import type { Context } from "grammy";
import { prisma } from "../db.js";
import { getParticipantStats, sendStatsCard } from "../services/stats-card.js";

export async function handleStats(ctx: Context) {
  const from = ctx.from;
  if (!from || !ctx.chat) return;
  const telegramUserId = String(from.id);
  const botUsername = ctx.me.username;

  if (ctx.chat.type !== "private") {
    const group = await prisma.telegramGroup.findUnique({ where: { telegramId: String(ctx.chat.id) } });
    if (!group) return;
    await ctx.replyWithChatAction("upload_photo").catch(() => {});
    const stats = await getParticipantStats(ctx.api, group.id, telegramUserId, botUsername);
    if (!stats.ok) {
      await ctx.reply(stats.message, { reply_parameters: { message_id: ctx.msg!.message_id } });
      return;
    }
    await sendStatsCard(ctx.api, ctx.chat.id, stats, ctx.msg?.message_id);
    return;
  }

  // In DMs there is no group context: show a card for each active campaign the user is in.
  const now = new Date();
  const memberships = await prisma.campaignParticipant.findMany({
    where: {
      telegramUserId,
      campaign: { status: "ACTIVE", startAt: { lte: now }, endAt: { gte: now } },
    },
    include: { campaign: { select: { groupId: true } } },
    orderBy: { totalPoints: "desc" },
    take: 3,
  });

  if (memberships.length === 0) {
    await ctx.reply(
      "You're not in any active campaign yet.\n\nOpen a community's invite link, or tap 📋 My Communities to get your own."
    );
    return;
  }

  await ctx.replyWithChatAction("upload_photo").catch(() => {});
  for (const m of memberships) {
    const stats = await getParticipantStats(ctx.api, m.campaign.groupId, telegramUserId, botUsername);
    if (stats.ok) await sendStatsCard(ctx.api, ctx.chat.id, stats);
  }
}
