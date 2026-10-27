import "dotenv/config";
import { Bot, webhookCallback } from "grammy";
import express from "express";
import { prisma } from "./db.js";
import { registerCommands } from "./commands/index.js";
import { registerHandlers } from "./handlers/index.js";
import { setupBotCommands } from "./setup.js";

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("BOT_TOKEN is required. Set it in your environment.");
  process.exit(1);
}

const WEBHOOK_URL = process.env.WEBHOOK_URL;
const WEBHOOK_SECRET = process.env.BOT_WEBHOOK_SECRET;
const PORT = parseInt(process.env.BOT_PORT ?? "3001");

export const bot = new Bot(BOT_TOKEN);

// Register all commands and handlers
registerCommands(bot);
registerHandlers(bot);

// Global error handler
bot.catch((err) => {
  console.error("Bot error:", err.error);
});

async function main() {
  await setupBotCommands(bot);

  if (WEBHOOK_URL) {
    // Webhook mode (production)
    const app = express();
    app.use(express.json());

    // Health check
    app.get("/health", (_req, res) => {
      res.json({ status: "ok", bot: bot.botInfo?.username ?? "unknown" });
    });

    const handleUpdate = webhookCallback(bot, "express", {
      secretToken: WEBHOOK_SECRET,
    });

    app.post(`/webhook/${WEBHOOK_SECRET ?? "webhook"}`, handleUpdate);

    app.listen(PORT, () => {
      console.log(`Bot webhook server listening on port ${PORT}`);
    });

    // Set webhook
    const webhookPath = `/webhook/${WEBHOOK_SECRET ?? "webhook"}`;
    await bot.api.setWebhook(`${WEBHOOK_URL}${webhookPath}`, {
      secret_token: WEBHOOK_SECRET,
    });
    console.log(`Webhook set to ${WEBHOOK_URL}${webhookPath}`);
  } else {
    // Polling mode (development)
    console.log("Starting bot in polling mode...");

    // Delete any existing webhook
    await bot.api.deleteWebhook();

    bot.start({
      onStart: (info) => {
        console.log(`Bot @${info.username} started (polling)`);
      },
    });
  }

  // Graceful shutdown
  const shutdown = async () => {
    console.log("Shutting down...");
    await prisma.$disconnect();
    if (!WEBHOOK_URL) {
      await bot.stop();
    }
    process.exit(0);
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
