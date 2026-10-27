// ─── Brand ───────────────────────────────────────────────────────────────────

export const BRAND = {
  name: "TribeOS",
  tagline: "One platform. One standard. Every community configured.",
  domain: "tribeos.app",
  supportEmail: "support@tribeos.app",
} as const;

// ─── Referral ─────────────────────────────────────────────────────────────────

export const REFERRAL_CODE_PREFIX = "ref_";
export const REFERRAL_CODE_LENGTH = 12;

// ─── Bot Commands ─────────────────────────────────────────────────────────────

export const BOT_COMMANDS = [
  { command: "start", description: "Register and get started" },
  { command: "help", description: "Show available commands" },
  { command: "referral", description: "Get your referral link" },
  { command: "myreferrals", description: "View your referral stats" },
  { command: "leaderboard", description: "View campaign leaderboard" },
  { command: "campaign", description: "View active campaign details" },
  { command: "rules", description: "View campaign rules" },
  { command: "stats", description: "View your personal stats" },
] as const;

// ─── Pagination ───────────────────────────────────────────────────────────────

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// ─── Rate Limits ──────────────────────────────────────────────────────────────

export const RATE_LIMITS = {
  referralCodeRequests: { requests: 5, windowMs: 60_000 },
  botCommands: { requests: 20, windowMs: 60_000 },
  apiRequests: { requests: 100, windowMs: 60_000 },
} as const;

// ─── Job Names ────────────────────────────────────────────────────────────────

export const JOB_NAMES = {
  CHECK_MEMBERSHIP: "check-membership",
  QUALIFY_REFERRAL: "qualify-referral",
  CAMPAIGN_SETTLE: "campaign-settle",
  SEND_ANNOUNCEMENT: "send-announcement",
} as const;
