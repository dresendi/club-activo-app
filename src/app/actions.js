import { auth, api, mobileFetch, setActivationProof, clearActivationProof } from '../services/client.js';
import { loginSchema } from '../../shared/auth/validation.js';
import { go, refresh } from '../navigation.jsx';
function values(previous, form){return Object.fromEntries(form instanceof FormData ? form : previous);}
async function action(name,previous,form){
  try {
    const response=await mobileFetch(`/actions/${name}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(values(previous,form))});
    const result=await response.json();
    if(result.success && result.session){
      if(!auth) throw new Error('Configura la conexión de autenticación.');
      const saved=await auth.setSession({access_token:result.session.access_token,refresh_token:result.session.refresh_token});
      if(saved.error) throw saved.error;
      setActivationProof(result.activationProof);
    }
    return result;
  } catch(error){return {success:false,formError:error.message || 'No se pudo conectar. Intenta de nuevo.'};}
}
export async function loginAction(previous,form){
  const parsed=loginSchema.safeParse(values(previous,form));
  if(!parsed.success)return {success:false,errors:parsed.error.flatten().fieldErrors,formError:'Revisa los datos.'};
  try{
    if(!auth)throw new Error('La conexión móvil todavía no está configurada.');
    clearActivationProof();
    const result=await auth.signInWithPassword({phone:parsed.data.identifier,password:parsed.data.password});
    if(result.error)throw new Error('No fue posible iniciar sesión con ese teléfono y contraseña.');
    const viewer=await api('/v1/me');
    refresh();go(viewer.isAdmin?'/admin':'/eventos');return {success:true};
  }catch(error){await auth?.signOut({scope:'local'});return {success:false,formError:error.message};}
}
export const requestActivationOtpAction=(p,f)=>action('requestActivationOtpAction',p,f);
export const verifyActivationOtpAction=(p,f)=>action('verifyActivationOtpAction',p,f);
export const requestRecoveryOtpAction=(p,f)=>action('requestRecoveryOtpAction',p,f);
export const recoverPasswordWithOtpAction=(p,f)=>action('recoverPasswordWithOtpAction',p,f);
export async function completeActivationProfileAction(p,f){
  const result=await action('completeActivationProfileAction',p,f);
  if(result.success){clearActivationProof();refresh();go(result.redirectTo || '/eventos');}
  return result;
}
export async function approveRequestAction(p,f){const result=await action('approveRequestAction',p,f);if(result.success)refresh();return result;}
export const deactivateAccountAction=(p,f)=>action('deactivateAccountAction',p,f);
export const enableAccountAction=(p,f)=>action('enableAccountAction',p,f);
export async function logoutAction(){try{await auth?.signOut({scope:'local'});}finally{clearActivationProof();window.dispatchEvent(new Event('mobile:session-expired'));go('/login');}}
