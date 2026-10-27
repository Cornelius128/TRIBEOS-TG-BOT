import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Star, CheckCircle2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { QuestForm } from "./quest-form";

export const instant = false;
export const metadata = { title: "Quests & Missions" };

const typeLabel: Record<string, string> = {
  MANUAL: "Manual",
  REFERRAL_COUNT: "Referral Count",
  POINTS_MILESTONE: "Points Milestone",
  STREAK: "Streak",
};

export default async function QuestsPage({ params }: { params: Promise<{ groupId: string }> }) {
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
    select: { id: true, name: true },
    orderBy: { createdAt: "desc" },
  });

  const badges = await prisma.badge.findMany({
    where: { groupId },
    select: { id: true, name: true, emoji: true },
  });

  const quests = await prisma.quest.findMany({
    where: { groupId },
    include: {
      campaign: { select: { id: true, name: true } },
      badge: true,
      _count: { select: { completions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const canWrite = admin.role === "OWNER" || admin.role === "ADMIN";

  return (
    <div className="p-8 max-w-4xl">
      <Link
        href={`/dashboard/groups/${groupId}`}
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> {admin.group.title}
      </Link>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Quests & Missions</h1>
          <p className="text-zinc-400">Create engagement tasks, award points and badges on completion.</p>
        </div>
      </div>

      {canWrite && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" /> New Quest
            </CardTitle>
            <CardDescription>
              Automatic quests (Referral Count, Points Milestone) trigger when participants hit the target.
              Manual quests are marked complete by an admin.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <QuestForm groupId={groupId} campaigns={campaigns} badges={badges} />
          </CardContent>
        </Card>
      )}

      {quests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <Star className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium mb-1">No quests yet</p>
          <p className="text-sm text-zinc-600">Create your first quest to engage community members.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quests.map((quest) => (
            <div key={quest.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-white">{quest.title}</span>
                    {quest.badge && (
                      <span className="text-base" title={quest.badge.name}>{quest.badge.emoji}</span>
                    )}
                    <Badge variant={quest.isActive ? "success" : "secondary"}>
                      {quest.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline">{typeLabel[quest.type] ?? quest.type}</Badge>
                  </div>
                  {quest.description && (
                    <p className="text-sm text-zinc-400 mb-2 line-clamp-2">{quest.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span className="text-orange-400 font-medium">{quest.points} pts</span>
                    {quest.type !== "MANUAL" && (
                      <span>Target: {quest.target}</span>
                    )}
                    {quest.campaign && <span>· {quest.campaign.name}</span>}
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {quest._count.completions} completed
                    </span>
                  </div>
                </div>
                {canWrite && (
                  <QuestToggle groupId={groupId} questId={quest.id} isActive={quest.isActive} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Badges section */}
      {badges.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-white mb-4">Badges</h2>
          <div className="flex flex-wrap gap-3">
            {badges.map((b) => (
              <div key={b.id} className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2">
                <span className="text-xl">{b.emoji}</span>
                <span className="text-sm text-zinc-200">{b.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function QuestToggle({ groupId, questId, isActive }: { groupId: string; questId: string; isActive: boolean }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        fetch(`/api/groups/${groupId}/quests/${questId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: !isActive }),
        }).then(() => window.location.reload());
      }}
    >
      <button
        type="submit"
        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
          isActive
            ? "border-zinc-700 text-zinc-400 hover:text-red-400 hover:border-red-900"
            : "border-zinc-700 text-zinc-400 hover:text-emerald-400 hover:border-emerald-900"
        }`}
      >
        {isActive ? "Deactivate" : "Activate"}
      </button>
    </form>
  );
}
