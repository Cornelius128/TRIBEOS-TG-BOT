import type { Context } from "grammy";
import { prisma } from "../db.js";
import { getActiveCampaignForGroup } from "../services/referral.js";

export async function handleLeaderboard(ctx: Context) {
  let campaign = null;
  if (ctx.chat?.type !== "private") {
    const group = await prisma.telegramGroup.findUnique({
      where: { telegramId: String(ctx.chat?.id) },
    });
    if (group) campaign = await getActiveCampaignForGroup(group.id);
  }

  if (!campaign) {
    await ctx.reply("No active campaign leaderboard available.");
    return;
  }

  const top = await prisma.campaignParticipant.findMany({
    where: { campaignId: campaign.id },
    orderBy: { qualifiedReferrals: "desc" },
    take: 10,
  });

  if (top.length === 0) {
    await ctx.reply(`No participants yet for **${campaign.name}**.`, {
      parse_mode: "Markdown",
    });
    return;
  }

  const medals = ["🥇", "🥈", "🥉"];
  const rows = top.map((p, i) => {
    const medal = medals[i] ?? `#${i + 1}`;
    const name = p.telegramUsername ? `@${p.telegramUsername}` : p.telegramName ?? "Unknown";
    return `${medal} ${name} — ${p.qualifiedReferrals} refs (${p.totalPoints} pts)`;
  });

  await ctx.reply(
    `🏆 **${campaign.name} — Top Referrers**\n\n${rows.join("\n")}`,
    { parse_mode: "Markdown" }
  );
}
