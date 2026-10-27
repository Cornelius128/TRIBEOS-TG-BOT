import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FlashBountyClient } from "./flash-bounty-client";

export const instant = false;

export async function generateMetadata() {
  return { title: "Flash Bounty" };
}

export default async function FlashBountyPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const session = await auth();
  const userId = session!.user!.id as string;

  const admin = await prisma.groupAdmin.findUnique({
    where: { groupId_userId: { groupId, userId } },
    include: { group: true },
  });
  if (!admin) notFound();

  const bounties = await prisma.flashBounty.findMany({
    where: { groupId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const canWrite = admin.role === "OWNER" || admin.role === "ADMIN";

  return (
    <div className="p-8 max-w-3xl">
      <Link
        href={`/dashboard/groups/${groupId}`}
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> {admin.group.title}
      </Link>

      <h1 className="text-2xl font-bold text-white mb-2">Flash Bounty</h1>
      <p className="text-zinc-400 mb-8">
        Launch time-limited referral multiplier events. The bot announces them in the group
        with a countdown.
      </p>

      <FlashBountyClient
        groupId={groupId}
        initialBounties={bounties.map((b) => ({
          ...b,
          multiplier: Number(b.multiplier),
          startAt: b.startAt.toISOString(),
          endAt: b.endAt.toISOString(),
        }))}
        canWrite={canWrite}
      />
    </div>
  );
}
