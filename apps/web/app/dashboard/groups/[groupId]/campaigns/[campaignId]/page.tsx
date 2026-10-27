import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/utils";
import { CampaignStatusControl } from "./campaign-status-control";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const statusVariant: Record<string, "default" | "success" | "warning" | "destructive" | "secondary" | "info" | "outline"> = {
  DRAFT: "secondary",
  SCHEDULED: "info",
  ACTIVE: "success",
  PAUSED: "warning",
  UNDER_REVIEW: "warning",
  COMPLETED: "secondary",
  CANCELLED: "destructive",
};

const referralStatusVariant: Record<string, "default" | "success" | "warning" | "destructive" | "secondary" | "info" | "outline"> = {
  REGISTERED: "secondary",
  PENDING: "warning",
  QUALIFIED: "success",
  REJECTED: "destructive",
  REVERSED: "destructive",
};

export async function generateMetadata({ params }: { params: Promise<{ groupId: string; campaignId: string }> }) {
  const { campaignId } = await params;
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  return { title: campaign?.name ?? "Campaign" };
}

export const instant = false;

export default async function CampaignPage({ params }: { params: Promise<{ groupId: string; campaignId: string }> }) {
  const { groupId, campaignId } = await params;
  const session = await auth();
  const userId = session!.user!.id as string;

  const admin = await prisma.groupAdmin.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!admin) notFound();

  const campaign = await prisma.campaign.findFirst({
    where: { id: campaignId, groupId },
    include: {
      _count: {
        select: { participants: true, referrals: true },
      },
    },
  });
  if (!campaign) notFound();

  const participants = await prisma.campaignParticipant.findMany({
    where: { campaignId },
    orderBy: { qualifiedReferrals: "desc" },
    take: 50,
  });

  const referrals = await prisma.referral.findMany({
    where: { campaignId },
    include: {
      referrer: { select: { telegramUsername: true, telegramName: true } },
      referred: { select: { telegramUsername: true, telegramName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const qualRules = campaign.qualificationRules as {
    requireBotStart?: boolean;
    requireGroupJoin?: boolean;
    minMembershipDays?: number;
  };

  const canWrite = admin.role === "OWNER" || admin.role === "ADMIN";

  return (
    <div className="p-8">
      <Link
        href={`/dashboard/groups/${groupId}/campaigns`}
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Campaigns
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">{campaign.name}</h1>
            <Badge variant={statusVariant[campaign.status] ?? "secondary"}>
              {campaign.status}
            </Badge>
          </div>
          {campaign.description && (
            <p className="text-zinc-400 max-w-2xl">{campaign.description}</p>
          )}
          <p className="text-sm text-zinc-500 mt-2">
            {formatDate(campaign.startAt)} – {formatDate(campaign.endAt)}
          </p>
        </div>
        {canWrite && (
          <CampaignStatusControl
            groupId={groupId}
            campaignId={campaign.id}
            currentStatus={campaign.status}
          />
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Participants</CardDescription>
            <CardTitle className="text-2xl">{campaign._count.participants}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Referrals</CardDescription>
            <CardTitle className="text-2xl">{campaign._count.referrals}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Qualified</CardDescription>
            <CardTitle className="text-2xl">
              {referrals.filter((r) => r.status === "QUALIFIED").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Review</CardDescription>
            <CardTitle className="text-2xl">
              {referrals.filter((r) => r.status === "PENDING").length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="leaderboard">
        <TabsList className="mb-6">
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="participants">Participants</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard">
          {participants.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500">
              No participants yet.
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">Rank</th>
                    <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">Participant</th>
                    <th className="px-4 py-3 text-right text-xs text-zinc-500 font-medium">Qualified</th>
                    <th className="px-4 py-3 text-right text-xs text-zinc-500 font-medium">Pending</th>
                    <th className="px-4 py-3 text-right text-xs text-zinc-500 font-medium">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {participants.map((p, i) => (
                    <tr key={p.id} className="bg-zinc-950 hover:bg-zinc-900">
                      <td className="px-4 py-3 text-zinc-400 font-medium">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-zinc-200">
                          {p.telegramUsername ? `@${p.telegramUsername}` : p.telegramName ?? p.telegramUserId}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-green-400">{p.qualifiedReferrals}</td>
                      <td className="px-4 py-3 text-right text-yellow-400">{p.pendingReferrals}</td>
                      <td className="px-4 py-3 text-right font-semibold text-orange-400">{p.totalPoints}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="referrals">
          {referrals.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500">
              No referrals yet.
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">Referrer</th>
                    <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">Referred</th>
                    <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {referrals.map((r) => (
                    <tr key={r.id} className="bg-zinc-950 hover:bg-zinc-900">
                      <td className="px-4 py-3 text-zinc-200">
                        {r.referrer.telegramUsername
                          ? `@${r.referrer.telegramUsername}`
                          : r.referrer.telegramName ?? "Unknown"}
                      </td>
                      <td className="px-4 py-3 text-zinc-200">
                        {r.referred.telegramUsername
                          ? `@${r.referred.telegramUsername}`
                          : r.referred.telegramName ?? "Unknown"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={referralStatusVariant[r.status] ?? "secondary"}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-zinc-500">{formatDateTime(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="participants">
          {participants.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500">
              No participants yet.
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">User</th>
                    <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">Group Member</th>
                    <th className="px-4 py-3 text-right text-xs text-zinc-500 font-medium">Qualified Refs</th>
                    <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {participants.map((p) => (
                    <tr key={p.id} className="bg-zinc-950 hover:bg-zinc-900">
                      <td className="px-4 py-3 text-zinc-200">
                        {p.telegramUsername ? `@${p.telegramUsername}` : p.telegramName ?? p.telegramUserId}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={p.isGroupMember ? "success" : "secondary"}>
                          {p.isGroupMember ? "Yes" : "No"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-200">{p.qualifiedReferrals}</td>
                      <td className="px-4 py-3 text-zinc-500">{formatDateTime(p.registeredAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="details">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Start</span>
                  <span className="text-zinc-200">{formatDateTime(campaign.startAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">End</span>
                  <span className="text-zinc-200">{formatDateTime(campaign.endAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Timezone</span>
                  <span className="text-zinc-200">{campaign.timezone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Points/Referral</span>
                  <span className="text-zinc-200">{campaign.pointsPerReferral}</span>
                </div>
                {campaign.maxParticipants && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Max Participants</span>
                    <span className="text-zinc-200">{campaign.maxParticipants}</span>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Qualification Rules</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Require Bot Start</span>
                  <Badge variant={qualRules.requireBotStart ? "success" : "secondary"}>
                    {qualRules.requireBotStart ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Require Group Join</span>
                  <Badge variant={qualRules.requireGroupJoin ? "success" : "secondary"}>
                    {qualRules.requireGroupJoin ? "Yes" : "No"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Min Membership Days</span>
                  <span className="text-zinc-200">{qualRules.minMembershipDays ?? 0}</span>
                </div>
              </CardContent>
            </Card>
            {campaign.rules && (
              <Card className="md:col-span-2">
                <CardHeader><CardTitle>Rules</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-sm text-zinc-400 whitespace-pre-wrap">{campaign.rules}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
