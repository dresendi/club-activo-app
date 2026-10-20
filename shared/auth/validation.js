import { z } from "zod";
import { normalizeInternationalPhone } from "./phone.js";

const securePasswordSchema = z
  .string()
  .min(6, "La contraseña debe tener al menos 6 caracteres.")
  .regex(/[A-Z]/, "Incluye al menos una mayúscula.")
  .regex(/[a-z]/, "Incluye al menos una minúscula.")
  .regex(/[0-9]/, "Incluye al menos un número.")
  .regex(
    /^[A-Za-z0-9!#$]+$/,
    "Usa solo letras, números y opcionalmente estos símbolos: ! # $."
  );

export const phoneSchema = z.string().trim().transform(normalizeInternationalPhone)
  .refine((value) => value !== null, "Ingresa un teléfono válido con + y código de país.");

export const optionalEmailSchema = z.preprocess(
  (value) => typeof value === "string" ? value.trim().toLowerCase() || null : value,
  z.string().email("Ingresa un correo válido.").nullish().transform((value) => value ?? null)
);

export const loginSchema = z.object({
  identifier: phoneSchema,
  password: z.string().min(1, "Ingresa tu contraseña.")
});

export const personNameShape = {
  firstName: z.string().trim().min(2, "Ingresa el nombre.").max(200),
  paternalSurname: z.string().trim().min(1, "Ingresa el apellido paterno.").max(100),
  maternalSurname: z.string().trim().max(100).nullish().transform(value => value || null)
};

export const registrationSchema = z.object({
  ...personNameShape,
  participantPaternalSurname: personNameShape.paternalSurname,
  participantMaternalSurname: personNameShape.maternalSurname,
  firstNameAutism: z.string().trim().min(2, "Ingresa el nombre del participante.").max(200),
  relationship: z.string().trim().max(100).nullish().transform((value) => value || null),
  phone: phoneSchema,
  email: optionalEmailSchema,
  role: z.literal("family").default("family")
});

export const otpChannelSchema = z.enum(["sms", "whatsapp"]).default("sms");
export const recoveryRequestSchema = z.object({ phone: phoneSchema, channel: otpChannelSchema });
export const recoveryOtpSchema = z.object({
  phone: phoneSchema,
  otp: z.string().trim().regex(/^\d{6,8}$/, "Ingresa el código que recibiste por WhatsApp."),
  password: securePasswordSchema,
  confirmPassword: z.string().min(1, "Confirma tu contraseña.")
}).refine((value) => value.password === value.confirmPassword, {
  message: "Las contraseñas no coinciden.", path: ["confirmPassword"]
});

export const activationSchema = z
  .object({
    token: z.string().trim().min(1, "El token es obligatorio."),
    password: securePasswordSchema,
    confirmPassword: z.string().trim().min(1, "Confirma tu contraseña.")
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"]
  });

export const normalizePhone = normalizeInternationalPhone;
export const activationPhoneSchema = z.object({ phone: phoneSchema, channel: otpChannelSchema });
export const activationOtpSchema = z.object({
  phone: phoneSchema,
  otp: z.string().trim().regex(/^\d{6,8}$/, "Ingresa el código que recibiste por WhatsApp.")
});
export const completeProfileSchema = z.object({
  email: optionalEmailSchema,
  password: securePasswordSchema,
  confirmPassword: z.string().min(1, "Confirma tu contraseña.")
}).refine((value) => value.password === value.confirmPassword, {
  message: "Las contraseñas no coinciden.", path: ["confirmPassword"]
});
