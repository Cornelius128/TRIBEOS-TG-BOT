export const BOT_COMMANDS = [
  { command: "start", description: "Open the main menu" },
  { command: "dashboard", description: "Open TribeOS web dashboard" },
  { command: "help", description: "Show available commands" },
  { command: "link", description: "Link a Telegram group" },
  { command: "referral", description: "Get your invite link" },
  { command: "myreferrals", description: "View your referral stats" },
  { command: "leaderboard", description: "View campaign leaderboard" },
  { command: "campaign", description: "View active campaign details" },
  { command: "rules", description: "View campaign rules" },
  { command: "stats", description: "View your personal stats" },
  { command: "portal", description: "Post community action board (group admins)" },
  { command: "flashbounty", description: "Start a Flash Bounty (group admins)" },
  { command: "claim", description: "Claim Mystery Box reward" },
  { command: "poach", description: "Poach an inactive referral" },
];

export const REFERRAL_CODE_PREFIX = "ref_";
export const REFERRAL_CODE_LENGTH = 12;

export const DASHBOARD_URL = (
  process.env.DASHBOARD_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");
