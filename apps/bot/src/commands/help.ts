import type { Context } from "grammy";
import { DASHBOARD_URL } from "../constants.js";

export async function handleHelp(ctx: Context) {
  await ctx.reply(
    `🤖 **TribeOS Bot Commands**\n\n` +
    `/start — Register and get started\n` +
    `/campaign — View active campaign details\n` +
    `/referral — Get your unique referral link\n` +
    `/myreferrals — View your referral stats\n` +
    `/leaderboard — View the campaign leaderboard\n` +
    `/rules — View campaign rules\n` +
    `/stats — View your personal stats\n\n` +
    `📊 Full dashboard: ${DASHBOARD_URL}`,
    { parse_mode: "Markdown" }
  );
}
