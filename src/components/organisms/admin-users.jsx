import { mobileFetch as fetch } from "@/services/client.js";
"use client";
import { BusyOverlay } from "@/components/molecules/busy-overlay.jsx";
import { useEffect, useState } from "react";
import { PersonNameFields } from "@/components/molecules/person-name-fields.jsx";
import { deactivateAccountAction, enableAccountAction } from "@/app/actions";
import { ActionIcon } from "@/components/atoms/action-icon.jsx";
import { DeleteRecordDialog } from "@/components/molecules/delete-record-dialog.jsx";
import { assignableRoles } from "@/lib/auth/roles";
import { useRouter } from "next/navigation";

export function AdminUsers() {
  const router = useRouter();
  const [roles, setRoles] = useState([]);
  const [type, setType] = useState("contact");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState(-1);
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  useEffect(() => {
    const controller = new AbortController();
    setResults([]); setActive(-1);
    if (query.trim().length < 2 || selected) { setLoading(false); return () => controller.abort(); }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/users?type=${type}&q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setResults(data.results); setMessage(data.results.length ? "" : "Sin coincidencias.");
      } catch (error) { if (error.name !== "AbortError") setMessage(error.message || "No se pudo buscar."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, type, selected]);
  function choose(item) { setSelected(item); setRoles(item.roles || []); setQuery(item.full_name); setResults([]); setMessage(""); setErrors({}); }
  async function saveRoles() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/users/roles", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selected.id, roles })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSelected({ ...selected, roles: result.roles });
      setRoles(result.roles);
      setMessage("Roles actualizados.");
      router.refresh();
    } catch (error) { setMessage(error.message || "No se pudieron guardar los roles."); }
    finally { setBusy(false); }
  }
  async function save(event) {
    event.preventDefault(); setBusy(true); setMessage("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...data, id: selected.id, type }) });
      const result = await response.json();
      setErrors(result.errors || {});
      if (!response.ok) throw new Error(result.error);
      const fullName = [data.firstName.trim(), data.paternalSurname.trim(), data.maternalSurname.trim()].filter(Boolean).join(" ");
      setSelected({ ...selected, first_name: data.firstName.trim(), paternal_surname: data.paternalSurname.trim(), maternal_surname: data.maternalSurname.trim(), full_name: fullName });
      setQuery(fullName);
      setMessage("Nombre actualizado.");
    } catch (error) { setMessage(error.message || "No se pudo guardar."); }
    finally { setBusy(false); }
  }
  async function deactivate() {
    if (!window.confirm(`¿Desactivar la cuenta de ${selected.full_name}? Perderá acceso al portal.`)) return;
    setBusy(true);
    try {
      const form = new FormData(); form.set("guardianId", selected.id);
      const result = await deactivateAccountAction({}, form);
      setMessage(result.message || result.formError);
      if (result.success) setSelected({ ...selected, status: "inactive" });
    } catch { setMessage("No se pudo desactivar la cuenta."); }
    finally { setBusy(false); }
  }
  async function enable() {
    setBusy(true);
    try {
      const form = new FormData(); form.set("guardianId", selected.id);
      const result = await enableAccountAction({}, form);
      setMessage(result.message || result.formError);
      if (result.success) setSelected({ ...selected, status: result.status });
    } catch { setMessage("No se pudo habilitar la cuenta."); }
    finally { setBusy(false); }
  }
  return <section className="admin-dashboard">
    <BusyOverlay active={busy} message="Guardando cambios…" />
    <h1>Administrar Usuarios</h1>
    <label className="text-field">Buscar en
      <select disabled={busy} value={type} onChange={event => { setType(event.target.value); setSelected(null); setQuery(""); setMessage(""); }}>
        <option value="contact">Contactos</option><option value="participant">Participantes</option>
      </select>
    </label>
    <label className="text-field" htmlFor="user-search">Buscar por nombre o apellidos</label>
    <input id="user-search" className="admin-user-search" role="combobox" autoComplete="off" disabled={busy}
      aria-autocomplete="list" aria-controls="user-results" aria-expanded={results.length > 0}
      aria-activedescendant={active >= 0 ? `user-option-${active}` : undefined} value={query}
      onChange={event => { setQuery(event.target.value); setSelected(null); setMessage(""); }}
      onKeyDown={event => {
        if (event.key === "ArrowDown") { event.preventDefault(); setActive(index => Math.min(index + 1, results.length - 1)); }
        if (event.key === "ArrowUp") { event.preventDefault(); setActive(index => Math.max(0, index - 1)); }
        if (event.key === "Enter" && results[active]) { event.preventDefault(); choose(results[active]); }
        if (event.key === "Escape") { setResults([]); setActive(-1); }
      }} />
    <p className="panel-form__footnote">Escribe al menos dos caracteres. Se muestran hasta 20 coincidencias; agrega apellidos para precisar.</p>
    <ul id="user-results" role="listbox" aria-label="Coincidencias" className="admin-user-results">
      {results.map((item, index) => <li key={item.id} id={`user-option-${index}`} role="option" aria-selected={active === index}>
        <button type="button" tabIndex={-1} onClick={() => choose(item)}>{item.full_name} <small>{item.phone || `ID: ${item.id}`}</small></button>
      </li>)}
    </ul>
    <p role="status">{loading ? "Buscando…" : message}</p>
    {selected ? <form key={`${type}-${selected.id}`} onSubmit={save} className="panel-form">
      {!selected.paternal_surname ? <p>Nombre anterior: {selected.full_name}. Revisa y separa sus apellidos antes de guardar.</p> : null}
      <fieldset disabled={busy} className="admin-user-editor">
        <PersonNameFields participantLabel={type === "participant"} values={selected} errors={errors} />
        <button className="button button--primary" type="submit"><ActionIcon name="save" />{busy ? "Procesando…" : "Guardar nombre"}</button>
      </fieldset>
      {type === "contact" ? <><p>Estado: {selected.status === "inactive" ? "Inactiva" : selected.status === "active" ? "Activa" : selected.status === "approved_pending_activation" ? "Pendiente de activar" : selected.status === "rejected" ? "Rechazada" : "Pendiente de revisión"}</p>
        {selected.role !== "admin" && selected.status !== "active" ? <button type="button" className="button button--primary" disabled={busy} onClick={enable}>Activar cuenta</button> : null}
        {selected.role !== "admin" && selected.status !== "inactive" ? <button type="button" className="button button--secondary" disabled={busy} onClick={deactivate}><ActionIcon name="block" />Desactivar cuenta</button> : null}</> : null}
      {type === "contact" ? <fieldset disabled={busy} className="admin-user-editor">
        <legend>Roles del usuario</legend>
        <p>Selecciona los roles adicionales de esta cuenta.</p>
        {selected.role === "admin" ? <p>Administrador: acceso conservado.</p> : null}
        {assignableRoles.map(role => <label key={role.value}>
          <input type="checkbox" checked={roles.includes(role.value)}
            onChange={event => setRoles(current => event.target.checked ? [...current, role.value] : current.filter(value => value !== role.value))} />
          {" "}<strong>{role.label}</strong> — {role.description}
        </label>)}
        <button type="button" className="button button--primary" onClick={saveRoles}><ActionIcon name="save" />Guardar roles</button>
      </fieldset> : null}
      {selected.role !== "admin" ? <div className="record-danger-zone">
        <p>Elimina este registro y sus datos asociados de forma definitiva.</p>
        <button type="button" className="button button--danger" disabled={busy} onClick={() => setDeleteTarget({ record: selected, type })}><ActionIcon name="trash" />Borrar permanentemente</button>
      </div> : null}
    </form> : null}
    {deleteTarget ? <DeleteRecordDialog record={deleteTarget.record} type={deleteTarget.type}
      onClose={() => setDeleteTarget(null)} onDeleted={() => {
        setDeleteTarget(null); setSelected(null); setQuery(""); setResults([]); setErrors({});
        setMessage("Registro eliminado permanentemente.");
      }} /> : null}
  </section>;
}
