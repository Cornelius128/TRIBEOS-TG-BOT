import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = clientIp(req.headers);

  if (ip === "unknown" || ip === "::1" || ip === "127.0.0.1") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { lastLoginIp: ip },
  });

  return NextResponse.json({ ok: true });
}
