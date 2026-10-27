import type { Bot, Context } from "grammy";
import { prisma } from "../db.js";
import { DASHBOARD_URL } from "../constants.js";
import {
  mainMenuKeyboard,
  groupsListKeyboard,
  groupMemberKeyboard,
  groupAdminKeyboard,
  flashBountyKeyboard,
  sybilFilterKeyboard,
  portalKeyboard,
} from "../services/menu.js";
import { getOrCreatePerUserInviteLink } from "../services/invite-links.js";
import { getActiveCampaignForGroup, getOrCreateParticipant, getOrCreateReferralCode } from "../services/referral.js";
import { startFlashBounty, endFlashBounty } from "../services/flash-bounty.js";

const SYBIL_PRESETS = {
  off: { minAccountAgeDays: 0, requireWalletConnect: false, filterLevel: "off" as const },
  easy: { minAccountAgeDays: 30, requireWalletConnect: false, filterLevel: "easy" as const },
  medium: { minAccountAgeDays: 30, requireWalletConnect: true, filterLevel: "medium" as const },
  hardcore: { minAccountAgeDays: 90, requireWalletConnect: true, filterLevel: "hardcore" as const },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getGroupByDbId(groupId: string) {
  return prisma.telegramGroup.findUnique({ where: { id: groupId } });
}

async function isGroupAdmin(groupId: string, telegramUserId: string) {
  const admin = await prisma.groupAdmin.findFirst({
    where: { groupId, telegramUserId },
  });
  return !!admin;
}

async function getLeaderboardText(groupId: string): Promise<string> {
  const campaign = await getActiveCampaignForGroup(groupId);
  if (!campaign) return "No active campaign.";

  const top = await prisma.campaignParticipant.findMany({
    where: { campaignId: campaign.id },
    orderBy: { qualifiedReferrals: "desc" },
    take: 10,
  });

  if (top.length === 0) return `No participants yet for *${campaign.name}*.`;

  const medals = ["🥇", "🥈", "🥉"];
  const rows = top.map((p, i) => {
    const medal = medals[i] ?? `#${i + 1}`;
    const name = p.telegramUsername ? `@${p.telegramUsername}` : p.telegramName ?? "Unknown";
    return `${medal} ${name} — ${p.qualifiedReferrals} refs (${p.totalPoints} pts)`;
  });

  return `🏆 *${campaign.name} — Top Referrers*\n\n${rows.join("\n")}`;
}

async function getStatsText(groupId: string, telegramUserId: string): Promise<string> {
  const campaign = await getActiveCampaignForGroup(groupId);
  if (!campaign) return "No active campaign.";

  const participant = await prisma.campaignParticipant.findUnique({
    where: { campaignId_telegramUserId: { campaignId: campaign.id, telegramUserId } },
  });

  if (!participant) return "You haven't participated yet. Get your invite link to join!";

  const referrals = await prisma.referral.findMany({
    where: { campaignId: campaign.id, referrerId: participant.id },
    select: { status: true },
  });

  const counts = referrals.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const rank = await prisma.campaignParticipant.count({
    where: {
      campaignId: campaign.id,
      qualifiedReferrals: { gt: participant.qualifiedReferrals },
    },
  });
  const total = await prisma.campaignParticipant.count({ where: { campaignId: campaign.id } });

  return (
    `📊 *Your Stats — ${campaign.name}*\n\n` +
    `✅ Qualified: ${counts["QUALIFIED"] ?? 0}\n` +
    `⏳ Pending: ${(counts["PENDING"] ?? 0) + (counts["REGISTERED"] ?? 0)} unconfirmed\n` +
    `❌ Rejected: ${counts["REJECTED"] ?? 0}\n` +
    `🏆 Points: ${participant.totalPoints}\n` +
    `📍 Rank: #${rank + 1} of ${total}`
  );
}

async function getCampaignText(groupId: string): Promise<string> {
  const campaign = await getActiveCampaignForGroup(groupId);
  if (!campaign) return "No active campaign in this community right now.";

  const participantCount = await prisma.campaignParticipant.count({
    where: { campaignId: campaign.id },
  });
  const referralCount = await prisma.referral.count({ where: { campaignId: campaign.id } });

  return (
    `📢 *${campaign.name}*\n\n` +
    (campaign.description ? `📋 ${campaign.description}\n` : "") +
    `🏆 Points per referral: ${campaign.pointsPerReferral}\n` +
    `👥 Participants: ${participantCount}\n` +
    `🔗 Total referrals: ${referralCount}\n` +
    (campaign.endAt
      ? `⏰ Ends: ${new Date(campaign.endAt).toLocaleDateString()}`
      : "")
  );
}

async function getReferralLinkForDM(
  bot: Bot,
  groupId: string,
  telegramUserId: string,
  telegramUsername: string | undefined,
  telegramFirstName: string
): Promise<string> {
  const group = await getGroupByDbId(groupId);
  if (!group) return "Group not found.";

  const link = await getOrCreatePerUserInviteLink(
    bot,
    group.telegramId,
    Number(telegramUserId),
    telegramUsername,
    telegramFirstName
  );

  if (link) return link;

  // Fallback to deep link
  const campaign = await getActiveCampaignForGroup(group.id);
  if (!campaign) return "No active campaign.";

  const participant = await getOrCreateParticipant(
    campaign.id,
    telegramUserId,
    telegramUsername,
    telegramFirstName
  );
  const code = await getOrCreateReferralCode(
    campaign.id,
    participant.id,
    process.env.BOT_USERNAME ?? "TribeOSBot"
  );
  return code.deepLink;
}

// ─── DM Navigation Handlers ──────────────────────────────────────────────────

async function handleMainMenu(ctx: Context) {
  const kb = mainMenuKeyboard();
  await ctx.editMessageText(
    "👋 *TribeOS* — Community Referral Platform\n\nWhat would you like to do?",
    { parse_mode: "Markdown", reply_markup: kb }
  );
  await ctx.answerCallbackQuery();
}

async function handleGroupsList(ctx: Context) {
  const userId = String(ctx.from!.id);
  const kb = await groupsListKeyboard(userId);
  await ctx.editMessageText(
    "📋 *My Communities*\n\nSelect a community to manage:",
    { parse_mode: "Markdown", reply_markup: kb }
  );
  await ctx.answerCallbackQuery();
}

async function handleHelp(ctx: Context) {
  const text =
    "❓ *Help*\n\n" +
    "🔗 *Get Invite Link* — Get your personal referral link\n" +
    "🏆 *Leaderboard* — See the top referrers\n" +
    "📊 *My Stats* — View your referral performance\n" +
    "📢 *Campaign Info* — Learn about the active campaign\n\n" +
    "For group admins:\n" +
    "⚡ *Flash Bounty* — Start a timed points multiplier event\n" +
    "🛡️ *Sybil Filter* — Set anti-bot protection level\n" +
    "🖥️ *Dashboard* — Full management via Telegram browser\n\n" +
    "To link a new group: run `/portal` in your group after adding the bot.";
  await ctx.editMessageText(text, {
    parse_mode: "Markdown",
    reply_markup: { inline_keyboard: [[{ text: "← Back", callback_data: "m:main" }]] },
  });
  await ctx.answerCallbackQuery();
}

async function handleAbout(ctx: Context) {
  await ctx.editMessageText(
    "🤖 *TribeOS Bot*\n\n" +
    "Supercharge your Telegram community with:\n" +
    "• 📎 Trackable per-user invite links\n" +
    "• 🏆 Referral leaderboards & points\n" +
    "• ⚡ Flash Bounty events\n" +
    "• 🎁 Mystery Crate rewards\n" +
    "• 🛡️ Sybil & bot protection\n\n" +
    `🌐 [Open Dashboard](${DASHBOARD_URL})`,
    {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: [[{ text: "← Back", callback_data: "m:main" }]] },
    }
  );
  await ctx.answerCallbackQuery();
}

