import type { Context } from "grammy";
import { prisma } from "../db.js";
import { getActiveCampaignForGroup } from "../services/referral.js";
import { DASHBOARD_URL } from "../constants.js";

export async function handleCampaign(ctx: Context) {
  let campaign = null;
  if (ctx.chat?.type !== "private") {
    const group = await prisma.telegramGroup.findUnique({
      where: { telegramId: String(ctx.chat?.id) },
    });
    if (group) campaign = await getActiveCampaignForGroup(group.id);
  }

  if (!campaign) {
    await ctx.reply(
      "No active campaign running right now.\n" +
      `Check the dashboard for upcoming campaigns: ${DASHBOARD_URL}`
    );
    return;
  }

  const participants = await prisma.campaignParticipant.count({
    where: { campaignId: campaign.id },
  });

  const endDate = campaign.endAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  await ctx.reply(
    `📣 **${campaign.name}**\n\n` +
    (campaign.description ? `${campaign.description}\n\n` : "") +
    `👥 Participants: ${participants}\n` +
    `⏰ Ends: ${endDate}\n` +
    `🏆 Points per referral: ${campaign.pointsPerReferral}\n\n` +
    `Get your referral link: /referral\n` +
    `View leaderboard: /leaderboard`,
    { parse_mode: "Markdown" }
  );
}
