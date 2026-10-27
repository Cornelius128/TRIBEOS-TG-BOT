import type { Context } from "grammy";
import { prisma } from "../db.js";

export async function handleVerifyChallenge(ctx: Context) {
  // Only in groups
  if (ctx.chat?.type === "private") return;

  const from = ctx.from;
  if (!from) return;

  const match = ctx.match as RegExpMatchArray | null;
  const code = match?.[1];
  if (!code) return;

  const chatId = String(ctx.chat?.id);

  // Find the challenge
  const challenge = await prisma.groupLinkChallenge.findUnique({
    where: { code },
  });

  if (!challenge) {
    await ctx.reply("❌ Invalid verification code.");
    return;
  }

  if (challenge.usedAt) {
    await ctx.reply("This verification code has already been used.");
    return;
  }

  if (challenge.expiresAt < new Date()) {
    await ctx.reply("❌ This verification code has expired. Please generate a new one from the dashboard.");
    return;
  }

  // Verify the sender is actually an admin
  const chatMember = await ctx.api.getChatMember(ctx.chat!.id, from.id);
  const isAdmin = ["administrator", "creator"].includes(chatMember.status);

  if (!isAdmin) {
    await ctx.reply("❌ You must be an administrator of this group to link it.");
    return;
  }

  // Get or create the TelegramGroup record
  const chat = ctx.chat!;
  const chatInfo = await ctx.api.getChat(chat.id);
  const memberCount = "members_count" in chatInfo ? (chatInfo.members_count as number) : null;

  const group = await prisma.telegramGroup.upsert({
    where: { telegramId: chatId },
    update: {
      title: chat.title ?? "Unknown Group",
      username: "username" in chat ? (chat.username ?? null) : null,
      botIsAdmin: true,
      memberCount: memberCount ?? undefined,
    },
    create: {
      telegramId: chatId,
      title: chat.title ?? "Unknown Group",
      username: "username" in chat ? (chat.username ?? null) : null,
      type: chat.type,
      botIsAdmin: true,
      memberCount: memberCount ?? undefined,
    },
  });

  // Mark challenge as used and associate with group
  await prisma.groupLinkChallenge.update({
    where: { code },
    data: {
      usedAt: new Date(),
      groupId: group.id,
    },
  });

  // Create admin record for the user who ran the challenge
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

  // Audit log
  await prisma.auditLog.create({
    data: {
      groupId: group.id,
      userId: challenge.userId,
      eventType: "GROUP_LINKED",
      description: `Group "${group.title}" linked via challenge verification`,
      metadata: { telegramGroupId: chatId, verifiedBy: from.id },
    },
  });

  await ctx.reply(
    `✅ **${group.title}** has been successfully linked to TribeOS!\n\n` +
    `You can now configure modules and campaigns from the dashboard.`,
    { parse_mode: "Markdown" }
  );
}
