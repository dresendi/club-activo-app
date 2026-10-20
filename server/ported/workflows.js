import { requestContext } from "../context.js";
import { z } from "zod";
import { cookies } from "../context.js";
import { activationProofCookie, createActivationProof, verifyActivationProof } from "./activation-proof.js";
import {
  activationOtpSchema, activationPhoneSchema, completeProfileSchema,
  loginSchema, recoveryOtpSchema, recoveryRequestSchema, registrationSchema
} from "../../shared/auth/validation.js";
import {
  clubDatabase, databaseResult, guardianByAuthId, guardianByPhone, guardianById,
  savePreregistration, registrationById, approveParticipantLink
} from "./database.js";
import { isActiveGuardian, isAdministrator, canActivateGuardian } from "../../shared/auth/access.js";
import { createServerSupabaseClient, createServiceSupabaseClient, createStatelessSupabaseClient } from "../context.js";

const failure = (formError) => ({ success: false, formError });
function invalid(parsed) {
  return { success: false, errors: parsed.error.flatten().fieldErrors, formError: "Revisa los datos e intenta de nuevo." };
}
function report(context, error) {
  // Log codes only: Auth/DB errors may contain personal data or request payloads.
  console.error(`[${context}]`, { code: error?.code, status: error?.status });
}

async function currentAccount() {
  const supabase = await createServerSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase, user: null, guardian: null };
  return { supabase, user, guardian: await guardianByAuthId(user.id) };
}
async function requireAdministrator() {
  const account = await currentAccount();
  if (!isAdministrator(account.guardian, account.user)) throw new Error("ADMIN_REQUIRED");
  return account;
}

export async function signInUser(payload) {
  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) return invalid(parsed);
  let stage = "create-client";
  try {
    const supabase = await createServerSupabaseClient();
    stage = "password";
    const { data, error } = await supabase.auth.signInWithPassword({ phone: parsed.data.identifier, password: parsed.data.password });
    if (error || !data.user) {
      report("login:password", error ?? { code: "missing_user" });
      return failure("No fue posible iniciar sesión con ese teléfono y contraseña.");
    }
    stage = "account-lookup";
    const guardian = await guardianByAuthId(data.user.id);
    stage = "account-access";
    if (!isActiveGuardian(guardian, data.user) || guardian.phone !== parsed.data.identifier) {
      await supabase.auth.signOut({ scope: "local" });
      return failure("Tu cuenta todavía no está activa o fue inactivada por el administrador.");
    }
    return { success: true, redirectTo: isAdministrator(guardian, data.user) ? "/admin" : "/eventos" };
  } catch (error) {
    report(`login:${stage}`, error?.code ? error : { code: "UNCLASSIFIED_EXCEPTION", status: error?.status });
    return failure("No pudimos iniciar sesión. Intenta de nuevo más tarde.");
  }
}

export async function submitRegistrationRequest(payload) {
  const parsed = registrationSchema.safeParse(payload);
  if (!parsed.success) return invalid(parsed);
  try {
    const existing = await guardianByPhone(parsed.data.phone);
    if (existing) {
      const { user } = await currentAccount();
      if (!isActiveGuardian(existing, user)) {
        return failure("Ese teléfono ya tiene una cuenta o solicitud. Si ya está activa, inicia sesión para registrar otro participante; si está pendiente, contacta al club.");
      }
      // Existing accounts are never overwritten by the public registration form.
    }
    const request = await savePreregistration(parsed.data, existing);
    return { success: true, requestId: request.id, message: "Recibimos tu solicitud. El administrador revisará los datos; después podrás activar tu cuenta por WhatsApp." };
  } catch (error) {
    report("registration", error);
    if (error?.code === "23505") return failure("Ese teléfono ya tiene una cuenta o solicitud. Inicia sesión si quieres agregar otro participante.");
    return failure("No fue posible guardar la solicitud. Intenta de nuevo más tarde.");
  }
}

