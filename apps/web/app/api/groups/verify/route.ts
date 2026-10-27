import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const code = req.nextUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }

  const challenge = await prisma.groupLinkChallenge.findUnique({
    where: { code },
    include: { group: true },
  });

  if (!challenge) {
    return NextResponse.json({ verified: false, message: "Challenge not found." });
  }

  if (challenge.userId !== userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (challenge.expiresAt < new Date()) {
    return NextResponse.json({ verified: false, message: "Challenge has expired. Please generate a new one." });
  }

  if (!challenge.usedAt || !challenge.groupId) {
    return NextResponse.json({
      verified: false,
      message: "Not yet verified. Send the command in your Telegram group first.",
    });
  }

  // Already verified — make sure admin record exists
  const existingAdmin = await prisma.groupAdmin.findUnique({
    where: { groupId_userId: { groupId: challenge.groupId, userId } },
  });

  if (!existingAdmin) {
    await prisma.groupAdmin.create({
      data: {
        groupId: challenge.groupId,
        userId,
        role: "OWNER",
      },
    });
  }

  return NextResponse.json({ verified: true, groupId: challenge.groupId });
}
