import type { Context } from "grammy";
import { prisma } from "../db.js";

export async function handleWelcome(ctx: Context) {
  const update = ctx.chatMember;
  if (!update) return;

  const chatId = String(ctx.chat?.id);
  const newStatus = update.new_chat_member.status;
  const oldStatus = update.old_chat_member.status;

  // Only for new members
  const justJoined = ["member", "administrator"].includes(newStatus) &&
    ["left", "kicked"].includes(oldStatus);
  if (!justJoined) return;

  const user = update.new_chat_member.user;
  if (user.is_bot) return;

  // Check if welcome module is enabled
  const group = await prisma.telegramGroup.findUnique({ where: { telegramId: chatId } });
  if (!group) return;

  const welcomeConfig = await prisma.groupModuleConfig.findUnique({
    where: { groupId_moduleId: { groupId: group.id, moduleId: "welcome" } },
  });

  if (!welcomeConfig?.enabled) return;

  const config = welcomeConfig.config as {
    welcomeMessage?: string;
    rulesMessage?: string;
    showInstructions?: boolean;
  };

  const name = user.first_name;
  let message = config.welcomeMessage ?? `Welcome to the community, ${name}! 🎉`;

  // Replace placeholder
  message = message.replace("{name}", name);

  if (config.showInstructions !== false) {
    message += "\n\nUse /help to see available commands.";
  }

  try {
    await ctx.reply(message);
  } catch {
    // Bot may not have permission to send messages
  }
}
