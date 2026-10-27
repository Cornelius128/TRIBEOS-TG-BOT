"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

type AllocationStatus = "PENDING" | "ELIGIBLE" | "CLAIMED" | "PAID" | "REJECTED";

interface Allocation {
  id: string;
  rank: number | null;
  participantId: string;
  amount: unknown;
  points: number | null;
  status: string;
  claimedAt: Date | null;
  paidAt: Date | null;
  paymentRef: string | null;
  notes: string | null;
}

const STATUS_FLOW: Record<string, AllocationStatus | null> = {
  PENDING: "ELIGIBLE",
  ELIGIBLE: "CLAIMED",
  CLAIMED: "PAID",
  PAID: null,
  REJECTED: null,
};

const badgeVariant: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  PENDING: "secondary",
  ELIGIBLE: "default",
  CLAIMED: "warning",
  PAID: "success",
  REJECTED: "destructive",
};

export function AllocationTable({
  allocations,
  groupId,
  poolId,
  canWrite,
}: {
  allocations: Allocation[];
  groupId: string;
  poolId: string;
  canWrite: boolean;
  statusColor: Record<string, "default" | "success" | "warning" | "destructive" | "secondary">;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function advance(allocationId: string, nextStatus: AllocationStatus) {
    setBusy(allocationId);
    await fetch(`/api/groups/${groupId}/rewards/${allocationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-zinc-500 text-xs border-b border-zinc-800">
            <th className="text-left py-2 pr-4">Rank</th>
            <th className="text-left py-2 pr-4">Participant ID</th>
            <th className="text-left py-2 pr-4">Points / Amount</th>
            <th className="text-left py-2 pr-4">Status</th>
            {canWrite && <th className="text-left py-2">Action</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {allocations.map((a) => {
            const next = STATUS_FLOW[a.status];
            return (
              <tr key={a.id} className="hover:bg-zinc-900/50">
                <td className="py-2 pr-4 text-zinc-400">{a.rank ?? "—"}</td>
                <td className="py-2 pr-4 font-mono text-xs text-zinc-300">{a.participantId.slice(-8)}</td>
                <td className="py-2 pr-4 text-zinc-300">
                  {a.points != null ? `${a.points} pts` : a.amount != null ? String(a.amount) : "—"}
                </td>
                <td className="py-2 pr-4">
                  <Badge variant={badgeVariant[a.status] ?? "secondary"}>{a.status}</Badge>
                </td>
                {canWrite && (
                  <td className="py-2">
                    {next ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={busy === a.id}
                        onClick={() => advance(a.id, next)}
                        className="text-xs h-6 px-2"
                      >
                        {busy === a.id ? "…" : `Mark ${next}`}
                      </Button>
                    ) : (
                      <span className="text-zinc-600 text-xs">—</span>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
