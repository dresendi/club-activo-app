import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
// Initial prototype: tokens live only in memory, never localStorage or Preferences.
export const auth = url && key && apiUrl ? createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: true, detectSessionInUrl: false }
}).auth : null;
export async function api(path) {
  const { data: { session } } = await auth.getSession();
  if (!session) throw new Error('Inicia sesión nuevamente.');
  const response = await fetch(`${apiUrl}${path}`, {
    headers: { Authorization: `Bearer ${session.access_token}` }, signal: AbortSignal.timeout(15000)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'No se pudo completar la consulta.');
  return result;
}
