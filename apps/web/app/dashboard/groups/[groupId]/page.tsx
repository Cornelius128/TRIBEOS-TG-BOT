import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Users, Share2, Settings, Activity, Zap, Shield, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const group = await prisma.telegramGroup.findUnique({ where: { id: groupId } });
  return { title: group?.title ?? "Group" };
}

export const instant = false;

export default async function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const session = await auth();
  const userId = session!.user!.id as string;

  const admin = await prisma.groupAdmin.findUnique({
    where: { groupId_userId: { groupId, userId } },
    include: {
      group: {
        include: {
          moduleConfigs: true,
          campaigns: {
            orderBy: { createdAt: "desc" },
            take: 5,
            include: {
              _count: { select: { participants: true, referrals: true } },
            },
          },
          _count: {
            select: { campaigns: true },
          },
        },
      },
    },
  });

  if (!admin) notFound();

  const { group } = admin;

  const enabledModules = group.moduleConfigs.filter((m) => m.enabled);
  const activeCampaign = group.campaigns.find((c) => c.status === "ACTIVE");

  const campaignStatusColor: Record<string, "default" | "success" | "warning" | "destructive" | "secondary" | "info" | "outline"> = {
    DRAFT: "secondary",
    SCHEDULED: "info",
    ACTIVE: "success",
    PAUSED: "warning",
    UNDER_REVIEW: "warning",
    COMPLETED: "secondary",
    CANCELLED: "destructive",
  };

  return (
    <div className="p-8">
      <Link
        href="/dashboard/groups"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Communities
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">{group.title}</h1>
            <Badge variant={group.botIsAdmin ? "success" : "warning"}>
              {group.botIsAdmin ? "Bot Admin" : "Bot Offline"}
            </Badge>
          </div>
          {group.username && (
            <p className="text-zinc-400">@{group.username}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/groups/${groupId}/audit`}>
              <ClipboardList className="h-4 w-4" /> Audit
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/groups/${groupId}/sybil-filter`}>
              <Shield className="h-4 w-4" /> Sybil Filter
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/groups/${groupId}/flash-bounty`}>
              <Zap className="h-4 w-4" /> Flash Bounty
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/groups/${groupId}/modules`}>
              <Settings className="h-4 w-4" /> Modules
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href={`/dashboard/groups/${groupId}/campaigns/new`}>
              <Plus className="h-4 w-4" /> New Campaign
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Members</CardDescription>
            <CardTitle className="text-2xl">{group.memberCount?.toLocaleString() ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Campaigns</CardDescription>
            <CardTitle className="text-2xl">{group._count.campaigns}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Modules</CardDescription>
            <CardTitle className="text-2xl">{enabledModules.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Campaign</CardDescription>
            <CardTitle className="text-sm text-zinc-200 mt-1">
              {activeCampaign ? activeCampaign.name : "None"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Campaigns */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Campaigns</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/groups/${groupId}/campaigns`}>View all</Link>
            </Button>
          </div>
          {group.campaigns.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 p-8 text-center">
              <Share2 className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500 mb-4">No campaigns yet</p>
              <Button asChild size="sm">
                <Link href={`/dashboard/groups/${groupId}/campaigns/new`}>
                  <Plus className="h-4 w-4" /> Create Campaign
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {group.campaigns.map((campaign) => (
                <Link
                  key={campaign.id}
                  href={`/dashboard/groups/${groupId}/campaigns/${campaign.id}`}
                  className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white text-sm truncate">{campaign.name}</p>
                      <Badge variant={campaignStatusColor[campaign.status] ?? "secondary"}>
                        {campaign.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1">
                      {campaign._count.participants} participants · {campaign._count.referrals} referrals
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Modules */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Active Modules</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/dashboard/groups/${groupId}/modules`}>Configure</Link>
            </Button>
          </div>
          {enabledModules.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 p-8 text-center">
              <Activity className="h-8 w-8 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500 mb-4">No modules enabled</p>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/groups/${groupId}/modules`}>
                  <Settings className="h-4 w-4" /> Enable Modules
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {enabledModules.map((mod) => (
                <div
                  key={mod.id}
                  className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4"
                >
                  <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                    <Activity className="h-4 w-4 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{mod.moduleId}</p>
                    <p className="text-xs text-zinc-500">v{mod.version}</p>
                  </div>
                  <Badge variant="success" className="ml-auto">Active</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
