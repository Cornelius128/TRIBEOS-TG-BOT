"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface Campaign { id: string; name: string }
interface BadgeOption { id: string; name: string; emoji: string }

export function QuestForm({
  groupId,
  campaigns,
  badges,
}: {
  groupId: string;
  campaigns: Campaign[];
  badges: BadgeOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [type, setType] = useState("MANUAL");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      title: fd.get("title"),
      description: fd.get("description") || undefined,
      type: fd.get("type"),
      target: Number(fd.get("target") ?? 1),
      points: Number(fd.get("points") ?? 10),
      campaignId: fd.get("campaignId") || undefined,
      badgeId: fd.get("badgeId") || undefined,
    };
    try {
      const res = await fetch(`/api/groups/${groupId}/quests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { setError((await res.json()).error ?? "Failed"); return; }
      (e.target as HTMLFormElement).reset();
      setType("MANUAL");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2">
        <label className="block text-xs text-zinc-400 mb-1">Quest title *</label>
        <input name="title" required maxLength={120} placeholder="e.g. Invite 5 friends" className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
      </div>
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Type</label>
        <select name="type" value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500">
          <option value="MANUAL">Manual (admin marks complete)</option>
          <option value="REFERRAL_COUNT">Referral Count (auto)</option>
          <option value="POINTS_MILESTONE">Points Milestone (auto)</option>
          <option value="STREAK">Streak (auto)</option>
        </select>
      </div>
      {type !== "MANUAL" && (
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Target ({type === "REFERRAL_COUNT" ? "referrals" : type === "POINTS_MILESTONE" ? "points" : "days"})</label>
          <input name="target" type="number" min={1} defaultValue={1} required className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
        </div>
      )}
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Points reward</label>
        <input name="points" type="number" min={0} defaultValue={10} className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
      </div>
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Campaign (optional)</label>
        <select name="campaignId" className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500">
          <option value="">Group-wide</option>
          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      {badges.length > 0 && (
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Badge reward (optional)</label>
          <select name="badgeId" className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500">
            <option value="">No badge</option>
            {badges.map((b) => <option key={b.id} value={b.id}>{b.emoji} {b.name}</option>)}
          </select>
        </div>
      )}
      <div className="md:col-span-2">
        <label className="block text-xs text-zinc-400 mb-1">Description</label>
        <textarea name="description" rows={2} maxLength={1000} placeholder="Optional details shown to participants" className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none" />
      </div>
      {error && <p className="md:col-span-2 text-sm text-red-400">{error}</p>}
      <div className="md:col-span-2">
        <Button type="submit" disabled={loading} size="sm">{loading ? "Creating…" : "Create Quest"}</Button>
      </div>
    </form>
  );
}
