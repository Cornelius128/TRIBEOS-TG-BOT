import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function getAdmin(groupId: string, userId: string) {
  return prisma.groupAdmin.findUnique({ where: { groupId_userId: { groupId, userId } } });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await getAdmin(groupId, session.user.id as string);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const quests = await prisma.quest.findMany({
    where: { groupId },
    include: {
      campaign: { select: { id: true, name: true } },
      badge: true,
      _count: { select: { completions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(quests);
}

const CreateSchema = z.object({
  title: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  type: z.enum(["MANUAL", "REFERRAL_COUNT", "POINTS_MILESTONE", "STREAK"]).default("MANUAL"),
  target: z.number().int().min(1).default(1),
  points: z.number().int().min(0).default(10),
  campaignId: z.string().optional(),
  badgeId: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await getAdmin(groupId, session.user.id as string);
  if (!admin || admin.role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });

  const quest = await prisma.quest.create({
    data: {
      groupId,
      title: parsed.data.title,
      description: parsed.data.description,
      type: parsed.data.type,
      target: parsed.data.target,
      points: parsed.data.points,
      campaignId: parsed.data.campaignId || null,
      badgeId: parsed.data.badgeId || null,
    },
    include: {
      campaign: { select: { id: true, name: true } },
      badge: true,
    },
  });

  return NextResponse.json(quest, { status: 201 });
}
