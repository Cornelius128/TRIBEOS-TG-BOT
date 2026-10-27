"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

interface Campaign { id: string; name: string; status: string }

export function TeamForm({ groupId, campaigns }: { groupId: string; campaigns: Campaign[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body = {
      campaignId: fd.get("campaignId"),
      name: fd.get("name"),
      description: fd.get("description") || undefined,
      region: fd.get("region") || undefined,
    };
    try {
      const res = await fetch(`/api/groups/${groupId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { setError((await res.json()).error ?? "Failed"); return; }
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Campaign *</label>
        <select name="campaignId" required className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500">
          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Team name *</label>
        <input name="name" required placeholder="e.g. Alpha Squad" maxLength={80} className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
      </div>
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Region / League</label>
        <input name="region" placeholder="e.g. APAC, Europe" maxLength={80} className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
      </div>
      <div>
        <label className="block text-xs text-zinc-400 mb-1">Description</label>
        <input name="description" placeholder="Optional" maxLength={500} className="w-full rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
      </div>
      {error && <p className="md:col-span-2 text-sm text-red-400">{error}</p>}
      <div className="md:col-span-2">
        <Button type="submit" disabled={loading} size="sm">{loading ? "Creating…" : "Create Team"}</Button>
      </div>
    </form>
  );
}
