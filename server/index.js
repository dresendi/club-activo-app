import { createClient } from '@supabase/supabase-js';
import { normalizeServiceKey } from './service-key.js';
import { createMobileApi } from './app.js';
const db = createClient(process.env.SUPABASE_URL, normalizeServiceKey(process.env.SUPABASE_SERVICE_ROLE_KEY), {auth:{persistSession:false,autoRefreshToken:false}});
createMobileApi(db, {allowedOrigins:process.env.ALLOWED_ORIGINS,calendarUrl:process.env.GOOGLE_MEMBERS_EVENTS_CALENDAR_EMBED_URL})
  .listen(Number(process.env.PORT || 3001), process.env.HOST || '127.0.0.1', () => console.log('Mobile API ready'));
