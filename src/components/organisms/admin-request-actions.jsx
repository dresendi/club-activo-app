"use client";

import { useActionState } from "react";
import { approveRequestAction, deactivateAccountAction } from "@/app/actions";
import { SubmitButton } from "@/components/atoms/submit-button.jsx";

const initialState = { success: false, formError: "", message: "" };
export function AdminRequestActions({ request, participants, whatsappUrl }) {
  const [approval, approve] = useActionState(approveRequestAction, initialState);
  const [deactivation, deactivate] = useActionState(deactivateAccountAction, initialState);
  const canApprove = request.status === "pending_review" ||
    (request.status === "approved" && request.guardian.status === "pending_review");
  const approved = request.status === "approved" || approval.success;
  return (
    <>
      <form action={approve} className="request-card__form">
        <input type="hidden" name="requestId" value={request.id} />
        <label className="text-field">
          <span>Participante que se vinculará</span>
          <select name="participantId" defaultValue={request.participant_id || ""} disabled={!canApprove}>
            <option value="">Crear participante: {request.participant_name}</option>
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>{participant.full_name} · {participant.id.slice(0, 8)}</option>
            ))}
          </select>
          <small>Selecciona uno existente solo después de confirmar que es la misma persona.</small>
        </label>
        {approval.formError ? <p role="alert" className="form-message form-message--error">{approval.formError}</p> : null}
        {approval.message ? <p role="status" className="form-message form-message--success">{approval.message}</p> : null}
        <SubmitButton disabled={!canApprove || approval.success}>Habilitar acceso y vincular participante</SubmitButton>
      </form>
      {approved && whatsappUrl && request.guardian.status !== "active" && request.guardian.status !== "inactive" ? (
        <a className="button button--primary" href={whatsappUrl} target="_blank" rel="noopener noreferrer">Abrir WhatsApp para invitar</a>
      ) : null}
      <form action={deactivate} className="request-card__form">
        <input type="hidden" name="guardianId" value={request.guardian_id} />
        {deactivation.formError ? <p role="alert">{deactivation.formError}</p> : null}
        {deactivation.message ? <p role="status">{deactivation.message}</p> : null}
        <SubmitButton disabled={request.guardian.role === "admin" || request.guardian.status === "inactive" || deactivation.success}>Inactivar cuenta del tutor</SubmitButton>
      </form>
    </>
  );
}
