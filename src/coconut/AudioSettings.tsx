import {useEffect,useRef} from 'react';
import {X} from 'lucide-react';
import type {AudioPreferences} from './audio';
import './audio.css';
export function AudioSettings({preferences,onChange,onClose}:{preferences:AudioPreferences;onChange:(patch:Partial<AudioPreferences>)=>void;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const trigger=document.activeElement,modal=dialog.current;modal?.showModal();return()=>{modal?.close();if(trigger instanceof HTMLElement)trigger.focus();};},[]);
 return <dialog ref={dialog} className="audio-dialog" aria-labelledby="audio-title" onCancel={onClose} onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
  <button className="audio-close" aria-label="소리 설정 닫기" onClick={onClose}><X size={22}/></button>
  <h2 id="audio-title">소리 설정</h2><p>코코넛 섬의 작은 음악</p>
  <label className="audio-toggle audio-master"><span>소리 켜기</span><input type="checkbox" checked={preferences.master} onChange={event=>onChange({master:event.target.checked})}/></label>
  {(['bgm','sfx'] as const).map(channel=><section className="audio-channel" key={channel}>
   <label className="audio-toggle"><span>{channel==='bgm'?'배경음악':'효과음'}</span><input type="checkbox" checked={preferences[channel]} onChange={event=>onChange({[channel]:event.target.checked})}/></label>
   <label className="audio-volume"><span>{channel==='bgm'?'배경음악':'효과음'} 크기</span><output>{Math.round(preferences[`${channel}Volume`]*100)}%</output><input aria-label={`${channel==='bgm'?'배경음악':'효과음'} 크기`} type="range" min="0" max="100" value={Math.round(preferences[`${channel}Volume`]*100)} onChange={event=>onChange({[`${channel}Volume`]:Number(event.target.value)/100})}/></label>
  </section>)}
  <p className="audio-note">패를 고르거나 수열을 완성할 때만<br/>효과음이 나요. 다른 버튼은 조용해요.</p>
  <button className="mint audio-done" onClick={onClose}>완료</button>
 </dialog>;
}
