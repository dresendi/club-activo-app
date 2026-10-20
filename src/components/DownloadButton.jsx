import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { mobileFetch } from '../services/client.js';
import { BusyOverlay } from './molecules/busy-overlay.jsx';
export function DownloadButton({path,children='Descargar'}) {
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  async function download(){
    setBusy(true);setError('');
    try{
      const response=await mobileFetch(path);
      if(!response.ok)throw new Error('No se pudo descargar el archivo. Revisa tu acceso e inténtalo de nuevo.');
      const blob=await response.blob();
      const disposition=response.headers.get('Content-Disposition') || '';
      const filename=decodeURIComponent(disposition.split("filename*=UTF-8''")[1] || 'archivo').replace(/[\\/:*?"<>|\r\n]/g,'_').slice(0,160);
      if(Capacitor.isNativePlatform()){
        const {Filesystem,Directory}=await import('@capacitor/filesystem');
        const {Share}=await import('@capacitor/share');
        const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(blob);});
        const temp=`${crypto.randomUUID()}-${filename}`;
        const saved=await Filesystem.writeFile({path:temp,data:base64,directory:Directory.Cache});
        try{await Share.share({title:filename,files:[saved.uri],dialogTitle:'Guardar o compartir archivo'});}
        finally{await Filesystem.deleteFile({path:temp,directory:Directory.Cache}).catch(()=>{});}
      }else{
        const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      }
    }catch(failure){setError(failure.message || 'No se pudo guardar el archivo.');}
    finally{setBusy(false);}
  }
  return <><BusyOverlay active={busy} message="Preparando archivo…"/><button type="button" className="button button--ghost" disabled={busy} onClick={download}>{children}</button>{error && <p role="alert">{error}</p>}</>;
}