async function handleHowTo(ctx: Context) {
  await ctx.editMessageText(
    "📖 *How to link your community:*\n\n" +
    "1️⃣ Add *@TribeOSBot* to your Telegram group as an *Admin*\n" +
    "2️⃣ Make sure the bot has permission to *invite users*\n" +
    `3️⃣ Visit [${DASHBOARD_URL}](${DASHBOARD_URL}) and sign in\n` +
    "4️⃣ Click *Add Community* and follow the linking steps\n" +
    "5️⃣ Run /portal in your group to pin the action board",
    {
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: [[{ text: "← Back", callback_data: "m:groups" }]] },
    }
  );
  await ctx.answerCallbackQuery();
}

async function handleGroupMenu(ctx: Context, bot: Bot, groupId: string) {
  const userId = String(ctx.from!.id);
  const group = await getGroupByDbId(groupId);
  if (!group) {
    await ctx.answerCallbackQuery({ text: "Community not found." });
    return;
  }

  const isAdmin = await isGroupAdmin(groupId, userId);
  const kb = isAdmin ? groupAdminKeyboard(groupId) : groupMemberKeyboard(groupId);

  const statusIcon = group.botIsAdmin ? "✅" : "⚠️ Bot not admin —";
  const statusNote = group.botIsAdmin ? "" : " some features may be limited";

  await ctx.editMessageText(
    `${statusIcon} *${group.title}*${statusNote}\n\nWhat would you like to do?`,
    { parse_mode: "Markdown", reply_markup: kb }
  );
  await ctx.answerCallbackQuery();
}

