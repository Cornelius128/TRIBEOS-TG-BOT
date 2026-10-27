import { z } from "zod";

// ─── Campaign Schemas ────────────────────────────────────────────────────────

export const CreateCampaignSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(2000).optional(),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  timezone: z.string().default("UTC"),
  maxParticipants: z.number().int().positive().optional(),
  pointsPerReferral: z.number().int().nonnegative().default(1),
  qualificationRules: z
    .object({
      requireBotStart: z.boolean().default(true),
      requireGroupJoin: z.boolean().default(true),
      minMembershipDays: z.number().int().nonnegative().default(0),
      requireMissionCompletion: z.boolean().default(false),
    })
    .default({}),
  rewardStructure: z
    .object({
      topN: z.number().int().positive().optional(),
      rewardDescription: z.string().max(500).optional(),
    })
    .optional(),
  rules: z.string().max(5000).optional(),
  contestReviewPeriodHours: z.number().int().positive().default(48),
});

export type CreateCampaignInput = z.infer<typeof CreateCampaignSchema>;

// ─── Module Config Schemas ───────────────────────────────────────────────────

export const ReferralModuleConfigSchema = z.object({
  enabled: z.boolean(),
  defaultPointsPerReferral: z.number().int().nonnegative().default(1),
  autoQualify: z.boolean().default(false),
  requireGroupMembership: z.boolean().default(true),
});

export const WelcomeModuleConfigSchema = z.object({
  enabled: z.boolean(),
  welcomeMessage: z.string().max(4096).optional(),
  rulesMessage: z.string().max(4096).optional(),
  showInstructions: z.boolean().default(true),
});

export const ModerationModuleConfigSchema = z.object({
  enabled: z.boolean(),
  antiSpam: z.boolean().default(true),
  maxMessagesPerMinute: z.number().int().positive().default(5),
  maxWarnings: z.number().int().positive().default(3),
  muteOnMaxWarnings: z.boolean().default(true),
  bannedWords: z.array(z.string()).default([]),
});

export const AnnouncementModuleConfigSchema = z.object({
  enabled: z.boolean(),
  allowScheduled: z.boolean().default(true),
});

// ─── Group Linking ────────────────────────────────────────────────────────────

export const LinkGroupSchema = z.object({
  challengeCode: z.string().min(6).max(64),
  telegramGroupId: z.string(),
});

// ─── Pagination ───────────────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type PaginationInput = z.infer<typeof PaginationSchema>;
