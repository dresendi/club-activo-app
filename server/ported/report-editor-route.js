import { randomUUID } from "node:crypto";
import { NextResponse } from "../compat.js";
import { revalidatePath } from "../compat.js";
import { z } from "zod";
import { clubDatabase, databaseResult } from "./database.js";
import { reportAccount, reportStorage } from "./reports.js";

export const runtime = "nodejs";
const fields = z.object({
  id: z.string().uuid().nullable(),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000),
  revision: z.string().nullable()
});
const json = (message, status = 400) => NextResponse.json({ message }, { status });
export async function POST(request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return json("Origen no permitido.", 403);
  let uploadedPath = null;
  let committed = false;
  try {
    const account = await reportAccount();
    if (!account.admin) return json("Solo el administrador puede modificar formatos.", 403);
    if (Number(request.headers.get("content-length")) > 11 * 1024 * 1024) return json("El archivo debe pesar como máximo 10 MB.", 413);
    const form = await request.formData();
    const parsed = fields.safeParse({id: form.get("id") || null, title: form.get("title"), description: form.get("description") || "", revision: form.get("revision") || null});
    if (!parsed.success) return json("Revisa el título y la descripción.");
    const { id, title, description, revision } = parsed.data;
    const db = clubDatabase();
    const existing = id ? await databaseResult(db.from("report_templates").select("*").eq("id", id).maybeSingle()) : null;
    if (id && !existing) return json("El formato ya no existe.", 404);
    if (existing && existing.updated_at !== revision) return json("Este formato cambió. Recarga antes de editarlo.", 409);
    const file = form.get("file");
    const hasFile = file instanceof File && file.size > 0;
    if (!hasFile && !existing) return json("Selecciona un archivo.");
    let values = { title, description, updated_by: account.user.id, updated_at: new Date().toISOString() };
    if (hasFile) {
      const extension = file.name.split(".").pop().toLowerCase();
      if (!["pdf", "doc", "docx", "xls", "xlsx", "odt", "ods"].includes(extension)) return json("Usa PDF, Word, Excel u OpenDocument.");
      if (file.size > 10 * 1024 * 1024) return json("El archivo debe pesar como máximo 10 MB.", 413);
      uploadedPath = `${randomUUID()}.${extension}`;
      const { error } = await reportStorage().upload(uploadedPath, file, { contentType: "application/octet-stream", upsert: false });
      if (error) throw error;
      values = { ...values, object_path: uploadedPath, file_name: file.name.replace(/[\r\n\\/]/g, "_").slice(0, 200), file_size: file.size };
    }
    const saved = await databaseResult(existing
      ? db.from("report_templates").update(values).eq("id", id).eq("updated_at", revision).select("id").maybeSingle()
      : db.from("report_templates").insert(values).select("id").single());
    if (!saved) return json("Otro administrador modificó el formato. Recarga e intenta de nuevo.", 409);
    committed = true;
    if (uploadedPath && existing) {
      const { error } = await reportStorage().remove([existing.object_path]);
      if (error) console.error("[reports.cleanup]", { code: error.statusCode });
    }
    revalidatePath("/formatos-iap");
    revalidatePath("/admin/formatos-iap");
    return json("Formato guardado.", 200);
  } catch (error) {
    console.error("[reports.save]", { code: error?.code || error?.statusCode });
    return json("No se pudo guardar el formato. Intenta de nuevo.", 500);
  } finally {
    if (uploadedPath && !committed) await reportStorage().remove([uploadedPath]).catch(() => {});
  }
}
