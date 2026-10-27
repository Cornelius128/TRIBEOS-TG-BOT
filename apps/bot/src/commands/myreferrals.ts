import type { Context } from "grammy";
import { prisma } from "../db.js";
import { getActiveCampaignForGroup } from "../services/referral.js";

export async function handleMyReferrals(ctx: Context) {
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
    await ctx.reply("No active campaign. Use /campaign for more info.");
    return;
  }

  const participant = await prisma.campaignParticipant.findUnique({
    where: { campaignId_telegramUserId: { campaignId: campaign.id, telegramUserId } },
  });

  if (!participant) {
    await ctx.reply(
      `You're not registered for **${campaign.name}** yet.\n` +
      `Get a referral link first using /referral`,
      { parse_mode: "Markdown" }
    );
    return;
  }

  await ctx.reply(
    `📊 **Your stats for ${campaign.name}:**\n\n` +
    `✅ Qualified referrals: ${participant.qualifiedReferrals}\n` +
    `⏳ Pending referrals: ${participant.pendingReferrals}\n` +
    `🏆 Total points: ${participant.totalPoints}\n` +
    `${participant.rank ? `📍 Rank: #${participant.rank}` : ""}`,
    { parse_mode: "Markdown" }
  );
}
