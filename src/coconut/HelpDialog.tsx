import {useEffect,useRef,useState} from 'react';
import {Hand,Pause,Play,RotateCcw,X} from 'lucide-react';
import {blockedReason,classify,type Tile} from './engine';
import './help.css';

const lessons=[
 {name:'등차수열',description:'1 → 3 → 5, 차이가 +2로 같아요.'},
 {name:'등비수열',description:'2 → 4 → 8, 비율이 ×2로 같아요.'},
 {name:'패 열기',description:'위의 세 패를 없애면, 아래의 패가 열려요.'},
 {name:'선택 취소',description:'선택한 패를 다시 누르면 취소돼요.'},
];
function demoTiles(lesson:number):Tile[]{
 const values=lesson===1?[2,4,8]:[1,3,5];
 const top=values.map((value,col)=>({id:`top-${col}`,layer:lesson===2?1:0,row:0,col,x:18+col*68,y:34,value}));
 return lesson===2?[...[2,4,8].map((value,col)=>({id:`bottom-${col}`,layer:0,row:0,col,x:18+col*68,y:76,value})),...top]:top;
}
export function HelpDialog({onClose}:{onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 const [lesson,setLesson]=useState(0),[frame,setFrame]=useState(0),[paused,setPaused]=useState(false),[reduced,setReduced]=useState(false);
 useEffect(()=>{
  const trigger=document.activeElement,modal=dialog.current;modal?.showModal();
  return()=>{modal?.close();if(trigger instanceof HTMLElement)trigger.focus();};
 },[]);
 useEffect(()=>{
  const query=matchMedia('(prefers-reduced-motion: reduce)');
  const update=()=>setReduced(query.matches);update();query.addEventListener('change',update);
  return()=>query.removeEventListener('change',update);
 },[]);
 useEffect(()=>{
  if(paused||reduced)return;
  const timer=setInterval(()=>setFrame(previous=>(previous+1)%6),850);
  return()=>clearInterval(timer);
 },[paused,reduced,lesson]);
 const step=reduced?(lesson===3?2:4):frame,tiles=demoTiles(lesson);
 const removed=lesson!==3&&step>=4;
 const remaining=tiles.filter(tile=>!removed||!tile.id.startsWith('top')).map(tile=>tile.id);
 const selected=lesson===3?(step===1?['top-0']:step===3?['top-1']:[]):Array.from({length:Math.min(step,3)},(_,i)=>`top-${i}`);
 const matching=!removed&&lesson!==3&&selected.length===3&&classify(selected.map(id=>tiles.find(t=>t.id===id)!.value));
 const target=lesson===3?(step===1||step===2?0:step===3||step===4?1:null):step>=1&&step<=3?step-1:null;
 const message=lesson===3?(step===1||step===3?'한 패를 선택했어요':step===2||step===4?'다시 눌러 선택을 취소했어요':'같은 패를 두 번 눌러 볼까요?'):
  removed?(lesson===2?'아래의 2 · 4 · 8을 고를 수 있어요':'수열 완성! 세 패가 사라졌어요'):matching?'수열 완성!':step?`${Math.min(step,3)}개 선택했어요`:'열린 패 세 개를 차례로 골라요';
 function choose(index:number){setLesson(index);setFrame(0);}
 return <dialog ref={dialog} className="help-dialog" aria-labelledby="help-title" onCancel={onClose} onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
  <button className="demo-close" aria-label="플레이 방법 닫기" onClick={onClose}><X size={21}/></button>
  <p className="demo-eyebrow">HOW TO PLAY</p><h2 id="help-title">세 개를 골라, 수열 완성</h2>
  <div className="demo-tabs" role="tablist" aria-label="플레이 예시">
   {lessons.map((item,index)=><button key={item.name} id={`lesson-${index}`} role="tab" aria-selected={lesson===index} aria-controls="lesson-panel" tabIndex={lesson===index?0:-1} onClick={()=>choose(index)} onKeyDown={event=>{
    const next=event.key==='ArrowRight'?(index+1)%4:event.key==='ArrowLeft'?(index+3)%4:event.key==='Home'?0:event.key==='End'?3:null;
    if(next!==null){event.preventDefault();choose(next);(event.currentTarget.parentElement?.children[next] as HTMLButtonElement)?.focus();}
   }}>{item.name}</button>)}
  </div>
  <section id="lesson-panel" role="tabpanel" aria-labelledby={`lesson-${lesson}`}>
   <p className="demo-description">{lessons[lesson].description}</p>
   <div className="demo-board" data-demo-step={step} aria-label={message}>
    {tiles.filter(tile=>remaining.includes(tile.id)).map(tile=>{
     const blocked=blockedReason(tile,remaining,tiles);
     return <div key={`${lesson}-${tile.id}`} data-demo-tile={tile.id} className={`mini-tile ${blocked?'covered':''} ${selected.includes(tile.id)&&!removed?'chosen':''} ${matching&&selected.includes(tile.id)?'matched':''} ${removed&&lesson===2?'opened':''}`} style={{left:tile.x,top:tile.y,zIndex:tile.layer+1}} aria-label={`${tile.value}${blocked?' 막힘': ' 열림'}`}><small>{tile.value}</small><strong>{tile.value}</strong><small>{tile.value}</small></div>;
    })}
    {target!==null&&!reduced&&<Hand key={`${lesson}-${step}`} className="demo-hand" size={34} style={{left:48+target*68,top:77}} aria-hidden="true"/>}
    {removed&&lesson!==2&&<span className="demo-success">✦ 수열 완성 ✦</span>}
   </div>
   <p className="demo-status">{message}</p>
  </section>
  <div className="demo-controls">
   {!reduced&&<button onClick={()=>setPaused(value=>!value)}>{paused?<Play size={15}/>:<Pause size={15}/>} {paused?'재생':'일시정지'}</button>}
   <button onClick={()=>{setFrame(0);setPaused(false);}}><RotateCcw size={15}/> 다시 보기</button>
  </div>
  <p className="demo-rules">고르는 순서는 자유, 숫자는 서로 다르게!<br/>위에 겹친 패만 먼저 없애 주세요.<br/>좌우에 패가 있어도 고를 수 있어요.</p>
  <p className="demo-tip">막혔다면 되돌리기로 다른 길을 찾아보세요.<br/>21단계부터는 같은 숫자도 위치를 살펴보세요.</p>
  <button className="mint demo-done" onClick={onClose}>알겠어요</button>
 </dialog>;
}
