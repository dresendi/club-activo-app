import { mobileFetch as fetch } from "@/services/client.js";
"use client";
import { BusyOverlay } from "@/components/molecules/busy-overlay.jsx";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { TextField } from "@/components/molecules/text-field.jsx";

export function ReportTemplateEditor({ template }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/report-templates", { method: "POST", body: new FormData(form) });
      const result = await response.json();
      setMessage(result.message || result.error || (response.ok ? "Formato guardado." : "No se pudo guardar el formato."));
      if (response.ok) { if (!template) form.reset(); router.refresh(); }
    } catch { setMessage("No se pudo guardar el formato. Intenta de nuevo."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="panel-form">
    <BusyOverlay active={busy} message="Guardando formato…" />
    {template ? <><input type="hidden" name="id" value={template.id} /><input type="hidden" name="revision" value={template.updated_at} /></> : null}
    <TextField label="Nombre del formato" name="title" defaultValue={template?.title || ""} required maxLength={160} />
    <label className="text-field"><span>Descripción e instrucciones</span><textarea name="description" defaultValue={template?.description || ""} maxLength={2000} rows={3} /></label>
    <TextField label={template ? "Reemplazar archivo (opcional)" : "Archivo del formato"} name="file" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.odt,.ods" required={!template} hint="PDF, Word, Excel u OpenDocument. Máximo 10 MB." />
    {template ? <small>Archivo actual: {template.file_name}</small> : null}
    {message ? <p role="status">{message}</p> : null}
    <button className="button button--primary" disabled={busy}>{busy ? "Guardando…" : template ? "Guardar cambios" : "Agregar formato"}</button>
  </form>;
}
