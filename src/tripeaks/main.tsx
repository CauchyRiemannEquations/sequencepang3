import {useEffect,useMemo,useRef,useState,type CSSProperties} from 'react';
import {createRoot} from 'react-dom/client';
import {HelpCircle,X,Undo2,RotateCcw,ArrowRight,Check,RefreshCw} from 'lucide-react';
import {canPick,chainValues,hasOpening,isOpen,newGame,reduceGame,remainingMs,type Action} from './game';
import {rulesFor,ruleLabel} from '../game/solitaire';
import './style.css';
function Dialog({title,close,children}:{title:string;close:()=>void;children:React.ReactNode}){
 const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{ref.current?.showModal()},[]);
 return <dialog ref={ref} onCancel={close}><button className="close" aria-label="닫기" onClick={close}><X size={20}/></button><h2>{title}</h2>{children}</dialog>;
}
function App(){
 const [game,setGame]=useState(()=>newGame());const [now,setNow]=useState(Date.now);
 const [help,setHelp]=useState(false);const [refresh,setRefresh]=useState(false);const [notice,setNotice]=useState('');
 const [flash,setFlash]=useState(0);const [best,setBest]=useState<number|null>(null);
 const values=chainValues(game),remaining=remainingMs(game,now),playing=game.phase==='playing';
 const possible=useMemo(()=>hasOpening(game),[game]);
 const key=`sp3-tripeaks-v1-layout-${game.layout}`;
 useEffect(()=>{try{const v=localStorage.getItem(key);setBest(v!==null&&Number.isFinite(Number(v))&&Number(v)>=0?Number(v):null)}catch{setBest(null)}},[key]);
 useEffect(()=>{if(!playing)return;const tick=()=>{const time=Date.now();setNow(time);setGame(g=>reduceGame(g,{type:'tick',now:time}))};const timer=setInterval(tick,100);document.addEventListener('visibilitychange',tick);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',tick)}},[playing]);
 useEffect(()=>{if(game.phase!=='over')return;setRefresh(false);setHelp(false);let saved=game.score;try{saved=Math.max(game.score,Number(localStorage.getItem(key))||0);localStorage.setItem(key,String(saved))}catch{}setBest(saved)},[game.phase,game.score,key]);
 useEffect(()=>{if(!flash)return;const timer=setTimeout(()=>setFlash(0),600);return()=>clearTimeout(timer)},[flash]);
 function act(type:Action['type'],id?:number){const time=Date.now();setNow(time);if(type==='pang'&&values.length>=3)setFlash(values.length);if(type==='pick'&&id!==undefined&&!canPick(game,id)){setNotice('이 숫자는 지금 수열에 이어지지 않아요.');return;}setNotice('');setGame(g=>reduceGame(g,{type,now:time,id}));}
 function reset(layout=game.layout){setGame(newGame(layout));setNotice('');setFlash(0);setRefresh(false)}
 const suggestion=notice||(values.length===0?'열린 카드 하나를 골라 시작하세요.':values.length===1?'두 번째 카드로 간격이나 비율을 정해요.':values.length===2?'한 장 더 이어야 수집할 수 있어요.':`지금 ${values.length}장을 수집하거나, 더 이어갈 수 있어요.`);
 return <main className="shell">
  <header><div className="brand">시퀀스팡<span>3</span><small>TRIPEAKS LAB</small></div><button className="icon" onClick={()=>setHelp(true)} aria-label="게임 방법"><HelpCircle size={21}/></button></header>
  <section className="hud"><div><small>수집한 카드</small><strong>{game.score}<em>장</em></strong></div><div className={'clock'+(remaining<15000?' hurry':'')} role="timer" aria-label="남은 시간"><strong>{Math.ceil(remaining/1000).toString().padStart(2,'0')}<em>초</em></strong><small>TIME ATTACK</small></div><div className="right"><small>배치 0{game.layout+1} 최고</small><strong>{best??'—'}<em>{best===null?'':'장'}</em></strong></div></section>
  <div className="time-track"><i style={{width:`${remaining/600}%`}}/></div>
  {game.phase==='ready'?<section className="intro"><span className="intro-star">✦</span><p>열린 카드를 톡, 다음 숫자를 톡.</p><h1>길을 열고,<br/>수열을 터뜨려요.</h1><div className="demo-cards"><b>2</b><b>5</b><b>8</b></div><p>3장 이상 이어서 <strong>PANG!</strong><br/>60초 동안 더 많은 카드를 모으세요.</p><button className="pang start" onClick={()=>act('start')}>60초 시작 <ArrowRight size={19}/></button><button className="text-button" onClick={()=>reset(game.layout+1)}>배치 0{game.layout+1} · 다른 배치 선택</button><small>콤보 없음 · 카드 한 장 = 1점<br/>같은 배치는 다음 카드판의 순서도 같습니다.</small></section>:<>
  <div className="board-caption"><span>카드판 {String(game.round).padStart(2,'0')}</span><span>밝은 카드만 선택할 수 있어요</span></div>
  <section className="peaks" aria-label="트라이픽스 카드판">{[0,1,2].map(peak=><div className="peak" key={peak}>{game.cards.filter(c=>c.peak===peak).map(c=>{
   const taken=game.removed.includes(c.id)||game.chain.includes(c.id),open=isOpen(game,c.id),valid=canPick(game,c.id);
   return <button key={`${game.round}-${c.id}`} data-card={c.id} className={`card ${taken?'taken':open?'open':'covered'} ${open&&values.length>0&&valid?'possible':''} tone-${c.value%3}`} style={{'--x':c.x,'--row':c.row} as CSSProperties} disabled={!playing||taken||!open} aria-hidden={taken} aria-label={`${c.value} 카드, ${open?'선택 가능':'가려짐'}`} onClick={()=>act('pick',c.id)}><span className="corner">{c.value}<i>✦</i></span><strong>{c.value}</strong><span className="bottom">{c.value}</span>{!open&&!taken&&<span className="covered-mark">아래 카드부터</span>}</button>
  })}<span className="peak-label">{['FIRST PEAK','SECOND PEAK','THIRD PEAK'][peak]}</span></div>)}</section>
  <section className="chain-area"><div className="chain-heading"><span>만드는 수열</span><b>{values.length>=2?rulesFor(values).map(ruleLabel).join(' 또는 '):'한 장씩 이어 보세요'}</b></div><div className="chain" aria-label="현재 수열">{values.length?values.map((v,i)=><span key={i} className="chain-card">{v}</span>):<span className="chain-placeholder">카드를 터치하면 여기로 모여요</span>}</div><div className="notice" role="status">{suggestion}</div><div className="chain-actions"><button className="utility" disabled={!playing||!values.length} onClick={()=>act('undo')} aria-label="한 장 되돌리기"><Undo2 size={20}/></button><button className="pang" disabled={!playing||values.length<3} onClick={()=>act('pang')}>PANG! <span>{values.length>=3?`+${values.length}장`:'3장부터'}</span></button><button className="utility" disabled={!playing||!values.length} onClick={()=>act('cancel')} aria-label="수열 선택 취소"><X size={21}/></button></div></section>
  {!possible&&playing&&<p className="stuck">지금 판에는 시작할 수 있는 3장 수열이 없어요.<br/>새 카드판으로 넘어가세요.</p>}
  <footer><span>선택 취소는 무료 · 시간은 계속</span><button disabled={!playing} onClick={()=>setRefresh(true)}><RefreshCw size={13}/>새 카드판 <b>−3초</b></button></footer>
  </>}
  {flash>0&&playing&&<div className="burst" key={`${game.score}-${flash}`}>PANG! <b>+{flash}</b></div>}
  {help&&<Dialog title="카드를 꺼내며 길을 열어요" close={()=>setHelp(false)}><ol><li>다른 카드가 가리지 않은 <b>밝은 카드</b>를 터치하세요.</li><li>첫 두 장으로 수열을 시작하고, 같은 차이·비율로 이어갑니다. 증가·감소 모두 가능해요.</li><li><b>3장 이상</b>이면 PANG으로 수집! 길게 이어도 한 장당 1점입니다.</li><li>카드를 고르면 그 아래 카드가 열립니다. 같은 숫자라도 다른 길이 열릴 수 있어요.</li><li>되돌리기와 취소는 선택 중인 수열에만 적용됩니다. 이미 수집한 카드는 돌아오지 않아요.</li></ol><p className="help-note">18장을 모두 수집하면 무료로 다음 판!<br/>막히면 ‘새 카드판’으로 교체할 수 있지만 3초가 줄어듭니다. 선택 중인 유효 수열은 자동 수집됩니다.<br/>시간 종료 시에도 3장 이상 선택한 유효 수열은 점수로 인정합니다. 1~2장은 인정하지 않습니다.<br/>도움말과 탭 전환 중에도 시간이 흐릅니다.</p><button className="pang" onClick={()=>setHelp(false)}>알겠어요 <Check size={18}/></button></Dialog>}
  {refresh&&playing&&<Dialog title="새 카드판을 펼칠까요?" close={()=>setRefresh(false)}><p>남은 카드를 새 배치로 바꾸고 <b>3초를 차감</b>합니다. 선택 중인 3장 이상 수열은 먼저 수집됩니다.</p><button className="pang" onClick={()=>{setRefresh(false);act('refresh')}}>새 카드판 · −3초</button></Dialog>}
  {game.phase==='over'&&<Dialog title="60초 수확 완료!" close={()=>reset()}><p className="result-label">HARVEST COMPLETE</p><div className="result-score">{game.score}<span>장</span></div><div className="result-stats"><span>PANG <b>{game.pangs}회</b></span><span>최장 수열 <b>{game.longest}장</b></span><span>최고 기록 <b>{best??game.score}장</b></span></div><button className="pang" onClick={()=>reset()}><RotateCcw size={17}/> 같은 배치로 다시</button><button className="text-button" onClick={()=>reset(game.layout+1)}>다른 배치 도전</button></Dialog>}
 </main>
}
createRoot(document.getElementById('root')!).render(<App/>);
