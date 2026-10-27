import { Bot } from "grammy";
import { handleJoinRequest } from "../services/invite-links.js";

export function registerJoinRequestHandler(bot: Bot): void {
  bot.on("chat_join_request", async (ctx) => {
    const request = ctx.chatJoinRequest;
    const chatId = request.chat.id;
    const user = request.from;
    const inviteLinkUrl = request.invite_link?.invite_link;

    try {
      await handleJoinRequest(
        bot,
        chatId,
        user.id,
        user.username,
        user.first_name,
        inviteLinkUrl
      );
    } catch (err) {
      console.error("Error handling join request:", err);
      // Default to approving on error to avoid blocking legitimate users
      try {
        await bot.api.approveChatJoinRequest(chatId, user.id);
      } catch {}
    }
  });
}
