"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Zap, X } from "lucide-react";

interface FlashBounty {
  id: string;
  durationMinutes: number;
  multiplier: number;
  bonusPoints: number;
  inviteCount: number;
  status: string;
  startAt: string;
  endAt: string;
}

interface Props {
  groupId: string;
  initialBounties: FlashBounty[];
  canWrite: boolean;
}

export function FlashBountyClient({ groupId, initialBounties, canWrite }: Props) {
  const [bounties, setBounties] = useState(initialBounties);
  const [duration, setDuration] = useState("60");
  const [multiplier, setMultiplier] = useState("3");
  const [bonus, setBonus] = useState("0");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeBounty = bounties.find((b) => b.status === "ACTIVE");

  async function startBounty() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/groups/${groupId}/flash-bounty`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationMinutes: parseInt(duration, 10),
          multiplier: parseFloat(multiplier),
          bonusPoints: parseInt(bonus, 10),
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Failed to start Flash Bounty");
        return;
      }
      const bounty = await res.json();
      setBounties((prev) => [bounty, ...prev]);
    } finally {
      setLoading(false);
    }
  }

  async function cancelBounty(bountyId: string) {
    const res = await fetch(`/api/groups/${groupId}/flash-bounty`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bountyId }),
    });
    if (res.ok) {
      setBounties((prev) =>
        prev.map((b) => (b.id === bountyId ? { ...b, status: "CANCELLED" } : b))
      );
    }
  }

  const statusVariant: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
    ACTIVE: "success",
    ENDED: "secondary",
    CANCELLED: "destructive",
  };

  return (
    <div className="space-y-8">
      {activeBounty ? (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-400 animate-pulse" />
                <CardTitle className="text-orange-400">Flash Bounty LIVE</CardTitle>
              </div>
              {canWrite && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => cancelBounty(activeBounty.id)}
                >
                  <X className="h-4 w-4" /> Cancel
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Multiplier</span>
              <span className="text-orange-400 font-bold text-lg">{activeBounty.multiplier}×</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Duration</span>
              <span className="text-zinc-200">{activeBounty.durationMinutes} min</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Ends at</span>
              <span className="text-zinc-200">
                {new Date(activeBounty.endAt).toLocaleTimeString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Referrals so far</span>
              <span className="text-green-400 font-semibold">{activeBounty.inviteCount}</span>
            </div>
          </CardContent>
        </Card>
      ) : canWrite ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-400" />
              Launch Flash Bounty
            </CardTitle>
            <CardDescription>
              Trigger a time-limited multiplier event. The bot will announce it in the group.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
            )}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  min={5}
                  max={1440}
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Multiplier</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  step={0.5}
                  value={multiplier}
                  onChange={(e) => setMultiplier(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Bonus Points</Label>
                <Input
                  type="number"
                  min={0}
                  value={bonus}
                  onChange={(e) => setBonus(e.target.value)}
                />
              </div>
            </div>
            <Button onClick={startBounty} disabled={loading} className="w-full">
              <Zap className="h-4 w-4" />
              {loading ? "Starting…" : "🚨 Launch Flash Bounty"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div>
        <h2 className="text-lg font-semibold text-white mb-4">History</h2>
        {bounties.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-zinc-500">
            No Flash Bounties yet.
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">Status</th>
                  <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">Duration</th>
                  <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">Multiplier</th>
                  <th className="px-4 py-3 text-right text-xs text-zinc-500 font-medium">Referrals</th>
                  <th className="px-4 py-3 text-left text-xs text-zinc-500 font-medium">Started</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {bounties.map((b) => (
                  <tr key={b.id} className="bg-zinc-950 hover:bg-zinc-900">
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[b.status] ?? "secondary"}>{b.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{b.durationMinutes} min</td>
                    <td className="px-4 py-3 text-orange-400 font-semibold">{b.multiplier}×</td>
                    <td className="px-4 py-3 text-right text-green-400">{b.inviteCount}</td>
                    <td className="px-4 py-3 text-zinc-500 text-xs">
                      {new Date(b.startAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
