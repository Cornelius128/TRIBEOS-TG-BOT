import { randomBytes } from "crypto";
import { REFERRAL_CODE_LENGTH, REFERRAL_CODE_PREFIX } from "../constants/index.js";

export function generateReferralCode(): string {
  const bytes = randomBytes(Math.ceil(REFERRAL_CODE_LENGTH * 0.75));
  const code = bytes
    .toString("base64url")
    .slice(0, REFERRAL_CODE_LENGTH)
    .replace(/[^a-zA-Z0-9]/g, "x");
  return `${REFERRAL_CODE_PREFIX}${code}`;
}

export function generateChallenge(): string {
  return randomBytes(24).toString("base64url");
}

export function generateSecureToken(length = 32): string {
  return randomBytes(length).toString("base64url");
}

export function paginate<T>(items: T[], page: number, limit: number) {
  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  return {
    items: items.slice(offset, offset + limit),
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export function isValidCampaignTransition(
  from: string,
  to: string,
  transitions: Record<string, string[]>
): boolean {
  return transitions[from]?.includes(to) ?? false;
}

export function formatLeaderboardPosition(position: number): string {
  if (position === 1) return "🥇";
  if (position === 2) return "🥈";
  if (position === 3) return "🥉";
  return `#${position}`;
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}
