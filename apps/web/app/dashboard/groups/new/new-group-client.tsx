"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Bot, Copy, Check, Loader2, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export function NewGroupClient() {
  const router = useRouter();
  const [step, setStep] = useState<"intro" | "challenge" | "waiting">("intro");
  const [challenge, setChallenge] = useState<{
    code: string;
    instruction?: string;
    command?: string;
    expiresAt: string;
    botLink: string;
    botUsername?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const fallbackBotUsername = process.env.NEXT_PUBLIC_BOT_USERNAME ?? "tribeosbot";
  const botUsername = challenge?.botUsername ?? fallbackBotUsername;

  async function generateChallenge() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/groups/challenge", { method: "POST" });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(data.error || "Failed to generate challenge.");
        return;
      }
      setChallenge(data);
      setStep("challenge");
    } catch {
      setLoading(false);
      setError("Failed to connect to the server. Please try again.");
    }
  }

  const effectiveCommand = challenge?.command ?? `/verify_${challenge?.code}@${botUsername}`;

  async function copyCommand() {
    if (!challenge) return;
    await navigator.clipboard.writeText(effectiveCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function checkVerification(silent = false) {
    if (!challenge) return;
    if (!silent) {
      setLoading(true);
      setStatusMsg("Checking verification status...");
    }
    try {
      const res = await fetch(`/api/groups/verify?code=${challenge.code}`);
      const data = await res.json();
      if (!silent) setLoading(false);
      if (data.verified && data.groupId) {
        setStatusMsg("✅ Group linked successfully! Redirecting...");
        if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        router.push(`/dashboard/groups/${data.groupId}`);
      } else if (!silent) {
        setStatusMsg(data.message || "Not yet verified. Make sure the command was sent in the group.");
      }
    } catch {
      if (!silent) {
        setLoading(false);
        setStatusMsg("Error checking verification. Please try again.");
      }
    }
  }

  // Auto-poll verification status every 3 seconds while on challenge step
  useEffect(() => {
    if (step === "challenge" && challenge?.code) {
      pollTimerRef.current = setInterval(() => {
        checkVerification(true);
      }, 3000);
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [step, challenge?.code]);

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
        Connect your Telegram group to TribeOS to start tracking referrals and managing modules.
      </p>

      {step === "intro" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>How linking works</CardTitle>
              <CardDescription>Follow these 3 easy steps to link your community.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="h-8 w-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-sm font-bold shrink-0">1</div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">Add @{fallbackBotUsername} as an Admin</p>
                  <p className="text-sm text-zinc-500 mt-1">Make sure the bot has admin rights to invite users and send messages.</p>
                  <a
                    href={`https://t.me/${fallbackBotUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-sm text-orange-400 hover:text-orange-300"
                  >
                    <Bot className="h-4 w-4" /> Open @{fallbackBotUsername}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="h-8 w-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-sm font-bold shrink-0">2</div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">Generate a one-time verification command</p>
                  <p className="text-sm text-zinc-500 mt-1">Generates a unique security code proving group ownership.</p>
                </div>
              </div>
              <div className="flex gap-4 items-start">
                <div className="h-8 w-8 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-sm font-bold shrink-0">3</div>
                <div>
                  <p className="text-sm font-medium text-zinc-200">Send command or tap Add Bot</p>
                  <p className="text-sm text-zinc-500 mt-1">The bot verifies your ownership and links the group automatically.</p>
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
              <CardTitle>Verify Community Ownership</CardTitle>
              <CardDescription>
                Choose either option below to complete verification within{" "}
                <span className="text-orange-400">15 minutes</span>:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Option 1: 1-Click Add & Verify */}
              <div className="rounded-xl border border-orange-500/30 bg-orange-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-orange-400">
                  <Sparkles className="h-4 w-4" /> Option 1: One-Click Add & Verify (Fastest)
                </div>
                <p className="text-xs text-zinc-400">
                  Select your group to add the bot with admin permissions and verify automatically in one step:
                </p>
                <a
                  href={challenge.botLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors"
                >
                  <Bot className="h-4 w-4" /> Add Bot to Group & Verify
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              {/* Option 2: Send Command Manually */}
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase text-zinc-400">Option 2: Send Command in Existing Group</p>
                <p className="text-xs text-zinc-400">
                  If the bot is already an administrator in your group, copy and send this exact command into the group chat:
                </p>
                <div className="rounded-lg bg-zinc-800 border border-zinc-700 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-sm font-mono text-orange-400 break-all">
                      {effectiveCommand}
                    </code>
                    <Button variant="ghost" size="sm" onClick={copyCommand}>
                      {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-zinc-500">
                  Note: The <span className="text-zinc-300">@{botUsername}</span> suffix ensures Telegram delivers the command directly to the bot.
                </p>
              </div>

              {statusMsg && (
                <div className="rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-3 text-sm text-zinc-300 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-orange-400 shrink-0" />
                  <span>{statusMsg}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Button onClick={() => checkVerification(false)} disabled={loading} className="w-full">
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Checking...</>
            ) : (
              "Check Verification Now"
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              if (pollTimerRef.current) clearInterval(pollTimerRef.current);
              setStep("intro");
              setChallenge(null);
            }}
            className="w-full"
          >
            Generate New Challenge
          </Button>
        </div>
      )}
    </div>
  );
}
