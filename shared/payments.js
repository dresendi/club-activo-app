import { z } from "zod";
export function mexicoDate() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = type => parts.find(part => part.type === type).value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
export const paymentSchema = z.object({
  participantId: z.string().uuid(),
  payerGuardianId: z.string().uuid(),
  year: z.coerce.number().int().min(2000).max(2100),
  amount: z.string().regex(/^\d{1,8}(\.\d{1,2})?$/).refine(value => Number(value) > 0),
  paidOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const parsed = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0,10) === value && value <= mexicoDate();
  }),
  method: z.enum(["cash", "transfer", "other"]),
  notes: z.string().trim().max(500).default("")
});
export const paymentSearchSchema = z.object({
  q: z.string().trim().max(100).default(""),
  type: z.enum(["participant", "contact"]).default("participant"),
  year: z.coerce.number().int().min(2000).max(2098),
  page: z.coerce.number().int().min(0).max(100000).default(0)
});
