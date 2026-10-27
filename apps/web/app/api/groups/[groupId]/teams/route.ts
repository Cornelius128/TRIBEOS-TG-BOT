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

  const teams = await prisma.team.findMany({
    where: { campaign: { groupId } },
    include: {
      campaign: { select: { id: true, name: true, status: true } },
      memberships: {
        include: {
          participant: { select: { telegramName: true, telegramUsername: true, totalPoints: true } },
        },
      },
    },
    orderBy: { totalPoints: "desc" },
  });

  return NextResponse.json(teams);
}

const CreateSchema = z.object({
  campaignId: z.string().min(1),
  name: z.string().min(1).max(80),
  description: z.string().max(500).optional(),
  region: z.string().max(80).optional(),
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
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const campaign = await prisma.campaign.findFirst({ where: { id: parsed.data.campaignId, groupId } });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const team = await prisma.team.create({
    data: {
      campaignId: parsed.data.campaignId,
      name: parsed.data.name,
      description: parsed.data.description,
      region: parsed.data.region,
    },
  });

  return NextResponse.json(team, { status: 201 });
}
