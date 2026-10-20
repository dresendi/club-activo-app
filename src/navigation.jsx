import { useMemo } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
export default function Link({href,children,...props}) {
  if (/^(https?:|mailto:)/.test(href)) return <a href={href} {...props}>{children}</a>;
  return <RouterLink to={href} {...props}>{children}</RouterLink>;
}
export function usePathname(){return useLocation().pathname;}
export function refresh(){window.dispatchEvent(new Event('mobile:refresh'));}
export function go(path){window.dispatchEvent(new CustomEvent('mobile:navigate',{detail:path}));}
export function useRouter(){
  const navigate=useNavigate();
  return useMemo(()=>({push:navigate,replace:path=>navigate(path,{replace:true}),refresh}),[navigate]);
}
