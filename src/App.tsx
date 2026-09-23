import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { ArrowLeft, ArrowRight, HelpCircle, RotateCcw, Undo2, X, Check, Sparkles } from 'lucide-react';
import { availableMoves, canMove, createGame, moveCard, ruleLabel, rulesFor, runCards, sameLocation, topCard, TOTAL_RUNS, TOTAL_CARDS, POOL, POOL_VERSION, canFinishRemaining, type Card, type Game, type Location } from './game/solitaire';

import {newRace,startRace,finishRace,elapsedMs,formatTime,readBest,saveBest} from './game/race';
const recordKey=(deal:number)=>`sequencepang3:${POOL_VERSION}:deal-${deal}:best-ms`;

const locate = (value: string): Location => {const [kind,index]=value.split(':');return {kind:kind as Location['kind'],index:Number(index)};};
const keyOf = (at: Location) => `${at.kind}:${at.index}`;
function CardFace({card}: {card: Card}) {
  return <><span className="card-corner">{card.value}<i>✦</i></span><span className="card-center"><i>✦</i><strong>{card.value}</strong><small>SEQUENCE</small></span><span className="card-corner bottom">{card.value}<i>✦</i></span></>;
}
function Dialog({title,onClose,children}: {title:string;onClose:()=>void;children:React.ReactNode}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{ref.current?.showModal();},[]);
  return <dialog ref={ref} onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose()}}><button className="dialog-close icon-btn" onClick={onClose} aria-label="닫기"><X size={20}/></button><h2>{title}</h2>{children}</dialog>;
}
export default function App() {
  const [game,setGame]=useState<Game>(()=>createGame());
  const [race,setRace]=useState(newRace);
  const [now,setNow]=useState(Date.now);
  const [best,setBest]=useState(()=>readBest(recordKey(0)));
  const [poolOpen,setPoolOpen]=useState(false);
  const [resultClosed,setResultClosed]=useState(false);
  const [newRecord,setNewRecord]=useState(false);
  const [history,setHistory]=useState<Game[]>([]);
  const [selected,setSelected]=useState<Location|null>(null);
  const [help,setHelp]=useState(false);
  const [reset,setReset]=useState(false);
  const [notice,setNotice]=useState('맨 위 카드 한 장을 옮겨 수열을 만들어 보세요.');
  const [burst,setBurst]=useState(false);
  const [drag,setDrag]=useState<{card:Card;x:number;y:number;width:number;height:number}|null>(null);
  const [hover,setHover]=useState<Location|null>(null);
  const gesture=useRef<{from:Location; x:number;y:number;dx:number;dy:number;width:number;height:number; active:boolean;pointerId:number}|null>(null);
  const suppressClick=useRef(false);
  const done=game.collected.length===TOTAL_RUNS;
  const moves=useMemo(()=>availableMoves(game),[game]);
  const remainingPossible=useMemo(()=>canFinishRemaining(game),[game]);
  const time=elapsedMs(race,now);
  const ready=race.phase==='ready';
  useEffect(()=>{if(race.phase!=='running')return;const tick=()=>setNow(Date.now());const id=setInterval(tick,100);document.addEventListener('visibilitychange',tick);return()=>{clearInterval(id);document.removeEventListener('visibilitychange',tick)}},[race.phase]);
  function start(){const at=Date.now();setNow(at);setRace(r=>startRace(r,at));}

  const selectedCard=selected?topCard(game,selected):undefined;
  useEffect(()=>{if(!burst)return;const timer=setTimeout(()=>setBurst(false),850);return()=>clearTimeout(timer)},[burst]);
  useEffect(()=>{const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){gesture.current=null;setDrag(null);setHover(null);setSelected(null)}};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape)},[]);
  function move(from:Location,to:Location) {
    if(race.phase!=='running')return;
    const next=moveCard(game,from,to);
    if(!next){setNotice('이곳에는 놓을 수 없어요. 빛나는 자리로 옮겨 보세요.');return;}
    setHistory(h=>[...h,game]);setGame(next);setSelected(null);
    const completed=next.collected.length>game.collected.length;
    setBurst(completed);
    if(next.collected.length===TOTAL_RUNS){
      const at=Date.now(),finished=finishRace(race,at);
      setNow(at);setRace(finished);setResultClosed(false);
      const previous=readBest(recordKey(game.deal));
      setNewRecord(previous===null||finished.elapsed<previous);
      setBest(saveBest(recordKey(game.deal),finished.elapsed));
    }
    setNotice(completed?'수열 완성! 비워진 열로 다음 수열을 만들어 보세요.':to.kind==='cell'?'잠시 보관했어요. 필요할 때 다시 꺼낼 수 있어요.':'한 장 이동! 드러난 카드도 움직일 수 있어요.');
  }
  function choose(at:Location) {
    if(race.phase!=='running')return;
    if(sameLocation(selected,at)){setSelected(null);return;}
    if(selected && canMove(game,selected,at)){move(selected,at);return;}
    if(topCard(game,at)){setSelected(at);setNotice('빛나는 자리로 드래그하거나, 놓을 자리를 터치하세요.');}
    else if(selected) setNotice('보관칸은 한 장만, 카드 더미에는 같은 규칙으로 이어 놓아요.');
  }
  function pointerDown(e:PointerEvent<HTMLButtonElement>,from:Location) {
    if(e.button!==0||race.phase!=='running'||gesture.current)return;
    const card=topCard(game,from);if(!card)return;
    suppressClick.current=false;
    const rect=e.currentTarget.getBoundingClientRect();
    gesture.current={from,x:e.clientX,y:e.clientY,dx:e.clientX-rect.left,dy:e.clientY-rect.top,width:rect.width,height:rect.height,active:false,pointerId:e.pointerId};
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function pointerMove(e:PointerEvent<HTMLButtonElement>) {
    const g=gesture.current;if(!g||g.pointerId!==e.pointerId)return;
    if(!g.active && Math.hypot(e.clientX-g.x,e.clientY-g.y)<7)return;
    g.active=true;setSelected(g.from);
    setDrag({card:topCard(game,g.from)!,x:e.clientX-g.dx,y:e.clientY-g.dy,width:g.width,height:g.height});
    const target=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('[data-destination]');
    setHover(target?locate(target.dataset.destination!):null);
  }
  function pointerUp(e:PointerEvent<HTMLButtonElement>) {
    const g=gesture.current;if(!g||g.pointerId!==e.pointerId)return;
    if(g.active){
      suppressClick.current=true;
      setTimeout(()=>{suppressClick.current=false},0);
      const target=document.elementFromPoint(e.clientX,e.clientY)?.closest<HTMLElement>('[data-destination]');
      if(target)move(g.from,locate(target.dataset.destination!));
      else setNotice('이동을 취소했어요. 카드는 원래 자리에 있어요.');
    }
    gesture.current=null;setDrag(null);setHover(null);
  }
  function cancelDrag(){if(gesture.current?.active){suppressClick.current=true;setTimeout(()=>{suppressClick.current=false},0)}gesture.current=null;setDrag(null);setHover(null);}
  function click(at:Location){if(suppressClick.current){suppressClick.current=false;return;}choose(at);}
  function restart(deal=game.deal){const next=createGame(deal);setGame(next);setRace(newRace());setNow(Date.now());setBest(readBest(recordKey(next.deal)));setResultClosed(false);setNewRecord(false);setHistory([]);setSelected(null);setReset(false);setBurst(false);cancelDrag();setNotice('맨 위 카드 한 장을 옮겨 수열을 만들어 보세요.');}
  function undo(){if(race.phase!=='running')return;const previous=history.at(-1);if(!previous)return;setGame(previous);setHistory(h=>h.slice(0,-1));setSelected(null);setBurst(false);cancelDrag();setNotice('직전 이동을 되돌렸어요. 시간은 계속 흐르고 있어요.');}
  const targetClass=(at:Location)=>`${selected&&canMove(game,selected,at)?' legal':''}${sameLocation(hover,at)&&selected&&canMove(game,selected,at)?' over':''}`;
  const cardButton=(card:Card,at:Location,extra='')=><button className={`playing-card tone-${card.value%3} ${extra}${sameLocation(selected,at)?' selected':''}${drag&&sameLocation(selected,at)?' dragging-source':''}`} data-card={card.id} aria-label={`${at.kind==='cell'?'보관칸':'열'} ${at.index+1}, ${card.value} 카드`} aria-pressed={sameLocation(selected,at)} onClick={()=>click(at)} onPointerDown={e=>pointerDown(e,at)} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={cancelDrag} onLostPointerCapture={()=>{if(gesture.current)cancelDrag()}}><CardFace card={card}/></button>;
  return <main className="game-shell">
    <header className="topbar"><a className="series-link" href="https://labtangent.vercel.app" aria-label="게임 목록으로"><ArrowLeft size={19}/></a><div className="brand">시퀀스팡<span>3</span><small>SEQUENCE SOLITAIRE</small></div><button className="icon-btn" aria-label="게임 방법" onClick={()=>setHelp(true)}><HelpCircle size={21}/></button></header>
    <section className="racebar" aria-label="진행 상황"><div className="race-layout"><span className="live-dot"/> 배치 0{game.deal+1}<small>{TOTAL_CARDS} CARDS</small></div><div className="race-clock" role="timer" aria-label="경과 시간"><strong>{formatTime(time)}</strong><small>{ready?'READY':done?'FINISHED':'TIME ATTACK'}</small></div><div className="race-progress"><strong>{game.collected.length}<em> / {TOTAL_RUNS}</em></strong><small>PANG</small></div></section>
    <div className="record-line"><span>이 배치 최고 기록 <b>{best===null?'첫 기록에 도전!':formatTime(best)}</b></span><button onClick={()=>setPoolOpen(true)}>숫자풀 보기</button></div>
    {ready?<section className="start-panel"><span className="start-mark">✦</span><p className="eyebrow">FIXED DECK · TIME ATTACK</p><h1>같은 40장,<br/>더 빠르게 정리해요.</h1><p>카드를 한 장씩 옮겨<br/>등차 6줄 + 등비 2줄을 완성하세요.</p><div className="start-facts"><span>숫자 <b>1–16</b></span><span>카드 <b>40장</b></span><span>보관 <b>2칸</b></span></div><button className="primary" onClick={start}>배치 0{game.deal+1} 시작 <ArrowRight size={18}/></button><button className="layout-switch" onClick={()=>restart(game.deal+1)}>다른 배치 선택</button><small>시작을 누르면 카드가 공개되고 시간이 흐릅니다.<br/>시간 제한 없음 · 되돌려도 시간은 계속</small></section>:<>
    <section className="upper-table">
      <div className="reserve"><div className="section-label">잠시 보관 <span>FREE CELL</span></div><div className="reserve-slots">{game.cells.map((card,index)=>{const at:Location={kind:'cell',index};return <div key={index} data-destination={keyOf(at)} className={'cell-slot'+targetClass(at)}>{card?cardButton(card,at):<button className="empty-card" aria-label={`빈 보관칸 ${index+1}`} onClick={()=>click(at)}><span>＋</span><small>한 장</small></button>}</div>})}</div></div>
      <div className="harvest"><div className="section-label">완성한 수열 <span>COLLECTION</span></div><div className="collection-grid">{Array.from({length:TOTAL_RUNS},(_,i)=>{const collected=game.collected[i];return <div className={'collection'+(collected?' collected':'')} key={i} title={collected?collected.cards.map(c=>c.value).join(' · '):`수집 ${i+1}`} aria-label={collected?`완성 수열 ${collected.cards.map(c=>c.value).join(', ')}`:`미완성 ${i+1}`} >{collected?<><Check size={16}/><b>{ruleLabel(collected.rule)}</b></>:<><span>✦</span><small>0{i+1}</small></>}</div>})}</div></div>
    </section>
    <div className="table-heading"><span>카드를 옮겨, 수열을 모아요</span><span>5장 = <b>PANG!</b></span></div>
    <section className="tableau" aria-label="카드 테이블">{game.piles.map((pile,index)=>{
      const at:Location={kind:'pile',index};const run=runCards(pile);const rules=rulesFor(run.map(c=>c.value));
      return <div className="column" key={index}><div className={'pile-heading'+(run.length>1?' building':'')}><span>{String.fromCharCode(65+index)}</span>{run.length>1?<b>{rules.map(ruleLabel).join(' / ')} <small>{run.length}/5</small></b>:<small>{pile.length}장</small>}</div><div data-destination={keyOf(at)} className={'pile'+targetClass(at)} style={{'--count':Math.max(0,pile.length-1)} as CSSProperties}>
        {!pile.length?<button className="empty-card empty-pile" onClick={()=>click(at)} aria-label={`빈 열 ${index+1}`}><span>＋</span><small>어떤 카드든</small></button>:pile.map((card,ci)=>{
          const isTop=ci===pile.length-1, linked=ci>=pile.length-run.length&&run.length>1;
          return <div className={'card-layer'+(linked?' linked':'')} key={card.id} style={{top:`calc(${ci} * var(--stack-gap))`}}>{isTop?cardButton(card,at):<div className={`playing-card covered tone-${card.value%3}`} aria-label={`아래 카드 ${card.value}, 이동하려면 위 카드부터 꺼내세요`}><CardFace card={card}/></div>}</div>;
        })}
      </div></div>;
    })}</section>
    <section className="table-footer"><div className="instruction" role="status" aria-live="polite">{selectedCard?<><span className="selected-value">{selectedCard.value}</span><span>놓을 자리를 선택하세요</span><button onClick={()=>setSelected(null)} aria-label="선택 취소"><X size={17}/></button></>:<><span className="instruction-star">✦</span><span>{notice}</span></>}</div>
    {!done&&!remainingPossible&&<div className="blocked" role="alert">남은 숫자로는 전부 완성할 수 없어요.<br/>마지막 PANG 이전으로 되돌려 다른 수열을 만들어 보세요.</div>}
    {!done&&remainingPossible&&moves.length===0&&<div className="blocked">옮길 자리가 없어요. 되돌리기로 다른 길을 찾아보세요.</div>}
    <div className="controls"><button onClick={undo} disabled={!history.length||done}><Undo2 size={18}/>되돌리기</button><span>{game.moves}회 이동</span><button onClick={()=>setReset(true)}><RotateCcw size={17}/>다시 놓기</button></div></section>
    <div className="rule-strip"><span>등차 {game.collected.filter(r=>r.rule.kind==='arithmetic').length}/6 <b>1 · 3 · 5 · 7 · 9</b></span><i>✦</i><span>등비 {game.collected.filter(r=>r.rule.kind==='geometric').length}/2 <b>1 · 2 · 4 · 8 · 16</b></span></div>
    </>}
    {burst&&<div className="pang-burst" key={game.moves}><Sparkles/><strong>SEQUENCE<br/>PANG!</strong><span>수열 한 줄 완성</span></div>}
    {drag&&<div className={`playing-card drag-ghost tone-${drag.card.value%3}`} style={{left:drag.x,top:drag.y,width:drag.width,height:drag.height}}><CardFace card={drag.card}/></div>}
    {help&&<Dialog title="한 장씩 옮기는 수열 솔리테어" onClose={()=>setHelp(false)}><p>더미의 <b>맨 위 카드만</b> 옮길 수 있어요. 아래 숫자는 미리 보이지만 위 카드를 먼저 꺼내야 해요.</p><ol><li>카드를 드래그하거나, 카드 → 목적지 순서로 터치하세요.</li><li>빈 열에는 어떤 카드든 놓을 수 있어요.</li><li>두 장으로 수열을 시작해요. 세 번째부터는 같은 차이 또는 같은 비율로 이어야 해요.</li><li><b>등차·등비수열 5장</b>이 이어지면 자동으로 PANG! 여덟 줄, 40장을 모두 정리하면 시간이 멈춰요.</li><li>보관칸 두 곳에는 각각 한 장만 둘 수 있어요. 카드 묶음 이동과 교환은 없어요.</li></ol><p className="help-note">증가·감소 모두 가능 · 공차 0 제외<br/>등비는 ×2, ×3, ÷2, ÷3 · 카드 색은 장식이에요.<br/>수열의 마지막 카드를 꺼내 다른 수열에 써도 돼요. 되돌리기는 횟수 제한이 없지만 시간은 계속 흘러요. 도움말을 열거나 탭을 바꿔도 시간이 흐릅니다.</p><button className="primary" onClick={()=>setHelp(false)}>플레이하기 <ArrowRight size={18}/></button></Dialog>}
    {poolOpen&&<Dialog title="고정 숫자풀 · 40장" onClose={()=>setPoolOpen(false)}><p>모든 배치가 같은 숫자와 장수를 사용합니다. 숫자 4와 8은 여러 수열에 함께 쓰여 조금 더 넣었어요.</p><div className="pool-grid">{POOL.map(({value,count})=><div key={value}><b>{value}</b><span>× {count}장</span></div>)}</div><p className="help-note">5장 등차수열 24종 + 등비수열 1종<br/>완주 구성: 등차 6줄 + 등비 2줄<br/>등비: 1 → 2 → 4 → 8 → 16<br/>수집 순서에 따라 남은 숫자가 막힐 수 있어요. 그때는 되돌리기로 다른 조합을 시도하세요.</p></Dialog>}
    {reset&&<Dialog title="카드를 다시 놓을까요?" onClose={()=>setReset(false)}><p>진행 중인 판과 이동 기록이 초기화됩니다.</p><button className="primary" onClick={()=>restart()}>같은 배치로 다시</button><button className="secondary" onClick={()=>restart(game.deal+1)}>다른 배치로 시작</button></Dialog>}
    {done&&!resultClosed&&<Dialog title="40장을 모두 정리했어요!" onClose={()=>setResultClosed(true)}><div className="clear-mark">✦</div><p className="clear-title">{newRecord?'NEW BEST!':'ALL CLEAR!'}</p><div className="finish-time">{formatTime(race.elapsed)}</div><p>배치 0{game.deal+1} · 수열 {TOTAL_RUNS}줄 · {game.moves}회 이동<br/>이 배치 최고 {best===null?'—':formatTime(best)}</p><button className="primary" onClick={()=>restart()}>같은 배치 기록 단축 <RotateCcw size={18}/></button><button className="secondary" onClick={()=>restart(game.deal+1)}>다른 배치 도전</button></Dialog>}
  </main>;
}
