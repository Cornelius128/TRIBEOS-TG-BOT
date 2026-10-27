import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { InputFile, type Api } from "grammy";
import { prisma } from "../db.js";
import { getActiveCampaignForGroup, getOrCreateReferralCode } from "./referral.js";
import { getActiveFlashBounty } from "./flash-bounty.js";

const require = createRequire(import.meta.url);

// Satori keeps one font per family+weight, so each subset needs its own family name;
// the fontFamily list below then falls back across them per glyph.
const SUBSETS = ["latin", "latin-ext", "cyrillic", "greek"] as const;
const FONT_FAMILY = SUBSETS.map((s) => `Inter-${s}`).join(", ");

const FONTS = SUBSETS.flatMap((subset) =>
  ([400, 600, 800] as const).map((weight) => ({
    name: `Inter-${subset}`,
    weight,
    style: "normal" as const,
    data: readFileSync(require.resolve(`@fontsource/inter/files/inter-${subset}-${weight}-normal.woff`)),
  }))
);

const C = {
  bg: "#09090b",
  surface: "#18181b",
  border: "#27272a",
  text: "#fafafa",
  textSecondary: "#a1a1aa",
  textMuted: "#71717a",
  accent: "#f97316",
  accentTrack: "#431407",
};

const WIDTH = 1200;
const HEIGHT = 675;
const PAD = 56;

export interface StatsCardData {
  displayName: string;
  username: string | null;
  avatar: string | null;
  communityTitle: string;
  campaignName: string;
  rank: number;
  totalParticipants: number;
  points: number;
  qualified: number;
  pending: number;
  nextRankPoints: number | null;
  endsAt: Date;
  bounty: { multiplier: number; endsAt: Date } | null;
  botUsername: string;
}

export type StatsResult =
  | { ok: true; card: StatsCardData; referralLink: string }
  | { ok: false; message: string };

// ─── Data ─────────────────────────────────────────────────────────────────────

export async function getParticipantStats(
  api: Api,
  groupId: string,
  telegramUserId: string,
  botUsername: string
): Promise<StatsResult> {
  const campaign = await getActiveCampaignForGroup(groupId);
  if (!campaign) return { ok: false, message: "No active campaign in this community right now." };

  const [group, participant] = await Promise.all([
    prisma.telegramGroup.findUnique({ where: { id: groupId } }),
    prisma.campaignParticipant.findUnique({
      where: { campaignId_telegramUserId: { campaignId: campaign.id, telegramUserId } },
    }),
  ]);
  if (!group || !participant) {
    return { ok: false, message: "You haven't joined this campaign yet — get your invite link to start earning points!" };
  }

  const [above, totalParticipants, pending, nextAbove, bounty, code, avatar] = await Promise.all([
    prisma.campaignParticipant.count({
      where: { campaignId: campaign.id, totalPoints: { gt: participant.totalPoints } },
    }),
    prisma.campaignParticipant.count({ where: { campaignId: campaign.id } }),
    prisma.referral.count({
      where: { campaignId: campaign.id, referrerId: participant.id, status: { in: ["REGISTERED", "PENDING"] } },
    }),
    prisma.campaignParticipant.findFirst({
      where: { campaignId: campaign.id, totalPoints: { gt: participant.totalPoints } },
      orderBy: { totalPoints: "asc" },
      select: { totalPoints: true },
    }),
    getActiveFlashBounty(groupId, campaign.id),
    getOrCreateReferralCode(campaign.id, participant.id, botUsername),
    fetchAvatar(api, Number(telegramUserId)),
  ]);

  return {
    ok: true,
    referralLink: code.deepLink,
    card: {
      displayName: participant.telegramName ?? participant.telegramUsername ?? "Member",
      username: participant.telegramUsername,
      avatar,
      communityTitle: group.title,
      campaignName: campaign.name,
      rank: above + 1,
      totalParticipants,
      points: participant.totalPoints,
      qualified: participant.qualifiedReferrals,
      pending,
      nextRankPoints: nextAbove?.totalPoints ?? null,
      endsAt: campaign.endAt,
      bounty: bounty ? { multiplier: bounty.multiplier, endsAt: bounty.endAt } : null,
      botUsername,
    },
  };
}

