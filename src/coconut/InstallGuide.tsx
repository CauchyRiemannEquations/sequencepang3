import {useEffect,useRef} from 'react';
import {X,Download} from 'lucide-react';
export function InstallGuide({onClose}:{onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  const trigger=document.activeElement,modal=dialog.current;modal?.showModal();
  return()=>{modal?.close();if(trigger instanceof HTMLElement)trigger.focus();};
 },[]);
 return <dialog ref={dialog} className="help-dialog install-guide" aria-labelledby="install-title" onCancel={onClose} onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
  <button className="demo-close" aria-label="설치 안내 닫기" onClick={onClose}><X size={21}/></button>
  <Download size={30} className="install-symbol"/><h2 id="install-title">홈 화면에 시퀀스팡3</h2>
  <p>코코넛 아이콘을 눌러 바로 플레이해요.</p>
  <div className="install-steps"><strong>안드로이드 · Chrome</strong><p>브라우저 메뉴 <b>⋮</b> → 앱 설치<br/>또는 홈 화면에 추가</p></div>
  <div className="install-steps"><strong>아이폰 · Safari</strong><p>공유 버튼 <b>□↑</b> → 홈 화면에 추가</p></div>
  <p className="demo-tip">메뉴가 보이지 않으면 이 주소를<br/>Chrome 또는 Safari에서 열어 주세요.</p>
  <p className="demo-tip">처음에는 인터넷에 연결해 게임을 열어 주세요.<br/>준비가 끝나면 오프라인에서도 플레이할 수 있어요.</p>
  <button className="mint demo-done" onClick={onClose}>알겠어요</button>
 </dialog>;
}
