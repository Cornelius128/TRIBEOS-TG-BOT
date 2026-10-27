import type { Context } from "grammy";
import { prisma } from "../db.js";
import { getActiveCampaignForGroup } from "../services/referral.js";

export async function handleStats(ctx: Context) {
  const from = ctx.from;
  if (!from) return;

  const telegramUserId = String(from.id);

  let campaign = null;
  if (ctx.chat?.type !== "private") {
    const group = await prisma.telegramGroup.findUnique({
      where: { telegramId: String(ctx.chat?.id) },
    });
    if (group) campaign = await getActiveCampaignForGroup(group.id);
  }

  if (!campaign) {
    await ctx.reply("No active campaign.");
    return;
  }

  const participant = await prisma.campaignParticipant.findUnique({
    where: { campaignId_telegramUserId: { campaignId: campaign.id, telegramUserId } },
  });

  if (!participant) {
    await ctx.reply("You haven't participated yet. Use /referral to get your link.");
    return;
  }

  const referrals = await prisma.referral.findMany({
    where: { campaignId: campaign.id, referrerId: participant.id },
    select: { status: true },
  });

  const counts = referrals.reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const totalParticipants = await prisma.campaignParticipant.count({
    where: { campaignId: campaign.id, qualifiedReferrals: { gt: 0 } },
  });

  const rank = await prisma.campaignParticipant.count({
    where: {
      campaignId: campaign.id,
      qualifiedReferrals: { gt: participant.qualifiedReferrals },
    },
  });

  await ctx.reply(
    `📊 **Your Stats — ${campaign.name}**\n\n` +
    `✅ Qualified: ${counts["QUALIFIED"] ?? 0}\n` +
    `⏳ Pending: ${counts["PENDING"] ?? 0} + ${counts["REGISTERED"] ?? 0} unconfirmed\n` +
    `❌ Rejected: ${counts["REJECTED"] ?? 0}\n` +
    `🏆 Points: ${participant.totalPoints}\n` +
    `📍 Rank: #${rank + 1} of ${totalParticipants}`,
    { parse_mode: "Markdown" }
  );
}
