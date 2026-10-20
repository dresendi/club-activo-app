import { createClient } from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const apiUrl=(import.meta.env.VITE_API_URL || '').replace(/\/$/,'');
// Never persist credentials in localStorage or Preferences. Native secure storage is a separate release task.
export const auth=url && key && apiUrl ? createClient(url,key,{auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:false}}).auth : null;
let proof='';
export function clearActivationProof(){proof='';}
export function setActivationProof(value){proof=value || '';}
export async function mobileFetch(path, options={}) {
  if (!apiUrl) throw new Error('La conexión móvil todavía no está configurada.');
  if (!/^\/(api|actions|v1)\//.test(path)) throw new Error('Ruta móvil inválida.');
  const session=auth ? (await auth.getSession()).data.session : null;
  const headers=new Headers(options.headers);
  if(session) headers.set('Authorization',`Bearer ${session.access_token}`);
  if(proof && path==='/actions/completeActivationProfileAction') headers.set('X-Activation-Proof',proof);
  const response=await fetch(`${apiUrl}${path}`,{...options,headers,signal:options.signal || AbortSignal.timeout(45000)});
  if(response.status===401) window.dispatchEvent(new Event('mobile:session-expired'));
  return response;
}
export async function api(path,options){
  const response=await mobileFetch(path,options);
  const result=await response.json();
  if(!response.ok) throw new Error(result.error || result.formError || 'No se pudo completar la consulta.');
  return result;
}
