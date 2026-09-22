import { useMemo, useRef, useState } from "react";
import { Trash2, Volume2, VolumeX, RotateCcw, Sparkles } from "lucide-react";

type SeqDef={id:string; nums:number[]};
type Lane={uid:number; def:SeqDef; filled:boolean[]; wrong:boolean};
type Mood="idle"|"happy"|"oops"|"combo"|"worry"|"clear";

const LIB:SeqDef[]=[
 {id:"a1",nums:[2,5,8,11,14]},
 {id:"g1",nums:[3,6,12,24,48]},
 {id:"s1",nums:[1,4,9,16,25]},
 {id:"f1",nums:[1,1,2,3,5]},
 {id:"a2",nums:[4,7,10,13,16]},
 {id:"f2",nums:[2,3,5,8,13]},
 {id:"s2",nums:[4,9,16,25,36]},
 {id:"g2",nums:[2,4,8,16,32]},
 {id:"a3",nums:[5,8,11,14,17]},
 {id:"f3",nums:[3,5,8,13,21]},
 {id:"a4",nums:[7,10,13,16,19]},
 {id:"g3",nums:[1,3,9,27,81]},
];

const SCRIPT=[11,24,16,5,7, 14,3,25,48,8, 13,16,25,32,14, 13,21,17,16,27, 36,19,8,81,13, 16,32,21,25,17,19,27,36,14,13,16,8,5,11,24];

const initialLanes=():Lane[]=>
  LIB.slice(0,4).map((def,i)=>({uid:i+1,def,filled:[true,true,true,false,false],wrong:false}));

function Mascot({mood}:{mood:Mood}){
 const face=mood==="oops"?"•﹏•":mood==="worry"?"•́︿•̀":mood==="clear"?"≧▽≦":mood==="combo"?"✦ᴗ✦":mood==="happy"?"^ᴗ^":"•ᴗ•";
 return <div className={"mascot "+mood} aria-label="용과 마스코트">
   <span className="leaf l1"/><span className="leaf l2"/><span className="leaf l3"/>
   <span className="seed s1"/><span className="seed s2"/><span className="seed s3"/>
   <span className="face">{face}</span>
 </div>
}

function sound(kind:string, muted:boolean){
 if(muted) return;
 const AC=window.AudioContext || (window as any).webkitAudioContext;
 if(!AC) return;
 const ctx=new AC(), o=ctx.createOscillator(), g=ctx.createGain();
 o.connect(g); g.connect(ctx.destination);
 const map:any={pick:[520,.045],place:[760,.07],bad:[170,.11],pang:[980,.18],combo:[1240,.22],clear:[880,.35],hold:[620,.06]};
 const [f,d]=map[kind]||map.pick;
 o.frequency.setValueAtTime(f,ctx.currentTime);
 if(kind==="pang"||kind==="combo") o.frequency.exponentialRampToValueAtTime(f*1.6,ctx.currentTime+d);
 g.gain.setValueAtTime(.055,ctx.currentTime); g.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+d);
 o.start();o.stop(ctx.currentTime+d);
 setTimeout(()=>ctx.close(),400);
}

