import { mobileFetch as fetch } from "@/services/client.js";
"use client";
import { BusyOverlay } from "@/components/molecules/busy-overlay.jsx";
import { useEffect, useRef, useState } from "react";
import { ActionIcon } from "@/components/atoms/action-icon.jsx";

export function DeleteRecordDialog({ record, type, onClose, onDeleted }) {
  const dialog = useRef(null);
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { dialog.current.showModal(); }, []);
  async function remove(event) {
    event.preventDefault();
    if (busy || confirmation !== "ELIMINAR") return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: record.id, type, confirmation }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      dialog.current.close(); onDeleted();
    } catch (err) { setError(err.message || "No se pudo borrar el registro."); setBusy(false); }
  }
  return <dialog ref={dialog} className="delete-record-dialog" aria-labelledby="delete-title" aria-describedby="delete-description" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <BusyOverlay active={busy} message="Eliminando registro…" />
    <form onSubmit={remove} className="panel-form">
      <div className="delete-record-dialog__symbol"><ActionIcon name="warning" width="28" height="28" /></div>
      <h2 id="delete-title">¿Borrar permanentemente?</h2>
      <div id="delete-description">
        <p>Vas a eliminar a <strong>{record.full_name}</strong>{record.phone ? ` (${record.phone})` : ""}.</p>
        <p>{type === "contact" ? "Se borrarán su cuenta de acceso, solicitudes, invitaciones y vínculos. Los participantes, pagos y recibos registrados se conservarán, incluido el nombre del pagador. Podrás volver a registrar el teléfono." : "Se borrarán el participante, sus solicitudes, sus vínculos, sus anualidades y sus recibos registrados. Las cuentas de los contactos se conservarán."}</p>
        <p><strong>Esta acción no se puede deshacer.</strong></p>
      </div>
      <label className="text-field">Escribe ELIMINAR para confirmar
        <input value={confirmation} onChange={event => setConfirmation(event.target.value)} autoComplete="off" spellCheck={false} disabled={busy} />
      </label>
      {error ? <p role="alert" className="form-message form-message--error">{error}</p> : null}
      <div className="record-actions">
        <button type="button" className="button button--ghost" autoFocus disabled={busy} onClick={onClose}>Cancelar</button>
        <button type="submit" className="button button--danger" disabled={busy || confirmation !== "ELIMINAR"}><ActionIcon name="trash" />{busy ? "Eliminando…" : "Sí, borrar permanentemente"}</button>
      </div>
    </form>
  </dialog>;
}
