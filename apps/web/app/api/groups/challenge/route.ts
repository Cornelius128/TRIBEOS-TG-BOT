import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateChallenge } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;

  // Expire any existing unused challenges for this user
  await prisma.groupLinkChallenge.updateMany({
    where: { userId, usedAt: null, expiresAt: { gt: new Date() } },
    data: { expiresAt: new Date() }, // expire them now
  });

  const code = generateChallenge();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

  const challenge = await prisma.groupLinkChallenge.create({
    data: { code, userId, expiresAt },
  });

  const botUsername =
    process.env.NEXT_PUBLIC_BOT_USERNAME ||
    process.env.BOT_USERNAME ||
    "tribeosbot";

  const command = `/verify_${challenge.code}@${botUsername}`;

  return NextResponse.json({
    code: challenge.code,
    expiresAt: challenge.expiresAt,
    botUsername,
    command,
    instruction: `Send this command in your Telegram group:\n${command}\n\nThe bot must be an admin of the group.`,
    botLink: `https://t.me/${botUsername}?startgroup=verify_${challenge.code}&admin=post_messages+invite_users+delete_messages`,
  });
}
