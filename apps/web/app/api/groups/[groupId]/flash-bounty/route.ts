import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateFlashBountySchema = z.object({
  durationMinutes: z.number().int().min(5).max(1440),
  multiplier: z.number().min(1).max(10),
  bonusPoints: z.number().int().min(0).default(0),
  campaignId: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;
  const userId = session.user.id as string;

  const admin = await prisma.groupAdmin.findUnique({
    where: { groupId_userId: { groupId, userId } },
    include: { group: true },
  });
  if (!admin || admin.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.flashBounty.findFirst({
    where: { groupId, status: "ACTIVE" },
  });
  if (existing) {
    return NextResponse.json({ error: "A Flash Bounty is already active" }, { status: 409 });
  }

  const body = await req.json();
  const parsed = CreateFlashBountySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { durationMinutes, multiplier, bonusPoints, campaignId } = parsed.data;
  const now = new Date();
  const endAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

  const bounty = await prisma.flashBounty.create({
    data: {
      groupId,
      campaignId: campaignId ?? null,
      startedBy: userId,
      durationMinutes,
      multiplier,
      bonusPoints,
      startAt: now,
      endAt,
      status: "ACTIVE",
    },
  });

  await prisma.auditLog.create({
    data: {
      groupId,
      userId,
      eventType: "FLASH_BOUNTY_STARTED",
      description: `Flash Bounty started: ${durationMinutes}min × ${multiplier}x`,
      metadata: { bountyId: bounty.id, durationMinutes, multiplier },
    },
  });

  return NextResponse.json(bounty, { status: 201 });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;
  const userId = session.user.id as string;

  const admin = await prisma.groupAdmin.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const bounties = await prisma.flashBounty.findMany({
    where: { groupId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(bounties);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { groupId } = await params;
  const userId = session.user.id as string;

  const admin = await prisma.groupAdmin.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!admin || admin.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { bountyId } = await req.json();

  const bounty = await prisma.flashBounty.findFirst({
    where: { id: bountyId, groupId, status: "ACTIVE" },
  });
  if (!bounty) return NextResponse.json({ error: "Active bounty not found" }, { status: 404 });

  await prisma.flashBounty.update({
    where: { id: bountyId },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json({ ok: true });
}
