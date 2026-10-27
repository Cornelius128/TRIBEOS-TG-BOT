import { connection, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Without this, Cache Components would prerender the handler and run the query at build time.
  await connection();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ status: "db_unreachable" }, { status: 503 });
  }
}
