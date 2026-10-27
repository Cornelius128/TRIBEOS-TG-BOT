import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function getAdmin(groupId: string, userId: string) {
  return prisma.groupAdmin.findUnique({ where: { groupId_userId: { groupId, userId } } });
}

const UpdateSchema = z.object({
  status: z.enum(["DRAFT", "SCHEDULED", "CANCELLED"]).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string; announcementId: string }> }
) {
  const { groupId, announcementId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await getAdmin(groupId, session.user.id as string);
  if (!admin || admin.role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const announcement = await prisma.announcement.findFirst({ where: { id: announcementId, groupId } });
  if (!announcement) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (announcement.status === "SENT") return NextResponse.json({ error: "Already sent" }, { status: 409 });

  const body = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const updated = await prisma.announcement.update({
    where: { id: announcementId },
    data: {
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.scheduledAt !== undefined ? { scheduledAt: parsed.data.scheduledAt ? new Date(parsed.data.scheduledAt) : null } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string; announcementId: string }> }
) {
  const { groupId, announcementId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await getAdmin(groupId, session.user.id as string);
  if (!admin || admin.role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const announcement = await prisma.announcement.findFirst({ where: { id: announcementId, groupId } });
  if (!announcement) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (announcement.status === "SENT") return NextResponse.json({ error: "Cannot delete sent announcement" }, { status: 409 });

  await prisma.announcement.delete({ where: { id: announcementId } });
  return new NextResponse(null, { status: 204 });
}
