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
    const expectedBuf = Buffer.from(expectedHash, "utf-8");
    const actualBuf = Buffer.from(hash, "utf-8");
    if (
      expectedBuf.length !== actualBuf.length ||
      !crypto.timingSafeEqual(expectedBuf, actualBuf)
    ) return null;

    // Reject data older than 24 hours
    const authDate = parseInt(params.get("auth_date") ?? "0", 10);
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) return null;

    const userStr = params.get("user");
    let user: TelegramWebAppUser | undefined;
    if (userStr) {
      try {
        user = JSON.parse(userStr);
      } catch {
        user = JSON.parse(decodeURIComponent(userStr));
      }
    }

    return { user, auth_date: authDate, query_id: params.get("query_id") ?? undefined };
  } catch {
    return null;
  }
}

/**
 * Verifies official Telegram Login Widget auth data.
 * Used for direct desktop and mobile browser logins outside Telegram.
 */
export function verifyTelegramWidgetData(
  data: Record<string, string | number | undefined | null>,
  botToken: string
): boolean {
  try {
    const hash = data.hash ? String(data.hash) : null;
    if (!hash) return false;

    // Check expiration (24 hours)
    const authDate = Number(data.auth_date ?? 0);
    const now = Math.floor(Date.now() / 1000);
    if (!authDate || now - authDate > 86400) return false;

    // Data-check-string is alphabetical key=value pairs joined by \n (excluding hash)
    const checkString = Object.keys(data)
      .filter((k) => k !== "hash" && data[k] !== undefined && data[k] !== null)
      .sort()
      .map((k) => `${k}=${data[k]}`)
      .join("\n");

    const secretKey = crypto.createHash("sha256").update(botToken).digest();
    const expectedHash = crypto
      .createHmac("sha256", secretKey)
      .update(checkString)
      .digest("hex");

    const expectedBuf = Buffer.from(expectedHash, "utf-8");
    const actualBuf = Buffer.from(hash, "utf-8");
    if (expectedBuf.length !== actualBuf.length) return false;

    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}
