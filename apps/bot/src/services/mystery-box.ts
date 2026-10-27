import { Bot } from "grammy";
import { prisma } from "../db.js";

const BOX_EXPIRY_HOURS = 24;

export async function spawnMysteryBox(
  bot: Bot,
  groupTelegramId: string,
  campaignId: string,
  inviterId: string,
  inviteeId: string,
  referralId: string
): Promise<void> {
  // Don't spawn if box already exists for this referral
  const existing = await prisma.mysteryBox.findUnique({ where: { referralId } });
  if (existing) return;

  const group = await prisma.telegramGroup.findUnique({ where: { telegramId: groupTelegramId } });
  if (!group) return;

  const expiresAt = new Date(Date.now() + BOX_EXPIRY_HOURS * 60 * 60 * 1000);

  const box = await prisma.mysteryBox.create({
    data: {
      groupId: group.id,
      campaignId,
      inviterId,
      inviteeId,
      referralId,
      rewardDescription: "Bonus referral points + early supporter badge",
      expiresAt,
      status: "PENDING",
    },
  });

  const inviterUsername = await getUsername(inviterId);
  const inviteeUsername = await getUsername(inviteeId);

  const msg = await bot.api.sendMessage(
    Number(groupTelegramId),
    `🎁 *Mystery Crate Spawned!*\n\n` +
      `${inviterUsername} invited ${inviteeUsername} — you both unlocked a mystery crate!\n\n` +
      `🎯 Both of you must /claim_${box.id.slice(-8)} within ${BOX_EXPIRY_HOURS} hours.\n` +
      `⚠️ If either of you misses the window, the crate *self-destructs*.\n\n` +
      `💰 Reward: _${box.rewardDescription}_`,
    { parse_mode: "Markdown" }
  );

  await prisma.mysteryBox.update({
    where: { id: box.id },
    data: { telegramMessageId: msg.message_id.toString() },
  });

  // Schedule auto-destruct
  setTimeout(async () => {
    await autoDestroyBox(bot, box.id, groupTelegramId);
  }, BOX_EXPIRY_HOURS * 60 * 60 * 1000);
}

export async function claimMysteryBox(
  bot: Bot,
  groupTelegramId: string,
  boxShortId: string,
  claimerId: string
): Promise<string> {
  const box = await prisma.mysteryBox.findFirst({
    where: { id: { endsWith: boxShortId } },
  });

  if (!box) return "Mystery crate not found.";
  if (box.status === "DESTROYED") return "💥 This crate has already self-destructed.";
  if (box.status === "CLAIMED") return "✅ This crate has already been fully claimed.";
  if (new Date() > box.expiresAt) {
    await autoDestroyBox(bot, box.id, groupTelegramId);
    return "⏰ This crate expired and was destroyed.";
  }

  if (claimerId !== box.inviterId && claimerId !== box.inviteeId) {
    return "Only the inviter and invitee can claim this crate.";
  }

  const isInviter = claimerId === box.inviterId;
  const alreadyClaimed = isInviter ? box.inviterClaimedAt : box.inviteeClaimedAt;
  if (alreadyClaimed) return "You've already claimed your share of this crate.";

  const now = new Date();
  const otherAlreadyClaimed = isInviter ? box.inviteeClaimedAt : box.inviterClaimedAt;

  const newStatus = otherAlreadyClaimed ? "CLAIMED" : "PARTIALLY_CLAIMED";

  await prisma.mysteryBox.update({
    where: { id: box.id },
    data: {
      ...(isInviter ? { inviterClaimedAt: now } : { inviteeClaimedAt: now }),
      status: newStatus,
    },
  });

  if (newStatus === "CLAIMED") {
    // Both claimed — grant reward (points in campaign)
    await grantBoxReward(box.campaignId, box.inviterId, box.inviteeId);

    await bot.api.sendMessage(
      Number(groupTelegramId),
      `🎉 *Mystery Crate Opened!*\n\n` +
        `Both parties claimed — reward granted!\n` +
        `💰 ${box.rewardDescription}`,
      { parse_mode: "Markdown" }
    );
    return `🎉 Crate opened! You both get: ${box.rewardDescription}`;
  }

  return `✅ Your half claimed! Waiting for ${isInviter ? "the person you invited" : "your inviter"} to claim theirs.`;
}

async function grantBoxReward(campaignId: string, inviterId: string, inviteeId: string): Promise<void> {
  const BONUS = 50;
  await prisma.campaignParticipant.updateMany({
    where: {
      campaignId,
      telegramUserId: { in: [inviterId, inviteeId] },
    },
    data: { totalPoints: { increment: BONUS } },
  });
}

async function autoDestroyBox(bot: Bot, boxId: string, groupTelegramId: string): Promise<void> {
  const box = await prisma.mysteryBox.findUnique({ where: { id: boxId } });
  if (!box || box.status === "CLAIMED" || box.status === "DESTROYED") return;

  await prisma.mysteryBox.update({
    where: { id: boxId },
    data: { status: "DESTROYED", destroyedAt: new Date() },
  });

  await bot.api.sendMessage(
    Number(groupTelegramId),
    `💥 *Mystery Crate Destroyed!*\n\n` +
      `The crate (ID: ${boxId.slice(-8)}) expired — both rewards are gone.\n` +
      `Stay active to keep your crates alive!`,
    { parse_mode: "Markdown" }
  );
}

async function getUsername(telegramUserId: string): Promise<string> {
  const p = await prisma.campaignParticipant.findFirst({
    where: { telegramUserId },
    orderBy: { registeredAt: "desc" },
  });
  if (p?.telegramUsername) return `@${p.telegramUsername}`;
  return p?.telegramName ?? `User ${telegramUserId}`;
}
