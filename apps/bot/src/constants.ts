export const BOT_COMMANDS = [
  { command: "start", description: "Open the main menu" },
  { command: "help", description: "Show available commands" },
  { command: "referral", description: "Get your invite link" },
  { command: "myreferrals", description: "View your referral stats" },
  { command: "leaderboard", description: "View campaign leaderboard" },
  { command: "campaign", description: "View active campaign details" },
  { command: "rules", description: "View campaign rules" },
  { command: "stats", description: "View your personal stats" },
  { command: "portal", description: "Post community action board (group admins)" },
  { command: "flashbounty", description: "Start a Flash Bounty (group admins)" },
];

export const REFERRAL_CODE_PREFIX = "ref_";
export const REFERRAL_CODE_LENGTH = 12;

export const DASHBOARD_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://tribeos.app";
