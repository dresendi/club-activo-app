import { z } from "zod";
import { clubDatabase, databaseResult } from "./database.js";
import { reportAccount, reportStorage } from "./reports.js";

export const runtime = "nodejs";
export async function GET(request, { params }) {
  try {
    const account = await reportAccount();
    if (!account.reader) return new Response("Acceso restringido al comité y al administrador.", { status: 403 });
    const { id } = await params;
    if (!z.string().uuid().safeParse(id).success) return new Response("Formato inválido.", { status: 400 });
    const template = await databaseResult(clubDatabase().from("report_templates").select("object_path,file_name").eq("id", id).maybeSingle());
    if (!template) return new Response("Formato no encontrado.", { status: 404 });
    const { data, error } = await reportStorage().download(template.object_path);
    if (error) throw error;
    return new Response(data, { headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(template.file_name).replace(/'/g, "%27")}`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"
    } });
  } catch { return new Response("No fue posible descargar el archivo.", { status: 500 }); }
}
