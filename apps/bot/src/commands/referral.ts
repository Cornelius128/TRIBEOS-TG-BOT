import type { Bot, Context } from "grammy";
import { prisma } from "../db.js";
import {
  getActiveCampaignForGroup,
  getOrCreateParticipant,
  getOrCreateReferralCode,
} from "../services/referral.js";
import { getOrCreatePerUserInviteLink } from "../services/invite-links.js";

export async function handleReferral(ctx: Context) {
  const from = ctx.from;
  if (!from) return;

  const telegramUserId = String(from.id);
  const botUsername = ctx.me.username;
  const fullName = [from.first_name, from.last_name].filter(Boolean).join(" ");

  let campaign = null;
  let groupTelegramId: string | null = null;

  if (ctx.chat?.type !== "private") {
    groupTelegramId = String(ctx.chat?.id);
    const group = await prisma.telegramGroup.findUnique({
      where: { telegramId: groupTelegramId },
    });
    if (group) {
      campaign = await getActiveCampaignForGroup(group.id);
    }
  }

  if (!campaign) {
    await ctx.reply("No active referral campaign right now. Use /campaign for details.");
    return;
  }

  const participant = await getOrCreateParticipant(
    campaign.id,
    telegramUserId,
    from.username,
    fullName
  );

  const code = await getOrCreateReferralCode(campaign.id, participant.id, botUsername);

  // Try to create a Telegram invite link (requires bot to be admin)
  let referralLink = code.deepLink;
  if (groupTelegramId && ctx.chat?.type !== "private") {
    const bot = ctx as unknown as { api: Bot["api"] };
    const inviteLink = await getOrCreatePerUserInviteLink(
      { api: bot.api } as Bot,
      groupTelegramId,
      from.id,
      from.username,
      from.first_name
    ).catch(() => null);
    if (inviteLink) referralLink = inviteLink;
  }

  const stats = await prisma.campaignParticipant.findUnique({
    where: { id: participant.id },
  });

  await ctx.reply(
    `🔗 *Your referral link for ${campaign.name}:*\n\n` +
      `${referralLink}\n\n` +
      `📊 Your stats:\n` +
      `• Qualified: ${stats?.qualifiedReferrals ?? 0}\n` +
      `• Pending: ${stats?.pendingReferrals ?? 0}\n` +
      `• Points: ${stats?.totalPoints ?? 0}\n\n` +
      `Share this link — anyone who joins through it is your recruit!\n` +
      `/myreferrals for full details`,
    { parse_mode: "Markdown" }
  );
}
