import type { Bot } from "grammy";
import { BOT_COMMANDS, DASHBOARD_URL } from "./constants.js";

export async function setupBotCommands(bot: Bot) {
  await bot.api.setMyCommands(BOT_COMMANDS);

  // Set the menu button shown in the bottom-left of DM chats.
  // HTTPS → "Open App" button that launches the Mini App.
  // HTTP (dev) → standard commands menu.
  const isHttps = DASHBOARD_URL.startsWith("https://");
  try {
    if (isHttps) {
      await bot.api.setChatMenuButton({
        menu_button: {
          type: "web_app",
          text: "Open App",
          web_app: { url: `${DASHBOARD_URL}/auth/telegram` },
        },
      });
    } else {
      await bot.api.setChatMenuButton({
        menu_button: { type: "commands" },
      });
    }
  } catch (err) {
    console.warn("setChatMenuButton failed (non-fatal):", err);
  }

  console.log("Bot commands and menu button registered.");
}
