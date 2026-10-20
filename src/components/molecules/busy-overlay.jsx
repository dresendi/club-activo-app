"use client";
import { useEffect, useRef } from "react";

export function BusyOverlay({ active, message = "Guardando datos…" }) {
  const dialog = useRef(null);
  useEffect(() => {
    const node = dialog.current;
    if (active && !node.open) node.showModal();
    if (!active && node.open) node.close();
    return () => { if (node.open) node.close(); };
  }, [active]);
  return <dialog ref={dialog} className="busy-overlay" aria-label={message} onCancel={event => event.preventDefault()}>
    <div role="status" aria-live="polite" className="busy-overlay__content">
      <span className="saving-spinner" aria-hidden="true" />
      <strong>{message}</strong><p>Espera un momento, por favor.</p>
    </div>
  </dialog>;
}
