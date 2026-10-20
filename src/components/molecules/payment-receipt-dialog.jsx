import { mobileFetch as fetch } from "@/services/client.js";
"use client";
import { useEffect, useRef, useState } from "react";
import { BusyOverlay } from "@/components/molecules/busy-overlay.jsx";
export function PaymentReceiptDialog({payment,participant,onClose,onSaved}) {
  const dialog=useRef(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>{const node=dialog.current;node.showModal();return ()=>node.close();},[]);
  async function submit(event) {
    event.preventDefault();if(busy)return;
    const form=new FormData(event.currentTarget);
    const file=form.get("file");
    if(!file?.size || file.size>4*1024*1024){setError("Selecciona un archivo de hasta 4 MB.");return;}
    setBusy(true);setError("");
    try {
      const response=await fetch(`/api/admin/payments/${payment.id}/receipt`,{method:"POST",body:form});
      const result=await response.json();if(!response.ok)throw Error(result.error);
      onSaved();
    } catch(err){setError(err.message || "No se pudo subir el recibo.");setBusy(false);}
  }
  return <dialog ref={dialog} className="delete-record-dialog" aria-labelledby="receipt-title" onCancel={event=>{event.preventDefault();if(!busy)onClose();}}>
    <BusyOverlay active={busy} message="Guardando recibo…" />
    <form className="panel-form" onSubmit={submit}>
      <h2 id="receipt-title">Adjuntar recibo · {payment.membership_year}</h2>
      <p><strong>{participant.full_name}</strong><br />Pago realizado por {payment.payer_name}</p>
      <p>Adjunta el comprobante enviado por el contacto. Se guardará de forma privada con esta anualidad.</p>
      <label className="text-field">Recibo de pago<input type="file" name="file" accept="application/pdf,image/jpeg,image/png" required disabled={busy} /><small>PDF, JPG o PNG. Máximo 4 MB. Verifica el archivo: no se reemplaza desde este formulario.</small></label>
      {error ? <p role="alert" className="form-message form-message--error">{error}</p> : null}
      <div className="record-actions"><button className="button button--ghost" type="button" autoFocus disabled={busy} onClick={onClose}>Cancelar</button><button className="button button--primary" disabled={busy}>Guardar recibo</button></div>
    </form>
  </dialog>;
}
