import { Bot } from "grammy";
import { prisma } from "../db.js";

const INACTIVITY_DAYS = 5;
const POACH_WINDOW_HOURS = 1;

export async function updateMemberActivity(
  campaignId: string,
  telegramUserId: string
): Promise<void> {
  await prisma.campaignParticipant.updateMany({
    where: { campaignId, telegramUserId },
    data: { lastActiveAt: new Date(), inactivityAlertedAt: null },
  });

  // Expire any open poach event targeting this user in this campaign
  await prisma.poachEvent.updateMany({
    where: {
      campaignId,
      subjectTelegramId: telegramUserId,
      status: "ALERTING",
    },
    data: { status: "EXPIRED" },
  });
}

export async function claimPoach(
  bot: Bot,
  groupTelegramId: string,
  poachEventId: string,
  poacherId: string
): Promise<string> {
  const event = await prisma.poachEvent.findUnique({ where: { id: poachEventId } });
  if (!event) return "Poach event not found.";
  if (event.status !== "ALERTING") return "This poach window has already closed.";
  if (new Date() > event.expiresAt) {
    await prisma.poachEvent.update({ where: { id: event.id }, data: { status: "EXPIRED" } });
    return "⏰ This poach window has expired.";
  }
  if (poacherId === event.originalReferrerId) return "You can't poach your own referral.";
  if (poacherId === event.subjectTelegramId) return "You can't poach yourself.";

  // Transfer points: find original referrer participant and deduct, add to poacher
  const campaign = await prisma.campaign.findUnique({ where: { id: event.campaignId } });
  if (!campaign) return "Campaign not found.";

  const pointsToTransfer = campaign.pointsPerReferral;

  await prisma.$transaction([
    prisma.campaignParticipant.updateMany({
      where: { campaignId: event.campaignId, telegramUserId: event.originalReferrerId },
      data: {
        qualifiedReferrals: { decrement: 1 },
        totalPoints: { decrement: pointsToTransfer },
      },
    }),
    prisma.campaignParticipant.upsert({
      where: {
        campaignId_telegramUserId: { campaignId: event.campaignId, telegramUserId: poacherId },
      },
      update: {
        qualifiedReferrals: { increment: 1 },
        totalPoints: { increment: pointsToTransfer },
      },
      create: {
        campaignId: event.campaignId,
        telegramUserId: poacherId,
        isGroupMember: true,
        qualifiedReferrals: 1,
        totalPoints: pointsToTransfer,
      },
    }),
    prisma.poachEvent.update({
      where: { id: event.id },
      data: {
        poacherId,
        poachClaimedAt: new Date(),
        pointsTransferred: pointsToTransfer,
        status: "CLAIMED",
      },
    }),
  ]);

  const poacherName = await getUsername(poacherId);
  const originalName = await getUsername(event.originalReferrerId);

  await bot.api.sendMessage(
    Number(groupTelegramId),
    `🦅 *Poach Successful!*\n\n` +
      `${poacherName} just poached ${originalName}'s referral!\n` +
      `+${pointsToTransfer} points transferred to ${poacherName}.`,
    { parse_mode: "Markdown" }
  );

  return `✅ Poach claimed! ${pointsToTransfer} points incoming.`;
}

export async function checkAndAlertPoachables(bot: Bot, groupTelegramId: string): Promise<void> {
  const group = await prisma.telegramGroup.findUnique({
    where: { telegramId: groupTelegramId },
  });
  if (!group) return;

  const activeCampaign = await prisma.campaign.findFirst({
    where: {
      groupId: group.id,
      status: "ACTIVE",
      startAt: { lte: new Date() },
      endAt: { gte: new Date() },
    },
  });
  if (!activeCampaign) return;

  const cutoff = new Date(Date.now() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000);

  // Find participants who have been inactive and have a referrer
  const dormant = await prisma.campaignParticipant.findMany({
    where: {
      campaignId: activeCampaign.id,
      isGroupMember: true,
      lastActiveAt: { lt: cutoff },
      inactivityAlertedAt: null,
      referralsReceived: { some: { status: "QUALIFIED" } },
    },
    include: {
      referralsReceived: {
        where: { status: "QUALIFIED" },
        take: 1,
        include: { referrer: true },
      },
    },
    take: 3, // Max 3 alerts per check to avoid spam
  });

  for (const participant of dormant) {
    const referral = participant.referralsReceived[0];
    if (!referral) continue;

    const openPoach = await prisma.poachEvent.findFirst({
      where: {
        campaignId: activeCampaign.id,
        subjectTelegramId: participant.telegramUserId,
        status: "ALERTING",
      },
    });
    if (openPoach) continue;

    const expiresAt = new Date(Date.now() + POACH_WINDOW_HOURS * 60 * 60 * 1000);

    const event = await prisma.poachEvent.create({
      data: {
        groupId: group.id,
        campaignId: activeCampaign.id,
        subjectTelegramId: participant.telegramUserId,
        originalReferrerId: referral.referrer.telegramUserId,
        expiresAt,
        status: "ALERTING",
      },
    });

    const subjectName = participant.telegramUsername
      ? `@${participant.telegramUsername}`
      : participant.telegramName ?? `User ${participant.telegramUserId}`;

    const msg = await bot.api.sendMessage(
      Number(groupTelegramId),
      `⚠️ *${subjectName} has gone cold!*\n\n` +
        `They haven't been active in ${INACTIVITY_DAYS}+ days.\n` +
        `Tag them and get them to chat — then claim their referral points!\n\n` +
        `⏰ Window: ${POACH_WINDOW_HOURS} hour(s)\n` +
        `🎯 /poach_${event.id.slice(-8)} to stake your claim`,
      { parse_mode: "Markdown" }
    );

    await prisma.poachEvent.update({
      where: { id: event.id },
      data: { alertMessageId: msg.message_id.toString() },
    });

    await prisma.campaignParticipant.update({
      where: { id: participant.id },
      data: { inactivityAlertedAt: new Date() },
    });

    // Schedule expiry
    setTimeout(async () => {
      await prisma.poachEvent.updateMany({
        where: { id: event.id, status: "ALERTING" },
        data: { status: "EXPIRED" },
      });
    }, POACH_WINDOW_HOURS * 60 * 60 * 1000);
  }
}

async function getUsername(telegramUserId: string): Promise<string> {
  const p = await prisma.campaignParticipant.findFirst({
    where: { telegramUserId },
    orderBy: { registeredAt: "desc" },
  });
  if (p?.telegramUsername) return `@${p.telegramUsername}`;
  return p?.telegramName ?? `User ${telegramUserId}`;
}
