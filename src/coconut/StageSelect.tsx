import {useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {ArrowLeft,Check,ChevronLeft,ChevronRight,Lock} from 'lucide-react';
import {STAGES} from './stages';
import type {Progress} from './progress';

const CHAPTER_SIZE=10;
const CHAPTER_NAMES=['첫 만남','선택과 해방','같은 숫자, 다른 위치','필요한 숫자 남기기'];
const CHAPTERS=Array.from({length:Math.ceil(STAGES.length/CHAPTER_SIZE)},(_,index)=>({
 name:CHAPTER_NAMES[index]||'새로운 여정',
 stages:STAGES.slice(index*CHAPTER_SIZE,(index+1)*CHAPTER_SIZE),
}));

type Props={
 progress:Progress;nextId:number;initialStageId:number;allCleared:boolean;
 onStart:(id:number)=>void;onBack:()=>void;footer:ReactNode;
};

export function StageSelect({progress,nextId,initialStageId,allCleared,onStart,onBack,footer}:Props){
 const initialChapter=Math.min(CHAPTERS.length-1,Math.max(0,Math.floor((initialStageId-1)/CHAPTER_SIZE)));
 const [chapterIndex,setChapterIndex]=useState(initialChapter);
 const viewportRef=useRef<HTMLDivElement>(null),activeChapter=useRef(initialChapter);
 const chapter=CHAPTERS[chapterIndex];

 useLayoutEffect(()=>{
  const viewport=viewportRef.current;if(!viewport)return;
  const align=()=>{viewport.scrollLeft=activeChapter.current*viewport.clientWidth;};
  align();const observer=new ResizeObserver(align);observer.observe(viewport);
  return()=>observer.disconnect();
 },[]);

 function changeChapter(index:number){
  const viewport=viewportRef.current;if(!viewport)return;
  const target=Math.min(CHAPTERS.length-1,Math.max(0,index));
  viewport.scrollTo({left:target*viewport.clientWidth,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 }
 function syncChapter(){
  const viewport=viewportRef.current;if(!viewport?.clientWidth)return;
  const index=Math.min(CHAPTERS.length-1,Math.max(0,Math.round(viewport.scrollLeft/viewport.clientWidth)));
  activeChapter.current=index;setChapterIndex(index);
 }

 return <section className="stages-content">
  <header className="game-header"><button className="round" aria-label="메인으로" onClick={onBack}><ArrowLeft/></button><h1>코코넛 섬</h1><span className="stage-total">{progress.cleared.length}/{STAGES.length}</span></header>
  <nav className="chapter-controls" aria-label="챕터 이동">
   <button className="round chapter-arrow" aria-label="이전 챕터" disabled={chapterIndex===0} onClick={()=>changeChapter(chapterIndex-1)}><ChevronLeft/></button>
   <h2 id="chapter-heading" aria-live="polite"><span>{chapter.name}</span><small>챕터 {chapterIndex+1} · {chapter.stages[0].id}–{chapter.stages[chapter.stages.length-1].id}단계</small></h2>
   <button className="round chapter-arrow" aria-label="다음 챕터" disabled={chapterIndex===CHAPTERS.length-1} onClick={()=>changeChapter(chapterIndex+1)}><ChevronRight/></button>
  </nav>
  <div className="chapter-viewport" ref={viewportRef} onScroll={syncChapter} role="region" aria-roledescription="캐러셀" aria-label="챕터별 스테이지, 좌우로 넘기기" tabIndex={0} onKeyDown={event=>{
   if(event.target!==event.currentTarget)return;
   const target=event.key==='ArrowLeft'?chapterIndex-1:event.key==='ArrowRight'?chapterIndex+1:event.key==='Home'?0:event.key==='End'?CHAPTERS.length-1:null;
   if(target!==null){event.preventDefault();changeChapter(target);}
  }}>
   {CHAPTERS.map((item,index)=><section className="chapter" key={index} inert={index!==chapterIndex} aria-hidden={index!==chapterIndex} aria-label={`${item.stages[0].id}~${item.stages[item.stages.length-1].id}단계 ${item.name}`}>
    <div className="stage-grid">{item.stages.map(stage=>{
     const cleared=progress.cleared.includes(stage.id),unlocked=stage.id<=nextId||cleared;
     return <button key={stage.id} data-stage={stage.id} className={`stage-card ${cleared?'completed':''} ${stage.id===nextId&&!allCleared?'current':''}`} disabled={!unlocked} aria-label={`${stage.id}단계 ${stage.name}${cleared?', 클리어':!unlocked?', 잠김':''}`} onClick={()=>onStart(stage.id)}>
      <strong>{String(stage.id).padStart(2,'0')}</strong><span>{stage.name}</span><small>{cleared?<><Check size={13}/> 클리어</>:unlocked?`${stage.tiles.length}패`: <><Lock size={12}/> 잠김</>}</small>
     </button>;
    })}</div>
   </section>)}
  </div>
  <div className="chapter-pagination" aria-label="챕터 바로 선택">{CHAPTERS.map((item,index)=><button key={index} aria-label={`${index+1}챕터 ${item.name}`} aria-current={index===chapterIndex?'true':undefined} onClick={()=>changeChapter(index)}><span/></button>)}</div>
  <div className="game-bottom-links">{footer}</div>
 </section>;
}
