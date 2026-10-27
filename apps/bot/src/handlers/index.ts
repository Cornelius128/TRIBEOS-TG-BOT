import type { Bot } from "grammy";
import { handleChatMemberUpdate } from "./chat-member.js";
import { handleVerifyChallenge } from "./verify.js";
import { handleWelcome } from "./welcome.js";
import { registerJoinRequestHandler } from "./join-request.js";
import { registerCallbackHandler } from "./callbacks.js";
import { prisma } from "../db.js";
import { updateMemberActivity } from "../services/poaching.js";
import { getActiveCampaignForGroup } from "../services/referral.js";

export function registerHandlers(bot: Bot) {
  // Track chat member updates (joins/leaves)
  bot.on("chat_member", (ctx) => handleChatMemberUpdate(ctx, bot));
  bot.on("my_chat_member", (ctx) => handleChatMemberUpdate(ctx, bot));

  // Handle verify challenge command in groups
  bot.hears(/^\/verify_([A-Za-z0-9_-]+)/, handleVerifyChallenge);

  // Welcome new members (if welcome module enabled)
  bot.on("chat_member", handleWelcome);

  // Join request handler (for createChatInviteLink with creates_join_request=true)
  registerJoinRequestHandler(bot);

  // Inline keyboard callback handler
  registerCallbackHandler(bot);

  // Track message activity for poaching mechanic
  bot.on("message", async (ctx) => {
    if (!ctx.chat || ctx.chat.type === "private") return;
    const chatId = ctx.chat.id.toString();
    const userId = ctx.from?.id.toString();
    if (!userId) return;

    const group = await prisma.telegramGroup.findUnique({ where: { telegramId: chatId } });
    if (!group) return;

    const campaign = await getActiveCampaignForGroup(group.id);
    if (!campaign) return;

    await updateMemberActivity(campaign.id, userId).catch(() => {});
  });
}
