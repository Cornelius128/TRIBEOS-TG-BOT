import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MODULE_CATALOG } from "@/lib/modules";
import { ModuleToggle } from "./module-toggle";

export const metadata = { title: "Modules" };

export const instant = false;

export default async function ModulesPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const session = await auth();
  const userId = session!.user!.id as string;

  const admin = await prisma.groupAdmin.findUnique({
    where: { groupId_userId: { groupId, userId } },
    include: {
      group: {
        include: { moduleConfigs: true },
      },
    },
  });

  if (!admin) notFound();

  const configMap: Record<string, { enabled: boolean; config: unknown }> = {};
  for (const mc of admin.group.moduleConfigs) {
    configMap[mc.moduleId] = { enabled: mc.enabled, config: mc.config };
  }

  const canWrite = admin.role === "OWNER" || admin.role === "ADMIN";

  return (
    <div className="p-8 max-w-4xl">
      <Link
        href={`/dashboard/groups/${groupId}`}
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> {admin.group.title}
      </Link>

      <h1 className="text-2xl font-bold text-white mb-2">Module Marketplace</h1>
      <p className="text-zinc-400 mb-8">
        Enable and configure features for this community. Each module is independent.
      </p>

      <div className="space-y-3">
        {MODULE_CATALOG.map((mod) => {
          const current = configMap[mod.id] ?? { enabled: false, config: mod.defaultConfig };
          return (
            <ModuleToggle
              key={mod.id}
              mod={mod}
              groupId={groupId}
              enabled={current.enabled}
              canWrite={canWrite}
            />
          );
        })}
      </div>
    </div>
  );
}
