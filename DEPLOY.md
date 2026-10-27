# Deploying TribeOS to Railway

The whole project — Postgres, the bot, and the web dashboard — is defined in
[`.railway/railway.ts`](.railway/railway.ts) (Railway Infrastructure as Code). Secrets are
`preserve()` in that file, so you set them once with the CLI and they never enter the repo.

| Service    | What it runs                                    | Health check   |
|------------|-------------------------------------------------|----------------|
| `postgres` | Railway Postgres                                | —              |
| `bot`      | grammY bot in webhook mode + expiry sweeper     | `/health`      |
| `web`      | Next.js dashboard / Mini App; runs migrations before each deploy | `/api/health` |

## 1. Create the project and apply the config

Run everything from the repository root.

```bash
railway login
```

```bash
railway init --name tribeos
```

```bash
railway config plan
```

```bash
railway config apply
```

## 2. Generate public domains

```bash
railway domain --service web
```

```bash
railway domain --service bot
```

Note the web domain (e.g. `web-production-xxxx.up.railway.app`); you need it in step 3.
The bot picks up its own domain automatically (`RAILWAY_PUBLIC_DOMAIN`) and registers its
Telegram webhook on startup.

## 3. Set secrets

Bot token (paste it when prompted, so it stays out of your shell history):

```bash
railway variable set BOT_TOKEN --stdin --service bot --skip-deploys
```

```bash
railway variable set BOT_USERNAME=YourBotUsername --service bot --skip-deploys
```

Webhook secret — must be hex: Telegram only allows `A-Z a-z 0-9 _ -` in it.

```bash
railway variable set "BOT_WEBHOOK_SECRET=$(openssl rand -hex 32)" --service bot --skip-deploys
```

```bash
railway variable set DASHBOARD_URL=https://<your-web-domain> --service bot --skip-deploys
```

```bash
railway variable set "AUTH_SECRET=$(openssl rand -base64 32)" --service web --skip-deploys
```

`TELEGRAM_BOT_TOKEN`, `BOT_USERNAME` and `NEXT_PUBLIC_BOT_USERNAME` on `web` reference the bot
service, and `DATABASE_URL` references Postgres — nothing to set for those.

## 4. Error monitoring (Sentry)

Create two projects in Sentry (Node.js for the bot, Next.js for the web) and set their DSNs:

```bash
railway variable set SENTRY_DSN=<bot-dsn> --service bot --skip-deploys
```

```bash
railway variable set SENTRY_DSN=<web-dsn> NEXT_PUBLIC_SENTRY_DSN=<web-dsn> --service web --skip-deploys
```

Sentry stays off while these are empty. `NEXT_PUBLIC_SENTRY_DSN` is baked into the browser bundle
at build time, so changing it needs a redeploy of `web`.

## 5. Deploy

```bash
railway up --service web --detach
```

```bash
railway up --service bot --detach
```

To deploy on every push instead, push the repo to GitHub and connect it:

```bash
railway service source connect --repo <owner>/<repo> --branch main --service web
```

```bash
railway service source connect --repo <owner>/<repo> --branch main --service bot
```

## 6. Verify

```bash
curl https://<your-web-domain>/api/health
```

```bash
curl https://<your-bot-domain>/health
```

Then send `/start` to the bot. The bottom-left menu button should read **Open App**
(it only switches to the Mini App button when `DASHBOARD_URL` is HTTPS).

## Custom domain

```bash
railway domain app.yourdomain.com --service web
```

Add the DNS records it prints, then point the bot at it:

```bash
railway variable set DASHBOARD_URL=https://app.yourdomain.com --service bot
```

Mini App buttons work with any HTTPS URL; no BotFather domain registration is needed for them.

## What runs where

- **Connection pooling** — `DB_CONNECTION_LIMIT` caps Prisma's pool (bot 5, web 10), keeping both
  services well under Postgres' 100-connection default.
- **Rate limiting** — web: per-IP limits on every `/api` route in `apps/web/proxy.ts`
  (sign-in 10/min, link challenge 5 per 10 min, everything else 120/min). Bot: 5 actions per
  3 s per user in DMs and on buttons. Both are in-memory, so each service runs one replica.
- **Scheduled work** — the bot sweeps every 30 s: it ends expired Flash Bounties (and posts the
  "Bounty ended" message) and moves finished campaigns to `UNDER_REVIEW`. No cron service needed.
- **Migrations** — `prisma migrate deploy` runs as the web service's pre-deploy step; a failed
  migration stops the deploy.
