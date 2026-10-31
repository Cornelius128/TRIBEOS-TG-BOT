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

const rawDashboardUrl = (
  process.env.DASHBOARD_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://jayonchain.tech"
).replace(/\/+$/, "");

// Guard: The Express bot service runs on app.jayonchain.tech while the Next.js web dashboard
// runs on jayonchain.tech. If DASHBOARD_URL is accidentally set to the bot's own subdomain, correct it.
export const DASHBOARD_URL =
  rawDashboardUrl === "https://app.jayonchain.tech" || rawDashboardUrl === "http://app.jayonchain.tech"
    ? "https://jayonchain.tech"
    : rawDashboardUrl;
