"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME ?? "tribeosbot";

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
  const widgetContainerRef = useRef<HTMLDivElement>(null);

  // Setup Telegram Login Widget global callback for browser logins
  useEffect(() => {
    (window as unknown as { onTelegramAuth?: (user: Record<string, string | number>) => Promise<void> }).onTelegramAuth = async (
      user: Record<string, string | number>
    ) => {
      setStatus("signing-in");
      const result = await signIn("telegram-widget", {
        ...user,
        redirect: false,
      });

      if (result?.error) {
        setErrorMsg("Authentication failed. Please try again.");
        setStatus("error");
        return;
      }

      await fetch("/api/auth/record-fingerprint", { method: "POST" }).catch(() => {});
      window.location.href = redirect;
    };

    return () => {
      delete (window as unknown as { onTelegramAuth?: unknown }).onTelegramAuth;
    };
  }, [redirect]);

  // Check for Telegram Mini App environment
  useEffect(() => {
    const timer = setTimeout(async () => {
      const tg = (window as {
        Telegram?: {
          WebApp?: {
            initData?: string;
            ready?: () => void;
            expand?: () => void;
          };
        };
      }).Telegram?.WebApp;

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

      await fetch("/api/auth/record-fingerprint", { method: "POST" }).catch(() => {});
      window.location.href = redirect;
    }, 200);

    return () => clearTimeout(timer);
  }, [redirect]);

  // Dynamically load the official Telegram Login Widget when viewed in a browser
  useEffect(() => {
    if (status !== "no-telegram" || !widgetContainerRef.current) return;

    // Prevent duplicate scripts
    if (widgetContainerRef.current.hasChildNodes()) return;

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", BOT_USERNAME);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    script.async = true;

    widgetContainerRef.current.appendChild(script);
  }, [status]);

  if (status === "no-telegram") {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center">
          <span className="text-3xl">📡</span>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Sign in to TribeOS</h1>
          <p className="text-zinc-400 text-sm max-w-sm">
            Sign in using your Telegram account to manage your communities, campaigns, and referral analytics.
          </p>
        </div>

        {/* Telegram Login Widget for browser */}
        <div className="flex flex-col items-center gap-3 w-full max-w-xs">
          <div ref={widgetContainerRef} className="min-h-[44px] flex items-center justify-center" />

          <div className="relative w-full my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-950 px-2 text-zinc-500">Or inside Telegram</span>
            </div>
          </div>

          <a
            href={`https://t.me/${BOT_USERNAME}?start=dashboard`}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#0088CC] hover:bg-[#0077b5] text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
              <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.94 8.19l-2.02 9.52c-.15.68-.55.85-1.11.53l-3.06-2.25-1.48 1.42c-.16.16-.3.3-.62.3l.22-3.13 5.73-5.17c.25-.22-.05-.34-.39-.12L7.08 14.4 4.08 13.4c-.67-.21-.68-.67.14-.99l11.63-4.49c.55-.2 1.04.13.09.27z" />
            </svg>
            Open in Telegram Mini App
          </a>
        </div>

        <p className="text-xs text-zinc-600 max-w-xs">
          Your Telegram identity securely links your administrator roles and community permissions.
        </p>
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
