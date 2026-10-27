import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const UpdateSchema = z.object({
  status: z.enum(["PENDING", "ELIGIBLE", "CLAIMED", "PAID", "REJECTED"]),
  notes: z.string().optional(),
  paymentRef: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string; allocationId: string }> }
) {
  const { groupId, allocationId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await prisma.groupAdmin.findUnique({
    where: { groupId_userId: { groupId, userId: session.user.id as string } },
  });
  if (!admin || admin.role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const allocation = await prisma.rewardAllocation.findFirst({
    where: { id: allocationId, pool: { campaign: { groupId } } },
  });
  if (!allocation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.rewardAllocation.update({
    where: { id: allocationId },
    data: {
      status: parsed.data.status,
      notes: parsed.data.notes,
      paymentRef: parsed.data.paymentRef,
      ...(parsed.data.status === "CLAIMED" && !allocation.claimedAt ? { claimedAt: new Date() } : {}),
      ...(parsed.data.status === "PAID" && !allocation.paidAt ? { paidAt: new Date() } : {}),
    },
  });

  return NextResponse.json(updated);
}
