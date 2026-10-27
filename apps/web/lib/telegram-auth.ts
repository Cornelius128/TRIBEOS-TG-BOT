import crypto from "crypto";

export interface TelegramWebAppUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramWebAppData {
  user?: TelegramWebAppUser;
  auth_date: number;
  query_id?: string;
}

export function verifyTelegramWebAppData(
  initData: string,
  botToken: string
): TelegramWebAppData | null {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;

    params.delete("hash");

    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    const secretKey = crypto
      .createHmac("sha256", "WebAppData")
      .update(botToken)
      .digest();

    const expectedHash = crypto
      .createHmac("sha256", secretKey)
      .update(dataCheckString)
      .digest("hex");

    // Constant-time comparison to prevent timing attacks
    const expectedBuf = Buffer.from(expectedHash, "hex");
    const actualBuf = Buffer.from(hash.padEnd(expectedHash.length, "0"), "hex");
    if (
      expectedBuf.length !== actualBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, actualBuf)
    ) return null;

    // Reject data older than 1 hour
    const authDate = parseInt(params.get("auth_date") ?? "0", 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 3600) return null;

    const userStr = params.get("user");
    const user: TelegramWebAppUser | undefined = userStr
      ? JSON.parse(decodeURIComponent(userStr))
      : undefined;

    return { user, auth_date: authDate, query_id: params.get("query_id") ?? undefined };
  } catch {
    return null;
  }
}
