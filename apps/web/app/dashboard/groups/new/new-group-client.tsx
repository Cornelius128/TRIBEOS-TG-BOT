"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bot, Copy, Check, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function NewGroupClient() {
  const router = useRouter();
  const [step, setStep] = useState<"intro" | "challenge" | "waiting">("intro");
  const [challenge, setChallenge] = useState<{
    code: string;
    instruction: string;
    expiresAt: string;
    botLink: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME ?? "TribeOSBot";

  async function generateChallenge() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/groups/challenge", { method: "POST" });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to generate challenge.");
      return;
    }
    setChallenge(data);
    setStep("challenge");
  }

  async function copyCommand() {
    if (!challenge) return;
    const cmd = `/verify_${challenge.code}`;
    await navigator.clipboard.writeText(cmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function checkVerification() {
    if (!challenge) return;
    setLoading(true);
    setStatusMsg("Checking...");
    const res = await fetch(`/api/groups/verify?code=${challenge.code}`);
    const data = await res.json();
    setLoading(false);
    if (data.verified && data.groupId) {
      router.push(`/dashboard/groups/${data.groupId}`);
    } else {
      setStatusMsg(data.message || "Not yet verified. Make sure you sent the command in the group.");
    }
  }

  return (
    <div className="p-8 max-w-2xl">
      <Link
        href="/dashboard/groups"
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white mb-8"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Communities
      </Link>

      <h1 className="text-2xl font-bold text-white mb-2">Link a Community</h1>
      <p className="text-zinc-400 mb-8">
        Connect your Telegram group to TribeOS to start managing it.
      </p>

      {step === "intro" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Before you start</CardTitle>
              <CardDescription>Complete these steps to link your group.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="h-8 w-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-sm font-bold shrink-0">1</div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">Add the TribeOS bot to your Telegram group</p>
                  <p className="text-sm text-zinc-500 mt-1">The bot must be an administrator with the ability to send messages and manage members.</p>
                  <a
                    href={`https://t.me/${botUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-sm text-orange-400 hover:text-orange-300"
                  >
                    <Bot className="h-4 w-4" /> Open @{botUsername}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="h-8 w-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-sm font-bold shrink-0">2</div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">Generate a verification challenge</p>
                  <p className="text-sm text-zinc-500 mt-1">You&apos;ll get a one-time command to send in your group, proving you&apos;re an admin.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="h-8 w-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-sm font-bold shrink-0">3</div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">Send the command in your group</p>
                  <p className="text-sm text-zinc-500 mt-1">The bot will confirm your admin status and link the group.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="rounded-lg bg-red-950 border border-red-800 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <Button onClick={generateChallenge} disabled={loading} className="w-full">
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generating challenge...</>
            ) : (
              "Generate Verification Challenge"
            )}
          </Button>
        </div>
      )}

      {step === "challenge" && challenge && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your verification command</CardTitle>
              <CardDescription>
                Send this command in your Telegram group within{" "}
                <span className="text-orange-400">15 minutes</span>.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-zinc-800 border border-zinc-700 p-4">
                <div className="flex items-center justify-between">
                  <code className="text-sm font-mono text-orange-400 break-all">
                    /verify_{challenge.code}
                  </code>
                  <Button variant="ghost" size="sm" onClick={copyCommand}>
                    {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg bg-zinc-800/50 border border-zinc-800 p-4 text-sm text-zinc-400 space-y-2">
                <p className="font-medium text-zinc-300">Instructions:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Open your Telegram group</li>
                  <li>Copy and send the command above</li>
                  <li>Come back and click &quot;Check Verification&quot;</li>
                </ol>
              </div>

              {statusMsg && (
                <div className="rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-3 text-sm text-zinc-300">
                  {statusMsg}
                </div>
              )}
            </CardContent>
          </Card>

          <Button onClick={checkVerification} disabled={loading} className="w-full">
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Checking...</>
            ) : (
              "Check Verification"
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => { setStep("intro"); setChallenge(null); }}
            className="w-full"
          >
            Generate New Challenge
          </Button>
        </div>
      )}
    </div>
  );
}
