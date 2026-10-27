import { prisma } from "../db.js";
import crypto from "crypto";

export function generateReferralCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(12);
  let code = "";
  for (let i = 0; i < 12; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return `ref_${code}`;
}

export async function getActiveCampaignForGroup(groupId: string) {
  return prisma.campaign.findFirst({
    where: {
      groupId,
      status: "ACTIVE",
      startAt: { lte: new Date() },
      endAt: { gte: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getOrCreateParticipant(
  campaignId: string,
  telegramUserId: string,
  telegramUsername?: string,
  telegramName?: string
) {
  return prisma.campaignParticipant.upsert({
    where: { campaignId_telegramUserId: { campaignId, telegramUserId } },
    update: {
      ...(telegramUsername && { telegramUsername }),
      ...(telegramName && { telegramName }),
    },
    create: {
      campaignId,
      telegramUserId,
      telegramUsername: telegramUsername ?? null,
      telegramName: telegramName ?? null,
    },
  });
}

export async function getOrCreateReferralCode(
  campaignId: string,
  participantId: string,
  botUsername: string
) {
  const existing = await prisma.referralCode.findUnique({
    where: { participantId },
  });
  if (existing) return existing;

  const code = generateReferralCode();
  const deepLink = `https://t.me/${botUsername}?start=${code}`;

  return prisma.referralCode.create({
    data: {
      campaignId,
      participantId,
      code,
      deepLink,
    },
  });
}

export async function recordReferral(
  campaignId: string,
  referrerId: string,
  referredId: string,
  referralCodeId: string,
  idempotencyKey: string
) {
  // Check for existing attribution (idempotency)
  const existing = await prisma.referral.findUnique({
    where: { idempotencyKey },
  });
  if (existing) return { referral: existing, isNew: false };

  // Check unique constraint: a user can only be referred once per campaign
  const alreadyReferred = await prisma.referral.findUnique({
    where: { campaignId_referredId: { campaignId, referredId } },
  });
  if (alreadyReferred) {
    return { referral: alreadyReferred, isNew: false };
  }

  // Prevent self-referral
  if (referrerId === referredId) {
    return { referral: null, isNew: false, error: "self_referral" };
  }

  // Same-device sybil check: block referrals where referrer and referred
  // authenticated from the same IP address (tracked when they open the Mini App)
  const [referredPart, referrerPart] = await Promise.all([
    prisma.campaignParticipant.findUnique({ where: { id: referredId }, select: { telegramUserId: true } }),
    prisma.campaignParticipant.findUnique({ where: { id: referrerId }, select: { telegramUserId: true } }),
  ]);
  if (referredPart && referrerPart) {
    const [referredUser, referrerUser] = await Promise.all([
      prisma.user.findFirst({ where: { telegramId: referredPart.telegramUserId }, select: { lastLoginIp: true } }),
      prisma.user.findFirst({ where: { telegramId: referrerPart.telegramUserId }, select: { lastLoginIp: true } }),
    ]);
    if (
      referredUser?.lastLoginIp &&
      referrerUser?.lastLoginIp &&
      referredUser.lastLoginIp === referrerUser.lastLoginIp
    ) {
      return { referral: null, isNew: false, error: "same_device" };
    }
  }

  const referral = await prisma.referral.create({
    data: {
      campaignId,
      referrerId,
      referredId,
      referralCodeId,
      status: "REGISTERED",
      idempotencyKey,
    },
  });

  // Increment usage count on referral code
  await prisma.referralCode.update({
    where: { id: referralCodeId },
    data: { usageCount: { increment: 1 } },
  });

  // Increment pending on referrer
  await prisma.campaignParticipant.update({
    where: { id: referrerId },
    data: { pendingReferrals: { increment: 1 } },
  });

  await prisma.auditLog.create({
    data: {
      campaignId,
      eventType: "REFERRAL_CREATED",
      description: `Referral recorded: ${referrerId} → ${referredId}`,
      metadata: { referralId: referral.id, idempotencyKey },
    },
  });

  return { referral, isNew: true };
}

export async function qualifyReferral(
  referralId: string,
  campaignId: string,
  referrerId: string,
  points: number
) {
  const existing = await prisma.referral.findUnique({ where: { id: referralId } });
  if (!existing || existing.status === "QUALIFIED") return;

  await prisma.$transaction(async (tx) => {
    await tx.referral.update({
      where: { id: referralId },
      data: {
        status: "QUALIFIED",
        qualifiedAt: new Date(),
        pointsAwarded: points,
      },
    });

    await tx.campaignParticipant.update({
      where: { id: referrerId },
      data: {
        qualifiedReferrals: { increment: 1 },
        pendingReferrals: { decrement: existing.status === "PENDING" ? 1 : 0 },
        totalPoints: { increment: points },
      },
    });

    await tx.auditLog.create({
      data: {
        campaignId,
        eventType: "REFERRAL_QUALIFIED",
        description: `Referral ${referralId} qualified`,
        metadata: { referralId, points },
      },
    });
  });
}

export async function checkAndQualifyReferrals(
  campaignId: string,
  telegramUserId: string,
  groupTelegramId: string,
  isMember: boolean
) {
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return;

  const qualRules = campaign.qualificationRules as {
    requireBotStart?: boolean;
    requireGroupJoin?: boolean;
    minMembershipDays?: number;
  };

  // Find pending referrals for this user
  const participant = await prisma.campaignParticipant.findUnique({
    where: { campaignId_telegramUserId: { campaignId, telegramUserId } },
  });
  if (!participant) return;

  const pendingReferrals = await prisma.referral.findMany({
    where: {
      campaignId,
      referredId: participant.id,
      status: { in: ["REGISTERED", "PENDING"] },
    },
  });

  for (const referral of pendingReferrals) {
    let canQualify = true;

    // Check: group join requirement
    if (qualRules.requireGroupJoin && !isMember) {
      canQualify = false;
      // Update to PENDING if not already
      if (referral.status === "REGISTERED") {
        await prisma.referral.update({
          where: { id: referral.id },
          data: { status: "PENDING" },
        });
      }
    }

    // Check: minimum membership days
    if (qualRules.minMembershipDays && qualRules.minMembershipDays > 0) {
      if (!participant.memberSince) {
        canQualify = false;
      } else {
        const daysSince = (Date.now() - participant.memberSince.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < qualRules.minMembershipDays) {
          canQualify = false;
        }
      }
    }

    if (canQualify) {
      await qualifyReferral(referral.id, campaignId, referral.referrerId, campaign.pointsPerReferral);
    }
  }
}
