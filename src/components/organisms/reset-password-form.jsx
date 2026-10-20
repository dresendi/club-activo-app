import { InternationalPhoneField } from "@/components/molecules/international-phone-field.jsx";
"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  recoverPasswordWithOtpAction,
  requestRecoveryOtpAction
} from "@/app/actions";
import { SubmitButton } from "@/components/atoms/submit-button.jsx";
import { TextField } from "@/components/molecules/text-field.jsx";
import { OtpChannelField } from "@/components/molecules/otp-channel-field.jsx";

const requestInitialState = {
  phone: "",
  errors: {},
  formError: "",
  message: "",
  otp: "",
  success: false
};

const resetInitialState = {
  errors: {},
  formError: "",
  success: false
};

export function ResetPasswordForm() {
  const router = useRouter();
  const [requestState, requestAction] = useActionState(
    requestRecoveryOtpAction,
    requestInitialState
  );
  const [resetState, resetAction] = useActionState(
    recoverPasswordWithOtpAction,
    resetInitialState
  );
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (requestState.success && requestState.phone) {
      setPhone(requestState.phone);
    }
  }, [requestState.phone, requestState.success]);

  useEffect(() => {
    const mismatchMessage = resetState.errors?.confirmPassword?.[0];
    const otpMessage = resetState.errors?.otp?.[0];

    if (mismatchMessage) {
      window.alert(mismatchMessage);
    }

    if (otpMessage) {
      window.alert(otpMessage);
    }
  }, [resetState.errors]);

  useEffect(() => {
    if (!resetState.success) {
      return;
    }

    window.alert("Tu contraseña se actualizó correctamente. Ahora inicia sesión.");
    router.push("/login?status=password-reset");
  }, [resetState.success, router]);

  const otpVisible = requestState.success;

  return (
    <div className="panel-form">
      <form action={requestAction} className="panel-form panel-form--secondary">
        <InternationalPhoneField error={requestState.errors?.phone?.[0]} />
        {requestState.formError ? (
          <p className="form-message form-message--error">{requestState.formError}</p>
        ) : null}
        {requestState.message ? (
          <p className="form-message form-message--success">{requestState.message}</p>
        ) : null}
        <OtpChannelField />
        <SubmitButton>Enviar código</SubmitButton>
      </form>

      <form action={resetAction} className="panel-form">
        <input name="phone" type="hidden" value={phone} />
        {phone ? <p>Restablecer contraseña para: <strong>{phone}</strong></p> : null}
        {resetState.formError ? (
          <p role="alert" className="form-message form-message--error">{resetState.formError}</p>
        ) : null}

        <TextField
          label="Código OTP"
          name="otp"
          type="text"
          required
          hint="Ingresa el código OTP que recibiste para la recuperación. Puede ser de 6 u 8 dígitos."
          onChange={(event) => setOtp(event.target.value)}
          value={otp}
          error={resetState.errors?.otp?.[0]}
        />
        <TextField
          label="Nueva contraseña"
          name="password"
          type="password"
          autoComplete="new-password"
          hint="Debe incluir al menos 6 caracteres, una mayúscula, letras y números. Los símbolos opcionales permitidos son ! # $."
          required
          onChange={(event) => setPassword(event.target.value)}
          value={password}
          error={resetState.errors?.password?.[0]}
        />
        <TextField
          label="Confirmar contraseña"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          onChange={(event) => setConfirmPassword(event.target.value)}
          value={confirmPassword}
          error={resetState.errors?.confirmPassword?.[0]}
        />
        <SubmitButton disabled={!otpVisible}>Validar OTP y guardar contraseña</SubmitButton>
      </form>
    </div>
  );
}