async function ensureAuthIdentity(guardian) {
  if (guardian.auth_user_id) return guardian;
  const admin = createServiceSupabaseClient();
  const { data, error } = await admin.auth.admin.createUser({
    phone: guardian.phone, phone_confirm: false,
    app_metadata: { role: guardian.role },
    user_metadata: { first_name: guardian.full_name }
  });
  let user = data?.user;
  if (error) {
    // Existing identities from the old model are associated only after an explicit
    // administrative approval. Activation still requires a fresh phone OTP.
    if (!["phone_exists", "user_already_exists"].includes(error.code)) throw error;
    for (let page = 1; ; page++) {
      const result = await admin.auth.admin.listUsers({ page, perPage: 100 });
      if (result.error) throw result.error;
      user = result.data.users.find((candidate) => `+${(candidate.phone || "").replace(/\D/g, "")}` === guardian.phone);
      if (user || result.data.users.length < 100) break;
    }
    if (!user) throw error;
  }
  if (!user) throw new Error("AUTH_USER_MISSING");
  const bound = await databaseResult(clubDatabase().from("guardians").update({ auth_user_id: user.id })
    .eq("id", guardian.id).is("auth_user_id", null).select("*").maybeSingle());
  if (bound) return bound;
  const current = await guardianById(guardian.id);
  if (current?.auth_user_id !== user.id) throw new Error("AUTH_BINDING_CONFLICT");
  return current;
}

export async function approveRegistrationRequest(payload) {
  const parsed = z.object({ requestId: z.string().uuid(), participantId: z.string().uuid().or(z.literal("")).nullish() }).safeParse(payload);
  if (!parsed.success) return invalid(parsed);
  try {
    const { user } = await requireAdministrator();
    const request = await registrationById(parsed.data.requestId);
    if (!request || !["pending_review", "approved"].includes(request.status)) return failure("La solicitud ya no está disponible para aprobación.");
    if (["inactive", "rejected"].includes(request.guardian.status)) return failure("La cuenta está inactiva o rechazada. Revisa su estado antes de aprobar.");
    await ensureAuthIdentity(request.guardian);
    await approveParticipantLink({ request, participantId: parsed.data.participantId || null, administratorId: user.id });
    return { success: true, message: "Solicitud aprobada y participante vinculado. La familia debe abrir /activar y solicitar su código por SMS. Esta aprobación no envía un mensaje automáticamente." };
  } catch (error) {
    report("approval", error);
    return failure(error?.message === "ADMIN_REQUIRED" ? "Necesitas una cuenta administradora activa." : "No se completó la aprobación. Recarga el panel y vuelve a intentarlo con el mismo participante.");
  }
}

export async function deactivateUserAccount({ guardianId }) {
  if (!z.string().uuid().safeParse(guardianId).success) return failure("Cuenta inválida.");
  try {
    await requireAdministrator();
    const guardian = await guardianById(guardianId);
    if (!guardian || guardian.role === "admin") return failure("No puedes inactivar una cuenta administradora desde este panel.");
    await databaseResult(clubDatabase().from("guardians").update({ status: "inactive" }).eq("id", guardianId).neq("role", "admin"));
    return { success: true, message: "Cuenta inactivada." };
  } catch (error) {
    report("deactivate", error);
    return failure("No fue posible inactivar la cuenta. Verifica tus permisos.");
  }
}

