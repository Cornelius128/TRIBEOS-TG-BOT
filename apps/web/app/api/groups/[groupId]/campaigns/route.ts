import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const CreateCampaignSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(2000).optional(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  timezone: z.string().default("UTC"),
  maxParticipants: z.number().int().positive().optional(),
  pointsPerReferral: z.number().int().nonnegative().default(1),
  qualificationRules: z
    .object({
      requireBotStart: z.boolean().default(true),
      requireGroupJoin: z.boolean().default(true),
      minMembershipDays: z.number().int().nonnegative().default(0),
    })
    .default({ requireBotStart: true, requireGroupJoin: true, minMembershipDays: 0 }),
  rules: z.string().max(5000).optional(),
  contestReviewPeriodHours: z.number().int().positive().default(48),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;

  const admin = await prisma.groupAdmin.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });

  if (!admin || admin.role === "VIEWER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = CreateCampaignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  if (data.endAt <= data.startAt) {
    return NextResponse.json(
      { error: "End date must be after start date." },
      { status: 400 }
    );
  }

  const campaign = await prisma.campaign.create({
    data: {
      groupId,
      name: data.name,
      description: data.description,
      startAt: data.startAt,
      endAt: data.endAt,
      timezone: data.timezone,
      maxParticipants: data.maxParticipants,
      pointsPerReferral: data.pointsPerReferral,
      qualificationRules: data.qualificationRules,
      rules: data.rules,
      contestReviewPeriodHours: data.contestReviewPeriodHours,
      status: "DRAFT",
      createdBy: userId,
    },
  });

  await prisma.auditLog.create({
    data: {
      groupId,
      campaignId: campaign.id,
      userId,
      eventType: "CAMPAIGN_CREATED",
      description: `Campaign "${campaign.name}" created`,
      metadata: { campaignId: campaign.id },
    },
  });

  return NextResponse.json(campaign, { status: 201 });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  const { groupId } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const admin = await prisma.groupAdmin.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });

  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const campaigns = await prisma.campaign.findMany({
    where: { groupId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { participants: true, referrals: true } },
    },
  });

  return NextResponse.json(campaigns);
}
