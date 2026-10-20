import { createContext, useContext, useState, useEffect, useRef, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route, useLocation, useNavigate, Link } from 'react-router-dom';
import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { auth, api, clearActivationProof } from './services/client.js';
import { logoutAction } from './app/actions.js';
import { mexicoDate } from '../shared/payments.js';
import { programPillars, featureCards, valueItems, mediaMentions, faqItems } from '../shared/club-content.js';
import { PrivacyNoticeLink } from './components/molecules/privacy-notice-link.jsx';
import { PrivacyNotice } from './components/organisms/privacy-notice.jsx';
import { DownloadButton } from './components/DownloadButton.jsx';
import { AdminNavigation } from './components/molecules/admin-navigation.jsx';
const Registration = lazy(()=>import('./components/organisms/registration-request-form.jsx').then(m=>({default:m.RegistrationRequestForm})));
const Activation = lazy(()=>import('./components/organisms/activation-otp-form.jsx').then(m=>({default:m.ActivationOtpForm})));
const Recovery = lazy(()=>import('./components/organisms/reset-password-form.jsx').then(m=>({default:m.ResetPasswordForm})));
const Login = lazy(()=>import('./components/organisms/login-form.jsx').then(m=>({default:m.LoginForm})));
const Users = lazy(()=>import('./components/organisms/admin-users.jsx').then(m=>({default:m.AdminUsers})));
const Payments = lazy(()=>import('./components/organisms/annual-payments.jsx').then(m=>({default:m.AnnualPayments})));
const Dashboard = lazy(()=>import('./components/organisms/admin-dashboard.jsx').then(m=>({default:m.AdminDashboard})));
const Editor = lazy(()=>import('./components/organisms/report-template-editor.jsx').then(m=>({default:m.ReportTemplateEditor})));
const Session = createContext({});
function Remote({path,children}){
  const {revision}=useContext(Session);
  const [state,setState]=useState({loading:true});
  const [retry,setRetry]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();setState({loading:true});
    api(path,{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setState({data});})
      .catch(error=>{if(!controller.signal.aborted)setState({error:error.message});});
    return()=>controller.abort();
  },[path,revision,retry]);
  if(state.loading)return <p role="status">Cargando…</p>;
  if(state.error)return <section className="card"><p role="alert">{state.error}</p><button onClick={()=>setRetry(n=>n+1)}>Reintentar</button></section>;
  return children(state.data);
}
function Protected({kind='member',children}){
  const {viewer,checking}=useContext(Session);
  if(checking)return <p role="status">Verificando tu cuenta…</p>;
  if(!viewer)return <section className="card"><h1>Accede a tu cuenta</h1><p>Inicia sesión con una cuenta activa para continuar.</p><Link className="button" to="/login">Entrar</Link></section>;
  if((kind==='admin' && !viewer.isAdmin) || (kind==='reports' && !viewer.canDownloadReports))return <section className="card"><h1>Acceso restringido</h1><p>Tu cuenta no tiene permisos para esta sección.</p></section>;
  return children;
}
function Admin({children}){return <Protected kind="admin"><AdminNavigation/>{children}</Protected>;}
function Reports({manage=false}){
  return <Protected kind={manage?'admin':'reports'}><h1>Formatos IAP</h1><p>{manage?'Publica y actualiza formatos e instrucciones.':'Consulta y descarga los formatos vigentes del club.'}</p><Remote path="/v1/reports">{templates=><>
    {manage && <section className="card"><h2>Agregar formato</h2><Editor/></section>}
    {!templates.length && <p>Todavía no hay formatos publicados.</p>}
    {templates.map(template=><section className="card" key={`${template.id}:${template.updated_at}`}><h2>{template.title}</h2><p className="preserve-lines">{template.description}</p><small>{template.file_name} · {Math.ceil(template.file_size/1024)} KB</small><DownloadButton path={`/api/report-templates/${template.id}`}>Descargar formato</DownloadButton>{manage && <Editor template={template}/>}</section>)}
  </>}</Remote></Protected>;
}
function Calendar({isPublic=false}){
  const content=<><h1>{isPublic?'Eventos abiertos al público':'Eventos del club'}</h1><Remote path={isPublic?'/v1/public-events':'/v1/events'}>{data=>data.url?<iframe className="calendar-frame" title="Calendario de eventos" src={data.url}/>:<p>No hay un calendario publicado en este momento.</p>}</Remote></>;
  return isPublic?content:<Protected>{content}</Protected>;
}
function Home(){
  const {viewer}=useContext(Session);
  return <><span className="eyebrow">TU COMUNIDAD, CONTIGO</span><h1>Un espacio para<br/>pertenecer.</h1><p>Encuentros, actividades y acompañamiento para las familias de Club Activo.</p><section className="card"><span aria-hidden="true">☀️</span><h2>{viewer?`Hola, ${viewer.name}`:'Nos mueve estar juntos'}</h2><p>Una comunidad para compartir, aprender y acompañarnos.</p><Link className="button" to={viewer?'/eventos':'/registro'}>{viewer?'Ver actividades':'Quiero formar parte'}</Link></section><div className="quick-links"><Link to="/comunidad">Comunidad</Link><Link to="/programas">Programas</Link><Link to="/prensa">Prensa</Link><Link to="/eventos-publicos">Eventos públicos</Link></div><section className="card muted"><h2>Una comunidad que acompaña</h2><p>Autismo / TDAH / Con sospecha de un posible diagnóstico</p></section></>;
}
function Info({title,items}){return <><h1>{title}</h1>{items.map(item=><section className="card" key={item.title}>{item.tag && <span className="eyebrow">{item.tag}</span>}<h2>{item.title}</h2><p>{item.description}</p></section>)}</>;}
function Account(){
  const {viewer}=useContext(Session);
  return <><h1>Mi cuenta</h1><section className="card">{viewer?<><h2>{viewer.name}</h2>{viewer.isCommittee && <span className="badge">Miembro de comité</span>}<div className="menu-list">{viewer.isAdmin && <Link to="/admin">Portal admin</Link>}{viewer.canDownloadReports && <Link to="/formatos-iap">Formatos IAP</Link>}<Link to="/registro">Registrar otro participante</Link>{!viewer.isAdmin && <Link to="/pagos">Pagos</Link>}<Link to="/restablecer-contrasena">Restablecer contraseña</Link><button onClick={logoutAction}>Cerrar sesión</button></div></>:<div className="menu-list"><Link to="/login">Iniciar sesión</Link><Link to="/registro">Solicitar registro</Link><Link to="/activar">Activar mi cuenta</Link><Link to="/restablecer-contrasena">Recuperar contraseña</Link></div>}</section><div className="menu-list"><Link to="/eventos-publicos">Eventos abiertos al público</Link><Link to="/preguntas">Preguntas frecuentes</Link><PrivacyNoticeLink/></div></>;
}
function Shell(){
  const navigate=useNavigate();const location=useLocation();
  const [viewer,setViewer]=useState(null);const [checking,setChecking]=useState(false);
  const [revision,setRevision]=useState(0);const [sessionError,setSessionError]=useState('');
  const current=useRef(null);const refreshVersion=useRef(0);
  current.current=viewer;
  useEffect(()=>{
    async function refreshViewer(){
      const version=++refreshVersion.current;
      const session=auth?(await auth.getSession()).data.session:null;
      if(!session){setViewer(null);setChecking(false);return;}
      setChecking(true);
      try{const next=await api('/v1/me');if(version===refreshVersion.current){setViewer(next);setSessionError('');}}
      catch(error){if(version===refreshVersion.current){setViewer(null);setSessionError(error.message);}}
      finally{if(version===refreshVersion.current)setChecking(false);}
    }
    function refresh(){setRevision(n=>n+1);refreshViewer();}
    function expired(){++refreshVersion.current;setViewer(null);setChecking(false);clearActivationProof();}
    function go(event){navigate(event.detail);}
    function visible(){if(document.visibilityState==='visible' && current.current)refresh();}
    window.addEventListener('mobile:refresh',refresh);window.addEventListener('mobile:navigate',go);
    window.addEventListener('mobile:session-expired',expired);document.addEventListener('visibilitychange',visible);
    const timer=setInterval(()=>{if(current.current && document.visibilityState==='visible')refreshViewer();},60000);
    return()=>{clearInterval(timer);++refreshVersion.current;window.removeEventListener('mobile:refresh',refresh);window.removeEventListener('mobile:navigate',go);window.removeEventListener('mobile:session-expired',expired);document.removeEventListener('visibilitychange',visible);};
  },[navigate]);
  useEffect(()=>{
    window.scrollTo(0,0);setSessionError('');
    if(!Capacitor.isNativePlatform())return;
    const listener=NativeApp.addListener('backButton',()=>{
      const dialog=document.querySelector('dialog[open]');
      if(dialog){if(dialog.dispatchEvent(new Event('cancel',{cancelable:true})))dialog.close();return;}
      if(location.pathname!=='/')navigate(-1);else NativeApp.minimizeApp();
    });
    return()=>{listener.then(handle=>handle.remove());};
  },[location.pathname,navigate]);
  const status=new URLSearchParams(location.search).get('status');
  return <Session.Provider value={{viewer,checking,revision}}><div className="app-shell"><header className="app-header"><Link to="/"><img src="/club-activo-logo.png" alt="Club Activo"/></Link><div><small>CLUB ACTIVO</small><strong>Autismo</strong></div>{viewer?.isCommittee && !viewer.isAdmin && <span className="badge">Miembro de comité</span>}{viewer?.isAdmin && <Link className="badge" to="/admin">Portal admin</Link>}</header><main>
    {sessionError && <p role="alert" className="error">{sessionError}</p>}
    <Suspense fallback={<p role="status">Cargando sección…</p>}><Routes>
      <Route path="/" element={<Home/>}/><Route path="/comunidad" element={<Info title="Comunidad" items={[...featureCards,...valueItems]}/>}/><Route path="/programas" element={<Info title="Programas" items={programPillars}/>}/><Route path="/prensa" element={<Info title="Prensa y aliados" items={mediaMentions}/>}/><Route path="/preguntas" element={<Info title="Preguntas frecuentes" items={faqItems}/>}/>
      <Route path="/cuenta" element={<Account/>}/><Route path="/login" element={<section className="card"><h1>Entrar a tu cuenta</h1><Login status={status}/><Link to="/activar">Activar mi cuenta</Link></section>}/>
      <Route path="/registro" element={<section className="card"><h1>Solicitud de registro</h1><Registration/></section>}/><Route path="/activar" element={<section className="card"><h1>Activar mi cuenta</h1><Activation/></section>}/><Route path="/restablecer-contrasena" element={<section className="card"><h1>Recuperar contraseña</h1><Recovery/></section>}/>
      <Route path="/eventos" element={<Calendar/>}/><Route path="/eventos-publicos" element={<Calendar isPublic/>}/><Route path="/aviso" element={<PrivacyNotice/>}/>
      <Route path="/pagos" element={<Protected>{viewer?.isAdmin?<Link to="/admin/pagos">Administrar anualidades</Link>:<section className="card centered"><span aria-hidden="true">💳 🧾</span><h1>Realiza el pago de tu anualidad aquí</h1><p>🚧 En construcción…</p><strong>✨ Próximamente</strong></section>}</Protected>}/>
      <Route path="/formatos-iap" element={<Reports/>}/>
      <Route path="/admin" element={<Admin><Remote path="/v1/admin/dashboard">{dashboard=><Dashboard dashboard={dashboard} viewer={viewer}/>}</Remote></Admin>}/>
      <Route path="/admin/usuarios" element={<Admin><Users/></Admin>}/><Route path="/admin/pagos" element={<Admin><Payments today={mexicoDate()}/></Admin>}/><Route path="/admin/formatos-iap" element={<Admin><Reports manage/></Admin>}/>
      <Route path="*" element={<><h1>Sección no encontrada</h1><Link to="/">Volver al inicio</Link></>}/>
    </Routes></Suspense><footer><PrivacyNoticeLink/></footer>
    </main><nav className="bottom-nav" aria-label="Navegación principal">{[['/','⌂','Inicio'],['/eventos','▦','Eventos'],...(viewer && !viewer.isAdmin?[['/pagos','◇','Pagos']]:[]),['/cuenta','○','Mi cuenta']].map(([path,icon,label])=><Link key={path} to={path} className={location.pathname===path?'selected':''} aria-current={location.pathname===path?'page':undefined}><span aria-hidden="true">{icon}</span>{label}</Link>)}</nav></div></Session.Provider>;
}
export function App(){return <HashRouter><Shell/></HashRouter>;}
