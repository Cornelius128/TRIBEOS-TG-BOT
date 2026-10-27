import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Called by a cron job every minute (e.g. Vercel Cron, Railway cron, or external scheduler).
// Marks expired flash bounties and campaigns with the correct terminal status.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  const expected = process.env.CRON_SECRET;
  if (expected && secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const [expiredBounties, expiredCampaigns] = await Promise.all([
    prisma.flashBounty.updateMany({
      where: { status: "ACTIVE", endAt: { lte: now } },
      data: { status: "ENDED" },
    }),
    prisma.campaign.updateMany({
      where: { status: "ACTIVE", endAt: { lte: now } },
      data: { status: "UNDER_REVIEW" },
    }),
  ]);

  return NextResponse.json({
    expiredBounties: expiredBounties.count,
    expiredCampaigns: expiredCampaigns.count,
  });
}