async function fetchAvatar(api: Api, userId: number): Promise<string | null> {
  try {
    const photos = await api.getUserProfilePhotos(userId, { limit: 1 });
    const sizes = photos.photos[0];
    if (!sizes?.length) return null;
    const size = sizes.find((s) => s.width >= 160) ?? sizes[sizes.length - 1];
    const file = await api.getFile(size.file_id);
    if (!file.file_path) return null;
    const res = await fetch(`https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

// ─── Formatting ───────────────────────────────────────────────────────────────

// Inter covers Latin, Cyrillic and Greek; anything else (emoji, CJK) would render as tofu.
function cleanText(value: string, max: number, fallback: string): string {
  const cleaned = value
    .replace(/[^\p{Script=Latin}\p{Script=Cyrillic}\p{Script=Greek}\p{Nd}\p{P}\p{Zs}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return fallback;
  return cleaned.length > max ? `${cleaned.slice(0, max - 1).trimEnd()}…` : cleaned;
}

function formatNumber(n: number): string {
  if (Math.abs(n) >= 10_000) {
    return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  }
  return n.toLocaleString("en");
}

export function formatRemaining(until: Date, now = new Date()): string {
  const mins = Math.max(0, Math.round((until.getTime() - now.getTime()) / 60_000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

// ─── Rendering ────────────────────────────────────────────────────────────────

type Style = Record<string, string | number>;
interface SatoriNode {
  type: string;
  props: Record<string, unknown>;
}

function el(style: Style, ...children: Array<SatoriNode | string>): SatoriNode {
  return {
    type: "div",
    props: { style: { display: "flex", ...style }, children: children.length === 1 ? children[0] : children },
  };
}

function text(value: string, style: Style): SatoriNode {
  return { type: "div", props: { style: { display: "flex", ...style }, children: value } };
}

function avatarNode(card: StatsCardData, name: string): SatoriNode {
  const size = 128;
  const ring: Style = { width: size, height: size, borderRadius: size / 2, border: `4px solid ${C.accent}` };
  if (card.avatar) {
    return { type: "img", props: { src: card.avatar, width: size, height: size, style: { ...ring, objectFit: "cover" } } };
  }
  const initials = name
    .replace(/^@/, "")
    .split(/[\s_]+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return el(
    { ...ring, alignItems: "center", justifyContent: "center", backgroundColor: C.surface },
    text(initials || "?", { fontSize: 48, fontWeight: 800, color: C.text })
  );
}

function statTile(label: string, value: number): SatoriNode {
  return el(
    {
      flex: 1,
      flexDirection: "column",
      gap: 6,
      padding: "22px 26px",
      backgroundColor: C.surface,
      border: `1px solid ${C.border}`,
      borderRadius: 20,
    },
    text(label, { fontSize: 20, fontWeight: 600, color: C.textSecondary }),
    text(formatNumber(value), { fontSize: 52, fontWeight: 800, color: C.text, lineHeight: 1 })
  );
}

function buildTree(card: StatsCardData): SatoriNode {
  const cleanedName = cleanText(card.displayName, 22, "");
  const name = cleanedName || (card.username ? `@${card.username}` : "Member");
  // When the name had to fall back to the @username, don't repeat it on the next line.
  const showUsername = !!card.username && !!cleanedName;
  const community = cleanText(card.communityTitle, 40, "Community");
  const campaign = cleanText(card.campaignName, 44, "Campaign");

  const isLeader = card.rank === 1 && card.points > 0;
  const gap = card.nextRankPoints !== null ? card.nextRankPoints - card.points + 1 : 0;
  const progress = card.nextRankPoints !== null && card.nextRankPoints > 0
    ? Math.min(1, card.points / (card.nextRankPoints + 1))
    : isLeader ? 1 : 0;
  const meterLabel = card.nextRankPoints !== null
    ? `${formatNumber(gap)} ${gap === 1 ? "point" : "points"} to pass #${card.rank - 1}`
    : isLeader ? "You're leading the campaign" : "Invite your first friend to get on the board";

  const badge = card.bounty
    ? el(
        { alignItems: "center", gap: 10, padding: "10px 20px", borderRadius: 999, backgroundColor: C.accent },
        text(`${card.bounty.multiplier}× FLASH BOUNTY`, { fontSize: 20, fontWeight: 800, color: C.bg, letterSpacing: 1 }),
        text(`· ${formatRemaining(card.bounty.endsAt)} left`, { fontSize: 20, fontWeight: 600, color: C.bg })
      )
    : el(
        { alignItems: "center", padding: "10px 20px", borderRadius: 999, border: `1px solid ${C.border}`, backgroundColor: C.surface },
        text(`Ends in ${formatRemaining(card.endsAt)}`, { fontSize: 20, fontWeight: 600, color: C.textSecondary })
      );

  return el(
    {
      // Satori adds padding outside width/height, so size the content box explicitly.
      width: WIDTH - PAD * 2,
      height: HEIGHT - PAD * 2,
      flexDirection: "column",
      justifyContent: "space-between",
      padding: PAD,
      backgroundColor: C.bg,
      backgroundImage: "radial-gradient(circle at 88% 0%, rgba(249,115,22,0.24), rgba(9,9,11,0) 55%)",
      fontFamily: FONT_FAMILY,
      color: C.text,
    },
    // Header
    el(
      { justifyContent: "space-between", alignItems: "flex-start" },
      el(
        { flexDirection: "column", gap: 6 },
        text("TRIBEOS", { fontSize: 18, fontWeight: 800, color: C.accent, letterSpacing: 5 }),
        text(community, { fontSize: 26, fontWeight: 600, color: C.textSecondary })
      ),
      badge
    ),
    // Identity + hero rank
    el(
      { justifyContent: "space-between", alignItems: "center" },
      el(
        { alignItems: "center", gap: 28 },
        avatarNode(card, name),
        el(
          { flexDirection: "column", gap: 6 },
          text(name, { fontSize: 54, fontWeight: 800, color: C.text, lineHeight: 1.05 }),
          text(showUsername ? `@${card.username}` : campaign, { fontSize: 24, fontWeight: 400, color: C.textSecondary }),
          ...(showUsername ? [text(campaign, { fontSize: 22, fontWeight: 400, color: C.textMuted })] : [])
        )
      ),
      el(
        { flexDirection: "column", alignItems: "flex-end" },
        text("Your rank", { fontSize: 22, fontWeight: 600, color: C.textSecondary }),
        text(`#${card.rank}`, { fontSize: 132, fontWeight: 800, color: C.text, lineHeight: 1, letterSpacing: -4 }),
        text(`of ${formatNumber(card.totalParticipants)} participants`, { fontSize: 22, fontWeight: 400, color: C.textSecondary })
      )
    ),
    // Stat tiles + meter
    el(
      { flexDirection: "column", gap: 22 },
      el(
        { gap: 20 },
        statTile("Points", card.points),
        statTile("Qualified referrals", card.qualified),
        statTile("Pending", card.pending)
      ),
      el(
        { flexDirection: "column", gap: 10 },
        el(
          { justifyContent: "space-between" },
          text(meterLabel, { fontSize: 20, fontWeight: 600, color: C.textSecondary }),
          text(`Invite friends via @${card.botUsername}`, { fontSize: 20, fontWeight: 400, color: C.textMuted })
        ),
        el(
          { width: "100%", height: 14, borderRadius: 7, backgroundColor: C.accentTrack },
          el({ width: `${Math.round(progress * 100)}%`, height: 14, borderRadius: 7, backgroundColor: C.accent })
        )
      )
    )
  );
}

export async function renderStatsCard(card: StatsCardData): Promise<Buffer> {
  // satori's types expect a ReactNode; the plain {type, props} tree is what it consumes at runtime.
  const svg = await satori(buildTree(card) as unknown as Parameters<typeof satori>[0], {
    width: WIDTH,
    height: HEIGHT,
    fonts: FONTS,
  });
  return new Resvg(svg, { fitTo: { mode: "width", value: WIDTH * 2 } }).render().asPng();
}

// ─── Caption + keyboard ───────────────────────────────────────────────────────

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function statsCaption(card: StatsCardData, referralLink: string): string {
  return (
    `📊 <b>${escapeHtml(card.campaignName)}</b> — rank #${card.rank} of ${card.totalParticipants}\n` +
    `🏆 ${formatNumber(card.points)} points · ✅ ${card.qualified} qualified · ⏳ ${card.pending} pending\n` +
    (card.bounty ? `⚡ ${card.bounty.multiplier}× Flash Bounty live for ${formatRemaining(card.bounty.endsAt)}\n` : "") +
    `\n🔗 Your link: ${escapeHtml(referralLink)}`
  );
}

export async function sendStatsCard(
  api: Api,
  chatId: number,
  stats: Extract<StatsResult, { ok: true }>,
  replyToMessageId?: number
) {
  const png = await renderStatsCard(stats.card);
  return api.sendPhoto(chatId, new InputFile(png, "tribeos-stats.png"), {
    caption: statsCaption(stats.card, stats.referralLink),
    parse_mode: "HTML",
    reply_markup: statsShareKeyboard(stats.card, stats.referralLink),
    ...(replyToMessageId ? { reply_parameters: { message_id: replyToMessageId } } : {}),
  });
}

export function statsShareKeyboard(card: StatsCardData, referralLink: string) {
  const shareText = `Join me in ${card.communityTitle} 🚀`;
  return {
    inline_keyboard: [[{
      text: "📤 Share my invite link",
      url: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`,
    }]],
  };
}
