import { mobileFetch as fetch } from "@/services/client.js";
"use client";

import Link from "next/link";
import { useState } from "react";
import { SubmitButton } from "@/components/atoms/submit-button.jsx";
import { TextField } from "@/components/molecules/text-field.jsx";
import { InternationalPhoneField } from "@/components/molecules/international-phone-field.jsx";
import { PrivacyNoticeLink } from "@/components/molecules/privacy-notice-link.jsx";

import { PersonNameFields } from "@/components/molecules/person-name-fields.jsx";

const initialState = {
  formError: "",
  message: "",
  requestId: "",
  success: false
};

export function RegistrationRequestForm() {
  const [state, setState] = useState(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setState(initialState);

    try {
      const formData = new FormData(event.currentTarget);
      const response = await fetch("/api/registration-request", {
        body: formData,
        method: "POST"
      });
      const result = await response.json();
      setState(result);
    } catch {
      setState({
        formError: "No se pudo enviar la solicitud. Intenta de nuevo.",
        message: "",
        requestId: "",
        success: false
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="panel-form">
      <div className="panel-form__grid">
        <PersonNameFields participant errors={state.errors} />
        <PersonNameFields errors={state.errors} />

        <TextField
          label="Parentesco"
          name="relationship"
          error={state.errors?.relationship?.[0]}
          autoComplete="additional-name"
          hint="Mamá / Papá / Tutor / Otro"
        />
        <InternationalPhoneField error={state.errors?.phone?.[0]} />
        <TextField
          label="Correo electrónico (opcional)"
          name="email"
          error={state.errors?.email?.[0]}
          type="email"
          autoComplete="email"
          hint="Solo como dato de contacto. Tu acceso será con el teléfono."
        />
      </div>

      <input type="hidden" name="role" value="family" />

      {state.formError ? (
        <p role="alert" className="form-message form-message--error">{state.formError}</p>
      ) : null}
      {state.message ? (
        <p className="form-message form-message--success">{state.message}</p>
      ) : null}

      <SubmitButton busy={isSubmitting} disabled={state.success} pendingMessage="Guardando solicitud…">
        {isSubmitting ? "Enviando..." : "Enviar solicitud"}
      </SubmitButton>
      <p className="panel-form__footnote">
        ¿Ya tienes acceso? <Link href="/login">Inicia sesión aquí</Link>.
      </p>

      <div className="privacy-card"><PrivacyNoticeLink /></div>
    </form>
  );
}
