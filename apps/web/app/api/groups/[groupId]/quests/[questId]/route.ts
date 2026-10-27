import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

async function getAdmin(groupId: string, userId: string) {
  return prisma.groupAdmin.findUnique({ where: { groupId_userId: { groupId, userId } } });
}

const PatchSchema = z.object({
  isActive: z.boolean().optional(),
  title: z.string().min(1).max(120).optional(),
  description: z.string().max(1000).optional(),
  points: z.number().int().min(0).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ groupId: string; questId: string }> }
) {
  const { groupId, questId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await getAdmin(groupId, session.user.id as string);
  if (!admin || admin.role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const quest = await prisma.quest.findFirst({ where: { id: questId, groupId } });
  if (!quest) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const updated = await prisma.quest.update({ where: { id: questId }, data: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string; questId: string }> }
) {
  const { groupId, questId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await getAdmin(groupId, session.user.id as string);
  if (!admin || admin.role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const quest = await prisma.quest.findFirst({ where: { id: questId, groupId } });
  if (!quest) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.quest.delete({ where: { id: questId } });
  return new NextResponse(null, { status: 204 });
}
