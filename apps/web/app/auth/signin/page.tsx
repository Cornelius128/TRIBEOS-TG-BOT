import Link from "next/link";
import { redirect } from "next/navigation";

const BOT_USERNAME = process.env.NEXT_PUBLIC_BOT_USERNAME ?? "TribeOSBot";

export const instant = false;

export default function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  // If accessed with a callbackUrl, redirect to /auth/telegram to handle it
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
          <span className="text-lg">📡</span>
        </div>
        <span className="text-xl font-bold text-white">TribeOS</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Sign in with Telegram</h1>
        <p className="text-zinc-400 text-sm max-w-xs">
          Open the TribeOS bot in Telegram and tap{" "}
          <strong className="text-white">🖥️ Open Dashboard</strong> — you'll be signed in automatically.
        </p>
      </div>

      <a
        href={`https://t.me/${BOT_USERNAME}`}
        className="inline-flex items-center gap-2 bg-[#0088CC] hover:bg-[#0077b5] text-white font-semibold px-6 py-3 rounded-xl transition-colors"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
          <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.94 8.19l-2.02 9.52c-.15.68-.55.85-1.11.53l-3.06-2.25-1.48 1.42c-.16.16-.3.3-.62.3l.22-3.13 5.73-5.17c.25-.22-.05-.34-.39-.12L7.08 14.4 4.08 13.4c-.67-.21-.68-.67.14-.99l11.63-4.49c.55-.2 1.04.13.09.27z" />
        </svg>
        Open TribeOS Bot
      </a>

      <p className="text-xs text-zinc-600">
        No account needed — your Telegram identity is used automatically.
      </p>
    </div>
  );
}
