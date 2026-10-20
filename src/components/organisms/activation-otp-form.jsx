"use client";

import { useActionState, useEffect, useState } from "react";
import {
  completeActivationProfileAction,
  requestActivationOtpAction,
  verifyActivationOtpAction
} from "@/app/actions";
import { SubmitButton } from "@/components/atoms/submit-button.jsx";
import { TextField } from "@/components/molecules/text-field.jsx";
import { OtpChannelField } from "@/components/molecules/otp-channel-field.jsx";

import { InternationalPhoneField } from "@/components/molecules/international-phone-field.jsx";

const phoneInitialState = {
  errors: {},
  formError: "",
  message: "",
  phone: "",
  success: false
};

const otpInitialState = {
  errors: {},
  formError: "",
  phone: "",
  success: false
};

const profileInitialState = {
  errors: {},
  formError: "",
  success: false
};

const STEP_PHONE = "phone";
const STEP_OTP = "otp";
const STEP_PROFILE = "profile";

export function ActivationOtpForm() {
  const [phoneState, phoneAction] = useActionState(
    requestActivationOtpAction,
    phoneInitialState
  );
  const [otpState, otpAction] = useActionState(
    verifyActivationOtpAction,
    otpInitialState
  );
  const [profileState, profileAction] = useActionState(
    completeActivationProfileAction,
    profileInitialState
  );
  const [step, setStep] = useState(STEP_PHONE);
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (phoneState.success && phoneState.phone) {
      setPhone(phoneState.phone);
      setStep(STEP_OTP);
    }
  }, [phoneState.phone, phoneState.success]);

  useEffect(() => {
    if (otpState.success) {
      setStep(STEP_PROFILE);
    }
  }, [otpState.success]);

  if (step === STEP_PROFILE) {
    return (
      <form action={profileAction} className="panel-form">
        <p className="form-message form-message--success">
          Confirmamos tu número. Solo falta que completes tus datos.
        </p>
        <div className="privacy-card">
          <strong>Participantes vinculados</strong>
          {otpState.participants?.length ? <ul>{otpState.participants.map(participant =>
            <li key={participant.id}>{participant.full_name}</li>)}</ul> : <p>No hay participantes vinculados a esta cuenta.</p>}
          <p>Si necesitas corregir un nombre, contacta al administrador.</p>
        </div>

        <TextField
          label="Correo electrónico (opcional)"
          defaultValue={otpState.email || ""}
          name="email"
          type="email"
          autoComplete="email"
          hint="Solo como dato de contacto; recuperarás tu acceso con el teléfono."
          error={profileState.errors?.email?.[0]}
        />
        <TextField
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          hint="Al menos 6 caracteres, con una mayúscula, una minúscula y un número. Símbolos permitidos: ! # $."
          error={profileState.errors?.password?.[0]}
        />
        <TextField
          label="Confirmar contraseña"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          error={profileState.errors?.confirmPassword?.[0]}
        />
        {profileState.formError ? (
          <p className="form-message form-message--error">{profileState.formError}</p>
        ) : null}
        <SubmitButton>Terminar mi registro</SubmitButton>
      </form>
    );
  }

  if (step === STEP_OTP) {
    return (
      <div className="panel-form">
        <form action={otpAction} className="panel-form">
          <input name="phone" type="hidden" value={phone} />
          {phoneState.message ? (
            <p className="form-message form-message--success">{phoneState.message}</p>
          ) : null}
          <TextField
            label="Código de verificación"
            name="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            hint={`Revisa ${phoneState.channel === "sms" ? "tus mensajes SMS" : "WhatsApp"} del número ${phone.slice(0, 3)}·····${phone.slice(-2)}.`}
            error={otpState.errors?.otp?.[0]}
          />
          {otpState.formError ? (
            <p className="form-message form-message--error">{otpState.formError}</p>
          ) : null}
          <SubmitButton>Confirmar mi número</SubmitButton>
        </form>

        <form action={phoneAction} className="panel-form panel-form--secondary">
          <input name="phone" type="hidden" value={phone} />
          <OtpChannelField defaultValue={phoneState.channel} />
          {phoneState.formError ? <p role="alert" className="form-message form-message--error">{phoneState.formError}</p> : null}
          <p className="panel-form__footnote">
            ¿No te llegó? Revisa tu bandeja de mensajes y espera un minuto antes
            de pedir otro.
          </p>
          <SubmitButton>Reenviar código</SubmitButton>
        </form>
      </div>
    );
  }

  return (
    <form action={phoneAction} className="panel-form">
      <InternationalPhoneField error={phoneState.errors?.phone?.[0]} />
      {phoneState.formError ? (
        <p className="form-message form-message--error">{phoneState.formError}</p>
      ) : null}
      <OtpChannelField />
      <SubmitButton>Enviarme el código</SubmitButton>
      <p className="panel-form__footnote">
        Te enviaremos un código por el canal que elijas para confirmar que el número es tuyo.
      </p>
    </form>
  );
}
