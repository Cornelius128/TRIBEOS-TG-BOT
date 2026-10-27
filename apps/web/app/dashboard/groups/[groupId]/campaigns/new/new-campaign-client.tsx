"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";

export function NewCampaignClient() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [pointsPerReferral, setPointsPerReferral] = useState(1);
  const [maxParticipants, setMaxParticipants] = useState("");
  const [rules, setRules] = useState("");
  const [requireBotStart, setRequireBotStart] = useState(true);
  const [requireGroupJoin, setRequireGroupJoin] = useState(true);
  const [minMembershipDays, setMinMembershipDays] = useState(0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !startAt || !endAt) {
      setError("Name, start date, and end date are required.");
      return;
    }
    if (new Date(endAt) <= new Date(startAt)) {
      setError("End date must be after start date.");
      return;
    }

    setLoading(true);
    setError("");

    const body = {
      name: name.trim(),
      description: description.trim() || undefined,
      startAt,
      endAt,
      pointsPerReferral,
      maxParticipants: maxParticipants ? parseInt(maxParticipants) : undefined,
      rules: rules.trim() || undefined,
      qualificationRules: {
        requireBotStart,
        requireGroupJoin,
        minMembershipDays,
      },
    };

    const res = await fetch(`/api/groups/${groupId}/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to create campaign.");
      return;
    }

    router.push(`/dashboard/groups/${groupId}/campaigns/${data.id}`);
  }

  return (
    <div className="p-8 max-w-2xl">
      <Link
        href={`/dashboard/groups/${groupId}/campaigns`}
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Campaigns
      </Link>

      <h1 className="text-2xl font-bold text-white mb-2">Create Campaign</h1>
      <p className="text-zinc-400 mb-8">Launch a new referral campaign for your community.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <Card>
          <CardHeader><CardTitle>Campaign Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Campaign Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Summer Referral Contest"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell participants what this campaign is about..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="startAt">Start Date *</Label>
                <Input
                  id="startAt"
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endAt">End Date *</Label>
                <Input
                  id="endAt"
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="points">Points per Referral</Label>
                <Input
                  id="points"
                  type="number"
                  min="0"
                  value={pointsPerReferral}
                  onChange={(e) => setPointsPerReferral(parseInt(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="maxParticipants">Max Participants (optional)</Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  min="1"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value)}
                  placeholder="Unlimited"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Qualification Rules</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-200">Require bot start</p>
                <p className="text-xs text-zinc-500">Referred user must start the bot</p>
              </div>
              <Switch
                checked={requireBotStart}
                onCheckedChange={setRequireBotStart}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-200">Require group join</p>
                <p className="text-xs text-zinc-500">Referred user must join the Telegram group</p>
              </div>
              <Switch
                checked={requireGroupJoin}
                onCheckedChange={setRequireGroupJoin}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="minDays">Minimum membership days (0 = immediate)</Label>
              <Input
                id="minDays"
                type="number"
                min="0"
                value={minMembershipDays}
                onChange={(e) => setMinMembershipDays(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-zinc-500">
                How many days the referred user must remain in the group before qualifying
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Rules &amp; Terms</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <Label htmlFor="rules">Campaign Rules (optional)</Label>
              <Textarea
                id="rules"
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                placeholder="Enter the rules and eligibility requirements..."
                rows={5}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</>
            ) : (
              "Create Campaign"
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href={`/dashboard/groups/${groupId}/campaigns`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
