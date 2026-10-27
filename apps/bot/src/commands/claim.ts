import { Bot } from "grammy";
import { claimMysteryBox } from "../services/mystery-box.js";

export function registerClaimCommand(bot: Bot): void {
  // Handles /claim_SHORTID
  bot.hears(/^\/claim_([a-zA-Z0-9]+)$/, async (ctx) => {
    const shortId = ctx.match[1];
    const userId = ctx.from?.id.toString();
    if (!userId || !ctx.chat) return;

    if (ctx.chat.type === "private") {
      await ctx.reply("Mystery crates must be claimed in the group.");
      return;
    }

    const result = await claimMysteryBox(
      bot,
      ctx.chat.id.toString(),
      shortId,
      userId
    );

    await ctx.reply(result);
  });
}