export async function enableUserAccount({ guardianId }) {
  if (!z.string().uuid().safeParse(guardianId).success) return failure("Cuenta inválida.");
  try {
    await requireAdministrator();
    let guardian = await guardianById(guardianId);
    if (!guardian || guardian.role === "admin") return failure("Esta cuenta no se puede modificar desde este panel.");
    if (guardian.status === "active") return {success:true, status:"active",message:"La cuenta ya está activa."};
    const links = await databaseResult(clubDatabase().from("guardian_participants").select("participant_id").eq("guardian_id",guardian.id).limit(1));
    if (!links.length) {
      const reopened = await databaseResult(clubDatabase().from("guardians").update({status:"pending_review"})
        .eq("id",guardian.id).eq("status",guardian.status).neq("role","admin").select("id").maybeSingle());
      if (!reopened) return failure("La cuenta cambió. Actualiza la búsqueda.");
      return {success:true,status:"pending_review",message:"Cuenta disponible para habilitación. Vincula primero el participante en Administrar Solicitudes."};
    }
    guardian = await ensureAuthIdentity(guardian);
    const status = guardian.phone_verified_at ? "active" : "approved_pending_activation";
    const changed = await databaseResult(clubDatabase().from("guardians").update({status})
      .eq("id",guardian.id).eq("status",guardian.status).neq("role","admin").select("id").maybeSingle());
    if (!changed) return failure("La cuenta cambió. Actualiza la búsqueda e inténtalo de nuevo.");
    return {success:true,status,message:status === "active" ? "Cuenta reactivada." : "Acceso habilitado. El contacto debe completar /activar con su teléfono."};
  } catch(error) { report("enable-account",error); return failure("No se pudo habilitar la cuenta."); }
}

async function requestPhoneOtp(payload, purpose) {
  const parsed = (purpose === "activation" ? activationPhoneSchema : recoveryRequestSchema).safeParse(payload);
  if (!parsed.success) return invalid(parsed);
  const phone = parsed.data.phone;
  const channel = parsed.data.channel;
  const channelLabel = channel === "sms" ? "SMS" : "WhatsApp";
  const neutral = { success: true, phone, channel, message: `Si tu cuenta está habilitada para este paso, recibirás un código por ${channelLabel}.` };
  try {
    const guardian = await guardianByPhone(phone);
    const expectedStatus = purpose === "activation" ? "approved_pending_activation" : "active";
    if (!guardian?.auth_user_id || guardian.status !== expectedStatus) return neutral;
    const identity = await createServiceSupabaseClient().auth.admin.getUserById(guardian.auth_user_id);
    if (identity.error) throw identity.error;
    const identityPhone = identity.data.user?.phone
      ? `+${identity.data.user.phone.replace(/\D/g, "")}` : null;
    if (identityPhone !== phone) {
      return failure("El teléfono del registro no coincide con la cuenta de acceso. Contacta al administrador para corregir la vinculación antes de solicitar un código.");
    }
    const supabase = createStatelessSupabaseClient();
    const { error } = await supabase.auth.signInWithOtp({ phone, options: { shouldCreateUser: false, channel } });
    if (error) {
      report(`phone-otp:${channel}`, error);
      if (error.status === 429 || error.code === "over_sms_send_rate_limit") {
        return failure("Se alcanzó el límite de envío de códigos. Espera antes de volver a solicitarlo; reenviar repetidamente no resolverá el bloqueo.");
      }
      if (error.code === "otp_disabled") {
        return failure("La cuenta de acceso no está disponible para enviar este código. El administrador debe revisar su vinculación y la configuración de autenticación.");
      }
      if (error.code === "sms_send_failed" && /21608|Trial accounts cannot send messages to unverified numbers/i.test(error.message || "")) {
        return failure("El proveedor está en modo de prueba y no permite enviar a este teléfono. El administrador debe verificar el número en Twilio o habilitar una cuenta de producción antes de reintentar.");
      }
      if (error.code === "sms_send_failed" && /20003|authentication failed|auth token is not valid/i.test(error.message || "")) {
        return failure("El servicio de mensajes tiene un problema de configuración. El administrador debe revisar las credenciales del proveedor en Supabase antes de volver a intentar.");
      }
      return failure(`No pudimos enviar el código por ${channelLabel}. Espera un minuto y prueba otro canal, o contacta al club.`);
    }
    return neutral;
  } catch (error) {
    report("request-otp", error);
    return failure("No pudimos iniciar la verificación. Intenta más tarde.");
  }
}
export async function requestActivationOtp(payload) { return requestPhoneOtp(payload, "activation"); }
export async function requestRecoveryOtp(payload) { return requestPhoneOtp(payload, "recovery"); }

