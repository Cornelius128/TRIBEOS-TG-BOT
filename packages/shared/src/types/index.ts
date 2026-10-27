// ─── Module Types ───────────────────────────────────────────────────────────

export const MODULE_IDS = {
  REFERRAL: "referral",
  ANTI_FRAUD: "anti_fraud",
  WELCOME: "welcome",
  MODERATION: "moderation",
  QUESTS: "quests",
  TEAM_BATTLES: "team_battles",
  ANALYTICS: "analytics",
  REWARDS: "rewards",
  WALLET_VERIFY: "wallet_verify",
  ANNOUNCEMENTS: "announcements",
  REPUTATION: "reputation",
} as const;

export type ModuleId = (typeof MODULE_IDS)[keyof typeof MODULE_IDS];

export type ModuleStatus = "AVAILABLE" | "PLANNED" | "UNAVAILABLE";

export interface ModuleDefinition {
  id: ModuleId;
  name: string;
  description: string;
  status: ModuleStatus;
  defaultConfig: Record<string, unknown>;
  dependencies: ModuleId[];
  requiredBotPermissions: string[];
}

// ─── Campaign Types ──────────────────────────────────────────────────────────

export type CampaignStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "ACTIVE"
  | "PAUSED"
  | "UNDER_REVIEW"
  | "COMPLETED"
  | "CANCELLED";

export const CAMPAIGN_STATUS_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ["SCHEDULED", "ACTIVE", "CANCELLED"],
  SCHEDULED: ["ACTIVE", "CANCELLED", "DRAFT"],
  ACTIVE: ["PAUSED", "UNDER_REVIEW", "CANCELLED"],
  PAUSED: ["ACTIVE", "UNDER_REVIEW", "CANCELLED"],
  UNDER_REVIEW: ["ACTIVE", "COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

// ─── Referral Types ──────────────────────────────────────────────────────────

export type ReferralStatus =
  | "REGISTERED"
  | "PENDING"
  | "QUALIFIED"
  | "REJECTED"
  | "REVERSED";

// ─── Group Admin Role ────────────────────────────────────────────────────────

export type GroupAdminRole = "OWNER" | "ADMIN" | "VIEWER";

// ─── Audit Event Types ───────────────────────────────────────────────────────

export type AuditEventType =
  | "GROUP_LINKED"
  | "GROUP_UNLINKED"
  | "MODULE_ENABLED"
  | "MODULE_DISABLED"
  | "MODULE_CONFIG_UPDATED"
  | "CAMPAIGN_CREATED"
  | "CAMPAIGN_STATUS_CHANGED"
  | "CAMPAIGN_FINALIZED"
  | "PARTICIPANT_REGISTERED"
  | "REFERRAL_CREATED"
  | "REFERRAL_QUALIFIED"
  | "REFERRAL_REJECTED"
  | "REFERRAL_REVERSED"
  | "REWARD_ALLOCATED"
  | "REWARD_CLAIMED"
  | "ADMIN_ADDED"
  | "ADMIN_REMOVED"
  | "DISQUALIFICATION"
  | "MANUAL_OVERRIDE";

// ─── Telegram Types ──────────────────────────────────────────────────────────

export interface TelegramUser {
  id: number;
  username?: string;
  firstName: string;
  lastName?: string;
  languageCode?: string;
}

export interface TelegramGroup {
  id: number;
  title: string;
  username?: string;
  type: "group" | "supergroup" | "channel";
  memberCount?: number;
}
