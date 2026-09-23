import {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {HelpCircle,X,Undo2,RotateCcw,ArrowRight,Check,Lightbulb,Infinity as InfinityIcon} from 'lucide-react';
import {canPick,findTriple,newGame,reduceGame,values,type Action} from './game';
import {rulesFor,ruleLabel} from '../game/solitaire';
import './style.css';
function Dialog({title,close,children}:{title:string;close:()=>void;children:React.ReactNode}){
 const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{ref.current?.showModal()},[]);
 return <dialog ref={ref} onCancel={close}><button className="close" aria-label="닫기" onClick={close}><X size={20}/></button><h2>{title}</h2>{children}</dialog>;
}
function App(){
 const [game,setGame]=useState(()=>newGame());const [help,setHelp]=useState(false);const [restart,setRestart]=useState(false);
 const [notice,setNotice]=useState('');const [hint,setHint]=useState<number[]>([]);const [flash,setFlash]=useState(0);
 const sequence=values(game),playing=game.phase==='playing';
 useEffect(()=>{if(!flash)return;const timer=setTimeout(()=>setFlash(0),650);return()=>clearTimeout(timer)},[flash]);
 function act(type:Action['type'],id?:number){
  if(type==='pick'&&id!==undefined&&!game.selected.includes(id)&&!canPick(game,id)){setNotice('지금 수열에 이어지지 않아요. 한 장 되돌리거나 취소해 보세요.');return;}
  if(type==='pang'&&sequence.length>=3)setFlash(sequence.length);
  if(type!=='pick')setHint([]);setNotice('');setGame(g=>reduceGame(g,{type,id}));
 }
 function reset(layout=game.layout){setGame(newGame(layout));setHint([]);setNotice('');setFlash(0);setRestart(false)}
 function showHint(){setGame(g=>reduceGame(g,{type:'cancel'}));setHint(findTriple(game.cards)??[]);setNotice('표시된 ① → ② → ③ 순서로 골라 보세요.');}
 const message=notice||(game.repaired?'수열이 없어 카드 3장을 바꿨어요. 다시 이어 보세요.':sequence.length===0?'위치와 상관없이 숫자를 톡톡 골라 보세요.':sequence.length===1?'같은 차이 또는 같은 비율로 이어 볼까요?':sequence.length===2?'한 장 더 이으면 PANG할 수 있어요.':`${sequence.length}장 완성! 더 이어도, 지금 모아도 좋아요.`);
 return <main className="shell">
  <header><div className="brand">시퀀스팡<span>3</span><small>NUMBER GARDEN</small></div><button className="icon" onClick={()=>setHelp(true)} aria-label="게임 방법"><HelpCircle size={21}/></button></header>
  <section className="hud"><div><small>모은 카드</small><strong>{game.score}<em>장</em></strong></div><div className="relaxed"><InfinityIcon size={29}/><small>시간 제한 없이</small></div><div className="right"><small>이번 목표</small><strong>{game.goal}<em>장</em></strong></div></section>
  <div className="goal-track" aria-label={`${game.goal}장 중 ${game.score}장 수집`}><i style={{width:`${Math.min(100,game.score/game.goal*100)}%`}}/></div>
  {game.phase==='ready'?<section className="intro"><span className="intro-star">✦</span><p>카드 9장, 천천히 골라도 괜찮아요.</p><h1>숫자를 고르고,<br/>수열을 모아요.</h1><div className="demo-cards"><b>2</b><b>5</b><b>8</b></div><p>3장 이상 이어서 <strong>PANG!</strong><br/>모은 자리에는 새 카드가 들어와요.</p><button className="pang start" onClick={()=>act('start')}>느긋하게 시작 <ArrowRight size={19}/></button><button className="text-button" onClick={()=>reset(game.layout+1)}>시작 배치 0{game.layout+1} · 바꾸기</button><small>실패도, 시간 제한도 없어요.<br/>막히면 무료 힌트 · 수열이 없으면 자동 교체</small></section>:<>
  <div className="board-caption"><span>숫자 1–12 · 카드 9장</span><span>모든 카드를 고를 수 있어요</span></div>
  <section className="card-grid" aria-label="펼친 숫자 카드 9장">{game.cards.map(c=>{
   const index=game.selected.indexOf(c.id),hintIndex=hint.indexOf(c.id),possible=canPick(game,c.id);
   return <button key={c.id} data-card={c.id} className={`card tone-${c.value%3} ${index>=0?'selected':''} ${hintIndex>=0?'hinted':''} ${index<0&&sequence.length>1&&possible?'possible':''}`} disabled={!playing} aria-label={`${c.value} 카드${index>=0?`, ${index+1}번째 선택`:''}${hintIndex>=0?`, 힌트 ${hintIndex+1}번째`:''}`} aria-pressed={index>=0} onClick={()=>act('pick',c.id)}><span className="corner">{c.value}<i>✦</i></span><strong>{c.value}</strong><span className="card-flower">✦</span><span className="bottom">{c.value}</span>{index>=0?<span className="badge">{index+1}</span>:hintIndex>=0?<span className="badge hint-badge">{hintIndex+1}</span>:null}</button>
  })}</section>
  <section className="chain-area"><div className="chain-heading"><span>만드는 수열</span><b>{sequence.length>=2?rulesFor(sequence).map(ruleLabel).join(' 또는 '):'천천히 골라 보세요'}</b></div><div className="chain" aria-label="현재 수열">{sequence.length?sequence.map((v,i)=><span key={i} className="chain-card">{v}</span>):<span className="chain-placeholder">예: 2 → 5 → 8 · 1 → 2 → 4</span>}</div><div className="notice" role="status">{message}</div><div className="chain-actions"><button className="utility" disabled={!playing||!sequence.length} onClick={()=>act('undo')} aria-label="한 장 되돌리기"><Undo2 size={20}/></button><button className="pang" disabled={!playing||sequence.length<3} onClick={()=>act('pang')}>PANG! <span>{sequence.length>=3?`+${sequence.length}장`:'3장부터'}</span></button><button className="utility" disabled={!playing||!sequence.length} onClick={()=>act('cancel')} aria-label="수열 선택 취소"><X size={21}/></button></div></section>
  <footer><button disabled={!playing} onClick={showHint}><Lightbulb size={17}/>힌트 보기 <small>무료</small></button><button disabled={!playing} onClick={()=>setRestart(true)}><RotateCcw size={15}/>처음부터</button></footer><p className="calm-note">잘못 골라도 괜찮아요. 언제든 선택을 되돌릴 수 있어요.</p>
  </>}
  {flash>0&&playing&&<div className="burst" key={`${game.score}-${flash}`}>PANG! <b>+{flash}</b></div>}
  {help&&<Dialog title="천천히 수열을 모아요" close={()=>setHelp(false)}><ol><li>펼쳐진 <b>9장의 카드</b>에서 위치와 상관없이 숫자를 고르세요.</li><li>같은 차이 또는 같은 비율로 <b>3장 이상</b> 이어 PANG! 증가·감소 모두 가능해요.</li><li>모은 카드만 새 숫자로 채워집니다. 남아 있는 카드도 다음 수열에 쓸 수 있어요.</li><li>잘못 고르면 되돌리기·취소. 선택한 카드를 다시 누르면 그 카드부터 선택이 풀려요.</li><li>찾기 어려우면 <b>무료 힌트</b>로 한 가지 수열을 볼 수 있어요.</li></ol><p className="help-note">시간 제한·생명·패배가 없습니다.<br/>카드판에 만들 수 있는 수열이 하나도 없으면 카드 3장을 자동 교체합니다.<br/>30장 목표 달성 후 계속 모을 수 있습니다. 숫자 범위와 난도 규칙은 그대로 유지됩니다.</p><button className="pang" onClick={()=>setHelp(false)}>알겠어요 <Check size={18}/></button></Dialog>}
  {restart&&<Dialog title="처음부터 다시 할까요?" close={()=>setRestart(false)}><p>현재 모은 카드 수가 초기화됩니다.</p><button className="pang" onClick={()=>reset()}>같은 배치로 다시</button><button className="text-button" onClick={()=>setRestart(false)}>계속 플레이</button></Dialog>}
  {game.phase==='goal'&&<Dialog title="차곡차곡, 목표 달성!" close={()=>act('continue')}><p className="result-label">NICE AND EASY</p><div className="result-score">{game.score}<span>장</span></div><p className="result-copy">잘 모았어요. 원하면 이대로 계속할 수 있어요.<br/>다음에도 같은 숫자 범위와 규칙으로 진행됩니다.</p><div className="result-stats"><span>PANG <b>{game.pangs}회</b></span><span>최장 수열 <b>{game.longest}장</b></span></div><button className="pang" onClick={()=>act('continue')}>계속 모으기 <ArrowRight size={18}/></button><button className="text-button" onClick={()=>reset()}>새로 시작하기</button></Dialog>}
 </main>
}
createRoot(document.getElementById('root')!).render(<App/>);
