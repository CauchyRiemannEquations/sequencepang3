import React,{useState,useEffect,useRef} from 'react';
import {createRoot} from 'react-dom/client';
import {ArrowLeft,RotateCcw,Undo2,Play,HelpCircle,X,Check,Leaf} from 'lucide-react';
import {TILES,blockedReason,classify,hasMove} from './engine';
import './style.css';
type Screen='main'|'game'|'clear';
function App(){
 const [screen,setScreen]=useState<Screen>('main'),[help,setHelp]=useState(false);
 const [remaining,setRemaining]=useState(TILES.map(t=>t.id)),[selected,setSelected]=useState<string[]>([]),[history,setHistory]=useState<string[][]>([]);
 const [phase,setPhase]=useState<'idle'|'valid'|'invalid'>('idle'),[notice,setNotice]=useState('열린 패 세 개로 수열을 만들어 보세요'),[fresh,setFresh]=useState<string[]>([]);
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null),noticeTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const cancel=()=>{if(timer.current)clearTimeout(timer.current);timer.current=null;};
 useEffect(()=>()=>{cancel();if(noticeTimer.current)clearTimeout(noticeTimer.current)},[]);
 function restart(){cancel();setRemaining(TILES.map(t=>t.id));setSelected([]);setHistory([]);setFresh([]);setPhase('idle');setNotice('열린 패 세 개로 수열을 만들어 보세요');setScreen('game');}
 function message(text:string){setNotice(text);}
 function tap(id:string){
  if(phase!=='idle')return;
  const tile=TILES.find(t=>t.id===id)!;const reason=blockedReason(tile,remaining);
  if(reason){message(reason==='above'?'위에 겹친 패를 먼저 없애 주세요':'왼쪽이나 오른쪽 이웃 패를 먼저 없애 주세요');return;}
  if(selected.includes(id)){setSelected(selected.filter(s=>s!==id));message('선택을 취소했어요');return;}
  const next=[...selected,id];setSelected(next);
  if(next.length<3){message(`${next.length}개 선택 · 패를 다시 누르면 취소`);return;}
  const values=next.map(id=>TILES.find(t=>t.id===id)!.value);const kind=classify(values);
  if(!kind){setPhase('invalid');message(new Set(values).size<3?'같은 숫자는 함께 고를 수 없어요':'등차수열이나 등비수열이 아니에요');timer.current=setTimeout(()=>{setSelected([]);setPhase('idle')},550);return;}
  setPhase('valid');message(`${[...values].sort((a,b)=>a-b).join(' · ')}  ${kind==='arithmetic'?'등차수열':'등비수열'}!`);
  timer.current=setTimeout(()=>{
   const nextRemaining=remaining.filter(id=>!next.includes(id));
   setFresh(nextRemaining.filter(id=>{const tile=TILES.find(t=>t.id===id)!;return blockedReason(tile,remaining)&&!blockedReason(tile,nextRemaining)}));
   setHistory([...history,[...remaining]]);setRemaining(nextRemaining);setSelected([]);setPhase('idle');
   if(!nextRemaining.length)setScreen('clear');else if(!hasMove(nextRemaining))message('만들 수 있는 수열이 없어요 · 되돌리기로 다른 길을 찾아보세요');
  },420);
 }
 function undo(){if(phase!=='idle'||!history.length)return;cancel();setRemaining(history[history.length-1]);setHistory(history.slice(0,-1));setSelected([]);setFresh([]);message('한 수 전의 패 배치를 되돌렸어요');}
 function exit(){cancel();setPhase('idle');setSelected([]);setScreen('main');}
 const values=selected.map(id=>TILES.find(t=>t.id===id)!.value).sort((a,b)=>a-b);
 return <main className={`app ${screen}`}>
  <div className="ambient" aria-hidden="true"/>
  {screen==='main'&&<section className="home-content">
   <span className="edition">COCONUT ISLAND</span>
   <img className="mascot home-mascot" src="/coconut/mascot.webp" alt="잎을 단 반쪽 코코넛"/>
   <h1 className="logo" aria-label="시퀀스팡3"><span>시</span><span>퀀</span><span>스</span><span>팡</span><b>3</b></h1>
   <p className="tagline">차곡차곡, 수열을 찾아요</p>
   <div className="showcase" aria-hidden="true"><i>1</i><i>3</i><i>5</i></div>
   <button className="primary start" onClick={restart}>시작하기 <Play fill="currentColor" size={24}/></button>
   <button className="help-button" onClick={()=>setHelp(true)}><HelpCircle size={21}/> 게임 방법</button>
   <p className="quiet">시간제한 없이, 나만의 속도로</p>
  </section>}
  {screen==='game'&&<section className="game-content">
   <header className="game-header"><button className="round" aria-label="메인으로 나가기" onClick={exit}><ArrowLeft/></button><h1>시퀀스팡<span>3</span></h1><button className="round" aria-label="게임 방법" onClick={()=>setHelp(true)}><HelpCircle/></button></header>
   <div className="stats"><div><span>STAGE</span><strong>01</strong></div><img className="mascot tiny" src="/coconut/mascot.webp" alt=""/><div><span>남은 패</span><strong data-testid="remaining">{remaining.length}<small> / 24</small></strong></div></div>
   <div className="board-frame"><div className="board" aria-label="2층 수열 마작 보드">
    {TILES.filter(t=>remaining.includes(t.id)).map(tile=>{const reason=blockedReason(tile,remaining),isSelected=selected.includes(tile.id);return <button key={tile.id} data-tile={tile.id} data-blocked={reason||'none'} aria-label={`${tile.layer+1}층 ${tile.row+1}행 ${tile.col+1}열 숫자 ${tile.value}${reason?', 막힌 패':', 선택 가능'}`} aria-pressed={isSelected} className={`tile layer-${tile.layer} ${reason?'blocked':'available'} ${isSelected?'selected':''} ${isSelected?phase:''} ${fresh.includes(tile.id)?'fresh':''}`} style={{left:`${tile.x/308*100}%`,top:`${tile.y/270*100}%`,zIndex:tile.layer*100+tile.row*5+1}} onClick={()=>tap(tile.id)}><span className="corner tl">{tile.value}</span><span className="tile-value">{tile.value}</span><span className="corner br">{tile.value}</span></button>})}
   </div></div>
   <div className={`selection-tray ${phase}`} aria-label="선택한 숫자">{[0,1,2].map((i)=><React.Fragment key={i}>{i>0&&<span className="dot">·</span>}<span className={values[i]?'chosen-number':'empty-slot'}>{values[i]||' '}</span></React.Fragment>)}</div>
   <p className="notice" role="status" aria-live="polite">{notice}</p>
   <div className="actions"><button className="wood" disabled={!history.length||phase!=='idle'} onClick={undo}><Undo2 size={21}/>되돌리기</button><button className="mint" onClick={restart}><RotateCcw size={20}/>다시 시작</button></div>
   <button className="exit" onClick={exit}>메인으로 나가기</button>
  </section>}
  {screen==='clear'&&<section className="clear-content"><div className="sparkles" aria-hidden="true">✦　✧　✦</div><img className="mascot clear-mascot" src="/coconut/mascot.webp" alt="기뻐하는 코코넛"/><p className="edition">STAGE 01</p><h1>클리어!</h1><p>24개의 패를 모두 찾았어요</p><div className="clear-badge"><Check size={22}/> 수열 8개 완성</div><button className="primary" onClick={restart}><RotateCcw size={21}/>다시 플레이</button><button className="help-button" onClick={exit}>메인으로</button></section>}
  {help&&<div className="modal-backdrop" onClick={()=>setHelp(false)}><section className="rules" role="dialog" aria-modal="true" aria-labelledby="rules-title" onClick={e=>e.stopPropagation()}><button className="close" aria-label="게임 방법 닫기" onClick={()=>setHelp(false)}><X/></button><Leaf className="rules-leaf"/><h2 id="rules-title">세 개를 골라, 수열 완성</h2><p>위가 비어 있고, 왼쪽이나 오른쪽이 열린 패를 탭하세요.</p><div className="example"><b>1 · 3 · 5</b><span>같은 차이 +2 · 등차수열</span></div><div className="example"><b>2 · 4 · 8</b><span>같은 비율 ×2 · 등비수열</span></div><p>고르는 순서는 상관없어요.<br/>같은 숫자가 섞인 조합은 안 돼요.</p><p>선택한 패를 다시 누르면 취소돼요.<br/>세 패가 사라진 뒤, 아래와 옆의 패가 열려요.</p><button className="mint" onClick={()=>setHelp(false)}>알겠어요</button></section></div>}
 </main>
}
createRoot(document.getElementById('root')!).render(<App/>);
