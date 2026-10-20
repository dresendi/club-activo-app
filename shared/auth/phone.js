import { parsePhoneNumberFromString } from "libphonenumber-js/max";

/** Canonical account identifier. Requires an explicit country calling code. */
export function normalizeInternationalPhone(value) {
  if (typeof value !== "string") return null;
  const input = value.trim();
  // Do not guess a country, extract a number from prose, or accept extensions.
  if (!/^\+[\d\s().-]+$/.test(input)) return null;
  const phone = parsePhoneNumberFromString(input, { extract: false });
  if (!phone || phone.ext || !phone.isValid()) return null;
  return phone.number;
}

export const INTERNATIONAL_PHONE_HINT =
  "Incluye + y el código de país: +52 para México, +1 para Estados Unidos, u otro país.";
