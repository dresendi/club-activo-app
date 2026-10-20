import { NextResponse } from "../compat.js";
import { getSessionViewer } from "../viewer.js";
import { clubDatabase, databaseResult } from "./database.js";
import { paymentSchema, paymentSearchSchema } from "../../shared/payments.js";

export async function GET(request) {
  if (!(await getSessionViewer()).isAdmin) return NextResponse.json({error:"Acceso denegado."},{status:403});
  const parsed = paymentSearchSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({error:"Filtros inválidos."},{status:400});
  try {
    const {q,type,year,page} = parsed.data;
    const result = await databaseResult(clubDatabase().rpc("search_annual_payments", {search_term:q,search_kind:type,start_year:year,page_number:page}));
    return NextResponse.json(result,{headers:{"Cache-Control":"no-store"}});
  } catch { return NextResponse.json({error:"No se pudieron consultar las anualidades."},{status:500}); }
}
export async function POST(request) {
  const viewer = await getSessionViewer();
  if (!viewer.isAdmin) return NextResponse.json({error:"Acceso denegado."},{status:403});
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({error:"Datos inválidos."},{status:400}); }
  const parsed = paymentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({error:"Revisa contacto, año, monto y fecha del pago."},{status:400});
  try {
    const p=parsed.data;
    await databaseResult(clubDatabase().from("annual_payments").insert({participant_id:p.participantId,membership_year:p.year,
      payer_guardian_id:p.payerGuardianId,amount:p.amount,paid_on:p.paidOn,method:p.method,notes:p.notes,recorded_by:viewer.guardianId}));
    return NextResponse.json({success:true});
  } catch(error) {
    return NextResponse.json({error:error.code === "23505" ? "Este participante ya tiene registrada la anualidad de ese año. Actualiza la cuadrícula." : "No se pudo registrar el pago. Verifica que el contacto siga vinculado y los datos sean correctos."},{status:error.code === "23505" ? 409 : 400});
  }
}
