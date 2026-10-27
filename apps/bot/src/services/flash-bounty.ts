import { Bot } from "grammy";
import { prisma } from "../db.js";

export async function startFlashBounty(
  bot: Bot,
  groupTelegramId: string,
  startedByTelegramId: string,
  durationMinutes: number,
  multiplier: number,
  bonusPoints: number
): Promise<string> {
  const group = await prisma.telegramGroup.findUnique({
    where: { telegramId: groupTelegramId },
  });
  if (!group) return "Group not found.";

  const existing = await prisma.flashBounty.findFirst({
    where: { groupId: group.id, status: "ACTIVE" },
  });
  if (existing) return "A Flash Bounty is already active in this group!";

  const now = new Date();
  const endAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

  const bounty = await prisma.flashBounty.create({
    data: {
      groupId: group.id,
      startedBy: startedByTelegramId,
      durationMinutes,
      multiplier,
      bonusPoints,
      startAt: now,
      endAt,
      status: "ACTIVE",
    },
  });

  const endTimeStr = endAt.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });

  const msg = await bot.api.sendMessage(
    Number(groupTelegramId),
    `🚨 *FLASH BOUNTY ACTIVE: Next ${durationMinutes} Minutes!*\n\n` +
      `Every referral that joins now earns *${multiplier}x points*!\n` +
      (bonusPoints > 0 ? `Plus a *+${bonusPoints} bonus* per qualifying invite.\n` : "") +
      `\n⏰ Ends at ${endTimeStr} UTC\n\n` +
      `Get your referral link: /referral`,
    { parse_mode: "Markdown" }
  );

  await prisma.flashBounty.update({
    where: { id: bounty.id },
    data: { telegramMessageId: msg.message_id.toString() },
  });

  // Schedule end (using setTimeout for simplicity — in production use the worker/job system)
  setTimeout(async () => {
    await endFlashBounty(bot, bounty.id, groupTelegramId);
  }, durationMinutes * 60 * 1000);

  return `Flash Bounty started for ${durationMinutes} minutes with ${multiplier}x multiplier!`;
}

export async function endFlashBounty(
  bot: Bot,
  bountyId: string,
  groupTelegramId: string
): Promise<void> {
  const bounty = await prisma.flashBounty.findUnique({ where: { id: bountyId } });
  if (!bounty || bounty.status !== "ACTIVE") return;

  await prisma.flashBounty.update({
    where: { id: bountyId },
    data: { status: "ENDED" },
  });

  await bot.api.sendMessage(
    Number(groupTelegramId),
    `⏰ *Flash Bounty Ended!*\n\n` +
      `Total new referrals during event: *${bounty.inviteCount}*\n\n` +
      `Standard rates are back. Keep inviting! /referral`,
    { parse_mode: "Markdown" }
  );
}

export async function getActiveFlashBountyMultiplier(groupId: string): Promise<number> {
  const bounty = await prisma.flashBounty.findFirst({
    where: {
      groupId,
      status: "ACTIVE",
      startAt: { lte: new Date() },
      endAt: { gt: new Date() },
    },
  });
  return bounty?.multiplier ?? 1.0;
}

export async function incrementFlashBountyCount(groupId: string): Promise<void> {
  await prisma.flashBounty.updateMany({
    where: {
      groupId,
      status: "ACTIVE",
      startAt: { lte: new Date() },
      endAt: { gt: new Date() },
    },
    data: { inviteCount: { increment: 1 } },
  });
}
