// Actual App handlers with isolated React hooks, timers and storage. Not browser E2E.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
type Node={type:any;props:any;getAttribute:(name:string)=>string|null;focus:()=>void};
export function appHarness(data=new Map<string,string>()){
 let states:any[]=[],idx=0,effects:Array<()=>void>=[],rootEl:Node,current:Node,timers=new Map<number,()=>void>(),tid=0;
 const listeners=new Map<string,Function>(),focused:string[]=[];
 const document={activeElement:null as Node|null,getElementById(){},addEventListener(){},removeEventListener(){},hidden:false};
 const R:any={useState(init:any){const i=idx++;if(!(i in states))states[i]=typeof init==='function'?init():init;return[states[i],(v:any)=>{states[i]=typeof v==='function'?v(states[i]):v;}];},useRef(init:any){return R.useState(()=>({current:init}))[0];},useEffect(fn:any,deps:any[]){const i=idx++;if(!states[i]||deps.some((d,j)=>d!==states[i][j]))effects.push(fn);states[i]=deps;},createElement(type:any,props:any,...children:any[]){const node:Node={type,props:{...props,children},getAttribute(name){return this.props[name]??null;},focus(){document.activeElement=this;focused.push(this.props['data-tile']??this.props.className);}};return node;},Fragment:'Fragment'};R.default=R;
 const sandbox={console,localStorage:{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}},document,window:{addEventListener(type:string,fn:Function){listeners.set(type,fn);},removeEventListener(type:string){listeners.delete(type);}},setTimeout:(fn:()=>void)=>{timers.set(++tid,fn);return tid;},clearTimeout:(id:number)=>timers.delete(id)};
 const modules:Record<string,any>={};
 function load(file:string):any{
  if(file.endsWith('.css'))return{};if(file.endsWith('.json'))return JSON.parse(fs.readFileSync(file,'utf8'));if(modules[file])return modules[file];
  const exports={};modules[file]=exports;
  const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{jsx:ts.JsxEmit.React,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText;
  const req=(name:string):any=>name==='react'?R:name==='react-dom/client'?{createRoot:()=>({render:(element:Node)=>{rootEl=element;}})}:name==='lucide-react'?new Proxy({},{get:(_,key)=>key}):name==='./usePwaInstall'?{usePwaInstall:()=>({installed:true})}:name==='./audio'?{GameAudio:class{preferences={};setHidden(){}setModal(){}setScene(){}play(){}stopTransient(){}unlock(){}}}:/HelpDialog|InstallGuide|AudioSettings|StageSelect/.test(name)?{[name.slice(2)]:name.slice(2)}:load(path.resolve(path.dirname(file),name+(path.extname(name)?'':'.ts')));
  vm.runInNewContext('(function(require,exports){'+source+'})',sandbox)(req,exports);return exports;
 }
 function nodes(element:any,all:Node[]=[]):Node[]{if(element&&typeof element==='object'){all.push(element);for(const child of [element.props?.children].flat(Infinity))nodes(child,all);}return all;}
 function render(){idx=0;effects=[];current=rootEl.type();current.props.ref.current={querySelector(selector:string){
  const all=nodes(current);
  if(selector==='dialog[open]')return all.find(node=>['HelpDialog','AudioSettings','InstallGuide'].includes(node.type))??null;
  if(selector.startsWith('.tile'))return all.find(node=>node.props?.['data-blocked']==='none')??all.find(node=>node.props?.className==='notice');
  return all.find(node=>node.props?.className===(selector.includes('clear-content')?'primary':'primary start'))??null;
 }};effects.forEach(effect=>effect());return current;}
 function click(predicate:(node:Node)=>boolean,mode:'keyboard'|'pointer'='pointer'){
  const node=nodes(current).find(predicate);if(!node)throw Error('Node not found');
  if(mode==='keyboard')current.props.onKeyDownCapture({key:'Enter'});else current.props.onPointerDownCapture();
  document.activeElement=node;node.props.onClick();render();
 }
 load(root+'/src/coconut/main.tsx');render();
 return {data,focused,document,render,click,nodes:()=>nodes(current),storageChanged(key:string|null){listeners.get('storage')?.({key});render();},flush(){for(const [id,fn] of [...timers]){timers.delete(id);fn();}render();},start(mode:'keyboard'|'pointer'='pointer'){click(node=>node.props?.className==='primary start',mode);},next(mode:'keyboard'|'pointer'='pointer'){click(node=>node.props?.className==='primary'&&node.props.children.flat().includes('다음 단계 '),mode);},closeHelp(){nodes(current).find(node=>node.type==='HelpDialog')!.props.onClose();render();}};
}
