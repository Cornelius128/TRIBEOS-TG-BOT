import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Swords, Users, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeamForm } from "./team-form";

export const instant = false;
export const metadata = { title: "Team Battles" };

export default async function TeamsPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const session = await auth();
  const userId = session!.user!.id as string;

  const admin = await prisma.groupAdmin.findUnique({
    where: { groupId_userId: { groupId, userId } },
    include: { group: true },
  });
  if (!admin) notFound();

  const campaigns = await prisma.campaign.findMany({
    where: { groupId },
    select: { id: true, name: true, status: true },
    orderBy: { createdAt: "desc" },
  });

  const teams = await prisma.team.findMany({
    where: { campaign: { groupId } },
    include: {
      campaign: { select: { id: true, name: true, status: true } },
      memberships: {
        include: {
          participant: { select: { telegramName: true, telegramUsername: true, totalPoints: true } },
        },
        orderBy: { joinedAt: "desc" },
      },
    },
    orderBy: { totalPoints: "desc" },
  });

  const canWrite = admin.role === "OWNER" || admin.role === "ADMIN";

  const grouped = teams.reduce<Record<string, typeof teams>>((acc, t) => {
    const key = t.campaignId;
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

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
          <h1 className="text-2xl font-bold text-white mb-1">Team Battles & Leagues</h1>
          <p className="text-zinc-400">Organise participants into teams and run competitive campaigns.</p>
        </div>
      </div>

      {canWrite && campaigns.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" /> New Team
            </CardTitle>
            <CardDescription>Create a team within a campaign. Participants can be assigned via the bot.</CardDescription>
          </CardHeader>
          <CardContent>
            <TeamForm groupId={groupId} campaigns={campaigns} />
          </CardContent>
        </Card>
      )}

      {teams.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <Swords className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium mb-1">No teams yet</p>
          <p className="text-sm text-zinc-600">Create teams for a campaign and participants can join them.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([campaignId, campaignTeams]) => {
            const campaign = campaignTeams[0].campaign;
            return (
              <div key={campaignId}>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-lg font-semibold text-white">{campaign.name}</h2>
                  <Badge variant={campaign.status === "ACTIVE" ? "success" : "secondary"}>
                    {campaign.status}
                  </Badge>
                </div>

                {/* Leaderboard */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {campaignTeams.map((team, idx) => (
                    <div key={team.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-zinc-500">#{idx + 1}</span>
                            <span className="font-semibold text-white">{team.name}</span>
                          </div>
                          {team.region && <p className="text-xs text-zinc-500 mt-0.5">{team.region}</p>}
                          {team.description && (
                            <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{team.description}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-orange-400">{team.totalPoints}</p>
                          <p className="text-xs text-zinc-600">pts</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <Users className="h-3.5 w-3.5" />
                        <span>{team.memberships.length} member{team.memberships.length !== 1 ? "s" : ""}</span>
                      </div>
                      {team.memberships.length > 0 && (
                        <div className="mt-3 space-y-1.5">
                          {team.memberships.slice(0, 5).map((m) => (
                            <div key={m.id} className="flex items-center justify-between">
                              <span className="text-xs text-zinc-300 truncate">
                                {m.participant.telegramName ?? m.participant.telegramUsername ?? "Unknown"}
                              </span>
                              <span className="text-xs text-zinc-500 shrink-0 ml-2">{m.participant.totalPoints} pts</span>
                            </div>
                          ))}
                          {team.memberships.length > 5 && (
                            <p className="text-xs text-zinc-600">+{team.memberships.length - 5} more</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
