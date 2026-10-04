// Original coconut scores. AudioContext is created only after an intentional input.
export const AUDIO_KEY='sequencepang3-coconut-audio-v1';
export type AudioPreferences={master:boolean;bgm:boolean;sfx:boolean;bgmVolume:number;sfxVolume:number};
export const MUSIC={menu:{file:'01_coconut_cove_menu',duration:2016000/44100},play:{file:'02_tidal_patterns_play',duration:4032000/44100}};
const JINGLES={clear:'03_island_clear',complete:'05_coconut_journey_complete'};
export const EFFECTS=['ui_tap','deselect','match_ap','match_gp','invalid_soft','blocked_tile'] as const;
type Scene=keyof typeof MUSIC;
type Cue=typeof EFFECTS[number]|keyof typeof JINGLES;
type Asset=Scene|Cue;
type StorageLike=Pick<Storage,'getItem'|'setItem'>;
type Voice={source:AudioBufferSourceNode;gain:GainNode;jingle:boolean};
type Loop={source:AudioBufferSourceNode;gain:GainNode;scene:Scene;stopping?:boolean};
const clamp=(value:unknown,fallback:number)=>typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.min(1,value)):fallback;
export function readAudioPreferences(storage?:StorageLike):AudioPreferences{
 const defaults={master:false,bgm:true,sfx:true,bgmVolume:.55,sfxVolume:.8};
 try{
  const saved=JSON.parse(storage?.getItem(AUDIO_KEY)||'null');
  if(!saved||typeof saved!=='object'||Array.isArray(saved))return defaults;
  for(const key of ['master','bgm','sfx'] as const)if(typeof saved[key]==='boolean')defaults[key]=saved[key];
  defaults.bgmVolume=clamp(saved.bgmVolume,defaults.bgmVolume);defaults.sfxVolume=clamp(saved.sfxVolume,defaults.sfxVolume);
 }catch{/* Private mode and denied storage still allow a quiet game. */}
 return defaults;
}
export class GameAudio{
 preferences:AudioPreferences;
 context?:AudioContext;masterGain?:GainNode;musicGain?:GainNode;effectsGain?:GainNode;
 readonly buffers=new Map<Asset,AudioBuffer>();readonly pending=new Map<Asset,Promise<AudioBuffer|null>>();
 readonly voices=new Set<Voice>();readonly loops=new Set<Loop>();
 scene:Scene='menu';hidden=false;unlocked=false;disposed=false;modal=false;
 private revision=0;private eventRevision=0;private lastTap=-Infinity;private resumeAfterHidden=false;
 private musicEpoch?:number;private currentLoop?:Loop;private jingle?:Voice;
 constructor(private options:{storage?:StorageLike;createContext?:()=>AudioContext;fetcher?:typeof fetch;now?:()=>number;onChange?:(preferences:AudioPreferences)=>void}={}){this.preferences=readAudioPreferences(options.storage);}
 get audible(){const p=this.preferences;return p.master&&((p.bgm&&p.bgmVolume>0)||(p.sfx&&p.sfxVolume>0));}
 get ready(){return !this.disposed&&!this.hidden&&this.unlocked&&this.context?.state==='running'&&this.preferences.master;}
 private init(){
  if(this.context||this.disposed)return;
  const AudioConstructor=globalThis.AudioContext||(globalThis as typeof globalThis&{webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
  this.context=this.options.createContext?this.options.createContext():new AudioConstructor!();
  this.masterGain=this.context.createGain();this.musicGain=this.context.createGain();this.effectsGain=this.context.createGain();
  this.musicGain.connect(this.masterGain);this.effectsGain.connect(this.masterGain);this.masterGain.connect(this.context.destination);this.updateGains(0);
 }
 // Invoke synchronously from the input handler, never from a mount effect.
 unlock():Promise<boolean>{
  if(this.hidden||this.disposed||!this.audible)return Promise.resolve(false);
  try{
   this.init();this.unlocked=true;const context=this.context!;
   return context.resume().then(()=>{
    if(this.hidden||!this.audible||this.disposed){void context.suspend().catch(()=>{});return false;}
    this.updateGains();void this.syncMusic();this.preload();return context.state==='running';
   }).catch(()=>false);
  }catch{return Promise.resolve(false);}
 }
 async load(id:Asset):Promise<AudioBuffer|null>{
  if(this.buffers.has(id))return this.buffers.get(id)!;
  if(this.pending.has(id))return this.pending.get(id)!;
  const context=this.context;if(!context)return null;
  const paths=id in MUSIC?[`music/${MUSIC[id as Scene].file}.ogg`,`music/${MUSIC[id as Scene].file}.wav`]:
   id in JINGLES?[`jingles/${JINGLES[id as keyof typeof JINGLES]}.wav`]:EFFECTS.includes(id as typeof EFFECTS[number])?[`sfx/${id}.wav`]:[];
  const promise=(async()=>{
   for(const path of paths){
    const abort=new AbortController(),timeout=setTimeout(()=>abort.abort(),8000);
    try{
     const response=await (this.options.fetcher||fetch)(`/audio/${path}`,{signal:abort.signal});if(!response.ok)continue;
     const buffer=await context.decodeAudioData(await response.arrayBuffer());if(this.disposed)return null;
     this.buffers.set(id,buffer);return buffer;
    }catch{/* Ogg decode/network failures fall back to exact-duration WAV. */}finally{clearTimeout(timeout);}
   }
   return null; // Asset failures never block gameplay.
  })().finally(()=>this.pending.delete(id));
  this.pending.set(id,promise);return promise;
 }
 private preload(){
  if(!this.ready||!this.preferences.sfx)return;
  for(const id of [...EFFECTS,...Object.keys(JINGLES) as (keyof typeof JINGLES)[]])void this.load(id);
 }
 private ramp(param:AudioParam,value:number,duration=.12){
  const time=this.context!.currentTime;
  if(param.cancelAndHoldAtTime)param.cancelAndHoldAtTime(time);else{param.cancelScheduledValues(time);param.setValueAtTime(param.value,time);}
  if(duration)param.linearRampToValueAtTime(value,time+duration);else param.setValueAtTime(value,time);
 }
 private updateGains(duration=.12){
  if(!this.context)return;const p=this.preferences;
  this.ramp(this.masterGain!.gain,p.master?.8:0,duration);this.ramp(this.effectsGain!.gain,p.sfx?p.sfxVolume:0,duration);
  this.ramp(this.musicGain!.gain,p.bgm?p.bgmVolume*(this.jingle?.2:this.modal?.55:1):0,duration);
 }
 setPreferences(patch:Partial<AudioPreferences>){
  this.preferences={...this.preferences,...patch};
  this.preferences.bgmVolume=clamp(this.preferences.bgmVolume,.55);this.preferences.sfxVolume=clamp(this.preferences.sfxVolume,.8);
  try{this.options.storage?.setItem(AUDIO_KEY,JSON.stringify(this.preferences));}catch{/* Storage is optional. */}
  this.revision++;
  if(!this.preferences.master||!this.preferences.sfx||!this.preferences.sfxVolume)this.stopTransient();
  if(!this.preferences.bgm||!this.preferences.master||!this.preferences.bgmVolume)this.stopMusic();
  this.updateGains();
  if(!this.audible)void this.context?.suspend().catch(()=>{});else void this.unlock();
  this.options.onChange?.(this.preferences);
 }
 setScene(scene:Scene){
  this.stopTransient();if(scene!==this.scene){this.scene=scene;this.revision++;}void this.syncMusic();
 }
 setModal(open:boolean){this.modal=open;this.updateGains();}
 async syncMusic(){
  if(!this.ready||!this.preferences.bgm||!this.preferences.bgmVolume)return;
  const scene=this.scene,revision=this.revision;if(this.currentLoop?.scene===scene)return;
  const buffer=await this.load(scene);
  if(!buffer||revision!==this.revision||!this.ready||!this.preferences.bgm||!this.preferences.bgmVolume||this.currentLoop?.scene===scene)return;
  const context=this.context!,time=context.currentTime;this.musicEpoch??=time;
  const source=context.createBufferSource(),gain=context.createGain();
  source.buffer=buffer;source.loop=true;source.loopStart=0;source.loopEnd=MUSIC[scene].duration;
  source.connect(gain);gain.connect(this.musicGain!);gain.gain.setValueAtTime(0,time);
  const entry:Loop={source,gain,scene};this.loops.add(entry);
  source.onended=()=>{this.loops.delete(entry);source.disconnect();gain.disconnect();};
  const duration=.6,curve=Float32Array.from({length:32},(_,i)=>Math.sin(i/31*Math.PI/2));
  gain.gain.setValueCurveAtTime(curve,time,duration);
  for(const previous of this.loops)if(previous!==entry)this.retire(previous,duration);
  this.currentLoop=entry;source.start(time,(time-this.musicEpoch)%MUSIC[scene].duration);
 }
 private retire(entry:Loop,duration=.1){
  if(entry.stopping)return;entry.stopping=true;this.ramp(entry.gain.gain,0,duration);
  try{entry.source.stop(this.context!.currentTime+duration);}catch{/* Already stopped. */}
 }
 private stopMusic(){this.revision++;for(const entry of this.loops)this.retire(entry);this.currentLoop=undefined;}
 stopTransient(){
  this.eventRevision++;
  for(const voice of this.voices){try{voice.source.stop();}catch{}voice.source.disconnect();voice.gain.disconnect();}
  this.voices.clear();this.jingle=undefined;this.updateGains();
 }
 async play(id:Cue):Promise<boolean>{
  if(!this.ready||!this.preferences.sfx||!this.preferences.sfxVolume)return false;
  const now=this.options.now||(()=>performance.now()),started=now(),isJingle=id in JINGLES;
  if(id==='ui_tap'||id==='blocked_tile'){if(started-this.lastTap<55)return false;this.lastTap=started;}
  if(isJingle)this.stopTransient();const token=this.eventRevision;
  const buffer=await this.load(id);
  if(!buffer||token!==this.eventRevision||!this.ready||!this.preferences.sfx||!this.preferences.sfxVolume||now()-started>(isJingle?1500:250))return false;
  if(!isJingle&&this.jingle)return false;
  const small=[...this.voices].filter(v=>!v.jingle);
  if(!isJingle&&small.length>=3){try{small[0].source.stop();}catch{}this.voices.delete(small[0]);}
  const context=this.context!,source=context.createBufferSource(),gain=context.createGain();
  source.buffer=buffer;source.connect(gain);gain.connect(this.effectsGain!);gain.gain.setValueAtTime(isJingle?.85:1,context.currentTime);
  const voice={source,gain,jingle:isJingle};this.voices.add(voice);
  if(isJingle){this.jingle=voice;this.updateGains(.08);}
  source.onended=()=>{source.disconnect();gain.disconnect();this.voices.delete(voice);if(this.jingle===voice){this.jingle=undefined;this.updateGains(.3);}};
  source.start();return true;
 }
 setHidden(hidden:boolean){
  if(hidden===this.hidden)return;this.hidden=hidden;this.revision++;
  if(hidden){this.resumeAfterHidden=this.unlocked&&this.context?.state==='running'&&this.audible;this.stopTransient();void this.context?.suspend().catch(()=>{});}
  else if(this.resumeAfterHidden){this.resumeAfterHidden=false;void this.unlock();}
 }
 dispose(){this.disposed=true;this.stopTransient();this.stopMusic();this.buffers.clear();void this.context?.close().catch(()=>{});}
}
