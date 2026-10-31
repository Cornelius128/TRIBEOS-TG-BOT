import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { verifyTelegramWebAppData, verifyTelegramWidgetData } from "./telegram-auth";

async function getOrCreateTelegramUser(
  telegramId: string,
  rawName: string,
  image?: string | null
) {
  const name = rawName.trim() || `Telegram User ${telegramId}`;

  // Find existing user by Telegram ID
  let user = await prisma.user.findUnique({ where: { telegramId } });

  if (!user) {
    // Check if there's already a user linked via GroupAdmin
    const admin = await prisma.groupAdmin.findFirst({
      where: { telegramUserId: telegramId },
      include: { user: true },
    });

    if (admin?.user && !admin.user.telegramId) {
      user = await prisma.user.update({
        where: { id: admin.user.id },
        data: { telegramId, name: admin.user.name ?? name, image: image ?? admin.user.image },
      });
    } else {
      const email = `tg_${telegramId}@tg.tribeos.internal`;
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        user = await prisma.user.update({
          where: { id: existing.id },
          data: { telegramId, name: existing.name ?? name, image: image ?? existing.image },
        });
      } else {
        user = await prisma.user.create({
          data: { telegramId, email, name, image: image ?? null },
        });
      }
    }
  } else if (!user.name && name) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { name, image: image ?? user.image },
    });
  }

  return user;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  // Railway terminates TLS at its edge and forwards the original Host header.
  trustHost: true,
  secret:
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "tribeos_auth_production_secret_32chars_long_key",
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
    // Primary: Telegram Web App authentication (inside Telegram Mini App)
    Credentials({
      id: "telegram-webapp",
      name: "Telegram Mini App",
      credentials: { initData: { type: "text" } },
      async authorize(credentials) {
        const initData = credentials?.initData as string | undefined;
        if (!initData) return null;

        const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
        if (!botToken) {
          console.error("⚠️ Neither TELEGRAM_BOT_TOKEN nor BOT_TOKEN is set in web environment variables!");
          return null;
        }

        const data = verifyTelegramWebAppData(initData, botToken);
        if (!data?.user) return null;

        const telegramUser = data.user;
        const telegramId = String(telegramUser.id);
        const name = [telegramUser.first_name, telegramUser.last_name]
          .filter(Boolean)
          .join(" ") || telegramUser.username || `User ${telegramId}`;

        const user = await getOrCreateTelegramUser(telegramId, name);
        return { id: user.id, email: user.email, name: user.name };
      },
    }),

    // Secondary: Telegram Login Widget (standard desktop / mobile browser login)
    Credentials({
      id: "telegram-widget",
      name: "Telegram Login Widget",
      credentials: {
        id: { type: "text" },
        first_name: { type: "text" },
        last_name: { type: "text" },
        username: { type: "text" },
        photo_url: { type: "text" },
        auth_date: { type: "text" },
        hash: { type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.id || !credentials?.hash) return null;

        const botToken = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;
        if (!botToken) {
          console.error("⚠️ Neither TELEGRAM_BOT_TOKEN nor BOT_TOKEN is set in web environment variables!");
          return null;
        }

        const isValid = verifyTelegramWidgetData(
          credentials as Record<string, string>,
          botToken
        );
        if (!isValid) return null;

        const telegramId = String(credentials.id);
        const name = [credentials.first_name, credentials.last_name]
          .filter(Boolean)
          .join(" ") || (credentials.username as string) || `User ${telegramId}`;
        const photoUrl = credentials.photo_url as string | undefined;

        const user = await getOrCreateTelegramUser(telegramId, name, photoUrl);
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
});
