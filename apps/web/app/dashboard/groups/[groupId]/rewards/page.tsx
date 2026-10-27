import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trophy, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RewardPoolForm } from "./reward-pool-form";
import { AllocationTable } from "./allocation-table";

export const instant = false;
export const metadata = { title: "Rewards & Claims" };

export default async function RewardsPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const session = await auth();
  const userId = session!.user!.id as string;

  const admin = await prisma.groupAdmin.findUnique({
    where: { groupId_userId: { groupId, userId } },
    include: { group: true },
  });
  if (!admin) notFound();

  const campaigns = await prisma.campaign.findMany({
    where: { groupId, status: { in: ["ACTIVE", "UNDER_REVIEW", "COMPLETED"] } },
    select: { id: true, name: true, status: true },
    orderBy: { createdAt: "desc" },
  });

  const pools = await prisma.rewardPool.findMany({
    where: { campaign: { groupId } },
    include: {
      campaign: { select: { id: true, name: true, status: true } },
      allocations: {
        orderBy: { rank: "asc" },
        take: 100,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const canWrite = admin.role === "OWNER" || admin.role === "ADMIN";

  const statusColor: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
    PENDING: "secondary",
    ELIGIBLE: "info" as "default",
    CLAIMED: "warning",
    PAID: "success",
    REJECTED: "destructive",
  };

  return (
    <div className="p-8 max-w-5xl">
      <Link
        href={`/dashboard/groups/${groupId}`}
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> {admin.group.title}
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Rewards & Claims</h1>
          <p className="text-zinc-400">Create reward pools and track participant claim status.</p>
        </div>
      </div>

      {canWrite && campaigns.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" /> New Reward Pool
            </CardTitle>
            <CardDescription>Add a prize pool to a campaign. Allocations are created per-participant.</CardDescription>
          </CardHeader>
          <CardContent>
            <RewardPoolForm groupId={groupId} campaigns={campaigns} />
          </CardContent>
        </Card>
      )}

      {pools.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <Trophy className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium mb-1">No reward pools yet</p>
          <p className="text-sm text-zinc-600">
            Create a reward pool for an active or completed campaign to start tracking claims.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {pools.map((pool) => (
            <Card key={pool.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{pool.name}</CardTitle>
                    <CardDescription>
                      {pool.campaign.name} · {pool.rewardType}
                      {pool.totalAmount && ` · ${pool.totalAmount} ${pool.currency ?? ""}`}
                    </CardDescription>
                  </div>
                  <Badge variant={pool.campaign.status === "ACTIVE" ? "success" : "secondary"}>
                    {pool.campaign.status}
                  </Badge>
                </div>
              </CardHeader>
              {pool.allocations.length > 0 && (
                <CardContent>
                  <AllocationTable
                    allocations={pool.allocations}
                    groupId={groupId}
                    poolId={pool.id}
                    canWrite={canWrite}
                    statusColor={statusColor}
                  />
                </CardContent>
              )}
              {pool.allocations.length === 0 && (
                <CardContent>
                  <p className="text-sm text-zinc-500">No allocations yet. Allocations are created after campaign review.</p>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
