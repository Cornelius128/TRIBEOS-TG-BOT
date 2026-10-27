import type { Bot } from "grammy";
import { prisma } from "../db.js";
import { endFlashBounty } from "./flash-bounty.js";
import { captureError } from "../monitoring.js";

const SWEEP_INTERVAL_MS = 30_000;

// Ends flash bounties (with the group announcement) and closes campaigns past their end date.
// Runs inside the always-on bot process, so no separate cron service is needed.
export function startExpirySweeper(bot: Bot) {
  let running = false;

  const sweep = async () => {
    if (running) return;
    running = true;
    try {
      const now = new Date();
      const due = await prisma.flashBounty.findMany({
        where: { status: "ACTIVE", endAt: { lte: now } },
        include: { group: { select: { telegramId: true } } },
      });
      for (const bounty of due) {
        await endFlashBounty(bot, bounty.id, bounty.group.telegramId).catch((err) =>
          captureError(err, { bountyId: bounty.id })
        );
      }

      await prisma.campaign.updateMany({
        where: { status: "ACTIVE", endAt: { lte: now } },
        data: { status: "UNDER_REVIEW" },
      });

      // Send scheduled announcements that are now due
      const scheduled = await prisma.announcement.findMany({
        where: { status: "SCHEDULED", scheduledAt: { lte: now } },
        include: { group: { select: { telegramId: true } } },
      });
      for (const ann of scheduled) {
        try {
          await bot.api.sendMessage(ann.group.telegramId, ann.content, { parse_mode: "HTML" });
          await prisma.announcement.update({
            where: { id: ann.id },
            data: { status: "SENT", sentAt: now },
          });
        } catch (err) {
          captureError(err, { announcementId: ann.id });
          await prisma.announcement.update({
            where: { id: ann.id },
            data: { status: "FAILED" },
          }).catch(() => {});
        }
      }
    } catch (err) {
      captureError(err, { job: "expiry-sweep" });
    } finally {
      running = false;
    }
  };

  void sweep();
  return setInterval(sweep, SWEEP_INTERVAL_MS);
}
