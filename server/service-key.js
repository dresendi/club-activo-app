// Server configuration guard only. Supabase verifies the key and its privileges.
export function normalizeServiceKey(value) {
  const key = typeof value === "string" ? value.trim() : "";
  if (!key) {
    throw Object.assign(new Error("Missing SUPABASE_SERVICE_ROLE_KEY"), {
      code: "SERVICE_ROLE_KEY_MISSING"
    });
  }

  if (/^sb_secret_[A-Za-z0-9_-]+$/.test(key)) return key;

  try {
    const parts = key.split(".");
    if (parts.length === 3 && parts.every(part => /^[A-Za-z0-9_-]+$/.test(part))) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      if (payload?.role === "service_role") return key;
    }
  } catch {}

  throw Object.assign(new Error(
    "SUPABASE_SERVICE_ROLE_KEY must be a Supabase secret key or legacy service_role JWT."
  ), { code: "SERVICE_ROLE_KEY_INVALID_FORMAT" });
}
