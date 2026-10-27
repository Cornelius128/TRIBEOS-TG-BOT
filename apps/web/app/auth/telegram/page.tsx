"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME ?? "TribeOSBot";

function Spinner({ label }: { label: string }) {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-zinc-400 text-sm">{label}</p>
    </div>
  );
}

export default function TelegramAuthPage() {
  return (
    <Suspense fallback={<Spinner label="Loading…" />}>
      <TelegramAuth />
    </Suspense>
  );
}

function TelegramAuth() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/dashboard";
  const [status, setStatus] = useState<"loading" | "signing-in" | "no-telegram" | "error">(
    "loading"
  );
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Wait a tick for the Telegram Web App script to inject
    const timer = setTimeout(async () => {
      const tg = (window as { Telegram?: { WebApp?: { initData?: string; ready?: () => void; expand?: () => void } } }).Telegram?.WebApp;

      if (!tg?.initData) {
        setStatus("no-telegram");
        return;
      }

      tg.ready?.();
      tg.expand?.();
      setStatus("signing-in");

      const result = await signIn("telegram-webapp", {
        initData: tg.initData,
        redirect: false,
      });

      if (result?.error) {
        setErrorMsg("Authentication failed. Please try again.");
        setStatus("error");
        return;
      }

      // Record device fingerprint (IP) for sybil detection — best-effort
      await fetch("/api/auth/record-fingerprint", { method: "POST" }).catch(() => {});

      // Redirect after successful sign-in
      window.location.href = redirect;
    }, 200);

    return () => clearTimeout(timer);
  }, [redirect]);

  if (status === "no-telegram") {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center">
          <span className="text-3xl">🤖</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-white mb-2">Open via Telegram</h1>
          <p className="text-zinc-400 text-sm max-w-xs">
            TribeOS only works inside Telegram. Open the bot and tap{" "}
            <strong>🖥️ Open Dashboard</strong> to manage your communities.
          </p>
        </div>
        <a
          href={`https://t.me/${BOT_USERNAME}`}
          className="inline-flex items-center gap-2 bg-[#0088CC] hover:bg-[#0077b5] text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
            <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.94 8.19l-2.02 9.52c-.15.68-.55.85-1.11.53l-3.06-2.25-1.48 1.42c-.16.16-.3.3-.62.3l.22-3.13 5.73-5.17c.25-.22-.05-.34-.39-.12L7.08 14.4 4.08 13.4c-.67-.21-.68-.67.14-.99l11.63-4.49c.55-.2 1.04.13.09.27z" />
          </svg>
          Open in Telegram
        </a>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="text-3xl">⚠️</div>
        <h1 className="text-xl font-bold text-white">Sign-in failed</h1>
        <p className="text-zinc-400 text-sm">{errorMsg}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-2 rounded-xl transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  return <Spinner label={status === "signing-in" ? "Signing you in…" : "Loading…"} />;
}
