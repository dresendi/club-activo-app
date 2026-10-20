import { DownloadButton } from "@/components/DownloadButton.jsx";
import { mobileFetch as fetch } from "@/services/client.js";
"use client";
import { useEffect, useRef, useState } from "react";
import { BusyOverlay } from "@/components/molecules/busy-overlay.jsx";
import { TextField } from "@/components/molecules/text-field.jsx";
import { PaymentReceiptDialog } from "@/components/molecules/payment-receipt-dialog.jsx";
import { ActionIcon } from "@/components/atoms/action-icon.jsx";

const money = new Intl.NumberFormat("es-MX", {style:"currency",currency:"MXN"});
const methods = {cash:"Efectivo",transfer:"Transferencia",other:"Otro"};
export function AnnualPayments({today}) {
  const [query,setQuery] = useState("");
  const [type,setType] = useState("participant");
  const [year,setYear] = useState(Number(today.slice(0,4))-1);
  const [page,setPage] = useState(0);
  const [revision,setRevision] = useState(0);
  const [data,setData] = useState({rows:[],total:0});
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [message,setMessage] = useState("");
  const [selected,setSelected] = useState(null);
  const [receiptTarget,setReceiptTarget] = useState(null);
  useEffect(()=>{
    const controller=new AbortController();
    setLoading(true);setError("");setData({rows:[],total:0});
    const timer=setTimeout(async()=>{
      try {
        const response=await fetch(`/api/admin/payments?${new URLSearchParams({q:query,type,year:String(year),page:String(page)})}`,{signal:controller.signal});
        const result=await response.json();
        if(!response.ok) throw Error(result.error);
        setData(result);
      } catch(err) {if(err.name!=="AbortError") setError(err.message || "No se pudo consultar.");}
      finally {if(!controller.signal.aborted) setLoading(false);}
    },300);
    return ()=>{clearTimeout(timer);controller.abort();};
  },[query,type,year,page,revision]);
  const years=[year,year+1,year+2];
  return <section className="admin-dashboard">
    <h1>Pagos de anualidades</h1>
    <p>Una anualidad por participante y año. El pago puede realizarlo cualquiera de sus contactos. El estado de pago no activa ni desactiva cuentas.</p>
    <div className="payment-filters">
      <label className="text-field">Buscar por<select value={type} onChange={e=>{setType(e.target.value);setPage(0);}}><option value="participant">Participante</option><option value="contact">Contacto</option></select></label>
      <TextField label={type === "participant" ? "Nombre o apellidos" : "Nombre, apellidos o teléfono del contacto"} name="paymentSearch" value={query} maxLength={100} onChange={e=>{setQuery(e.target.value);setPage(0);}} />
      <label className="text-field">Desde el año<select value={year} onChange={e=>{setYear(Number(e.target.value));setPage(0);}}>{Array.from({length:99},(_,i)=>2000+i).map(y=><option key={y} value={y}>{y}</option>)}</select></label>
    </div>
    <div className="record-actions"><button className="button button--ghost" disabled={year<=2000} onClick={()=>{setYear(y=>Math.max(2000,y-3));setPage(0);}}>← Años anteriores</button><button className="button button--ghost" disabled={year>=2098} onClick={()=>{setYear(y=>Math.min(2098,y+3));setPage(0);}}>Años siguientes →</button></div>
    <p role="status">{loading ? "Buscando anualidades…" : message || `${data.total} ${data.total === 1 ? "participante" : "participantes"}`}</p>
    {error ? <p role="alert">{error} <button type="button" onClick={()=>setRevision(r=>r+1)}>Reintentar</button></p> : null}
    <div className="payment-grid-scroll" tabIndex={0} role="region" aria-label="Anualidades por participante" aria-busy={loading}>
      <table className="payment-grid"><caption>Anualidades {year}–{year+2} · MXN</caption>
        <thead><tr><th scope="col">Participante y contactos</th>{years.map(y=><th key={y} scope="col">{y}</th>)}</tr></thead>
        <tbody>{data.rows.map(row=><tr key={row.id}>
          <th scope="row"><strong>{row.full_name}</strong><small>ID: {row.id.slice(0,8)}</small>{row.contacts.map(contact=><small key={contact.id}>{contact.full_name} · {contact.phone}</small>)}</th>
          {years.map(y=>{const payment=row.payments.find(p=>p.membership_year===y);return <td key={y} data-year={y}>{payment ? <div className="payment-cell"><span className="status-pill">Pagada</span><strong>{money.format(Number(payment.amount))}</strong><span>{payment.paid_on.split("-").reverse().join("/")}</span><small>Pagó: {payment.payer_name}</small><small>{methods[payment.method]}</small>{payment.notes ? <small>{payment.notes}</small> : null}{payment.receipt_path ? <DownloadButton path={`/api/admin/payments/${payment.id}/receipt`}>🧾 Descargar recibo</DownloadButton> : <button className="button button--ghost" onClick={()=>setReceiptTarget({payment,participant:row})}>📎 Adjuntar recibo</button>}</div> : <div className="payment-cell"><span>Sin pago registrado</span><button className="button button--primary" disabled={!row.contacts.length || loading} onClick={()=>setSelected({participant:row,year:y})}>Registrar pago</button>{!row.contacts.length ? <small>Vincula un contacto antes de registrar el pago.</small> : null}</div>}</td>;})}
        </tr>)}</tbody>
      </table>
      {!loading && !error && !data.rows.length ? <p>No hay participantes que coincidan con la búsqueda.</p> : null}
    </div>
    <div className="record-actions"><button className="button button--ghost" disabled={page===0 || loading} onClick={()=>setPage(p=>p-1)}>Anterior</button><span>Página {page+1} de {Math.max(1,Math.ceil(data.total/20))}</span><button className="button button--ghost" disabled={loading || (page+1)*20>=data.total} onClick={()=>setPage(p=>p+1)}>Siguiente</button></div>
    {receiptTarget ? <PaymentReceiptDialog {...receiptTarget} onClose={()=>setReceiptTarget(null)} onSaved={()=>{setReceiptTarget(null);setMessage("Recibo guardado correctamente.");setRevision(r=>r+1);}} /> : null}
    {selected ? <PaymentDialog {...selected} today={today} onClose={()=>setSelected(null)} onSaved={()=>{setSelected(null);setMessage("Pago registrado correctamente.");setRevision(r=>r+1);}} /> : null}
  </section>;
}

