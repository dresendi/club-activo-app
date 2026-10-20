import { nameColumns } from "../../shared/names.js";
import { createServiceSupabaseClient } from "../context.js";

export function clubDatabase() {
  return createServiceSupabaseClient().schema("club_activo_v2");
}

export async function databaseResult(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export function guardianByPhone(phone) {
  return databaseResult(clubDatabase().from("guardians").select("*").eq("phone", phone).maybeSingle());
}

export function guardianByAuthId(id) {
  return databaseResult(clubDatabase().from("guardians").select("*").eq("auth_user_id", id).maybeSingle());
}

export function guardianById(id) {
  return databaseResult(clubDatabase().from("guardians").select("*").eq("id", id).maybeSingle());
}

export async function savePreregistration(payload, existingGuardian = null) {
  const db = clubDatabase();
  let guardian = existingGuardian;
  if (!guardian) {
    guardian = await databaseResult(db.from("guardians").insert({
      phone: payload.phone,
      ...nameColumns(payload),
      email: payload.email,
      role: "family"
    }).select("*").single());
  }
  try {
    return await databaseResult(db.from("registration_requests").insert({
      guardian_id: guardian.id,
      participant_name: nameColumns(payload, true).full_name,
      participant_first_name: payload.firstNameAutism,
      participant_paternal_surname: payload.participantPaternalSurname,
      participant_maternal_surname: payload.participantMaternalSurname,
      relationship: payload.relationship || null
    }).select("id").single());
  } catch (error) {
    // Only roll back the newly inserted, unbound account. Never delete an existing tutor.
    if (!existingGuardian) {
      await databaseResult(db.from("guardians").delete()
        .eq("id", guardian.id).eq("status", "pending_review").is("auth_user_id", null))
        .catch(() => console.error("[registration] rollback failed; manual review required"));
    }
    throw error;
  }
}

export function registrationById(id) {
  return databaseResult(clubDatabase().from("registration_requests")
    .select("*, guardian:guardians!inner(*)").eq("id", id).maybeSingle());
}

export async function approveParticipantLink({ request, participantId, administratorId }) {
  const db = clubDatabase();
  // Reserve the participant on the request with compare-and-set. Concurrent reviewers
  // cannot link this request to different participants. Retries resume the same choice.
  const selectedId = participantId || request.id;
  if (request.participant_id && request.participant_id !== selectedId) {
    throw new Error("Esta solicitud ya tiene otro participante asignado. Recarga el panel.");
  }
  if (participantId) {
    const participant = await databaseResult(db.from("participants").select("id")
      .eq("id", participantId).maybeSingle());
    if (!participant) throw new Error("El participante seleccionado ya no existe.");
  } else {
    // Deterministic ID makes retries safe without creating a second participant.
    await databaseResult(db.from("participants").upsert({ id: selectedId, full_name: request.participant_name, first_name: request.participant_first_name, paternal_surname: request.participant_paternal_surname, maternal_surname: request.participant_maternal_surname },
      { onConflict: "id", ignoreDuplicates: true }));
  }
  if (!request.participant_id) {
    const reserved = await databaseResult(db.from("registration_requests")
      .update({ participant_id: selectedId }).eq("id", request.id)
      .eq("status", "pending_review").is("participant_id", null).select("id").maybeSingle());
    if (!reserved) {
      const current = await registrationById(request.id);
      if (current?.participant_id !== selectedId) throw new Error("Otro administrador procesó esta solicitud. Recarga el panel.");
    }
  }
  await databaseResult(db.from("guardian_participants").upsert({
    guardian_id: request.guardian_id,
    participant_id: selectedId,
    relationship: request.relationship,
    approved_by: administratorId
  }, { onConflict: "guardian_id,participant_id", ignoreDuplicates: true }));
  await databaseResult(db.from("registration_requests").update({
    status: "approved",
    reviewed_by: administratorId, reviewed_at: new Date().toISOString()
  }).eq("id", request.id).eq("participant_id", selectedId));
  await databaseResult(db.from("guardians").update({ status: "approved_pending_activation" })
    .eq("id", request.guardian_id).eq("status", "pending_review"));
}
