import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Campaigns" };

const statusVariant: Record<string, "default" | "success" | "warning" | "destructive" | "secondary" | "info" | "outline"> = {
  DRAFT: "secondary",
  SCHEDULED: "info",
  ACTIVE: "success",
  PAUSED: "warning",
  UNDER_REVIEW: "warning",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

export const instant = false;

export default async function CampaignsPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const session = await auth();
  const userId = session!.user!.id as string;

  const admin = await prisma.groupAdmin.findUnique({
    where: { groupId_userId: { groupId, userId } },
    include: {
      group: {
        include: {
          campaigns: {
            orderBy: { createdAt: "desc" },
            include: {
              _count: { select: { participants: true, referrals: true } },
            },
          },
        },
      },
    },
  });

  if (!admin) notFound();

  const { group } = admin;

  return (
    <div className="p-8">
      <Link
        href={`/dashboard/groups/${groupId}`}
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> {group.title}
      </Link>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Campaigns</h1>
          <p className="text-zinc-400 mt-1">Manage referral campaigns for this community.</p>
        </div>
        <Button asChild>
          <Link href={`/dashboard/groups/${groupId}/campaigns/new`}>
            <Plus className="h-4 w-4" /> New Campaign
          </Link>
        </Button>
      </div>

      {group.campaigns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 p-16 text-center">
          <Share2 className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-zinc-300 mb-2">No campaigns yet</h3>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto mb-8">
            Create your first referral campaign to start growing your community.
          </p>
          <Button asChild>
            <Link href={`/dashboard/groups/${groupId}/campaigns/new`}>
              <Plus className="h-4 w-4" /> Create Campaign
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {group.campaigns.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/dashboard/groups/${groupId}/campaigns/${campaign.id}`}
              className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5 hover:border-zinc-700 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-semibold text-white truncate">{campaign.name}</h3>
                  <Badge variant={statusVariant[campaign.status] ?? "secondary"}>
                    {campaign.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-zinc-500">
                  <span>{campaign._count.participants} participants</span>
                  <span>{campaign._count.referrals} referrals</span>
                  <span>{formatDate(campaign.startAt)} – {formatDate(campaign.endAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
