import { Bot } from "grammy";
import { claimPoach } from "../services/poaching.js";

export function registerPoachCommand(bot: Bot): void {
  // Handles /poach_SHORTID
  bot.hears(/^\/poach_([a-zA-Z0-9]+)$/, async (ctx) => {
    const shortId = ctx.match[1];
    const userId = ctx.from?.id.toString();
    if (!userId || !ctx.chat) return;

    if (ctx.chat.type === "private") {
      await ctx.reply("Poaching must happen in the group.");
      return;
    }

    // Find the full event ID by short suffix
    const event = await import("../db.js").then(({ prisma }) =>
      prisma.poachEvent.findFirst({
        where: { id: { endsWith: shortId } },
      })
    );

    if (!event) {
      await ctx.reply("Poach event not found.");
      return;
    }

    const result = await claimPoach(bot, ctx.chat.id.toString(), event.id, userId);
    await ctx.reply(result);
  });
}
