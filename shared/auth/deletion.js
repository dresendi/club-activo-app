import { z } from "zod";

export const deletionSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["contact", "participant"]),
  confirmation: z.literal("ELIMINAR")
});

export function canDeleteRecord(viewer, record, type) {
  return Boolean(viewer?.isAdmin && record &&
    (type === "participant" || (type === "contact" && record.role !== "admin" && record.id !== viewer.guardianId)));
}
