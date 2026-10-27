import type { Context } from "grammy";
import { prisma } from "../db.js";
import { portalKeyboard } from "../services/menu.js";
import { getActiveCampaignForGroup } from "../services/referral.js";

export async function handlePortal(ctx: Context) {
  if (!ctx.chat || ctx.chat.type === "private") {
    await ctx.reply(
      "The /portal command is for use in groups. Add me to your group and run it there!"
    );
    return;
  }

  const chatId = String(ctx.chat.id);
  const group = await prisma.telegramGroup.findUnique({
    where: { telegramId: chatId },
    include: {
      campaigns: {
        where: { status: "ACTIVE" },
        take: 1,
        include: {
          _count: { select: { participants: true, referrals: true } },
        },
      },
    },
  });

  if (!group) {
    await ctx.reply(
      "⚠️ This group hasn't been linked to TribeOS yet.\n\n" +
      "An admin needs to visit the dashboard to set up this community."
    );
    return;
  }

  const campaign = group.campaigns[0];

  let text: string;
  if (campaign) {
    text =
      `🚀 *${group.title}*\n\n` +
      `📢 *Active Campaign: ${campaign.name}*\n` +
      `👥 ${campaign._count.participants} participants • 🔗 ${campaign._count.referrals} referrals\n\n` +
      "Use the buttons below to get your invite link, check stats, or view the leaderboard!";
  } else {
    text =
      `🏠 *${group.title}* — TribeOS Community\n\n` +
      "No active campaign right now.\n\n" +
      "Use the buttons below to explore features.";
  }

  await ctx.reply(text, {
    parse_mode: "Markdown",
    reply_markup: portalKeyboard(),
  });
}
