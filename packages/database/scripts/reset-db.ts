/**
 * Reset all data in the database for fresh testing.
 * Usage: npx tsx packages/database/scripts/reset-db.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("⚠️  Resetting ALL data in the database...");

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      audit_logs,
      job_outbox,
      verification_tokens,
      sessions,
      accounts,
      config_versions,
      group_module_configs,
      group_link_challenges,
      group_admins,
      qualification_checks,
      mystery_boxes,
      poach_events,
      flash_bounties,
      referral_invite_links,
      referrals,
      referral_codes,
      campaign_participants,
      campaigns,
      team_memberships,
      teams,
      reward_allocations,
      reward_pools,
      announcements,
      telegram_events,
      telegram_groups,
      users
    RESTART IDENTITY CASCADE
  `);

  console.log("✅ Database reset complete. All tables are empty.");
}

main()
  .catch((e) => {
    console.error("Reset failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
