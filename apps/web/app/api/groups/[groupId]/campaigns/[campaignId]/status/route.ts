import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SCHEDULED", "ACTIVE", "CANCELLED"],
  SCHEDULED: ["ACTIVE", "CANCELLED", "DRAFT"],
  ACTIVE: ["PAUSED", "UNDER_REVIEW", "CANCELLED"],
  PAUSED: ["ACTIVE", "UNDER_REVIEW", "CANCELLED"],
  UNDER_REVIEW: ["ACTIVE", "COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

const UpdateStatusSchema = z.object({
  status: z.enum(["DRAFT", "SCHEDULED", "ACTIVE", "PAUSED", "UNDER_REVIEW", "COMPLETED", "CANCELLED"]),
  reason: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string; campaignId: string }> }
) {
  const { groupId, campaignId } = await params;
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

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, groupId },
  });

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = UpdateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { status: newStatus, reason } = parsed.data;
  const allowed = VALID_TRANSITIONS[campaign.status] ?? [];

  if (!allowed.includes(newStatus)) {
    return NextResponse.json(
      { error: `Cannot transition from ${campaign.status} to ${newStatus}` },
      { status: 422 }
    );
  }

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      status: newStatus as any,
      ...(newStatus === "COMPLETED" && { finalizedAt: new Date() }),
    },
  });

  await prisma.auditLog.create({
    data: {
      groupId,
      campaignId,
      userId,
      eventType: "CAMPAIGN_STATUS_CHANGED",
      description: `Campaign status changed from ${campaign.status} to ${newStatus}${reason ? `: ${reason}` : ""}`,
      metadata: { from: campaign.status, to: newStatus, reason },
    },
  });

  return NextResponse.json(updated);
}
