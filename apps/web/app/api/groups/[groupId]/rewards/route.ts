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

  const pools = await prisma.rewardPool.findMany({
    where: { campaign: { groupId } },
    include: {
      campaign: { select: { id: true, name: true, status: true } },
      allocations: {
        orderBy: { rank: "asc" },
        include: { pool: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(pools);
}

const CreatePoolSchema = z.object({
  campaignId: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  rewardType: z.enum(["POINTS", "CRYPTO", "TOKEN", "WHITELIST", "CUSTOM"]).default("POINTS"),
  totalAmount: z.number().optional(),
  currency: z.string().optional(),
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
  const parsed = CreatePoolSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const campaign = await prisma.campaign.findFirst({ where: { id: parsed.data.campaignId, groupId } });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const pool = await prisma.rewardPool.create({
    data: {
      campaignId: parsed.data.campaignId,
      name: parsed.data.name,
      description: parsed.data.description,
      rewardType: parsed.data.rewardType,
      totalAmount: parsed.data.totalAmount,
      currency: parsed.data.currency,
    },
  });

  return NextResponse.json(pool, { status: 201 });
}
