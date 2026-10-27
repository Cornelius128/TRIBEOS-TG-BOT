import { defineRailway, postgres, preserve, project, service } from "railway/iac";

// Apply with: railway login && railway link && railway config plan && railway config apply
// Secrets are preserve(): set them once with `railway variables --set` (see DEPLOY.md),
// so their values live in Railway and never in this repository.
// NODE_ENV is deliberately not set: it is visible at build time and would make pnpm skip
// devDependencies (prisma, typescript, tailwind) that the builds need.

export default defineRailway(() => {
  const db = postgres("postgres");

  const bot = service("bot", {
    build: {
      builder: "RAILPACK",
      buildCommand: "pnpm --filter @tribeos/database generate && pnpm --filter @tribeos/bot build",
      watchPatterns: ["apps/bot/**", "packages/**", "pnpm-lock.yaml"],
    },
    deploy: {
      startCommand: "pnpm --filter @tribeos/bot start",
      healthcheckPath: "/health",
      healthcheckTimeout: 60,
      restartPolicyType: "ON_FAILURE",
      restartPolicyMaxRetries: 10,
      // Rate limiting and the expiry sweeper run in-process; keep one replica.
      numReplicas: 1,
    },
    env: {
      DATABASE_URL: db.env.DATABASE_URL,
      DB_CONNECTION_LIMIT: "5",
      BOT_TOKEN: preserve(),
      BOT_USERNAME: preserve(),
      BOT_WEBHOOK_SECRET: preserve(),
      DASHBOARD_URL: preserve(),
      SENTRY_DSN: preserve(),
    },
  });

  const web = service("web", {
    build: {
      builder: "RAILPACK",
      buildCommand: "pnpm --filter @tribeos/database generate && pnpm --filter web build",
      watchPatterns: ["apps/web/**", "packages/**", "pnpm-lock.yaml"],
    },
    deploy: {
      startCommand: "pnpm --filter web start",
      preDeployCommand: ["pnpm --filter @tribeos/database migrate:deploy"],
      healthcheckPath: "/api/health",
      healthcheckTimeout: 120,
      restartPolicyType: "ON_FAILURE",
      restartPolicyMaxRetries: 10,
      // The API rate limiter is in-memory; scale past one replica only after moving it to Redis.
      numReplicas: 1,
    },
    env: {
      DATABASE_URL: db.env.DATABASE_URL,
      DB_CONNECTION_LIMIT: "10",
      AUTH_SECRET: preserve(),
      TELEGRAM_BOT_TOKEN: bot.env.BOT_TOKEN,
      BOT_USERNAME: bot.env.BOT_USERNAME,
      NEXT_PUBLIC_BOT_USERNAME: bot.env.BOT_USERNAME,
      SENTRY_DSN: preserve(),
      NEXT_PUBLIC_SENTRY_DSN: preserve(),
    },
  });

  return project("tribeos", { resources: [db, bot, web] });
});
