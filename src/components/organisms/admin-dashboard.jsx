import { AdminRequestActions } from "@/components/organisms/admin-request-actions.jsx";

export function AdminDashboard({ dashboard, viewer }) {
  if (!viewer?.isAdmin) return <section className="notice-card notice-card--center"><strong>Portal protegido</strong><p>Necesitas una cuenta administradora activa.</p></section>;
  const baseUrl = "https://club-activo-app-web.vercel.app";
  return (
    <section className="admin-dashboard">
      <div className="content-section__header"><div><p className="eyebrow">Administrador</p><h1>Bienvenido {viewer.firstName}</h1></div><p>Gestiona solicitudes y accesos. Vincula cada tutor con un participante nuevo o existente.</p></div>
      {dashboard.error ? <p role="alert">{dashboard.error}</p> : null}
      <div className="admin-stats">{dashboard.summary.map((item) => <article key={item.label} className="metric-card metric-card--light"><strong>{item.value}</strong><span>{item.label}</span></article>)}</div>
      {!dashboard.error && !dashboard.requests.length ? <p>Todavía no hay solicitudes en el sistema nuevo.</p> : null}
      <div className="admin-grid">
        {dashboard.requests.map((request) => {
          const message = `Tu solicitud de Club Activo fue aprobada. Activa tu cuenta en ${baseUrl}/activar. Ingresa tu teléfono con código de país, solicita tu código por SMS y completa tu registro.`;
          const whatsappUrl = `https://wa.me/${request.guardian.phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
          return (
            <article key={request.id} className="request-card">
              <div className="request-card__head"><div><p className="eyebrow">Tutor</p><h2>{request.guardian.full_name}</h2></div><span className="status-pill">{request.status === "approved" ? "Aprobada" : request.status === "rejected" ? "Rechazada" : "Pendiente"}</span></div>
              <dl className="request-card__details">
                <div><dt>Participante solicitado</dt><dd>{request.participant_name}</dd></div>
                <div><dt>Parentesco</dt><dd>{request.relationship || "Sin especificar"}</dd></div>
                <div><dt>Teléfono</dt><dd>{request.guardian.phone}</dd></div>
                <div><dt>Correo de contacto</dt><dd>{request.guardian.email || "No proporcionado"}</dd></div>
                <div><dt>Cuenta del tutor</dt><dd>{({pending_review: "Pendiente de revisión", approved_pending_activation: "Pendiente de activar", active: "Activa", inactive: "Inactiva", rejected: "Rechazada"})[request.guardian.status]}</dd></div>
              </dl>
              <AdminRequestActions request={request} participants={dashboard.participants} whatsappUrl={whatsappUrl} />
            </article>
          );
        })}
      </div>
    </section>
  );
}
