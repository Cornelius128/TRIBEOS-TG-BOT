import type { Context } from "grammy";
import { prisma } from "../db.js";
import {
  getActiveCampaignForGroup,
  getOrCreateParticipant,
  getOrCreateReferralCode,
  recordReferral,
} from "../services/referral.js";
import { persistentKeyboard } from "../services/menu.js";

export async function handleStart(ctx: Context) {
  const from = ctx.from;
  if (!from) return;

  const telegramUserId = String(from.id);
  const telegramUsername = from.username;
  const telegramName = [from.first_name, from.last_name].filter(Boolean).join(" ");
  const botUsername = ctx.me.username;

  // Extract referral code from deep link
  const startParam = ctx.match as string | undefined;
  let referralCode: string | null = null;
  if (startParam && startParam.startsWith("ref_")) {
    referralCode = startParam;
  }

  if (ctx.chat?.type !== "private") return;

  // ── Handle referral deep link ──────────────────────────────────────────────

  if (referralCode) {
    const codeRecord = await prisma.referralCode.findUnique({
      where: { code: referralCode },
      include: { campaign: true, participant: true },
    });

    if (!codeRecord) {
      await ctx.reply(
        "❌ This referral link is invalid or has expired.",
        { reply_markup: persistentKeyboard() }
      );
      return;
    }

    const campaign = codeRecord.campaign;
    if (campaign.status !== "ACTIVE") {
      await ctx.reply(
        `This campaign (${campaign.name}) is ${campaign.status.toLowerCase()} and not accepting new participants.`,
        { reply_markup: persistentKeyboard() }
      );
      return;
    }

    const referredParticipant = await getOrCreateParticipant(
      campaign.id,
      telegramUserId,
      telegramUsername,
      telegramName
    );

    const idempotencyKey = `${campaign.id}:${codeRecord.participantId}:${referredParticipant.id}`;
    const { isNew, error } = await recordReferral(
      campaign.id,
      codeRecord.participantId,
      referredParticipant.id,
      codeRecord.id,
      idempotencyKey
    );

    if (error === "self_referral") {
      await ctx.reply(
        "You can't refer yourself! 😅",
        { reply_markup: persistentKeyboard() }
      );
      return;
    }

    if (error === "same_device") {
      await ctx.reply(
        "🚫 *Referral blocked*\n\nOur system detected that this device was already used to participate in this campaign. Each device can only join once to keep things fair.",
        { parse_mode: "Markdown", reply_markup: persistentKeyboard() }
      );
      return;
    }

    const myCode = await getOrCreateReferralCode(
      campaign.id,
      referredParticipant.id,
      botUsername
    );

    const referrerName = codeRecord.participant.telegramUsername
      ? `@${codeRecord.participant.telegramUsername}`
      : codeRecord.participant.telegramName ?? "someone";

    const intro = isNew
      ? `✅ *You've been referred by ${referrerName}!*\n\nYou're now registered for *${campaign.name}*.\n\n📎 Your referral link:\n\`${myCode.deepLink}\`\n\nShare it with friends to earn points!`
      : `Welcome back! You're already in *${campaign.name}*.\n\n📎 Your link:\n\`${myCode.deepLink}\``;

    await ctx.reply(intro, {
      parse_mode: "Markdown",
      reply_markup: persistentKeyboard(),
    });
    return;
  }

  // ── General welcome with menu ──────────────────────────────────────────────

  await ctx.reply(
    "👋 *Welcome to TribeOS!*\n\nI help manage community referral campaigns.\n\nUse the buttons below ↓ to navigate, or type /help for a full list of commands.",
    {
      parse_mode: "Markdown",
      reply_markup: persistentKeyboard(),
    }
  );
}
