// TribeOS Telegram Bot service entry point
import "dotenv/config";
import crypto from "crypto";
import { captureError, flushErrors } from "./monitoring.js";
import { Bot, webhookCallback, type Context } from "grammy";
import { limit } from "@grammyjs/ratelimiter";
import express from "express";
import { prisma } from "./db.js";
import { registerCommands } from "./commands/index.js";
import { registerHandlers } from "./handlers/index.js";
import { setupBotCommands } from "./setup.js";
import { startExpirySweeper } from "./services/expiry.js";

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("BOT_TOKEN is required. Set it in your environment.");
  process.exit(1);
}

// On Railway the service's generated domain is injected as RAILWAY_PUBLIC_DOMAIN.
const WEBHOOK_URL =
  process.env.WEBHOOK_URL ??
  (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : undefined);
const WEBHOOK_SECRET =
  process.env.BOT_WEBHOOK_SECRET || crypto.randomBytes(32).toString("hex");
const PORT = parseInt(process.env.PORT ?? process.env.BOT_PORT ?? "3001");

if (WEBHOOK_URL && !process.env.BOT_WEBHOOK_SECRET) {
  console.warn(
    "⚠️ BOT_WEBHOOK_SECRET is not set; auto-generated a secure session secret. Set BOT_WEBHOOK_SECRET in Railway variables to keep it persistent across restarts."
  );
}

export const bot = new Bot(BOT_TOKEN);

// Per-user flood protection for DMs and button taps. Group messages are left alone so
// the admin-only guard still deletes every unauthorized command.
bot.filter(
  (ctx) => ctx.chat?.type === "private" || !!ctx.callbackQuery,
  limit<Context, never>({
    timeFrame: 3000,
    limit: 5,
    keyGenerator: (ctx) => ctx.from?.id.toString(),
    onLimitExceeded: async (ctx) => {
      if (ctx.callbackQuery) {
        await ctx.answerCallbackQuery({ text: "Slow down a little 🙂" }).catch(() => {});
      }
    },
  })
);

registerCommands(bot);
registerHandlers(bot);

bot.catch((err) => {
  captureError(err.error, { updateId: err.ctx.update.update_id });
});

async function main() {
  await setupBotCommands(bot);
  const sweeper = startExpirySweeper(bot);

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
    clearInterval(sweeper);
    await prisma.$disconnect();
    await flushErrors();
    if (!WEBHOOK_URL) {
      await bot.stop();
    }
    process.exit(0);
  };

  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

main().catch(async (err) => {
  captureError(err, { fatal: true });
  await flushErrors();
  process.exit(1);
});
