import { NextResponse } from "../compat.js";
import { revalidatePath } from "../compat.js";
import { getSessionViewer } from "../viewer.js";
import { clubDatabase, databaseResult } from "./database.js";
import { userRolesSchema } from "../../shared/auth/roles.js";

export async function PATCH(request) {
  if (!(await getSessionViewer()).isAdmin) {
    return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
  }
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Datos inválidos." }, { status: 400 }); }
  const parsed = userRolesSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Selecciona roles válidos." }, { status: 400 });
  try {
    const record = await databaseResult(clubDatabase().from("guardians")
      .update({ roles: parsed.data.roles }).eq("id", parsed.data.id)
      .select("id,roles").maybeSingle());
    if (!record) return NextResponse.json({ error: "La cuenta ya no existe." }, { status: 404 });
    revalidatePath("/", "layout");
    return NextResponse.json({ success: true, roles: record.roles });
  } catch {
    return NextResponse.json({ error: "No se pudieron guardar los roles." }, { status: 500 });
  }
}
