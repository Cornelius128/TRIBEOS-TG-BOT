import type { Bot, Context } from "grammy";
import { prisma } from "../db.js";
import {
  getActiveCampaignForGroup,
  getOrCreateParticipant,
  recordReferral,
  checkAndQualifyReferrals,
} from "../services/referral.js";
import { spawnMysteryBox } from "../services/mystery-box.js";
import { checkAndAlertPoachables } from "../services/poaching.js";
import { incrementFlashBountyCount } from "../services/flash-bounty.js";

export async function handleChatMemberUpdate(ctx: Context, bot: Bot) {
  const update = ctx.chatMember ?? ctx.myChatMember;
  if (!update) return;

  const chatId = String(ctx.chat?.id);
  const user = update.new_chat_member.user;
  const telegramUserId = String(user.id);
  const newStatus = update.new_chat_member.status;
  const oldStatus = update.old_chat_member.status;

  // Record the event for idempotency
  try {
    await prisma.telegramEvent.upsert({
      where: { updateId: BigInt(ctx.update.update_id) },
      create: {
        updateId: BigInt(ctx.update.update_id),
        eventType: "chat_member",
        telegramGroupId: chatId,
        telegramUserId,
        payload: ctx.update as any,
      },
      update: {},
    });
  } catch {
    // Already processed
    return;
  }

  // Handle bot being added as admin
  if (update.new_chat_member.user.is_bot && newStatus === "administrator") {
    await prisma.telegramGroup.updateMany({
      where: { telegramId: chatId },
      data: { botIsAdmin: true },
    });
    return;
  }

  // Handle bot being removed
  if (update.new_chat_member.user.is_bot && ["kicked", "left"].includes(newStatus)) {
    await prisma.telegramGroup.updateMany({
      where: { telegramId: chatId },
      data: { botIsAdmin: false, isActive: false },
    });
    return;
  }

  const group = await prisma.telegramGroup.findUnique({ where: { telegramId: chatId } });
  if (!group) return;

  const isMember = ["member", "administrator", "creator"].includes(newStatus);
  const wasNotMember = ["left", "kicked", "banned"].includes(oldStatus);
  const justJoined = isMember && wasNotMember;
  const justLeft = !isMember && ["member", "administrator", "creator"].includes(oldStatus);

  // Update member count
  if (justJoined || justLeft) {
    await prisma.telegramGroup.update({
      where: { id: group.id },
      data: {
        memberCount: {
          [justJoined ? "increment" : "decrement"]: 1,
        },
      },
    }).catch(() => {});
  }

  // Update participant membership status
  const campaign = await getActiveCampaignForGroup(group.id);
  if (!campaign) return;

  let participant = await prisma.campaignParticipant.findUnique({
    where: { campaignId_telegramUserId: { campaignId: campaign.id, telegramUserId } },
  });

  if (justJoined) {
    // ── Invite-link path: participant not yet created ──────────────────────
    // When the user joined via createChatInviteLink (creates_join_request=true),
    // handleJoinRequest stored the referral attribution in a TelegramEvent.
    // We read it here and create the participant + referral record.
    if (!participant) {
      const pendingAttribution = await prisma.telegramEvent.findFirst({
        where: {
          eventType: "join_request_approved",
          telegramGroupId: chatId,
          telegramUserId,
        },
      });

      if (pendingAttribution) {
        const payload = pendingAttribution.payload as { referralCodeId?: string };
        if (payload.referralCodeId) {
          const referralCode = await prisma.referralCode.findUnique({
            where: { id: payload.referralCodeId },
          });

          if (referralCode && referralCode.campaignId === campaign.id) {
            participant = await getOrCreateParticipant(
              campaign.id,
              telegramUserId,
              user.username,
              user.first_name
            );

            const idempotencyKey = `${campaign.id}:${referralCode.participantId}:${participant.id}`;
            await recordReferral(
              campaign.id,
              referralCode.participantId,
              participant.id,
              referralCode.id,
              idempotencyKey
            ).catch(console.error);
          }
        }
      }
    }

    // ── Common join logic for both paths ──────────────────────────────────
    if (participant && !participant.isGroupMember) {
      await prisma.campaignParticipant.update({
        where: { id: participant.id },
        data: { isGroupMember: true, memberSince: new Date(), lastActiveAt: new Date() },
      });

      // Qualify any pending referrals for this user
      await checkAndQualifyReferrals(campaign.id, telegramUserId, chatId, true);

      // Spawn mystery box if their referral just qualified
      const referral = await prisma.referral.findUnique({
        where: { campaignId_referredId: { campaignId: campaign.id, referredId: participant.id } },
      });
      if (referral && referral.status === "QUALIFIED") {
        const referrerParticipant = await prisma.campaignParticipant.findUnique({
          where: { id: referral.referrerId },
        });
        if (referrerParticipant) {
          await spawnMysteryBox(
            bot, chatId, campaign.id,
            referrerParticipant.telegramUserId, telegramUserId, referral.id
          ).catch(console.error);
        }
      }

      await incrementFlashBountyCount(group.id).catch(() => {});
    }
  }

  if (justLeft && participant?.isGroupMember) {
    await prisma.campaignParticipant.update({
      where: { id: participant.id },
      data: { isGroupMember: false },
    });
  }

  // Periodically check for poachable members (1-in-20 chance per join event to spread load)
  if (justJoined && Math.random() < 0.05) {
    await checkAndAlertPoachables(bot, chatId).catch(console.error);
  }
}
