import type { Context } from "grammy";
import { prisma } from "../db.js";
import { getActiveCampaignForGroup } from "../services/referral.js";

export async function handleRules(ctx: Context) {
  let campaign = null;
  if (ctx.chat?.type !== "private") {
    const group = await prisma.telegramGroup.findUnique({
      where: { telegramId: String(ctx.chat?.id) },
    });
    if (group) campaign = await getActiveCampaignForGroup(group.id);
  }

  if (!campaign) {
    await ctx.reply("No active campaign right now.");
    return;
  }

  if (!campaign.rules) {
    await ctx.reply(`**${campaign.name}** — No specific rules posted yet.`, {
      parse_mode: "Markdown",
    });
    return;
  }

  await ctx.reply(
    `📋 **Rules for ${campaign.name}:**\n\n${campaign.rules}`,
    { parse_mode: "Markdown" }
  );
}
