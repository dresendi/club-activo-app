import { createServerSupabaseClient, createServiceSupabaseClient } from "../context.js";
import { clubDatabase, databaseResult, guardianByAuthId } from "./database.js";
import { canDownloadReports, isAdministrator } from "../../shared/auth/access.js";

export const REPORT_BUCKET = "iap-report-templates";
export async function reportAccount() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { user: null, admin: false, reader: false };
  const guardian = await guardianByAuthId(user.id);
  return { user, admin: isAdministrator(guardian, user), reader: canDownloadReports(guardian, user) };
}
export async function reportTemplates() {
  const account = await reportAccount();
  if (!account.reader) throw new Error("FORBIDDEN");
  return databaseResult(clubDatabase().from("report_templates").select("*").order("updated_at", { ascending: false }));
}
export function reportStorage() { return createServiceSupabaseClient().storage.from(REPORT_BUCKET); }
