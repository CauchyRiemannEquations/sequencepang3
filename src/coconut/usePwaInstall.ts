import {useEffect,useState} from 'react';
type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:'accepted'|'dismissed'}>};
function isStandalone(){return matchMedia('(display-mode: standalone)').matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone);}
export function usePwaInstall(){
 const [prompt,setPrompt]=useState<InstallEvent|null>(null),[installed,setInstalled]=useState(isStandalone),[busy,setBusy]=useState(false);
 useEffect(()=>{
  const query=matchMedia('(display-mode: standalone)');
  const onMode=()=>setInstalled(isStandalone());
  const onPrompt=(event:Event)=>{event.preventDefault();setPrompt(event as InstallEvent);};
  const onInstalled=()=>{setInstalled(true);setPrompt(null);};
  window.addEventListener('beforeinstallprompt',onPrompt);window.addEventListener('appinstalled',onInstalled);query.addEventListener('change',onMode);
  return()=>{window.removeEventListener('beforeinstallprompt',onPrompt);window.removeEventListener('appinstalled',onInstalled);query.removeEventListener('change',onMode);};
 },[]);
 async function install(){
  if(!prompt||busy)return false;
  setBusy(true);
  try{await prompt.prompt();await prompt.userChoice;return true;}
  catch{return false;}
  finally{setPrompt(null);setBusy(false);}
 }
 return {installed,busy,install};
}
// No worker in development: the offline shell always corresponds to a full build.
if(import.meta.env.PROD&&'serviceWorker' in navigator){
 navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).catch(error=>console.warn('Offline preparation unavailable',error));
}