export default function App(){
 const [lanes,setLanes]=useState<Lane[]>(initialLanes);
 const [hand,setHand]=useState<number[]>(SCRIPT.slice(0,5));
 const [deckPos,setDeckPos]=useState(5);
 const [selected,setSelected]=useState<number|null>(null);
 const [hold,setHold]=useState<number|null>(null);
 const [discards,setDiscards]=useState(2);
 const [score,setScore]=useState(0);
 const [combo,setCombo]=useState(0);
 const [maxCombo,setMaxCombo]=useState(0);
 const [turns,setTurns]=useState(0);
 const [cleared,setCleared]=useState(0);
 const [discarded,setDiscarded]=useState(0);
 const [perfect,setPerfect]=useState(0);
 const [mood,setMood]=useState<Mood>("idle");
 const [muted,setMuted]=useState(false);
 const [pang,setPang]=useState<{uid:number;dragon:boolean}|null>(null);
 const [done,setDone]=useState(false);
 const lastCompleteTurn=useRef(-99);
 const dirty=useRef<Record<number,boolean>>({});
 const nextLane=useRef(4);

 const next=useMemo(()=>[SCRIPT[deckPos%SCRIPT.length],SCRIPT[(deckPos+1)%SCRIPT.length]],[deckPos]);

 const draw=()=>{
   const n=SCRIPT[deckPos%SCRIPT.length];
   setDeckPos(p=>p+1);
   return n;
 };

 const replaceHand=(idx:number)=>{
   setHand(h=>h.map((n,i)=>i===idx?draw():n));
   setSelected(null);
 };

 const wrong=(laneIdx:number)=>{
   sound("bad",muted); setMood("oops"); dirty.current[lanes[laneIdx].uid]=true;
   setLanes(ls=>ls.map((l,i)=>i===laneIdx?{...l,wrong:true}:l));
   setTimeout(()=>{setLanes(ls=>ls.map((l,i)=>i===laneIdx?{...l,wrong:false}:l));setMood("idle")},360);
 };

 const place=(laneIdx:number,slot:number)=>{
   if(selected===null||done) return;
   const card=hand[selected], lane=lanes[laneIdx];
   if(lane.filled[slot]||slot<3||card!==lane.def.nums[slot]){wrong(laneIdx);return;}
   const t=turns+1; setTurns(t); sound("place",muted); setMood("happy");
   const newFilled=lane.filled.map((x,i)=>i===slot?true:x);
   const complete=newFilled.every(Boolean);
   if(!complete){
     setLanes(ls=>ls.map((l,i)=>i===laneIdx?{...l,filled:newFilled}:l));
     replaceHand(selected); setTimeout(()=>setMood("idle"),250); return;
   }
   const newCombo=t-lastCompleteTurn.current<=3?combo+1:1;
   lastCompleteTurn.current=t; setCombo(newCombo); setMaxCombo(m=>Math.max(m,newCombo));
   const mult=1+Math.min(4,newCombo-1)*.2;
   setScore(s=>s+Math.round(1000*mult));
   if(!dirty.current[lane.uid]) setPerfect(p=>p+1);
   const newCleared=cleared+1; setCleared(newCleared);
   const dragon=newCombo>=5; setPang({uid:lane.uid,dragon}); setMood(dragon?"combo":"happy");
   sound(dragon?"combo":"pang",muted);
   replaceHand(selected);
   if(newCleared>=8){
     setTimeout(()=>{setDone(true);setMood("clear");sound("clear",muted)},620);
     return;
   }
   setTimeout(()=>{
     const def=LIB[nextLane.current%LIB.length]; nextLane.current++;
     setLanes(ls=>ls.map((l,i)=>i===laneIdx?{uid:100+nextLane.current,def,filled:[true,true,true,false,false],wrong:false}:l));
     setPang(null);setMood("idle");
   },520);
 };

 const doHold=()=>{
   if(selected===null||done)return;
   const card=hand[selected]; sound("hold",muted);
   if(hold===null){setHold(card);replaceHand(selected)}
   else {setHand(h=>h.map((n,i)=>i===selected?hold:n));setHold(card);setSelected(null)}
 };

 const doDiscard=()=>{
   if(selected===null||discards<=0||done)return;
   sound("bad",muted);setDiscards(d=>d-1);setDiscarded(d=>d+1);setTurns(t=>t+1);replaceHand(selected);
 };

 const restart=()=>{
   setLanes(initialLanes());setHand(SCRIPT.slice(0,5));setDeckPos(5);setSelected(null);setHold(null);setDiscards(2);
   setScore(0);setCombo(0);setMaxCombo(0);setTurns(0);setCleared(0);setDiscarded(0);setPerfect(0);
   setMood("idle");setPang(null);setDone(false);lastCompleteTurn.current=-99;dirty.current={};nextLane.current=4;
 };

 return <main className="game-shell">
   <div className="farm-bg"><i/><i/><i/><i/></div>
   <header className="topbar">
     <div className="brand"><b>시퀀스팡<span>3</span></b><small>SEQUENCE SOLITAIRE</small></div>
     <div className="top-actions">
       <div className="goal"><strong>{cleared}</strong><span>/ 8 PANG</span></div>
       <button className="icon-btn" onClick={()=>setMuted(m=>!m)} aria-label="음소거">{muted?<VolumeX/>:<Volume2/>}</button>
     </div>
   </header>

   <section className="status">
     <Mascot mood={mood}/>
     <div className="score"><small>SCORE</small><strong>{score.toLocaleString()}</strong></div>
     <div className={"combo "+(combo>=2?"hot":"")}><small>COMBO</small><strong>{combo?combo+"×":"—"}</strong></div>
     <div className="next-box"><small>NEXT</small><div><em>{next[0]}</em><span>›</span><em>{next[1]}</em></div></div>
   </section>

   <section className="lanes" aria-label="수열 보드">
     {lanes.map((lane,li)=><div key={lane.uid} className={"lane lane-"+li+" "+(lane.wrong?"wrong":"")+(pang?.uid===lane.uid?" pang":"")}>
       <div className="lane-tag">{String.fromCharCode(65+li)}</div>
       <div className="sequence">
         {lane.def.nums.map((n,si)=><div key={si} className="term-wrap">
           <button disabled={si<3||lane.filled[si]} onClick={()=>place(li,si)}
             className={"term "+(lane.filled[si]?"filled":"blank")+(selected!==null&&!lane.filled[si]&&hand[selected]===n?" possible":"")}>
             {lane.filled[si]?n:""}
           </button>
           {si<4&&<span className="arrow">›</span>}
         </div>)}
       </div>
       {pang?.uid===lane.uid&&<div className="pang-burst">{pang.dragon?"DRAGON PANG!":"PANG!"}<span>✦ • ✦ • ✦</span></div>}
     </div>)}
   </section>

   <section className="tray">
     <div className="utility-row">
       <button onClick={doHold} className={"hold "+(selected!==null?"ready":"")}><span>HOLD</span><b>{hold??"—"}</b></button>
       <div className="tiny-tip">{selected===null?"숫자를 고른 뒤 빈칸을 터치":"어느 줄에 둘까요?"}</div>
       <button onClick={doDiscard} disabled={selected===null||discards<=0} className="discard"><Trash2/><span>버리기 ×{discards}</span></button>
     </div>
     <div className="hand">
       {hand.map((n,i)=><button key={i} onClick={()=>{setSelected(i===selected?null:i);setMood("idle");sound("pick",muted)}} className={"fruit-card "+(selected===i?"selected":"")}>
         <span className="mini-leaf"/><i/><i/><i/><strong>{n}</strong>
       </button>)}
     </div>
   </section>

   {done&&<div className="result-backdrop">
     <section className="result">
       <Mascot mood="clear"/><Sparkles className="spark"/>
       <p className="eyebrow">SEQUENCE SOLITAIRE</p><h1>CLEAR!</h1>
       <div className="result-score">{score.toLocaleString()}</div>
       <div className="stats">
         <span><small>MAX COMBO</small><b>{maxCombo}×</b></span>
         <span><small>TURNS</small><b>{turns}</b></span>
         <span><small>DISCARDS</small><b>{discarded}</b></span>
         <span><small>PERFECT</small><b>{perfect}</b></span>
       </div>
       <button className="again" onClick={restart}><RotateCcw/> 다시 플레이</button>
     </section>
   </div>}
 </main>
}
