"use client";
import { useFormStatus } from "react-dom";
import { BusyOverlay } from "@/components/molecules/busy-overlay.jsx";

export function SubmitButton({ children, disabled = false, busy = false, pendingMessage = "Procesando…" }) {
  const { pending } = useFormStatus();
  const working = pending || busy;
  return (
    <>
      <button className="button button--primary" disabled={disabled || working} type="submit" aria-busy={working}>
        {working ? pendingMessage : children}
      </button>
      <BusyOverlay active={working} message={pendingMessage} />
    </>
  );
}
