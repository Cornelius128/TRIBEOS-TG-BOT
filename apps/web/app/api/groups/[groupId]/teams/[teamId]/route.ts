import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getAdmin(groupId: string, userId: string) {
  return prisma.groupAdmin.findUnique({ where: { groupId_userId: { groupId, userId } } });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ groupId: string; teamId: string }> }
) {
  const { groupId, teamId } = await params;
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await getAdmin(groupId, session.user.id as string);
  if (!admin || admin.role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const team = await prisma.team.findFirst({ where: { id: teamId, campaign: { groupId } } });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.team.delete({ where: { id: teamId } });
  return new NextResponse(null, { status: 204 });
}
