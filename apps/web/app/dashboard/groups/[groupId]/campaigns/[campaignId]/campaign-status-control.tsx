"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Pause, CheckCircle, XCircle } from "lucide-react";

const TRANSITIONS: Record<string, { label: string; status: string; icon: React.ReactNode; variant: "default" | "outline" | "destructive" | "secondary" }[]> = {
  DRAFT: [
    { label: "Activate", status: "ACTIVE", icon: <Play className="h-4 w-4" />, variant: "default" },
    { label: "Schedule", status: "SCHEDULED", icon: <Play className="h-4 w-4" />, variant: "outline" },
  ],
  SCHEDULED: [
    { label: "Activate", status: "ACTIVE", icon: <Play className="h-4 w-4" />, variant: "default" },
    { label: "Cancel", status: "CANCELLED", icon: <XCircle className="h-4 w-4" />, variant: "destructive" },
  ],
  ACTIVE: [
    { label: "Pause", status: "PAUSED", icon: <Pause className="h-4 w-4" />, variant: "outline" },
    { label: "Review", status: "UNDER_REVIEW", icon: <CheckCircle className="h-4 w-4" />, variant: "secondary" },
  ],
  PAUSED: [
    { label: "Resume", status: "ACTIVE", icon: <Play className="h-4 w-4" />, variant: "default" },
    { label: "Review", status: "UNDER_REVIEW", icon: <CheckCircle className="h-4 w-4" />, variant: "secondary" },
  ],
  UNDER_REVIEW: [
    { label: "Complete", status: "COMPLETED", icon: <CheckCircle className="h-4 w-4" />, variant: "default" },
    { label: "Reactivate", status: "ACTIVE", icon: <Play className="h-4 w-4" />, variant: "outline" },
  ],
};

interface Props {
  groupId: string;
  campaignId: string;
  currentStatus: string;
}

export function CampaignStatusControl({ groupId, campaignId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const available = TRANSITIONS[currentStatus] ?? [];
  if (available.length === 0) return null;

  async function transition(newStatus: string) {
    setLoading(true);
    setError("");

    const res = await fetch(
      `/api/groups/${groupId}/campaigns/${campaignId}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      }
    );

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to update status.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        {loading && <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />}
        {available.map((t) => (
          <Button
            key={t.status}
            variant={t.variant}
            size="sm"
            onClick={() => transition(t.status)}
            disabled={loading}
          >
            {t.icon}
            {t.label}
          </Button>
        ))}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
