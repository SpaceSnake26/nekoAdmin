import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

// Signs and verifies one-click unsubscribe tokens. The token encodes the
// email + an issued-at timestamp, signed with UNSUBSCRIBE_HMAC_SECRET.
//
// Format: base64url(`${email}|${iat}`) + "." + base64url(hmac)

function secret(): string {
  const s = process.env.UNSUBSCRIBE_HMAC_SECRET;
  if (!s) throw new Error("UNSUBSCRIBE_HMAC_SECRET is not set");
  return s;
}

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromB64url(s: string): Buffer {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function signUnsubscribeToken(email: string): string {
  const payload = `${email}|${Date.now()}`;
  const body = b64url(Buffer.from(payload, "utf8"));
  const mac = b64url(createHmac("sha256", secret()).update(body).digest());
  return `${body}.${mac}`;
}

export function verifyUnsubscribeToken(token: string): {
  email: string;
  iat: number;
} | null {
  const dot = token.indexOf(".");
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  let expected: Buffer;
  let given: Buffer;
  try {
    expected = createHmac("sha256", secret()).update(body).digest();
    given = fromB64url(mac);
  } catch {
    return null;
  }
  if (expected.length !== given.length) return null;
  if (!timingSafeEqual(expected, given)) return null;
  const decoded = fromB64url(body).toString("utf8");
  const sep = decoded.indexOf("|");
  if (sep < 0) return null;
  const email = decoded.slice(0, sep);
  const iat = Number(decoded.slice(sep + 1));
  if (!email || !Number.isFinite(iat)) return null;
  return { email, iat };
}
