import { Bot } from "grammy";
import { startFlashBounty } from "../services/flash-bounty.js";

export function registerFlashBountyCommand(bot: Bot): void {
  // /flashbounty <minutes> <multiplier> [bonusPoints]
  // Only group admins can trigger this
  bot.command("flashbounty", async (ctx) => {
    if (!ctx.chat || ctx.chat.type === "private") {
      await ctx.reply("Flash Bounties can only be started in a group.");
      return;
    }

    const chatId = ctx.chat.id;
    const userId = ctx.from?.id;
    if (!userId) return;

    // Verify admin — delete message and DM if not
    const member = await ctx.getChatMember(userId);
    if (!["administrator", "creator"].includes(member.status)) {
      await ctx.deleteMessage().catch(() => {});
      await ctx.api.sendMessage(userId, "⛔ Only group admins can start a Flash Bounty.").catch(() => {});
      return;
    }

    const args = ctx.match?.toString().trim().split(/\s+/) ?? [];
    const durationMinutes = parseInt(args[0] ?? "60", 10);
    const multiplier = parseFloat(args[1] ?? "3");
    const bonusPoints = parseInt(args[2] ?? "0", 10);

    if (isNaN(durationMinutes) || durationMinutes < 5 || durationMinutes > 1440) {
      await ctx.reply("Usage: /flashbounty <minutes 5–1440> <multiplier> [bonusPoints]\nExample: /flashbounty 60 3 100");
      return;
    }
    if (isNaN(multiplier) || multiplier < 1 || multiplier > 10) {
      await ctx.reply("Multiplier must be between 1 and 10.");
      return;
    }

    const result = await startFlashBounty(
      bot,
      chatId.toString(),
      userId.toString(),
      durationMinutes,
      multiplier,
      isNaN(bonusPoints) ? 0 : bonusPoints
    );

    if (!result.startsWith("Flash Bounty started")) {
      await ctx.reply(result);
    }
  });
}
