import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;

  const groups = await prisma.groupAdmin.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          _count: {
            select: { campaigns: true },
          },
        },
      },
    },
    orderBy: { verifiedAt: "desc" },
  });

  return NextResponse.json(groups);
}
