import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { verifyTelegramWebAppData } from "./telegram-auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  // Railway terminates TLS at its edge and forwards the original Host header.
  trustHost: true,
  pages: {
    signIn: "/auth/telegram",
    error: "/auth/telegram",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  providers: [
    // Primary: Telegram Web App authentication (no forms, uses initData hash)
    Credentials({
      id: "telegram-webapp",
      credentials: { initData: { type: "text" } },
      async authorize(credentials) {
        const initData = credentials?.initData as string | undefined;
        if (!initData) return null;

        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) return null;

        const data = verifyTelegramWebAppData(initData, botToken);
        if (!data?.user) return null;

        const telegramUser = data.user;
        const telegramId = String(telegramUser.id);
        const name = [telegramUser.first_name, telegramUser.last_name]
          .filter(Boolean)
          .join(" ");

        // Find existing user by Telegram ID
        let user = await prisma.user.findUnique({ where: { telegramId } });

        if (!user) {
          // Check if there's already a user linked via GroupAdmin (migrating existing admins)
          const admin = await prisma.groupAdmin.findFirst({
            where: { telegramUserId: telegramId },
            include: { user: true },
          });

          if (admin?.user && !admin.user.telegramId) {
            // Link Telegram ID to the existing web account
            user = await prisma.user.update({
              where: { id: admin.user.id },
              data: { telegramId, name: admin.user.name ?? name },
            });
          } else {
            // Create a new account
            const email = `tg_${telegramId}@tg.tribeos.internal`;
            const existing = await prisma.user.findUnique({ where: { email } });
            if (existing) {
              user = await prisma.user.update({
                where: { id: existing.id },
                data: { telegramId },
              });
            } else {
              user = await prisma.user.create({
                data: { telegramId, email, name },
              });
            }
          }
        } else if (telegramUser.first_name && !user.name) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { name },
          });
        }

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
});
