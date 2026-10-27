import { describe, it, expect } from "vitest";
import {
  generateReferralCode,
  generateChallenge,
  generateSecureToken,
  paginate,
  isValidCampaignTransition,
  formatLeaderboardPosition,
  truncate,
} from "../utils/index.js";
import { REFERRAL_CODE_PREFIX, REFERRAL_CODE_LENGTH } from "../constants/index.js";
import { CAMPAIGN_STATUS_TRANSITIONS } from "../types/index.js";

describe("generateReferralCode", () => {
  it("produces a code with the correct prefix", () => {
    const code = generateReferralCode();
    expect(code.startsWith(REFERRAL_CODE_PREFIX)).toBe(true);
  });

  it("produces a code of correct total length", () => {
    const code = generateReferralCode();
    expect(code.length).toBe(REFERRAL_CODE_PREFIX.length + REFERRAL_CODE_LENGTH);
  });

  it("only contains alphanumeric characters after prefix", () => {
    const code = generateReferralCode();
    const body = code.slice(REFERRAL_CODE_PREFIX.length);
    expect(/^[a-zA-Z0-9]+$/.test(body)).toBe(true);
  });

  it("generates unique codes", () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateReferralCode()));
    expect(codes.size).toBe(100);
  });
});

describe("generateChallenge", () => {
  it("produces a non-empty string", () => {
    expect(generateChallenge().length).toBeGreaterThan(0);
  });

  it("generates unique challenges", () => {
    const challenges = new Set(Array.from({ length: 20 }, () => generateChallenge()));
    expect(challenges.size).toBe(20);
  });
});

describe("generateSecureToken", () => {
  it("defaults to a reasonable length", () => {
    expect(generateSecureToken().length).toBeGreaterThan(20);
  });
});

describe("paginate", () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1);

  it("returns correct items for page 1", () => {
    const result = paginate(items, 1, 10);
    expect(result.items).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(result.total).toBe(25);
    expect(result.hasNext).toBe(true);
    expect(result.hasPrev).toBe(false);
  });

  it("returns correct items for the last partial page", () => {
    const result = paginate(items, 3, 10);
    expect(result.items).toEqual([21, 22, 23, 24, 25]);
    expect(result.hasNext).toBe(false);
    expect(result.hasPrev).toBe(true);
  });
});

describe("isValidCampaignTransition", () => {
  it("allows DRAFT → SCHEDULED", () => {
    expect(isValidCampaignTransition("DRAFT", "SCHEDULED", CAMPAIGN_STATUS_TRANSITIONS)).toBe(true);
  });

  it("allows ACTIVE → PAUSED", () => {
    expect(isValidCampaignTransition("ACTIVE", "PAUSED", CAMPAIGN_STATUS_TRANSITIONS)).toBe(true);
  });

  it("allows DRAFT → ACTIVE (direct launch)", () => {
    expect(isValidCampaignTransition("DRAFT", "ACTIVE", CAMPAIGN_STATUS_TRANSITIONS)).toBe(true);
  });

  it("rejects COMPLETED → ACTIVE", () => {
    expect(isValidCampaignTransition("COMPLETED", "ACTIVE", CAMPAIGN_STATUS_TRANSITIONS)).toBe(false);
  });

  it("rejects same-status transition ACTIVE → ACTIVE", () => {
    expect(isValidCampaignTransition("ACTIVE", "ACTIVE", CAMPAIGN_STATUS_TRANSITIONS)).toBe(false);
  });
});

describe("formatLeaderboardPosition", () => {
  it("returns medal for positions 1-3", () => {
    expect(formatLeaderboardPosition(1)).toBe("🥇");
    expect(formatLeaderboardPosition(2)).toBe("🥈");
    expect(formatLeaderboardPosition(3)).toBe("🥉");
  });

  it("returns #N for other positions", () => {
    expect(formatLeaderboardPosition(4)).toBe("#4");
    expect(formatLeaderboardPosition(100)).toBe("#100");
  });
});

describe("truncate", () => {
  it("returns text unchanged if within limit", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("truncates with ellipsis", () => {
    const result = truncate("hello world", 8);
    expect(result).toBe("hello...");
    expect(result.length).toBe(8);
  });
});
