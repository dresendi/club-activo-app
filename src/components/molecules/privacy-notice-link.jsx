import { useRef } from 'react';
import { PrivacyNotice } from '../organisms/privacy-notice.jsx';
export function PrivacyNoticeLink() {
  const dialog=useRef(null);
  return <><button type="button" className="text-link" onClick={()=>dialog.current.showModal()}>Aviso de privacidad</button>
    <dialog ref={dialog} className="privacy-dialog" aria-label="Aviso de privacidad"><button type="button" autoFocus onClick={()=>dialog.current.close()}>Cerrar</button><PrivacyNotice /></dialog></>;
}
