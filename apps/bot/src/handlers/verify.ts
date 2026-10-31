import type { Context, Api } from "grammy";
import { prisma } from "../db.js";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function verifyGroupWithCode(
  chat: { id: number; title?: string; type: string; username?: string | null },
  from: { id: number; first_name?: string; username?: string },
  code: string,
  api: Api
): Promise<{ success: boolean; message?: string }> {
  const chatId = String(chat.id);

  // Find the challenge
  const challenge = await prisma.groupLinkChallenge.findUnique({
    where: { code },
  });

  if (!challenge) {
    return { success: false, message: "❌ Invalid verification code. Please generate a new one from the dashboard." };
  }

  if (challenge.usedAt) {
    return { success: false, message: "⚠️ This verification code has already been used." };
  }

  if (challenge.expiresAt < new Date()) {
    return { success: false, message: "❌ This verification code has expired. Please generate a new one from the dashboard." };
  }

  // Verify the sender is an administrator or group creator
  try {
    const senderMember = await api.getChatMember(chat.id, from.id);
    const isSenderAdmin = ["administrator", "creator"].includes(senderMember.status);
    if (!isSenderAdmin) {
      return { success: false, message: "❌ You must be an administrator or owner of this group to link it." };
    }
  } catch (err) {
    console.warn("Could not verify sender admin status:", err);
    return {
      success: false,
      message: "⚠️ Could not verify administrator permissions. Please ensure the bot is added as an administrator.",
    };
  }

  // Get member count
  let memberCount: number | null = null;
  try {
    memberCount = await api.getChatMemberCount(chat.id);
  } catch {
    // Ignore if not available
  }

  // Upsert the TelegramGroup record
  const group = await prisma.telegramGroup.upsert({
    where: { telegramId: chatId },
    update: {
      title: chat.title ?? "Unknown Group",
      username: chat.username ?? null,
      botIsAdmin: true,
      memberCount: memberCount ?? undefined,
    },
    create: {
      telegramId: chatId,
      title: chat.title ?? "Unknown Group",
      username: chat.username ?? null,
      type: chat.type,
      botIsAdmin: true,
      memberCount: memberCount ?? undefined,
    },
  });

  // Mark challenge as used and link group
  await prisma.groupLinkChallenge.update({
    where: { code },
    data: {
      usedAt: new Date(),
      groupId: group.id,
    },
  });

  // Create or update admin record for dashboard user
  await prisma.groupAdmin.upsert({
    where: { groupId_userId: { groupId: group.id, userId: challenge.userId } },
    update: { role: "OWNER", telegramUserId: String(from.id) },
    create: {
      groupId: group.id,
      userId: challenge.userId,
      role: "OWNER",
      telegramUserId: String(from.id),
    },
  });

  // Update user's telegramId if not set
  await prisma.user.updateMany({
    where: { id: challenge.userId, telegramId: null },
    data: { telegramId: String(from.id) },
  }).catch(() => {});

  // Audit log
  await prisma.auditLog.create({
    data: {
      groupId: group.id,
      userId: challenge.userId,
      eventType: "GROUP_LINKED",
      description: `Group "${group.title}" linked via challenge verification`,
      metadata: { telegramGroupId: chatId, verifiedBy: from.id },
    },
  }).catch(() => {});

  const safeTitle = escapeHtml(group.title);
  return {
    success: true,
    message:
      `✅ <b>${safeTitle}</b> has been successfully linked to TribeOS!\n\n` +
      `You can now configure modules, campaigns, and invite tracking from your dashboard.`,
  };
}

export async function handleVerifyChallenge(ctx: Context) {
  // Only in groups
  if (ctx.chat?.type === "private") return;

  const from = ctx.from;
  const chat = ctx.chat;
  if (!from || !chat) return;

  const match = ctx.match as RegExpMatchArray | null;
  const code = match?.[1];
  if (!code) return;

  try {
    const result = await verifyGroupWithCode(
      {
        id: chat.id,
        title: chat.title,
        type: chat.type,
        username: "username" in chat ? (chat.username ?? null) : null,
      },
      from,
      code,
      ctx.api
    );

    if (result.message) {
      await ctx.reply(result.message, { parse_mode: "HTML" });
    }
  } catch (err) {
    console.error("Error in handleVerifyChallenge:", err);
    await ctx.reply(
      "❌ An unexpected error occurred while verifying the group. Please check that the bot has administrator rights and try again."
    );
  }
}
