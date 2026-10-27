"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldCheck, ShieldAlert } from "lucide-react";

type FilterLevel = "off" | "easy" | "medium" | "hardcore";

interface Config {
  minAccountAgeDays: number;
  requireWalletConnect: boolean;
  filterLevel: FilterLevel;
}

interface Props {
  groupId: string;
  initialConfig: Config;
  canWrite: boolean;
}

const LEVELS: { value: FilterLevel; label: string; description: string; minAccountAgeDays: number; icon: React.ReactNode }[] = [
  {
    value: "off",
    label: "Off",
    description: "No sybil filtering. Anyone can join via referral links.",
    minAccountAgeDays: 0,
    icon: <Shield className="h-5 w-5 text-zinc-500" />,
  },
  {
    value: "easy",
    label: "Level 1 — Easy",
    description: "Telegram account must be at least 30 days old.",
    minAccountAgeDays: 30,
    icon: <Shield className="h-5 w-5 text-green-400" />,
  },
  {
    value: "medium",
    label: "Level 2 — Medium",
    description: "Account 30+ days old + wallet connect required (when TMA is enabled).",
    minAccountAgeDays: 30,
    icon: <ShieldCheck className="h-5 w-5 text-yellow-400" />,
  },
  {
    value: "hardcore",
    label: "Level 3 — Hardcore",
    description: "Account 90+ days old + wallet connect + on-chain activity required.",
    minAccountAgeDays: 90,
    icon: <ShieldAlert className="h-5 w-5 text-orange-400" />,
  },
];

export function SybilFilterClient({ groupId, initialConfig, canWrite }: Props) {
  const [config, setConfig] = useState(initialConfig);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(level: FilterLevel) {
    setSaving(true);
    const selected = LEVELS.find((l) => l.value === level)!;
    const newConfig: Config = {
      filterLevel: level,
      minAccountAgeDays: selected.minAccountAgeDays,
      requireWalletConnect: level === "medium" || level === "hardcore",
    };
    try {
      const res = await fetch(`/api/groups/${groupId}/sybil-filter`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig),
      });
      if (res.ok) {
        setConfig(newConfig);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {LEVELS.map((level) => {
        const isActive = config.filterLevel === level.value;
        return (
          <Card
            key={level.value}
            className={`cursor-pointer transition-all ${
              isActive
                ? "border-orange-500/50 bg-orange-500/5"
                : "border-zinc-800 hover:border-zinc-700"
            }`}
            onClick={() => canWrite && !saving && save(level.value)}
          >
            <CardContent className="flex items-start gap-4 pt-4">
              <div className="mt-0.5">{level.icon}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-white text-sm">{level.label}</p>
                  {isActive && <Badge variant="success">Active</Badge>}
                  {level.value === "medium" || level.value === "hardcore" ? (
                    <Badge variant="info">Requires TMA</Badge>
                  ) : null}
                </div>
                <p className="text-sm text-zinc-400">{level.description}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
      {saved && (
        <p className="text-sm text-green-400 text-center">Sybil filter updated!</p>
      )}
      {!canWrite && (
        <p className="text-sm text-zinc-500 text-center">You need admin access to change this.</p>
      )}
    </div>
  );
}
