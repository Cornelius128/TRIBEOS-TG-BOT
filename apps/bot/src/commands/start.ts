import type { Context } from "grammy";
import { prisma } from "../db.js";
import {
  getActiveCampaignForGroup,
  getOrCreateParticipant,
  getOrCreateReferralCode,
  recordReferral,
} from "../services/referral.js";
import { persistentKeyboard, mainMenuKeyboard } from "../services/menu.js";
import { verifyGroupWithCode } from "../handlers/verify.js";

export async function handleStart(ctx: Context) {
  const from = ctx.from;
  const chat = ctx.chat;
  if (!from || !chat) return;

  const telegramUserId = String(from.id);
  const telegramUsername = from.username;
  const telegramName = [from.first_name, from.last_name].filter(Boolean).join(" ");
  const botUsername = ctx.me.username;

  // Extract parameter from deep link
  const startParam = typeof ctx.match === "string" ? ctx.match.trim() : undefined;

  // ── Handle group-level start (e.g. from ?startgroup=verify_code) ─────────
  if (chat.type !== "private") {
    if (startParam && startParam.startsWith("verify_")) {
      const code = startParam.replace(/^verify_/, "").trim();
      const result = await verifyGroupWithCode(
        {
          id: chat.id,
          title: chat.title,
          type: chat.type,
          username: "username" in chat ? (chat.username ?? null) : null,
        },
        from,
        code,
        ctx.api
      );
      if (result.message) {
        await ctx.reply(result.message, { parse_mode: "HTML" });
      }
    }
    return;
  }

  let referralCode: string | null = null;
  if (startParam && startParam.startsWith("ref_")) {
    referralCode = startParam;
  }

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
