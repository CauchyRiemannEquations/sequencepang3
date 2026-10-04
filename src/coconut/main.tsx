import React,{useState,useEffect,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {ArrowLeft,RotateCcw,Undo2,Play,HelpCircle,Check,Grid2X2,Lock,Download} from 'lucide-react';
import {WIDTH,HEIGHT,blockedReason,classify,hasMove} from './engine';
import {STAGES,boardBounds} from './stages';
import {PROGRESS_KEY,readProgress,nextStage,completeStage,type Progress} from './progress';
import {HelpDialog} from './HelpDialog';
import {usePwaInstall} from './usePwaInstall';
import {InstallGuide} from './InstallGuide';
import './style.css';
import './journey.css';
import './logos.css';

type Screen='main'|'stages'|'game'|'clear';
function loadProgress(){
 try{return readProgress(localStorage.getItem(PROGRESS_KEY),STAGES.length);}
 catch{return readProgress(null,STAGES.length);}
}
function App(){
 const [screen,setScreen]=useState<Screen>('main'),[help,setHelp]=useState(false);
 const pwa=usePwaInstall();
 const [installGuide,setInstallGuide]=useState(false);
 async function installApp(){if(!await pwa.install())setInstallGuide(true);}
 const [progress,setProgress]=useState<Progress>(loadProgress);
 const [stageIndex,setStageIndex]=useState(0);
 const stage=STAGES[stageIndex],tiles=stage.tiles,bounds=boardBounds(tiles);
 const [remaining,setRemaining]=useState(tiles.map(t=>t.id)),[selected,setSelected]=useState<string[]>([]),[history,setHistory]=useState<string[][]>([]);
 const [phase,setPhase]=useState<'idle'|'valid'|'invalid'>('idle'),[notice,setNotice]=useState(stage.lesson),[fresh,setFresh]=useState<string[]>([]);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const nextId=nextStage(progress,STAGES.length),allCleared=progress.cleared.length===STAGES.length;
 const cancel=()=>{if(timer.current)clearTimeout(timer.current);timer.current=null;};
 useEffect(()=>()=>cancel(),[]);
 useEffect(()=>{try{localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress));}catch{/* Storage is optional. */}},[progress]);
 function start(index:number){
  cancel();const target=STAGES[index];setStageIndex(index);setRemaining(target.tiles.map(t=>t.id));
  setSelected([]);setHistory([]);setFresh([]);setPhase('idle');setNotice(target.lesson);setScreen('game');
 }
 function navigate(target:Screen){cancel();setPhase('idle');setSelected([]);setHelp(false);setScreen(target);}
 function tap(id:string){
  if(phase!=='idle'||!remaining.includes(id))return;
  const tile=tiles.find(t=>t.id===id);if(!tile)return;
  if(blockedReason(tile,remaining,tiles)){setNotice('위에 겹친 패를 먼저 없애 주세요');return;}
  if(selected.includes(id)){setSelected(selected.filter(s=>s!==id));setNotice('선택을 취소했어요');return;}
  const next=[...selected,id];setSelected(next);
  if(next.length<3){setNotice(`${next.length}개 선택 · 패를 다시 누르면 취소`);return;}
  const values=next.map(id=>tiles.find(t=>t.id===id)!.value),kind=classify(values);
  if(!kind){
   setPhase('invalid');setNotice(new Set(values).size<3?'같은 숫자는 함께 고를 수 없어요':'등차수열이나 등비수열이 아니에요');
   timer.current=setTimeout(()=>{setSelected([]);setPhase('idle');timer.current=null;},550);return;
  }
  setPhase('valid');setNotice(`${[...values].sort((a,b)=>a-b).join(' · ')}  ${kind==='arithmetic'?'등차수열':'등비수열'}!`);
  timer.current=setTimeout(()=>{
   const nextRemaining=remaining.filter(id=>!next.includes(id));
   setFresh(nextRemaining.filter(id=>{const tile=tiles.find(t=>t.id===id)!;return blockedReason(tile,remaining,tiles)&&!blockedReason(tile,nextRemaining,tiles);}));
   setHistory(previous=>[...previous,[...remaining]]);setRemaining(nextRemaining);setSelected([]);setPhase('idle');timer.current=null;
   if(!nextRemaining.length){setProgress(previous=>completeStage(previous,stage.id,STAGES.length));setScreen('clear');}
   else if(!hasMove(nextRemaining,tiles))setNotice('만들 수 있는 수열이 없어요 · 되돌리기로 다른 길을 찾아보세요');
   else setNotice('열린 패 세 개로 다음 수열을 찾아보세요');
  },420);
 }
 function undo(){
  if(phase!=='idle'||!history.length)return;cancel();setRemaining(history[history.length-1]);
  setHistory(history.slice(0,-1));setSelected([]);setFresh([]);setNotice('한 수 전의 패 배치를 되돌렸어요');
 }
 const values=selected.map(id=>tiles.find(t=>t.id===id)!.value).sort((a,b)=>a-b);
 const layerCount=Math.max(...tiles.map(t=>t.layer))+1,stageLabel=String(stage.id).padStart(2,'0');
 return <main className={`app ${screen}`}>
  <div className="ambient" aria-hidden="true"/>
  {screen==='main'&&<section className="home-content">
   <h1 className="home-brand" aria-label="시퀀스팡3"><img src="/coconut/logos/home-logo.png" alt="" width="1536" height="1024" fetchPriority="high"/></h1>
   <p className="tagline">차곡차곡, 수열을 찾아요</p><div className="showcase" aria-hidden="true"><i>1</i><i>3</i><i>5</i></div>
   <p className="home-progress"><Check size={17}/> 클리어 {progress.cleared.length} / {STAGES.length}</p>
   <button className="primary start" onClick={()=>start(nextId-1)}>{allCleared?'다시 도전':`${nextId}단계 시작`} <Play fill="currentColor" size={24}/></button>
   <button className="help-button stage-select" onClick={()=>navigate('stages')}><Grid2X2 size={21}/> 스테이지 선택</button>
   <div className="home-links"><button className="text-button" onClick={()=>setHelp(true)}><span aria-hidden="true">?</span> 플레이 방법</button><a className="text-button contact-button" href="mailto:cremationmath@gmail.com" aria-label="문의하기"><span aria-hidden="true">✉</span> 문의하기</a></div>{!pwa.installed&&<button className="install-button" disabled={pwa.busy} onClick={installApp}><Download size={15}/> 홈 화면에 설치</button>}<p className="quiet">시간제한 없이, 나만의 속도로</p>
  </section>}
  {screen==='stages'&&<section className="stages-content">
   <header className="game-header"><button className="round" aria-label="메인으로" onClick={()=>navigate('main')}><ArrowLeft/></button><h1>코코넛 섬</h1><span className="stage-total">{progress.cleared.length}/{STAGES.length}</span></header>
   <p className="stages-intro">한 단계씩, 새로운 길을 열어요</p>
   {[0,10,20].map(offset=><section className="chapter" key={offset} aria-label={`${offset+1}~${offset+10}단계 ${['첫 만남','선택과 해방','같은 숫자, 다른 위치'][offset/10]}`}>
    <h2>{['첫 만남','선택과 해방','같은 숫자, 다른 위치'][offset/10]}<small>{offset+1}–{offset+10}</small></h2>
    <div className="stage-grid">{STAGES.slice(offset,offset+10).map(item=>{
     const cleared=progress.cleared.includes(item.id),unlocked=item.id<=nextId||cleared;
     return <button key={item.id} data-stage={item.id} className={`stage-card ${cleared?'completed':''} ${item.id===nextId&&!allCleared?'current':''}`} disabled={!unlocked} aria-label={`${item.id}단계 ${item.name}${cleared?', 클리어':!unlocked?', 잠김':''}`} onClick={()=>start(item.id-1)}>
      <strong>{String(item.id).padStart(2,'0')}</strong><span>{item.name}</span><small>{cleared?<><Check size={14}/> 클리어</>:unlocked?`${item.tiles.length}패`: <><Lock size={13}/> 잠김</>}</small>
     </button>;
    })}</div>
   </section>)}
   {allCleared&&<p className="journey-complete">{STAGES.length}단계 여정 완료! 원하는 섬에 다시 도전해 보세요.</p>}
  </section>}
  {screen==='game'&&<section className="game-content">
   <header className="game-header"><button className="round" aria-label="스테이지 선택으로" onClick={()=>navigate('stages')}><ArrowLeft/></button><h1 className="game-brand" aria-label="시퀀스팡3"><img src="/coconut/logos/game-logo.png" alt="" width="1536" height="1024"/></h1><button className="round" aria-label="게임 방법" onClick={()=>setHelp(true)}><HelpCircle/></button></header>
   <div className="stats"><div><span>STAGE</span><strong data-testid="stage">{stageLabel}</strong></div><img className="mascot tiny" src="/coconut/mascot.webp" alt=""/><div><span>남은 패</span><strong data-testid="remaining">{remaining.length}<small> / {tiles.length}</small></strong></div></div>
   <p className="stage-name">{stage.name}</p>
   <div className="board-frame"><div className="board" aria-label={`${layerCount}층 수열 마작 보드`} style={{aspectRatio:`${bounds.width}/${bounds.height}`,maxWidth:bounds.width*1.15}}>
    {tiles.filter(t=>remaining.includes(t.id)).map(tile=>{
     const reason=blockedReason(tile,remaining,tiles),isSelected=selected.includes(tile.id);
     return <button key={tile.id} data-tile={tile.id} data-blocked={reason||'none'} aria-label={`${tile.layer+1}층 ${tile.row+1}행 ${tile.col+1}열 숫자 ${tile.value}${reason?', 막힌 패':', 선택 가능'}`} aria-pressed={isSelected} className={`tile layer-${tile.layer} ${reason?'blocked':'available'} ${isSelected?'selected':''} ${isSelected?phase:''} ${fresh.includes(tile.id)?'fresh':''}`} style={{left:`${(tile.x-bounds.minX)/bounds.width*100}%`,top:`${(tile.y-bounds.minY)/bounds.height*100}%`,width:`${WIDTH/bounds.width*100}%`,height:`${HEIGHT/bounds.height*100}%`,zIndex:tile.layer*100+tile.row*5+1}} onClick={()=>tap(tile.id)}>
      <span className="corner tl">{tile.value}</span><span className="tile-value">{tile.value}</span><span className="corner br">{tile.value}</span>
     </button>;
    })}
   </div></div>
   <div className={`selection-tray ${phase}`} aria-label="선택한 숫자">{[0,1,2].map(i=><React.Fragment key={i}>{i>0&&<span className="dot">·</span>}<span className={values[i]?'chosen-number':'empty-slot'}>{values[i]||' '}</span></React.Fragment>)}</div>
   <p className="notice" role="status" aria-live="polite">{notice}</p>
   <div className="actions"><button className="wood" disabled={!history.length||phase!=='idle'} onClick={undo}><Undo2 size={21}/>되돌리기</button><button className="mint" onClick={()=>start(stageIndex)}><RotateCcw size={20}/>다시 시작</button></div>
   <button className="exit" onClick={()=>navigate('main')}>메인으로 나가기</button>
  </section>}
  {screen==='clear'&&<section className="clear-content">
   <div className="sparkles" aria-hidden="true">✦　✧　✦</div><img className="mascot clear-mascot" src="/coconut/mascot.webp" alt="기뻐하는 코코넛"/>
   <p className="edition">STAGE {stageLabel}</p><h1>{allCleared?'여정 완료!':'클리어!'}</h1><p>{tiles.length}개의 패를 모두 찾았어요</p>
   <div className="clear-badge"><Check size={22}/> 수열 {tiles.length/3}개 완성</div>
   {stageIndex<STAGES.length-1?<button className="primary" onClick={()=>start(stageIndex+1)}>다음 단계 <Play fill="currentColor" size={21}/></button>:<><p className="journey-note">준비된 {STAGES.length}단계를 모두 클리어했어요!</p><button className="primary" onClick={()=>navigate('stages')}>스테이지 선택</button></>}
   <button className="help-button" onClick={()=>start(stageIndex)}><RotateCcw size={19}/> 다시 플레이</button><button className="exit" onClick={()=>navigate('main')}>메인으로</button>
  </section>}
  {installGuide&&<InstallGuide onClose={()=>setInstallGuide(false)}/>}
  {help&&<HelpDialog onClose={()=>setHelp(false)}/>}
 </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
