"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface Campaign { id: string; name: string }

export function AnnouncementForm({ groupId, campaigns }: { groupId: string; campaigns: Campaign[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [schedule, setSchedule] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const scheduledAt = fd.get("scheduledAt") as string | null;
    const body = {
      content: fd.get("content"),
      type: fd.get("type"),
      campaignId: fd.get("campaignId") || undefined,
      scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
    };
    try {
      const res = await fetch(`/api/groups/${groupId}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { setError((await res.json()).error ?? "Failed"); return; }
      (e.target as HTMLFormElement).reset();
      setSchedule(false);
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Type</label>
          <select name="type" className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500">
            <option value="BROADCAST">Broadcast</option>
            <option value="CAMPAIGN_REMINDER">Campaign Reminder</option>
            <option value="BOUNTY_ALERT">Bounty Alert</option>
            <option value="CUSTOM">Custom</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Campaign (optional)</label>
          <select name="campaignId" className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500">
            <option value="">No campaign</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs text-zinc-400 mb-1">Message *</label>
        <textarea
          name="content"
          required
          rows={4}
          maxLength={4096}
          placeholder="Write your announcement here. Telegram Markdown is supported."
          className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={schedule}
            onChange={(e) => setSchedule(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-zinc-400">Schedule for later</span>
        </label>
      </div>

      {schedule && (
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Send at</label>
          <input
            name="scheduledAt"
            type="datetime-local"
            required={schedule}
            className="rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading} size="sm">
          {loading ? "Saving…" : schedule ? "Schedule" : "Save Draft"}
        </Button>
      </div>
    </form>
  );
}