async function handleGetReferralLink(ctx: Context, bot: Bot, groupId: string) {
  const from = ctx.from!;
  const userId = String(from.id);

  await ctx.answerCallbackQuery({ text: "Generating your link..." });

  const link = await getReferralLinkForDM(bot, groupId, userId, from.username, from.first_name);

  const group = await getGroupByDbId(groupId);
  const groupName = group?.title ?? "your community";

  await ctx.editMessageText(
    `🔗 *Your Invite Link for ${groupName}*\n\n` +
    `\`${link}\`\n\n` +
    "Share this link to earn referral points. Every join through your link is tracked!",
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[{ text: "← Back to Community", callback_data: `g:menu:${groupId}` }]],
      },
    }
  );
}

async function handleLeaderboard(ctx: Context, groupId: string) {
  const text = await getLeaderboardText(groupId);
  await ctx.editMessageText(text, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [[{ text: "← Back", callback_data: `g:menu:${groupId}` }]],
    },
  });
  await ctx.answerCallbackQuery();
}

async function handleStats(ctx: Context, groupId: string) {
  const userId = String(ctx.from!.id);
  const text = await getStatsText(groupId, userId);
  await ctx.editMessageText(text, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [[{ text: "← Back", callback_data: `g:menu:${groupId}` }]],
    },
  });
  await ctx.answerCallbackQuery();
}

async function handleCampaignInfo(ctx: Context, groupId: string) {
  const text = await getCampaignText(groupId);
  await ctx.editMessageText(text, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [[{ text: "← Back", callback_data: `g:menu:${groupId}` }]],
    },
  });
  await ctx.answerCallbackQuery();
}

async function handleFlashBountyMenu(ctx: Context, groupId: string) {
  const userId = String(ctx.from!.id);
  const ok = await isGroupAdmin(groupId, userId);
  if (!ok) {
    await ctx.answerCallbackQuery({ text: "Admin access required.", show_alert: true });
    return;
  }

  const kb = await flashBountyKeyboard(groupId);
  const active = await prisma.flashBounty.findFirst({
    where: { groupId, status: "ACTIVE" },
  });

  const text = active
    ? `⚡ *Flash Bounty Active!*\n\n${active.multiplier}× points for ${active.durationMinutes} min\nJoins so far: ${active.inviteCount}`
    : "⚡ *Flash Bounty*\n\nStart a timed event that multiplies referral points. Great for growth sprints!";

  await ctx.editMessageText(text, { parse_mode: "Markdown", reply_markup: kb });
  await ctx.answerCallbackQuery();
}

