import express from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { contexts } from './context.js';
import { getSessionViewer } from './viewer.js';
import { calendarEmbedUrl } from '../shared/calendars.js';
import * as workflows from './ported/workflows.js';
import { reportTemplates } from './ported/reports.js';
import { clubDatabase, databaseResult } from './ported/database.js';
import * as users from './ported/users-route.js';
import * as roles from './ported/roles-route.js';
import * as payments from './ported/payments-route.js';
import * as receipts from './ported/receipts-route.js';
import * as reports from './ported/report-editor-route.js';
import * as reportFile from './ported/report-file-route.js';
import * as registration from './ported/registration-route.js';
const actions = {
  requestActivationOtpAction: workflows.requestActivationOtp,
  verifyActivationOtpAction: workflows.verifyActivationOtp,
  completeActivationProfileAction: workflows.completeActivationProfile,
  requestRecoveryOtpAction: workflows.requestRecoveryOtp,
  recoverPasswordWithOtpAction: workflows.recoverPasswordWithOtp,
  approveRequestAction: workflows.approveRegistrationRequest,
  deactivateAccountAction: workflows.deactivateUserAccount,
  enableAccountAction: workflows.enableUserAccount
};
const adminActions = new Set(['approveRequestAction','deactivateAccountAction','enableAccountAction']);
const fail = (res, message, status) => res.status(status).json({error:message,formError:message,success:false});
export function createMobileApi(db, config = {}) {
  const app = express(); app.disable('x-powered-by');
  const origins = (config.allowedOrigins || '').split(',').map(value=>value.trim()).filter(Boolean);
  app.use((req,res,next)=>{
    res.set({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    if (req.headers.origin && !origins.includes(req.headers.origin)) return fail(res,'Origen no permitido.',403);
    next();
  });
  app.use(cors({origin:origins,allowedHeaders:['Authorization','Content-Type','X-Activation-Proof'],
    exposedHeaders:['Content-Disposition'],methods:['GET','POST','PATCH','DELETE']}));
  app.get('/health',(req,res)=>res.json({status:'ok'}));
  const limited = rateLimit({windowMs:60_000,limit:10,standardHeaders:'draft-8',legacyHeaders:false,
    message:{error:'Espera un minuto antes de volver a intentarlo.',formError:'Espera un minuto antes de volver a intentarlo.'}});
  app.use('/actions',limited);
  app.use('/api/registration-request',limited);
  app.use(express.raw({type:()=>true,limit:'12mb'}));
  app.use((req,res,next)=>{
    const token = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '')?.[1];
    contexts.run({db,token,proof:req.headers['x-activation-proof'],proofSecret:config.proofSecret,
      createPublicClient:config.createPublicClient},()=>next());
  });
  const writable = (req,res,next)=>config.enableMutations === true ? next() : fail(res,'Las operaciones de escritura no están habilitadas en este entorno móvil.',503);
  const authorize = kind => async (req,res,next)=>{
    try {
      const viewer = await getSessionViewer();
      if (!viewer.isLoggedIn) return fail(res,'Inicia sesión con una cuenta activa.',viewer.authenticated?403:401);
      if (kind === 'admin' && !viewer.isAdmin) return fail(res,'Acceso exclusivo del administrador.',403);
      if (kind === 'reports' && !viewer.canDownloadReports) return fail(res,'Acceso exclusivo del comité y administrador.',403);
      req.viewer = viewer; next();
    } catch { fail(res,'No se pudo consultar la cuenta.',503); }
  };
  app.get('/v1/me',authorize('member'),(req,res)=>res.json(req.viewer));
  app.get('/v1/events',authorize('member'),(req,res)=>res.json({url:calendarEmbedUrl(config.calendarUrl)}));
  app.get('/v1/public-events',(req,res)=>res.json({url:calendarEmbedUrl(config.publicCalendarUrl)}));
  app.get('/v1/reports',authorize('reports'),async(req,res)=>{
    try { res.json(await reportTemplates()); } catch { fail(res,'No se pudieron cargar los formatos.',503); }
  });
  app.get('/v1/admin/dashboard',authorize('admin'),async(req,res)=>{
    try {
      const database = clubDatabase();
      const [requests,participants] = await Promise.all([
        databaseResult(database.from('registration_requests').select('*, guardian:guardians!inner(*)').order('created_at',{ascending:false}).limit(100)),
        databaseResult(database.from('participants').select('id,full_name').order('full_name').limit(1000))
      ]);
      res.json({requests,participants,summary:[{label:'Solicitudes visibles',value:String(requests.length)},{label:'Por aprobar',value:String(requests.filter(r=>r.status==='pending_review').length)},{label:'Participantes',value:String(participants.length)}]});
    } catch { fail(res,'No se pudo cargar el panel.',503); }
  });
  app.use('/api/admin',authorize('admin'));
  app.post('/actions/:name',async(req,res,next)=>{
    if (!Object.hasOwn(actions,req.params.name)) return fail(res,'Acción inválida.',404);
    if (adminActions.has(req.params.name)) return authorize('admin')(req,res,next);
    next();
  },writable,async(req,res)=>{
    try {
      const payload = JSON.parse(req.body.toString());
      const result = await actions[req.params.name](payload);
      const context = contexts.getStore();
      if (result.success && context.session) result.session = context.session;
      if (result.success && context.outProof) result.activationProof = context.outProof;
      res.status(result.success?200:400).json(result);
    } catch { fail(res,'No se pudo procesar la solicitud.',400); }
  });
  function bridge(handler) {
    return async(req,res)=>{
      try {
        const headers = new Headers();
        if (req.headers['content-type']) headers.set('content-type',req.headers['content-type']);
        if (req.headers['content-length']) headers.set('content-length',req.headers['content-length']);
        // Actual origin was checked by middleware; retain ported same-origin checks.
        headers.set('origin','http://mobile-api.local');
        const request = new Request(`http://mobile-api.local${req.originalUrl}`,{method:req.method,headers,
          body:['GET','HEAD'].includes(req.method)?undefined:req.body});
        const response = await handler(request,{params:Promise.resolve(req.params)});
        res.status(response.status);
        response.headers.forEach((value,name)=>res.setHeader(name,value));
        res.send(Buffer.from(await response.arrayBuffer()));
      } catch { fail(res,'No se pudo completar la operación.',500); }
    };
  }
  const register=(path,handlers,guard)=>{
    for(const method of ['GET','POST','PATCH','DELETE']) if(handlers[method]) {
      const middleware = guard ? [authorize(guard)] : [];
      if(method !== 'GET') middleware.push(writable);
      app[method.toLowerCase()](path,...middleware,bridge(handlers[method]));
    }
  };
  register('/api/registration-request',registration);
  register('/api/admin/users/roles',roles);
  register('/api/admin/users',users);
  register('/api/admin/payments/:id/receipt',receipts);
  register('/api/admin/payments',payments);
  register('/api/report-templates/:id',reportFile,'reports');
  register('/api/report-templates',reports,'admin');
  app.use((error,req,res,next)=>fail(res,error.type==='entity.too.large'?'El archivo supera el límite permitido.':'Solicitud inválida.',error.type==='entity.too.large'?413:400));
  return app;
}
