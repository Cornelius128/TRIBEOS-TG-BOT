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

  // Ending is handled by the expiry sweeper, so it survives bot restarts and redeploys.
  return `Flash Bounty started for ${durationMinutes} minutes with ${multiplier}x multiplier!`;
}

export async function endFlashBounty(
  bot: Bot,
  bountyId: string,
  groupTelegramId: string
): Promise<void> {
  // Atomic claim: only one caller (sweeper tick or replica) gets to announce the end.
  const { count } = await prisma.flashBounty.updateMany({
    where: { id: bountyId, status: "ACTIVE" },
    data: { status: "ENDED" },
  });
  if (count === 0) return;

  const bounty = await prisma.flashBounty.findUnique({ where: { id: bountyId } });

  await bot.api.sendMessage(
    Number(groupTelegramId),
    `⏰ *Flash Bounty Ended!*\n\n` +
      `Total new referrals during event: *${bounty?.inviteCount ?? 0}*\n\n` +
      `Standard rates are back. Keep inviting! /referral`,
    { parse_mode: "Markdown" }
  );
}

export async function getActiveFlashBounty(groupId: string, campaignId: string) {
  const now = new Date();
  return prisma.flashBounty.findFirst({
    where: {
      groupId,
      status: "ACTIVE",
      startAt: { lte: now },
      endAt: { gt: now },
      OR: [{ campaignId: null }, { campaignId }],
    },
  });
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