async function handleStartFlashBounty(
  ctx: Context,
  bot: Bot,
  groupId: string,
  durationMinutes: number,
  multiplier: number
) {
  const userId = String(ctx.from!.id);
  const ok = await isGroupAdmin(groupId, userId);
  if (!ok) {
    await ctx.answerCallbackQuery({ text: "Admin access required.", show_alert: true });
    return;
  }

  const group = await getGroupByDbId(groupId);
  if (!group) {
    await ctx.answerCallbackQuery({ text: "Group not found.", show_alert: true });
    return;
  }

  await ctx.answerCallbackQuery({ text: "Starting Flash Bounty..." });
  const result = await startFlashBounty(bot, group.telegramId, userId, durationMinutes, multiplier, 0);

  const kb = await flashBountyKeyboard(groupId);
  await ctx.editMessageText(
    `⚡ *Flash Bounty*\n\n${result}`,
    { parse_mode: "Markdown", reply_markup: kb }
  );
}

async function handleCancelFlashBounty(ctx: Context, bot: Bot, groupId: string) {
  const userId = String(ctx.from!.id);
  const ok = await isGroupAdmin(groupId, userId);
  if (!ok) {
    await ctx.answerCallbackQuery({ text: "Admin access required.", show_alert: true });
    return;
  }

  const group = await getGroupByDbId(groupId);
  if (!group) {
    await ctx.answerCallbackQuery({ text: "Group not found.", show_alert: true });
    return;
  }

  const active = await prisma.flashBounty.findFirst({
    where: { groupId, status: "ACTIVE" },
  });

  if (!active) {
    await ctx.answerCallbackQuery({ text: "No active Flash Bounty.", show_alert: true });
    return;
  }

  await prisma.flashBounty.update({ where: { id: active.id }, data: { status: "CANCELLED" } });
  await bot.api.sendMessage(
    Number(group.telegramId),
    "⚡ Flash Bounty has been cancelled by an admin."
  );

  await ctx.answerCallbackQuery({ text: "Flash Bounty cancelled." });
  const kb = await flashBountyKeyboard(groupId);
  await ctx.editMessageText("⚡ *Flash Bounty*\n\nReady to start a new event.", {
    parse_mode: "Markdown",
    reply_markup: kb,
  });
}

async function handleSybilMenu(ctx: Context, groupId: string) {
  const userId = String(ctx.from!.id);
  const ok = await isGroupAdmin(groupId, userId);
  if (!ok) {
    await ctx.answerCallbackQuery({ text: "Admin access required.", show_alert: true });
    return;
  }

  const kb = await sybilFilterKeyboard(groupId);
  await ctx.editMessageText(
    "🛡️ *Sybil Filter*\n\nSet the barrier to entry for new members joining via referral links.",
    { parse_mode: "Markdown", reply_markup: kb }
  );
  await ctx.answerCallbackQuery();
}

async function handleSybilSet(ctx: Context, groupId: string, level: string) {
  const userId = String(ctx.from!.id);
  const ok = await isGroupAdmin(groupId, userId);
  if (!ok) {
    await ctx.answerCallbackQuery({ text: "Admin access required.", show_alert: true });
    return;
  }

  const preset = SYBIL_PRESETS[level as keyof typeof SYBIL_PRESETS];
  if (!preset) {
    await ctx.answerCallbackQuery({ text: "Invalid level.", show_alert: true });
    return;
  }

  const existing = await prisma.groupModuleConfig.findUnique({
    where: { groupId_moduleId: { groupId, moduleId: "anti_fraud" } },
  });

  await prisma.groupModuleConfig.upsert({
    where: { groupId_moduleId: { groupId, moduleId: "anti_fraud" } },
    update: { config: preset, enabled: preset.filterLevel !== "off", version: { increment: 1 } },
    create: {
      groupId,
      moduleId: "anti_fraud",
      enabled: preset.filterLevel !== "off",
      config: preset,
    },
  });

  if (existing) {
    const mc = await prisma.groupModuleConfig.findUnique({
      where: { groupId_moduleId: { groupId, moduleId: "anti_fraud" } },
    });
    if (mc) {
      await prisma.configVersion.create({
        data: {
          moduleConfigId: mc.id,
          config: existing.config as import("@prisma/client").Prisma.InputJsonValue,
          version: existing.version,
          changedBy: userId,
        },
      });
    }
  }

  await ctx.answerCallbackQuery({ text: `Sybil Filter set to: ${level}` });
  const kb = await sybilFilterKeyboard(groupId);
  await ctx.editMessageText(
    "🛡️ *Sybil Filter*\n\nLevel updated!",
    { parse_mode: "Markdown", reply_markup: kb }
  );
}

