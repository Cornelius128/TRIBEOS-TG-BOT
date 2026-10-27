import { Bot } from "grammy";
import { prisma } from "../db.js";
import { getActiveCampaignForGroup, getOrCreateParticipant, getOrCreateReferralCode } from "./referral.js";

export async function getOrCreatePerUserInviteLink(
  bot: Bot,
  groupTelegramId: string,
  userId: number,
  username: string | undefined,
  firstName: string
): Promise<string | null> {
  // Find the group
  const group = await prisma.telegramGroup.findUnique({
    where: { telegramId: groupTelegramId },
  });
  if (!group) return null;

  const campaign = await getActiveCampaignForGroup(group.id);
  if (!campaign) return null;

  const participant = await getOrCreateParticipant(
    campaign.id,
    userId.toString(),
    username,
    firstName
  );

  const referralCode = await getOrCreateReferralCode(
    campaign.id,
    participant.id,
    process.env.BOT_USERNAME ?? "TribeOSBot"
  );

  // Check if a join-request invite link already exists for this participant
  const existing = await prisma.referralInviteLink.findFirst({
    where: {
      referralCodeId: referralCode.id,
      requiresJoinRequest: true,
      expiresAt: { gt: new Date() },
    },
  });
  if (existing) return existing.inviteLink;

  try {
    const link = await bot.api.createChatInviteLink(Number(groupTelegramId), {
      name: `${firstName}'s referral`,
      creates_join_request: true,
      expire_date: Math.floor(new Date(campaign.endAt).getTime() / 1000),
    });

    await prisma.referralInviteLink.create({
      data: {
        groupId: group.id,
        campaignId: campaign.id,
        referralCodeId: referralCode.id,
        inviteLink: link.invite_link,
        telegramLinkId: link.invite_link,
        requiresJoinRequest: true,
        expiresAt: campaign.endAt,
      },
    });

    return link.invite_link;
  } catch (err) {
    console.error("createChatInviteLink failed:", err);
    // Fall back to deep link
    return referralCode.deepLink;
  }
}

export interface SybilCheckResult {
  passed: boolean;
  reason?: string;
}

export function checkSybilFilters(
  config: {
    minAccountAgeDays?: number;
    requireWalletConnect?: boolean;
  },
  userCreatedAt?: Date
): SybilCheckResult {
  if (config.minAccountAgeDays && config.minAccountAgeDays > 0 && userCreatedAt) {
    const ageDays = (Date.now() - userCreatedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays < config.minAccountAgeDays) {
      return { passed: false, reason: `Account must be at least ${config.minAccountAgeDays} days old.` };
    }
  }
  return { passed: true };
}

export async function handleJoinRequest(
  bot: Bot,
  chatId: number,
  userId: number,
  username: string | undefined,
  firstName: string,
  inviteLinkUrl: string | undefined
): Promise<void> {
  const group = await prisma.telegramGroup.findUnique({
    where: { telegramId: chatId.toString() },
    include: {
      moduleConfigs: {
        where: { moduleId: "anti_fraud", enabled: true },
      },
    },
  });

  const sybilConfig = (group?.moduleConfigs[0]?.config as {
    minAccountAgeDays?: number;
    requireWalletConnect?: boolean;
  }) ?? {};

  // If account age check enabled and we can't verify, apply soft block
  // (Telegram doesn't expose account creation date via Bot API, skip for now)
  const sybilResult = checkSybilFilters(sybilConfig);

  if (!sybilResult.passed) {
    await bot.api.declineChatJoinRequest(chatId, userId);
    try {
      await bot.api.sendMessage(userId, `❌ Your join request was declined: ${sybilResult.reason}`);
    } catch {}
    return;
  }

  // Approve
  await bot.api.approveChatJoinRequest(chatId, userId);

  // Record referral attribution from invite link
  if (inviteLinkUrl && group) {
    const inviteLink = await prisma.referralInviteLink.findUnique({
      where: { inviteLink: inviteLinkUrl },
      include: { referralCode: true },
    });

    if (inviteLink) {
      await prisma.referralInviteLink.update({
        where: { id: inviteLink.id },
        data: { approvedCount: { increment: 1 }, pendingCount: { decrement: 1 } },
      });

      // Store userId → referralCodeId mapping for when they first join
      // The chat_member handler picks this up
      await prisma.telegramEvent.upsert({
        where: { updateId: BigInt(`99${userId}${chatId}`) },
        update: {},
        create: {
          updateId: BigInt(`99${userId}${chatId}`),
          eventType: "join_request_approved",
          telegramGroupId: chatId.toString(),
          telegramUserId: userId.toString(),
          payload: { referralCodeId: inviteLink.referralCodeId, inviteLinkId: inviteLink.id },
        },
      });
    }
  }
}
