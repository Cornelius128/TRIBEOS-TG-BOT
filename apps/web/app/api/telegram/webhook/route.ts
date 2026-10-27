import { NextRequest, NextResponse } from "next/server";

const BOT_API_URL = process.env.BOT_WEBHOOK_URL ?? "http://localhost:3001/webhook";

// Forward Telegram updates to the bot process
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.text();

  try {
    const res = await fetch(BOT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(expectedSecret ? { "x-webhook-secret": expectedSecret } : {}),
      },
      body,
    });
    return NextResponse.json({ ok: true }, { status: res.ok ? 200 : 502 });
  } catch {
    return NextResponse.json({ error: "Bot unreachable" }, { status: 502 });
  }
}
