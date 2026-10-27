"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { MODULE_CATALOG } from "@/lib/modules";

type ModDef = typeof MODULE_CATALOG[number];

interface ModuleToggleProps {
  mod: ModDef;
  groupId: string;
  enabled: boolean;
  canWrite: boolean;
}

export function ModuleToggle({ mod, groupId, enabled: initialEnabled, canWrite }: ModuleToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function toggle(value: boolean) {
    if (!canWrite || mod.status !== "AVAILABLE") return;
    setLoading(true);
    setError("");

    const res = await fetch(`/api/groups/${groupId}/modules`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleId: mod.id, enabled: value }),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to update module.");
      return;
    }

    setEnabled(value);
  }

  return (
    <div className={`rounded-xl border p-5 transition-colors ${
      enabled ? "border-orange-500/30 bg-zinc-900" : "border-zinc-800 bg-zinc-900"
    }`}>
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-white">{mod.name}</h3>
            {mod.status === "PLANNED" && (
              <Badge variant="secondary">Planned</Badge>
            )}
            {mod.status === "AVAILABLE" && enabled && (
              <Badge variant="success">Active</Badge>
            )}
          </div>
          <p className="text-sm text-zinc-400">{mod.description}</p>
          {mod.dependencies.length > 0 && (
            <p className="text-xs text-zinc-600 mt-2">
              Requires: {mod.dependencies.join(", ")}
            </p>
          )}
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />}
          <Switch
            checked={enabled}
            onCheckedChange={toggle}
            disabled={!canWrite || mod.status !== "AVAILABLE" || loading}
            aria-label={`Toggle ${mod.name}`}
          />
        </div>
      </div>
    </div>
  );
}
