import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Users, Share2, Trophy, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export const instant = false;

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user!.id as string;

  const groupAdmins = await prisma.groupAdmin.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          campaigns: {
            where: { status: "ACTIVE" },
            take: 1,
          },
        },
      },
    },
  });

  const activeCampaigns = await prisma.campaign.count({
    where: {
      group: {
        admins: { some: { userId } },
      },
      status: "ACTIVE",
    },
  });

  const totalParticipants = await prisma.campaignParticipant.count({
    where: {
      campaign: {
        group: {
          admins: { some: { userId } },
        },
      },
    },
  });

  const totalReferrals = await prisma.referral.count({
    where: {
      campaign: {
        group: {
          admins: { some: { userId } },
        },
      },
      status: "QUALIFIED",
    },
  });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {session!.user!.name?.split(" ")[0] ?? "there"}
        </h1>
        <p className="text-zinc-400 mt-1">
          Here&apos;s what&apos;s happening across your communities.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Communities</CardDescription>
            <CardTitle className="text-3xl">{groupAdmins.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500">Total managed groups</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Campaigns</CardDescription>
            <CardTitle className="text-3xl">{activeCampaigns}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500">Running right now</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Participants</CardDescription>
            <CardTitle className="text-3xl">{totalParticipants}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500">Across all campaigns</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Qualified Referrals</CardDescription>
            <CardTitle className="text-3xl">{totalReferrals}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500">Verified referrals</p>
          </CardContent>
        </Card>
      </div>

      {/* Communities */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Your Communities</h2>
        <Button asChild size="sm">
          <Link href="/dashboard/groups/new">
            <Plus className="h-4 w-4" /> Add Community
          </Link>
        </Button>
      </div>

      {groupAdmins.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <Users className="h-10 w-10 text-zinc-700 mx-auto mb-4" />
          <h3 className="font-semibold text-zinc-300 mb-2">No communities yet</h3>
          <p className="text-sm text-zinc-500 mb-6">
            Link your first Telegram group to get started.
          </p>
          <Button asChild>
            <Link href="/dashboard/groups/new">
              <Plus className="h-4 w-4" /> Link a Community
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groupAdmins.map((admin) => (
            <Link
              key={admin.id}
              href={`/dashboard/groups/${admin.groupId}`}
              className="block rounded-xl border border-zinc-800 bg-zinc-900 p-5 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-white">{admin.group.title}</h3>
                  {admin.group.username && (
                    <p className="text-sm text-zinc-500">@{admin.group.username}</p>
                  )}
                </div>
                <Badge variant={admin.group.isActive ? "success" : "secondary"}>
                  {admin.group.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                {admin.group.memberCount && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {admin.group.memberCount.toLocaleString()}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  {admin.group.campaigns.length > 0 ? "Campaign active" : "No active campaign"}
                </span>
              </div>
              <p className="text-xs text-zinc-600 mt-3">
                Linked {formatDate(admin.verifiedAt)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