// ─── In-group Portal Handlers ─────────────────────────────────────────────────

async function handlePortalRef(ctx: Context, bot: Bot) {
  const from = ctx.from;
  if (!from) {
    await ctx.answerCallbackQuery({ text: "Could not identify you." });
    return;
  }

  const groupTelegramId = String(ctx.chat!.id);
  const group = await prisma.telegramGroup.findUnique({
    where: { telegramId: groupTelegramId },
  });

  if (!group) {
    await ctx.answerCallbackQuery({ text: "This group isn't registered with TribeOS.", show_alert: true });
    return;
  }

  const link = await getOrCreatePerUserInviteLink(
    bot,
    groupTelegramId,
    from.id,
    from.username,
    from.first_name
  );

  if (!link) {
    await ctx.answerCallbackQuery({ text: "No active campaign right now.", show_alert: true });
    return;
  }

  try {
    await bot.api.sendMessage(
      from.id,
      `🔗 *Your Invite Link for ${group.title}*\n\n\`${link}\`\n\nShare it with friends to earn referral points!`,
      { parse_mode: "Markdown" }
    );
    await ctx.answerCallbackQuery({ text: "✅ Link sent to your DMs!" });
  } catch {
    // User hasn't started the bot — show link inline
    await ctx.answerCallbackQuery({
      text: `Your link: ${link}`,
      show_alert: true,
    });
  }
}

async function handlePortalLeaderboard(ctx: Context) {
  const groupTelegramId = String(ctx.chat!.id);
  const group = await prisma.telegramGroup.findUnique({
    where: { telegramId: groupTelegramId },
  });

  if (!group) {
    await ctx.answerCallbackQuery({ text: "Group not registered.", show_alert: true });
    return;
  }

  const text = await getLeaderboardText(group.id);
  await ctx.answerCallbackQuery();
  await ctx.reply(text, { parse_mode: "Markdown" });
}

async function handlePortalStats(ctx: Context, bot: Bot) {
  const from = ctx.from;
  if (!from) {
    await ctx.answerCallbackQuery({ text: "Could not identify you." });
    return;
  }

  const groupTelegramId = String(ctx.chat!.id);
  const group = await prisma.telegramGroup.findUnique({
    where: { telegramId: groupTelegramId },
  });

  if (!group) {
    await ctx.answerCallbackQuery({ text: "Group not registered.", show_alert: true });
    return;
  }

  const text = await getStatsText(group.id, String(from.id));

  try {
    await bot.api.sendMessage(from.id, text, { parse_mode: "Markdown" });
    await ctx.answerCallbackQuery({ text: "📊 Stats sent to your DMs!" });
  } catch {
    await ctx.answerCallbackQuery({ text: text.slice(0, 200), show_alert: true });
  }
}

async function handlePortalCampaign(ctx: Context) {
  const groupTelegramId = String(ctx.chat!.id);
  const group = await prisma.telegramGroup.findUnique({
    where: { telegramId: groupTelegramId },
  });

  if (!group) {
    await ctx.answerCallbackQuery({ text: "Group not registered.", show_alert: true });
    return;
  }

  const text = await getCampaignText(group.id);
  await ctx.answerCallbackQuery();
  await ctx.reply(text, { parse_mode: "Markdown" });
}

// ─── Main Router ──────────────────────────────────────────────────────────────

