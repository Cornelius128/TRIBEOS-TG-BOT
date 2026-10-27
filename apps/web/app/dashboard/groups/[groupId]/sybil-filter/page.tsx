import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SybilFilterClient } from "./sybil-filter-client";

export const instant = false;

export async function generateMetadata() {
  return { title: "Sybil Filter" };
}

export default async function SybilFilterPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = await params;
  const session = await auth();
  const userId = session!.user!.id as string;

  const admin = await prisma.groupAdmin.findUnique({
    where: { groupId_userId: { groupId, userId } },
    include: { group: true },
  });
  if (!admin) notFound();

  const moduleConfig = await prisma.groupModuleConfig.findUnique({
    where: { groupId_moduleId: { groupId, moduleId: "anti_fraud" } },
  });

  const config = (moduleConfig?.config as {
    minAccountAgeDays?: number;
    requireWalletConnect?: boolean;
    filterLevel?: string;
  }) ?? {};

  const initialConfig = {
    minAccountAgeDays: config.minAccountAgeDays ?? 0,
    requireWalletConnect: config.requireWalletConnect ?? false,
    filterLevel: (config.filterLevel ?? "off") as "off" | "easy" | "medium" | "hardcore",
  };

  const canWrite = admin.role === "OWNER" || admin.role === "ADMIN";

  return (
    <div className="p-8 max-w-2xl">
      <Link
        href={`/dashboard/groups/${groupId}`}
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> {admin.group.title}
      </Link>

      <h1 className="text-2xl font-bold text-white mb-2">Sybil Filter</h1>
      <p className="text-zinc-400 mb-8">
        Set the barrier to entry for new members joining via referral links. Higher levels
        block more bots and burner accounts.
      </p>

      <SybilFilterClient groupId={groupId} initialConfig={initialConfig} canWrite={canWrite} />
    </div>
  );
}
