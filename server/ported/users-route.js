import { NextResponse } from "../compat.js";
import { z } from "zod";
import { getSessionViewer } from "../viewer.js";
import { clubDatabase, databaseResult } from "./database.js";
import { personNameShape } from "../../shared/auth/validation.js";
import { nameColumns } from "../../shared/names.js";
import { revalidatePath } from "../compat.js";
import { createServiceSupabaseClient } from "../context.js";
import { canDeleteRecord, deletionSchema } from "../../shared/auth/deletion.js";
import { RECEIPT_BUCKET } from "../../shared/receipt-files.js";

const tables = { contact: "guardians", participant: "participants" };
export async function DELETE(request) {
  const viewer = await getSessionViewer();
  if (!viewer.isAdmin) return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }
  const parsed = deletionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Confirma el borrado escribiendo ELIMINAR." }, { status: 400 });
  const { id, type } = parsed.data;
  try {
    const db = clubDatabase();
    const record = await databaseResult(db.from(tables[type]).select(type === "contact" ? "id,role,auth_user_id" : "id").eq("id", id).maybeSingle());
    if (!record) return NextResponse.json({ error: "El registro ya no existe. Actualiza la búsqueda." }, { status: 404 });
    if (!canDeleteRecord(viewer, record, type)) return NextResponse.json({ error: "No puedes borrar tu propia cuenta ni una cuenta administradora." }, { status: 403 });
    const receipts = type === "participant" ? await databaseResult(db.from("annual_payments").select("receipt_path").eq("participant_id",id).not("receipt_path","is",null)) : [];
    if (type === "contact" && record.auth_user_id) {
      const admin = createServiceSupabaseClient().auth.admin;
      const identity = await admin.getUserById(record.auth_user_id);
      if (identity.error) throw identity.error;
      if (identity.data.user.app_metadata?.role === "admin") return NextResponse.json({ error: "La identidad de acceso pertenece a un administrador." }, { status: 403 });
      // FK cascades remove guardian, requests, invitations and links atomically.
      // Existing JWTs cannot access the portal: every request checks the live guardian.
      const { error } = await admin.deleteUser(record.auth_user_id, false);
      if (error) throw error;
    } else {
      let deletion = db.from(tables[type]).delete().eq("id", id);
      if (type === "contact") deletion = deletion.is("auth_user_id", null).neq("role", "admin");
      const deleted = await databaseResult(deletion.select("id").maybeSingle());
      if (!deleted) return NextResponse.json({ error: "El registro cambió. Actualiza la búsqueda antes de eliminarlo." }, { status: 409 });
    }
    revalidatePath("/admin");
    revalidatePath("/admin/usuarios");
    if (receipts.length) {
      const cleanup = await createServiceSupabaseClient().storage.from(RECEIPT_BUCKET).remove(receipts.map(item=>item.receipt_path)).catch(()=>({error:true}));
      if (cleanup.error) console.error("[receipts.delete-cleanup]",{paths:receipts.map(item=>item.receipt_path)});
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "No se pudo completar el borrado. Verifica que la migración esté aplicada y que la cuenta no tenga registros administrativos protegidos." }, { status: 409 });
  }
}
export async function GET(request) {
  if (!(await getSessionViewer()).isAdmin) return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const table = tables[params.get("type")];
  const term = (params.get("q") || "").trim().slice(0, 100);
  if (!table) return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
  if (term.length < 2) return NextResponse.json({ results: [] });
  try {
    // Escape LIKE wildcards; user input never becomes a PostgREST filter expression.
    const literal = term.replace(/[\\%_]/g, "\\$&");
    const columns = "id,full_name,first_name,paternal_surname,maternal_surname" + (table === "guardians" ? ",phone,status,role,roles" : "");
    const results = await databaseResult(clubDatabase().from(table).select(columns)
      .ilike("full_name", `%${literal}%`).order("full_name").order("id").limit(20));
    return NextResponse.json({ results }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "No se pudo consultar la base de datos." }, { status: 500 }); }
}

export async function PATCH(request) {
  if (!(await getSessionViewer()).isAdmin) return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
  let payload;
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }
  const parsed = z.object({ id: z.string().uuid(), type: z.enum(["contact", "participant"]), ...personNameShape }).safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Revisa el nombre y los apellidos.", errors: parsed.error.flatten().fieldErrors }, { status: 400 });
  try {
    const result = await databaseResult(clubDatabase().from(tables[parsed.data.type])
      .update(nameColumns(parsed.data)).eq("id", parsed.data.id).select("id").maybeSingle());
    if (!result) return NextResponse.json({ error: "El registro ya no existe." }, { status: 404 });
    revalidatePath("/admin");
    return NextResponse.json({ success: true });
  } catch { return NextResponse.json({ error: "No se pudieron guardar los cambios." }, { status: 500 }); }
}
