import { randomUUID } from "node:crypto";
import { NextResponse } from "../compat.js";
import { z } from "zod";
import { getSessionViewer } from "../viewer.js";
import { clubDatabase, databaseResult } from "./database.js";
import { createServiceSupabaseClient } from "../context.js";
import { MAX_RECEIPT_BYTES, RECEIPT_BUCKET, receiptType } from "../../shared/receipt-files.js";

export const runtime = "nodejs";
const fail=(error,status=400)=>NextResponse.json({error},{status});
export async function POST(request,{params}) {
  const viewer=await getSessionViewer();
  if(!viewer.isAdmin)return fail("Acceso denegado.",403);
  if(request.headers.get("origin")!==new URL(request.url).origin)return fail("Origen no permitido.",403);
  const {id}=await params;
  if(!z.string().uuid().safeParse(id).success)return fail("Pago inválido.");
  if(Number(request.headers.get("content-length"))>MAX_RECEIPT_BYTES+65536)return fail("El recibo no debe superar 4 MB.",413);
  let uploadedPath=null, committed=false;
  const storage=createServiceSupabaseClient().storage.from(RECEIPT_BUCKET);
  try {
    const payment=await databaseResult(clubDatabase().from("annual_payments").select("id,receipt_path").eq("id",id).maybeSingle());
    if(!payment)return fail("El pago ya no existe.",404);
    if(payment.receipt_path)return fail("Este pago ya tiene un recibo registrado.",409);
    const form=await request.formData();const file=form.get("file");
    if(!(file instanceof File) || !file.size)return fail("Selecciona un recibo PDF, JPG o PNG.");
    if(file.size>MAX_RECEIPT_BYTES)return fail("El recibo no debe superar 4 MB.",413);
    const bytes=new Uint8Array(await file.arrayBuffer());
    const type=receiptType(bytes);
    if(!type)return fail("El contenido debe ser un archivo PDF, JPG o PNG válido.");
    uploadedPath=`${id}/${randomUUID()}.${type.extension}`;
    const uploaded=await storage.upload(uploadedPath,bytes,{contentType:type.mime,upsert:false});
    if(uploaded.error)throw uploaded.error;
    const saved=await databaseResult(clubDatabase().from("annual_payments").update({receipt_path:uploadedPath,
      receipt_name:file.name.replace(/[\r\n\\/]/g,"_").slice(0,180),receipt_type:type.mime,receipt_size:file.size,
      receipt_uploaded_at:new Date().toISOString(),receipt_uploaded_by:viewer.guardianId})
      .eq("id",id).is("receipt_path",null).select("id").maybeSingle());
    if(!saved)return fail("El pago cambió o alguien adjuntó otro recibo. Actualiza la cuadrícula.",409);
    committed=true;return NextResponse.json({success:true});
  } catch { return fail("No se pudo guardar el recibo. Intenta de nuevo.",500); }
  finally {
    if(uploadedPath && !committed) {
      const result=await storage.remove([uploadedPath]).catch(()=>({error:true}));
      if(result.error)console.error("[receipts.cleanup] pending cleanup",{path:uploadedPath});
    }
  }
}
export async function GET(request,{params}) {
  if(!(await getSessionViewer()).isAdmin)return fail("Acceso denegado.",403);
  const {id}=await params;
  if(!z.string().uuid().safeParse(id).success)return fail("Pago inválido.");
  try {
    const payment=await databaseResult(clubDatabase().from("annual_payments").select("receipt_path,receipt_type,receipt_name").eq("id",id).maybeSingle());
    if(!payment?.receipt_path)return fail("Este pago no tiene recibo.",404);
    const {data,error}=await createServiceSupabaseClient().storage.from(RECEIPT_BUCKET).download(payment.receipt_path);
    if(error)throw error;
    return new Response(data,{headers:{"Content-Type":payment.receipt_type,"Content-Disposition":`attachment; filename*=UTF-8''${encodeURIComponent(payment.receipt_name)}`,
      "Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"sandbox"}});
  } catch {return fail("No se pudo descargar el recibo.",500);}
}
