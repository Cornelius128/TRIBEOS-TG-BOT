import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Plus, Users, Settings, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Communities" };

export const instant = false;

export default async function GroupsPage() {
  const session = await auth();
  const userId = session!.user!.id as string;

  const groupAdmins = await prisma.groupAdmin.findMany({
    where: { userId },
    include: {
      group: {
        include: {
          _count: {
            select: { campaigns: true },
          },
        },
      },
    },
    orderBy: { verifiedAt: "desc" },
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Communities</h1>
          <p className="text-zinc-400 mt-1">Manage your linked Telegram groups.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/groups/new">
            <Plus className="h-4 w-4" /> Link Community
          </Link>
        </Button>
      </div>

      {groupAdmins.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 p-16 text-center">
          <Users className="h-12 w-12 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-zinc-300 mb-2">
            No communities linked
          </h3>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto mb-8">
            Add the TribeOS bot to your Telegram group as an admin, then link it here to start managing.
          </p>
          <Button asChild>
            <Link href="/dashboard/groups/new">
              <Plus className="h-4 w-4" /> Link Your First Community
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {groupAdmins.map((admin) => (
            <div
              key={admin.id}
              className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-5"
            >
              <div className="h-12 w-12 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-zinc-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-white truncate">{admin.group.title}</h3>
                  <Badge variant={admin.group.botIsAdmin ? "success" : "warning"}>
                    {admin.group.botIsAdmin ? "Bot Active" : "Bot Offline"}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-zinc-500">
                  {admin.group.username && <span>@{admin.group.username}</span>}
                  <span>{admin.group._count.campaigns} campaign{admin.group._count.campaigns !== 1 ? "s" : ""}</span>
                  {admin.group.memberCount && (
                    <span>{admin.group.memberCount.toLocaleString()} members</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/dashboard/groups/${admin.groupId}`}>
                    <Settings className="h-4 w-4" />
                    Manage
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
