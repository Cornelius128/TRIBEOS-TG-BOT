import type { Context, NextFunction } from "grammy";

export async function requireGroupAdmin(ctx: Context, next: NextFunction) {
  if (!ctx.chat || ctx.chat.type === "private") {
    return next();
  }

  if (!ctx.from) return;

  try {
    const member = await ctx.getChatMember(ctx.from.id);
    if (["administrator", "creator"].includes(member.status)) {
      return next();
    }
  } catch {
    // Cannot check — deny silently
  }

  // Not a group admin: delete their command and optionally DM them
  await ctx.deleteMessage().catch(() => {});
  try {
    await ctx.api.sendMessage(
      ctx.from.id,
      "⛔ That command is restricted to group admins."
    );
  } catch {
    // User hasn't started the bot yet — ignore
  }
}
