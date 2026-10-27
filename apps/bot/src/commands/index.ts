import type { Bot } from "grammy";
import { handleStart } from "./start.js";
import { handleHelp } from "./help.js";
import { handleReferral } from "./referral.js";
import { handleLeaderboard } from "./leaderboard.js";
import { handleCampaign } from "./campaign.js";
import { handleRules } from "./rules.js";
import { handleStats } from "./stats.js";
import { handlePortal } from "./portal.js";
import { registerFlashBountyCommand } from "./flashbounty.js";
import { registerClaimCommand } from "./claim.js";
import { registerPoachCommand } from "./poach.js";
import { requireGroupAdmin } from "../middleware/admin-only.js";
import { groupsListKeyboard, mainMenuKeyboard } from "../services/menu.js";

export function registerCommands(bot: Bot) {
  bot.command("start", handleStart);
  bot.command("menu", handleStart);
  bot.command("help", handleHelp);
  bot.command("referral", handleReferral);
  bot.command("myreferrals", handleStats);
  bot.command("leaderboard", handleLeaderboard);
  bot.command("campaign", handleCampaign);
  bot.command("stats", handleStats);

  // Admin-only in groups: non-admins have their message deleted
  bot.command("rules", requireGroupAdmin, handleRules);
  bot.command("portal", requireGroupAdmin, handlePortal);

  registerFlashBountyCommand(bot);
  registerClaimCommand(bot);
  registerPoachCommand(bot);

  // ─── Persistent reply keyboard button handlers (DM only) ─────────────────
  bot.hears("📋 My Communities", async (ctx) => {
    if (ctx.chat?.type !== "private" || !ctx.from) return;
    const kb = await groupsListKeyboard(String(ctx.from.id));
    await ctx.reply("🏠 *Your Communities*\n\nSelect a community to manage:", {
      parse_mode: "Markdown",
      reply_markup: kb,
    });
  });

  bot.hears("❓ Help", async (ctx) => {
    if (ctx.chat?.type !== "private") return;
    await ctx.reply(
      "📖 *TribeOS Help*\n\n" +
      "• 📋 *My Communities* — manage your linked groups\n" +
      "• 🔗 *Get Referral Link* — share and earn points\n" +
      "• 🏆 *Leaderboard* — see top referrers\n" +
      "• 📊 *My Stats* — your personal performance\n\n" +
      "*Group commands (admins only):*\n" +
      "• /portal — post the community action board\n" +
      "• /flashbounty — start a timed bonus event\n\n" +
      "Need to link a new group? Use the *My Communities* button.",
      {
        parse_mode: "Markdown",
        reply_markup: mainMenuKeyboard(),
      }
    );
  });
}
