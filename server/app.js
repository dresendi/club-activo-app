import express from 'express';
import cors from 'cors';
import { isActiveGuardian, isAdministrator, canDownloadReports } from '../shared/auth/access.js';
import { hasCommitteeRole } from '../shared/auth/roles.js';
import { calendarEmbedUrl } from '../shared/calendars.js';
export function createMobileApi(db, config = {}) {
const app = express();
app.disable('x-powered-by');
const origins = (config.allowedOrigins || '').split(',').map(value => value.trim()).filter(Boolean);
app.use(cors({origin: origins, allowedHeaders:['Authorization','Content-Type'], methods:['GET']}));
app.use((req,res,next) => {res.set('Cache-Control','no-store');next();});
app.get('/health', (req,res) => res.json({status:'ok'}));
app.use('/v1', async (req,res,next) => {
  const match = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '');
  if (!match) return res.status(401).json({error:'Inicia sesión.'});
  try {
    const {data:{user},error} = await db.auth.getUser(match[1]);
    if (error || !user) return res.status(401).json({error:'Tu sesión expiró.'});
    const result = await db.schema('club_activo_v2').from('guardians').select('id,full_name,auth_user_id,status,role,roles').eq('auth_user_id',user.id).maybeSingle();
    if (result.error) throw result.error;
    if (!isActiveGuardian(result.data,user)) return res.status(403).json({error:'La cuenta no está activa.'});
    req.account = {user,guardian:result.data}; next();
  } catch {res.status(503).json({error:'No se pudo consultar la cuenta.'});}
});
app.get('/v1/me', (req,res) => {
  const {guardian,user}=req.account;
  res.json({name:guardian.full_name,isAdmin:isAdministrator(guardian,user),isCommittee:hasCommitteeRole(guardian),canDownloadReports:canDownloadReports(guardian,user)});
});
app.get('/v1/events', (req,res) => res.json({url:calendarEmbedUrl(config.calendarUrl)}));
return app;
}
