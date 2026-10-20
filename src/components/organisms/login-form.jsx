"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/app/actions";
import { SubmitButton } from "@/components/atoms/submit-button.jsx";
import { TextField } from "@/components/molecules/text-field.jsx";
import { InternationalPhoneField } from "@/components/molecules/international-phone-field.jsx";

const initialState = {
  errors: {},
  formError: "",
  success: false
};

const statusMessages = {
  activated: "Tu cuenta quedó activada. Ya puedes iniciar sesión.",
  "password-reset": "Tu contraseña fue actualizada. Inicia sesión con la nueva clave."
};

export function LoginForm({ status }) {
  const [state, formAction] = useActionState(loginAction, initialState);
  const statusMessage = status ? statusMessages[status] : "";

  return (
    <form action={formAction} className="panel-form">
      {statusMessage ? (
        <p className="form-message form-message--success">{statusMessage}</p>
      ) : null}
      <InternationalPhoneField name="identifier" error={state.errors?.identifier?.[0]} />
      <TextField
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={state.errors?.password?.[0]}
      />
      {state.formError ? <p className="form-message form-message--error">{state.formError}</p> : null}
      <SubmitButton pendingMessage="Iniciando sesión…">Entrar</SubmitButton>
      <p className="panel-form__footnote">
        Si aún no formas parte del sistema cerrado, primero debes{" "}
        <Link href="/registro">enviar tu solicitud de registro</Link>.
      </p>
      <p className="panel-form__footnote">
        Si olvidaste tu contraseña, solicita un código OTP y completa la
        recuperación en <Link href="/restablecer-contrasena">esta página</Link>.
      </p>
    </form>
  );
}
