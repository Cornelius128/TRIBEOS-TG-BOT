import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

export const instant = false;

export async function generateMetadata() {
  return { title: "Audit Log" };
}

export default async function AuditLogPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const session = await auth();
  const userId = session!.user!.id as string;

  const admin = await prisma.groupAdmin.findUnique({
    where: { groupId_userId: { groupId, userId } },
    include: { group: true },
  });

  if (!admin) notFound();

  const logs = await prisma.auditLog.findMany({
    where: { groupId },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const eventColor: Record<string, "default" | "success" | "warning" | "destructive" | "secondary" | "info"> = {
    CAMPAIGN_CREATED: "success",
    CAMPAIGN_UPDATED: "info",
    CAMPAIGN_STATUS_CHANGED: "info",
    CAMPAIGN_DELETED: "destructive",
    MODULE_ENABLED: "success",
    MODULE_DISABLED: "warning",
    MODULE_CONFIG_UPDATED: "info",
    GROUP_LINKED: "success",
    GROUP_UNLINKED: "destructive",
    REFERRAL_QUALIFIED: "success",
    REFERRAL_REJECTED: "destructive",
    SUSPICIOUS_ACTIVITY: "destructive",
    ADMIN_ADDED: "success",
    ADMIN_REMOVED: "destructive",
  };

  return (
    <div className="p-8">
      <Link
        href={`/dashboard/groups/${groupId}`}
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> {admin.group.title}
      </Link>

      <h1 className="text-2xl font-bold text-white mb-2">Audit Log</h1>
      <p className="text-zinc-400 mb-8">All significant events for this community.</p>

      {logs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-12 text-center text-zinc-500">
          No audit events yet.
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">Event</th>
                <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">Description</th>
                <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">Actor</th>
                <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {logs.map((log) => (
                <tr key={log.id} className="bg-zinc-950 hover:bg-zinc-900">
                  <td className="px-4 py-3">
                    <Badge variant={eventColor[log.eventType] ?? "secondary"}>
                      {log.eventType.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-zinc-300 max-w-xs truncate">
                    {log.description}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">
                    {log.userId ?? "System"}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 text-xs whitespace-nowrap">
                    {formatDateTime(log.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
