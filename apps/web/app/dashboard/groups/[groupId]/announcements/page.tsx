import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Megaphone, Send, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AnnouncementForm } from "./announcement-form";
import { formatDateTime } from "@/lib/utils";

export const instant = false;
export const metadata = { title: "Announcements" };

const typeLabel: Record<string, string> = {
  BROADCAST: "Broadcast",
  CAMPAIGN_REMINDER: "Campaign Reminder",
  BOUNTY_ALERT: "Bounty Alert",
  CUSTOM: "Custom",
};

const statusIcon: Record<string, React.ReactNode> = {
  DRAFT: <Clock className="h-3.5 w-3.5 text-zinc-500" />,
  SCHEDULED: <Clock className="h-3.5 w-3.5 text-blue-400" />,
  SENT: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
  FAILED: <XCircle className="h-3.5 w-3.5 text-red-400" />,
  CANCELLED: <XCircle className="h-3.5 w-3.5 text-zinc-600" />,
};

const statusVariant: Record<string, "default" | "success" | "warning" | "destructive" | "secondary" | "info" | "outline"> = {
  DRAFT: "secondary",
  SCHEDULED: "info",
  SENT: "success",
  FAILED: "destructive",
  CANCELLED: "outline",
};

export default async function AnnouncementsPage({ params }: { params: Promise<{ groupId: string }> }) {
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

  const announcements = await prisma.announcement.findMany({
    where: { groupId },
    include: { campaign: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const canWrite = admin.role === "OWNER" || admin.role === "ADMIN";

  const stats = {
    total: announcements.length,
    sent: announcements.filter((a) => a.status === "SENT").length,
    scheduled: announcements.filter((a) => a.status === "SCHEDULED").length,
    draft: announcements.filter((a) => a.status === "DRAFT").length,
  };

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
          <h1 className="text-2xl font-bold text-white mb-1">Announcements</h1>
          <p className="text-zinc-400">Schedule posts and campaign reminders to your group.</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {[
          { label: "Total", value: stats.total },
          { label: "Sent", value: stats.sent },
          { label: "Scheduled", value: stats.scheduled },
          { label: "Drafts", value: stats.draft },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-1">
              <CardDescription className="text-xs">{s.label}</CardDescription>
              <CardTitle className="text-xl">{s.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {canWrite && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Megaphone className="h-4 w-4" /> New Announcement
            </CardTitle>
            <CardDescription>
              Draft a message now or schedule it for later. Scheduled announcements are sent by the bot automatically.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AnnouncementForm groupId={groupId} campaigns={campaigns} />
          </CardContent>
        </Card>
      )}

      {announcements.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 p-12 text-center">
          <Send className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium">No announcements yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant={statusVariant[a.status] ?? "secondary"}>
                      <span className="flex items-center gap-1">
                        {statusIcon[a.status]}
                        {a.status}
                      </span>
                    </Badge>
                    <span className="text-xs text-zinc-500">{typeLabel[a.type] ?? a.type}</span>
                    {a.campaign && (
                      <span className="text-xs text-zinc-500">· {a.campaign.name}</span>
                    )}
                  </div>
                  <p className="text-sm text-zinc-200 whitespace-pre-wrap line-clamp-3">{a.content}</p>
                  <p className="text-xs text-zinc-600 mt-2">
                    {a.status === "SCHEDULED" && a.scheduledAt
                      ? `Scheduled for ${formatDateTime(a.scheduledAt)}`
                      : a.status === "SENT" && a.sentAt
                      ? `Sent ${formatDateTime(a.sentAt)}`
                      : `Created ${formatDateTime(a.createdAt)}`}
                  </p>
                </div>
                {canWrite && (a.status === "DRAFT" || a.status === "SCHEDULED") && (
                  <AnnouncementActions groupId={groupId} announcementId={a.id} status={a.status} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnnouncementActions({ groupId, announcementId, status }: { groupId: string; announcementId: string; status: string }) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <form
        action={`/api/groups/${groupId}/announcements/${announcementId}`}
        method="post"
        onSubmit={(e) => {
          e.preventDefault();
          fetch(`/api/groups/${groupId}/announcements/${announcementId}`, {
            method: "DELETE",
          }).then(() => window.location.reload());
        }}
      >
        <button
          type="submit"
          className="text-xs text-zinc-500 hover:text-red-400 transition-colors px-2 py-1 rounded"
        >
          Cancel
        </button>
      </form>
    </div>
  );
}
