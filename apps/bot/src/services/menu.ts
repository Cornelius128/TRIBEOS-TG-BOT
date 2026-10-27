import { InlineKeyboard, Keyboard } from "grammy";
import { prisma } from "../db.js";
import { DASHBOARD_URL } from "../constants.js";

// ─── Main DM Menu ─────────────────────────────────────────────────────────────

export function mainMenuKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("📋 My Communities", "m:groups")
    .row()
    .text("❓ Help", "m:help")
    .text("🔗 About", "m:about");
}

// ─── Groups List ──────────────────────────────────────────────────────────────

export async function groupsListKeyboard(telegramUserId: string): Promise<InlineKeyboard> {
  const admins = await prisma.groupAdmin.findMany({
    where: { telegramUserId },
    include: { group: true },
    orderBy: { verifiedAt: "desc" },
  });

  const kb = new InlineKeyboard();

  if (admins.length === 0) {
    kb.text("📖 How to link a group", "m:howto");
  } else {
    for (const admin of admins) {
      const icon = admin.group.botIsAdmin ? "✅" : "⚠️";
      const title = admin.group.title.length > 28
        ? admin.group.title.slice(0, 25) + "…"
        : admin.group.title;
      kb.text(`${icon} ${title}`, `g:menu:${admin.groupId}`).row();
    }
  }

  kb.row().text("← Back", "m:main");
  return kb;
}

// ─── Group Menu (member + admin view) ────────────────────────────────────────

export function groupMemberKeyboard(groupId: string): InlineKeyboard {
  return new InlineKeyboard()
    .text("🔗 Get My Invite Link", `g:ref:${groupId}`)
    .row()
    .text("🏆 Leaderboard", `g:lb:${groupId}`)
    .text("📊 My Stats", `g:st:${groupId}`)
    .row()
    .text("📢 Campaign Info", `g:camp:${groupId}`)
    .row()
    .text("← Back", "m:groups");
}

export function groupAdminKeyboard(groupId: string): InlineKeyboard {
  const dashboardUrl = `${DASHBOARD_URL}/auth/telegram?redirect=/dashboard/groups/${groupId}`;
  const isHttps = DASHBOARD_URL.startsWith("https://");

  const kb = new InlineKeyboard()
    .text("🔗 Get My Invite Link", `g:ref:${groupId}`)
    .row()
    .text("🏆 Leaderboard", `g:lb:${groupId}`)
    .text("📊 My Stats", `g:st:${groupId}`)
    .row()
    .text("📢 Campaign Info", `g:camp:${groupId}`)
    .row()
    .text("⚡ Flash Bounty", `g:fb:${groupId}`)
    .text("🛡️ Sybil Filter", `g:sybil:${groupId}`)
    .row();

  // Telegram requires HTTPS for Web App buttons; fall back to a regular URL in dev
  if (isHttps) {
    kb.webApp("🖥️ Open Dashboard", dashboardUrl);
  } else {
    kb.url("🖥️ Open Dashboard", dashboardUrl);
  }

  kb.row().text("← Back", "m:groups");
  return kb;
}

// ─── Flash Bounty Menu ────────────────────────────────────────────────────────

export async function flashBountyKeyboard(groupId: string): Promise<InlineKeyboard> {
  const group = await prisma.telegramGroup.findUnique({ where: { id: groupId } });
  const active = group ? await prisma.flashBounty.findFirst({
    where: { groupId, status: "ACTIVE" },
  }) : null;

  const kb = new InlineKeyboard();

  if (active) {
    kb.text(
      `⚡ LIVE: ${active.multiplier}× (${active.durationMinutes}min) — ${active.inviteCount} joins`,
      `g:fb:info:${groupId}`
    ).row()
    .text("🛑 Cancel Bounty", `g:fb:cancel:${groupId}`)
    .row();
  } else {
    kb.text("30 min × 2×", `g:fb:30_2:${groupId}`)
      .text("60 min × 3×", `g:fb:60_3:${groupId}`)
      .row()
      .text("2 hr × 5×", `g:fb:120_5:${groupId}`)
      .text("🖥️ Custom...", `g:fb:custom:${groupId}`)
      .row();
  }

  kb.text("← Back", `g:admin:${groupId}`);
  return kb;
}

// ─── In-group Portal Keyboard ─────────────────────────────────────────────────

export function portalKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text("🔗 Get My Invite Link", "p:ref")
    .row()
    .text("🏆 Leaderboard", "p:lb")
    .text("📊 My Stats", "p:st")
    .row()
    .text("📢 Campaign", "p:camp");
}

// ─── Persistent Reply Keyboard (below text input, DM only) ───────────────────

export function persistentKeyboard(): Keyboard {
  return new Keyboard()
    .text("📋 My Communities")
    .text("❓ Help")
    .resized()
    .persistent();
}

// ─── Sybil Filter Menu ────────────────────────────────────────────────────────

export async function sybilFilterKeyboard(groupId: string): Promise<InlineKeyboard> {
  const mc = await prisma.groupModuleConfig.findUnique({
    where: { groupId_moduleId: { groupId, moduleId: "anti_fraud" } },
  });
  const current = ((mc?.config as { filterLevel?: string }) ?? {}).filterLevel ?? "off";

  const levels: [string, string][] = [
    ["off", "🔓 Off"],
    ["easy", "🟢 Level 1 — Easy (30d account)"],
    ["medium", "🟡 Level 2 — Medium (30d + wallet)"],
    ["hardcore", "🔴 Level 3 — Hardcore (90d + on-chain)"],
  ];

  const kb = new InlineKeyboard();
  for (const [level, label] of levels) {
    const isActive = current === level;
    kb.text(isActive ? `✅ ${label}` : label, `g:sybil:set:${level}:${groupId}`).row();
  }
  kb.text("← Back", `g:admin:${groupId}`);
  return kb;
}
