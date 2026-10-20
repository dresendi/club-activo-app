import { createHmac, timingSafeEqual } from "node:crypto";

export const activationProofCookie = "club-activation-proof";
export function createActivationProof(userId, secret, now = Date.now()) {
  const body = Buffer.from(JSON.stringify({ userId, expiresAt: now + 10 * 60 * 1000 })).toString("base64url");
  return `${body}.${createHmac("sha256", secret).update(body).digest("hex")}`;
}
export function verifyActivationProof(value, userId, secret, now = Date.now()) {
  if (!value || !secret) return false;
  try {
    const parts = value.split(".");
    if (parts.length !== 2 || !/^[a-f0-9]{64}$/.test(parts[1])) return false;
    const signature = createHmac("sha256", secret).update(parts[0]).digest();
    if (!timingSafeEqual(signature, Buffer.from(parts[1], "hex"))) return false;
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    return payload.userId === userId && payload.expiresAt > now;
  } catch { return false; }
}
