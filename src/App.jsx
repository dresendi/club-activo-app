import { useState } from 'react';
import { InternationalPhoneField } from './components/molecules/international-phone-field.jsx';
import { TextField } from './components/molecules/text-field.jsx';
import { BusyOverlay } from './components/molecules/busy-overlay.jsx';
import { loginSchema } from '../shared/auth/validation.js';
import { auth, api } from './services/client.js';

export function App() {
  const [viewer, setViewer] = useState(null);
  const [page, setPage] = useState('inicio');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [calendar, setCalendar] = useState(null);
  async function login(event) {
    event.preventDefault(); setError('');
    const parsed = loginSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) { setError('Revisa el teléfono y la contraseña.'); return; }
    setBusy(true);
    try {
      const result = await auth.signInWithPassword({phone: parsed.data.identifier, password: parsed.data.password});
      if (result.error) throw new Error('No fue posible iniciar sesión con ese teléfono y contraseña.');
      const account = await api('/v1/me');
      setViewer(account); setPage('inicio');
    } catch (failure) {
      await auth.signOut({scope:'local'}).catch(() => {});
      setError(failure.message || 'No se pudo conectar. Intenta nuevamente.');
    } finally { setBusy(false); }
  }
  async function navigate(next) {
    setPage(next); setError(''); setCalendar(null);
    if (next !== 'eventos' || !viewer) return;
    setBusy(true);
    try { setCalendar((await api('/v1/events')).url); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true);
    try { await auth.signOut({scope:'local'}); }
    finally { setViewer(null); setCalendar(null); setPage('inicio'); setError(''); setBusy(false); }
  }
  return <div className="app-shell">
    <BusyOverlay active={busy} message="Un momento…" />
    <header><img src="/club-activo-logo.png" alt="Club Activo"/><div><small>CLUB ACTIVO</small><strong>Autismo</strong></div>{viewer?.isCommittee && <span className="badge">Comité</span>}</header>
    <main>
      {error && <p role="alert" className="error">{error}</p>}
      {page === 'inicio' && <><span className="eyebrow">TU COMUNIDAD, CONTIGO</span><h1>Un espacio para<br/>pertenecer.</h1><p>Encuentros, actividades y acompañamiento para las familias de Club Activo.</p><section className="card"><span aria-hidden="true">☀️</span><h2>{viewer ? `Hola, ${viewer.name}` : 'Nos mueve estar juntos'}</h2><p>{viewer ? 'Consulta las actividades del club y los espacios de tu comunidad.' : 'Entra con tu cuenta del club para consultar las actividades.'}</p><button onClick={() => navigate(viewer ? 'eventos' : 'cuenta')}>{viewer ? 'Ver actividades' : 'Entrar a mi cuenta'}</button></section><section className="card muted"><h2>Una comunidad que acompaña</h2><p>Autismo / TDAH / Con sospecha de un posible diagnóstico</p></section></>}
      {page === 'eventos' && <><h1>Eventos</h1>{!viewer ? <section className="card"><p>Inicia sesión para consultar los eventos del club.</p><button onClick={() => navigate('cuenta')}>Entrar</button></section> : calendar ? <iframe title="Calendario del club" src={calendar} /> : !busy && <p>El calendario no está disponible en este momento.</p>}</>}
      {page === 'pagos' && <section className="card centered"><span aria-hidden="true">💳 🧾</span><h1>Realiza el pago de tu anualidad aquí</h1><p>🚧 En construcción…</p><strong>✨ Próximamente</strong></section>}
      {page === 'cuenta' && <><h1>Mi cuenta</h1>{viewer ? <section className="card"><h2>{viewer.name}</h2><p>{viewer.isCommittee ? 'Miembro de comité' : 'Miembro del club'}</p>{viewer.canDownloadReports && <p>Tu cuenta tiene acceso a Formatos IAP. La descarga móvil se integrará en la siguiente etapa.</p>}<button onClick={logout}>Cerrar sesión</button></section> : <section className="card"><h2>Bienvenido de nuevo</h2>{!auth ? <p role="status">El acceso estará disponible cuando se configure la conexión de esta aplicación.</p> : <form onSubmit={login}><InternationalPhoneField name="identifier"/><TextField label="Contraseña" name="password" type="password" autoComplete="current-password" required/><button type="submit" disabled={busy}>Entrar</button></form>}</section>}</>}
    </main>
    <nav aria-label="Navegación principal">{[['inicio','⌂','Inicio'],['eventos','▦','Eventos'],['pagos','◇','Pagos'],['cuenta','○','Mi cuenta']].filter(([id]) => id !== 'pagos' || (viewer && !viewer.isAdmin)).map(([id,icon,label]) => <button key={id} className={page === id ? 'selected' : ''} aria-current={page === id ? 'page' : undefined} onClick={() => navigate(id)}><span aria-hidden="true">{icon}</span>{label}</button>)}</nav>
  </div>;
}
