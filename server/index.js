import { createClient } from '@supabase/supabase-js';
import { normalizeServiceKey } from './service-key.js';
import { createMobileApi } from './app.js';
const options = {auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}};
const secret = normalizeServiceKey(process.env.SUPABASE_SERVICE_ROLE_KEY);
const url = process.env.SUPABASE_URL;
const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!publicKey || publicKey.startsWith('sb_secret_')) throw new Error('Configure SUPABASE_PUBLISHABLE_KEY for mobile OTP.');
const db = createClient(url, secret, options);
createMobileApi(db, {
  createPublicClient:()=>createClient(url,publicKey,options),proofSecret:secret,
  enableMutations:process.env.ENABLE_MUTATIONS==='true',allowedOrigins:process.env.ALLOWED_ORIGINS,
  calendarUrl:process.env.GOOGLE_MEMBERS_EVENTS_CALENDAR_EMBED_URL,
  publicCalendarUrl:process.env.GOOGLE_PUBLIC_EVENTS_CALENDAR_EMBED_URL
}).listen(Number(process.env.PORT || 3001),process.env.HOST || '127.0.0.1',()=>console.log('Mobile API ready'));