function PaymentDialog({participant,year,today,onClose,onSaved}) {
  const dialog=useRef(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>{const node=dialog.current;node.showModal();return ()=>node.close();},[]);
  async function submit(event) {
    event.preventDefault();if(busy)return;
    const fields=Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);setError("");
    try {
      const response=await fetch("/api/admin/payments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...fields,participantId:participant.id,year})});
      const result=await response.json();if(!response.ok)throw Error(result.error);
      onSaved();
    } catch(err) {setError(err.message || "No se pudo registrar el pago.");setBusy(false);}
  }
  return <dialog ref={dialog} className="delete-record-dialog" aria-labelledby="payment-title" onCancel={e=>{e.preventDefault();if(!busy)onClose();}}>
    <BusyOverlay active={busy} message="Registrando pago…" />
    <form className="panel-form" onSubmit={submit}>
      <h2 id="payment-title">Registrar anualidad {year}</h2><p><strong>{participant.full_name}</strong></p>
      <p>Registra únicamente pagos ya recibidos. Se guarda una sola anualidad por año.</p>
      <label className="text-field">Contacto que realizó el pago<select name="payerGuardianId" required disabled={busy} defaultValue=""><option value="" disabled>Selecciona el contacto</option>{participant.contacts.map(c=><option key={c.id} value={c.id}>{c.full_name} · {c.phone}</option>)}</select></label>
      <TextField label="Monto recibido (MXN)" name="amount" type="number" step="0.01" min="0.01" max="99999999.99" required disabled={busy} />
      <TextField label="Fecha del pago" name="paidOn" type="date" defaultValue={today} max={today} required disabled={busy} />
      <label className="text-field">Medio de pago<select name="method" disabled={busy}><option value="cash">Efectivo</option><option value="transfer">Transferencia</option><option value="other">Otro</option></select></label>
      <label className="text-field">Observaciones (opcional)<textarea name="notes" maxLength={500} rows={3} disabled={busy} /></label>
      {error ? <p role="alert" className="form-message form-message--error">{error}</p> : null}
      <div className="record-actions"><button type="button" className="button button--ghost" autoFocus disabled={busy} onClick={onClose}>Cancelar</button><button className="button button--primary" disabled={busy}><ActionIcon name="save" />Guardar pago</button></div>
    </form>
  </dialog>;
}