export function registerCallbackHandler(bot: Bot) {
  bot.on("callback_query:data", async (ctx) => {
    const data = ctx.callbackQuery.data;
    const isPrivate = ctx.chat?.type === "private";

    try {
      // ── DM menus ──────────────────────────────────────────────────────────

      if (data === "m:main") {
        await handleMainMenu(ctx);

      } else if (data === "m:groups") {
        await handleGroupsList(ctx);

      } else if (data === "m:help") {
        await handleHelp(ctx);

      } else if (data === "m:about") {
        await handleAbout(ctx);

      } else if (data === "m:howto") {
        await handleHowTo(ctx);

      // ── Group actions (DM) ────────────────────────────────────────────────

      } else if (data.startsWith("g:menu:") || data.startsWith("g:admin:")) {
        const groupId = data.startsWith("g:menu:") ? data.slice(7) : data.slice(8);
        await handleGroupMenu(ctx, bot, groupId);

      } else if (data.startsWith("g:ref:")) {
        const groupId = data.slice(6);
        await handleGetReferralLink(ctx, bot, groupId);

      } else if (data.startsWith("g:lb:")) {
        const groupId = data.slice(5);
        await handleLeaderboard(ctx, groupId);

      } else if (data.startsWith("g:st:")) {
        const groupId = data.slice(5);
        await handleStats(ctx, groupId);

      } else if (data.startsWith("g:camp:")) {
        const groupId = data.slice(7);
        await handleCampaignInfo(ctx, groupId);

      // ── Flash Bounty sub-actions ──────────────────────────────────────────

      } else if (data.startsWith("g:fb:cancel:")) {
        const groupId = data.slice(12);
        await handleCancelFlashBounty(ctx, bot, groupId);

      } else if (data.startsWith("g:fb:info:") || data.startsWith("g:fb:custom:")) {
        // "info" is just info on current bounty; "custom" opens dashboard
        const groupId = data.startsWith("g:fb:info:") ? data.slice(10) : data.slice(12);
        if (data.startsWith("g:fb:custom:")) {
          const group = await getGroupByDbId(groupId);
          const url = `${DASHBOARD_URL}/dashboard/groups/${groupId}`;
          await ctx.answerCallbackQuery({ text: `Open: ${url}` });
        } else {
          await handleFlashBountyMenu(ctx, groupId);
        }

      } else if (/^g:fb:\d+_\d+:/.test(data)) {
        // Format: g:fb:{min}_{mult}:{groupId}
        const withoutPrefix = data.slice(5); // "30_2:groupId"
        const colonIdx = withoutPrefix.indexOf(":");
        const params = withoutPrefix.slice(0, colonIdx); // "30_2"
        const groupId = withoutPrefix.slice(colonIdx + 1);
        const [durationStr, multiplierStr] = params.split("_");
        const durationMinutes = parseInt(durationStr, 10);
        const multiplier = parseInt(multiplierStr, 10);
        await handleStartFlashBounty(ctx, bot, groupId, durationMinutes, multiplier);

      } else if (data.startsWith("g:fb:")) {
        const groupId = data.slice(5);
        await handleFlashBountyMenu(ctx, groupId);

      // ── Sybil Filter ──────────────────────────────────────────────────────

      } else if (data.startsWith("g:sybil:set:")) {
        // Format: g:sybil:set:{level}:{groupId}
        const rest = data.slice(12); // "level:groupId"
        const colonIdx = rest.indexOf(":");
        const level = rest.slice(0, colonIdx);
        const groupId = rest.slice(colonIdx + 1);
        await handleSybilSet(ctx, groupId, level);

      } else if (data.startsWith("g:sybil:")) {
        const groupId = data.slice(8);
        await handleSybilMenu(ctx, groupId);

      // ── In-group portal callbacks ─────────────────────────────────────────

      } else if (data === "p:ref") {
        await handlePortalRef(ctx, bot);

      } else if (data === "p:lb") {
        await handlePortalLeaderboard(ctx);

      } else if (data === "p:st") {
        await handlePortalStats(ctx, bot);

      } else if (data === "p:camp") {
        await handlePortalCampaign(ctx);

      } else {
        await ctx.answerCallbackQuery({ text: "Unknown action." });
      }
    } catch (err) {
      console.error("Callback error:", err);
      try {
        await ctx.answerCallbackQuery({ text: "Something went wrong. Please try again." });
      } catch {}
    }
  });
}