export async function verifyActivationOtp(payload) {
  const parsed = activationOtpSchema.safeParse(payload);
  if (!parsed.success) return invalid(parsed);
  try {
    const guardian = await guardianByPhone(parsed.data.phone);
    if (guardian?.status !== "approved_pending_activation" || !guardian.auth_user_id) return failure("No hay una activación disponible para ese teléfono.");
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.verifyOtp({ phone: parsed.data.phone, token: parsed.data.otp, type: "sms" });
    if (error || !canActivateGuardian(guardian, data.user)) {
      if (data.session) await supabase.auth.signOut({ scope: "local" });
      return failure("El código no es válido o ya expiró. Solicita uno nuevo.");
    }
    const cookieStore = await cookies();
    cookieStore.set(activationProofCookie, createActivationProof(data.user.id, requestContext().proofSecret), {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 600
    });
    const links = await databaseResult(clubDatabase().from("guardian_participants")
      .select("participant:participants(id,full_name)").eq("guardian_id", guardian.id));
    return { success: true, phone: parsed.data.phone, email: guardian.email || "",
      participants: links.map(link => link.participant).filter(Boolean) };
  } catch (error) {
    report("verify-activation", error);
    return failure("No pudimos verificar el código. Intenta de nuevo.");
  }
}

export async function completeActivationProfile(payload) {
  const parsed = completeProfileSchema.safeParse(payload);
  if (!parsed.success) return invalid(parsed);
  try {
    const { supabase, user, guardian } = await currentAccount();
    if (!canActivateGuardian(guardian, user)) return failure("Vuelve a verificar tu teléfono para completar la activación.");
    const cookieStore = await cookies();
    if (!verifyActivationProof(cookieStore.get(activationProofCookie)?.value, user.id, requestContext().proofSecret)) {
      return failure("La verificación expiró. Solicita un nuevo código por WhatsApp.");
    }
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password, data: { first_name: guardian.full_name } });
    if (error) throw error;
    const activated = await databaseResult(clubDatabase().from("guardians").update({
      email: parsed.data.email,
      status: "active", phone_verified_at: user.phone_confirmed_at
    }).eq("id", guardian.id).eq("auth_user_id", user.id).eq("status", "approved_pending_activation").select("id").maybeSingle());
    if (!activated) return failure("El estado de tu cuenta cambió. Contacta al administrador.");
    cookieStore.delete(activationProofCookie);
    return { success: true, redirectTo: guardian.role === "admin" ? "/admin" : "/eventos" };
  } catch (error) {
    report("complete-activation", error);
    return failure("No pudimos completar la activación. Intenta de nuevo; si persiste, solicita otro código.");
  }
}

export async function recoverPasswordWithOtp(payload) {
  const parsed = recoveryOtpSchema.safeParse(payload);
  if (!parsed.success) return invalid(parsed);
  const supabase = createStatelessSupabaseClient();
  try {
    const guardian = await guardianByPhone(parsed.data.phone);
    if (guardian?.status !== "active") return failure("No fue posible recuperar la cuenta con esos datos.");
    const { data, error } = await supabase.auth.verifyOtp({ phone: parsed.data.phone, token: parsed.data.otp, type: "sms" });
    if (error || !isActiveGuardian(guardian, data.user) || !data.session) return failure("El código no es válido o ya expiró.");
    const updated = await supabase.auth.updateUser({ password: parsed.data.password });
    if (updated.error) throw updated.error;
    return { success: true };
  } catch (error) {
    report("recovery", error);
    return failure("No pudimos actualizar tu contraseña. Solicita un nuevo código e intenta otra vez.");
  } finally {
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
  }
}

// Old email/token activation cannot create identities in the replacement model.
export async function createActivationPassword() {
  return failure("Este enlace pertenece al sistema anterior. Abre /activar y verifica tu teléfono por WhatsApp.");
}
