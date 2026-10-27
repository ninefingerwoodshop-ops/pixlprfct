import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {snippets,createBehavior,validateBehavior,behaviorSource,mountBehaviors} from '../web/behaviors.js';
import {codeExportFiles} from '../web/code-export.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const snap=e=>JSON.parse(e.snapshot());
test('behaviors survive save, reload, duplication, undo and redo',()=>{
 const e=new Editor(),id=e.add('rectangle',0,0),before=e.snapshot();
 const shape=snap(e).shapes[0],behavior=createBehavior(snippets[0]);
 e.update(JSON.stringify({...shape,behaviors:[behavior]}));
 const saved=e.snapshot();e.undo();assert.equal(e.snapshot(),before);e.redo();assert.equal(e.snapshot(),saved);
 const copy=new Editor();copy.load(saved);assert.deepEqual(snap(copy).shapes[0].behaviors,[behavior]);
 const page=copy.duplicate_page(1);assert.deepEqual(snap(copy).shapes.find(s=>s.page_id===page).behaviors,[behavior]);
 e.free();copy.free();
});
test('all built-in snippets parse and invalid enabled code blocks export',()=>{
 for(const snippet of snippets)assert.equal(validateBehavior(snippet.code),'',snippet.name);
 assert.throws(()=>behaviorSource([{id:1,name:'Broken',behaviors:[{enabled:true,name:'JS',code:'if ('}]}]),/Broken \/ JS/);
 assert.doesNotThrow(()=>behaviorSource([{id:1,behaviors:[{enabled:false,code:'if ('}]}]));
});
test('web framework exports contain behaviors and mount/unmount hooks',()=>{
 const e=new Editor();e.add('rectangle',0,0);const doc=snap(e);doc.shapes[0].behaviors=[createBehavior(snippets[0])];
 for(const target of ['html','react','vue','angular']){
  const files=codeExportFiles(doc,{target}).map(f=>({...f,text:new TextDecoder().decode(f.data)}));const runtime=files.find(f=>f.name==='behavior-runtime.js');assert.ok(runtime.text.includes('Fade in'));
  const code=files.map(f=>f.text).join('\n');
  if(target==='html')assert.match(code,/mountBehaviors\(document, behaviors\)/);
  if(target==='react')assert.match(code,/useEffect\(\(\)=>mountBehaviors/);
  if(target==='vue')assert.match(code,/onBeforeUnmount/);
  if(target==='angular')assert.match(code,/ngOnDestroy/);
 }
 e.free();
});
test('managed runtime removes event listeners and restores styles',()=>{
 const listeners=new Map();let style=null;
 const element={style:{},addEventListener:(event,fn)=>listeners.set(event,fn),removeEventListener:event=>listeners.delete(event),getAttribute:()=>style,removeAttribute:()=>{style=null;},setAttribute:(_,value)=>{style=value;}};
 let clicks=0;const errors=[];
 const cleanup=mountBehaviors({querySelector:()=>element,querySelectorAll:()=>[]},[{layer:1,name:'Click',enabled:true,trigger:'load',run:(el,api)=>{api.on(el,'click',()=>clicks++);api.style(el,{opacity:'0.5'});api.cleanup(()=>clicks++);}}],e=>errors.push(e));
 listeners.get('click')();assert.equal(clicks,1);cleanup();assert.equal(clicks,2);assert.equal(listeners.size,0);assert.equal(style,null);assert.deepEqual(errors,[]);
});

test('native validation preserves descriptions, recovers, resets and cleans up without stale microtasks',async()=>{
 class Target extends EventTarget {constructor(attrs={}){super();this.attrs=new Map(Object.entries(attrs));}getAttribute(k){return this.attrs.get(k)??null;}setAttribute(k,v){this.attrs.set(k,String(v));}removeAttribute(k){this.attrs.delete(k);}}
 const error={id:'error',textContent:'',hidden:true},form=new Target(),field=new Target({'data-validate':'blur','aria-describedby':'helper','data-error-message':'Required'});
 Object.assign(field,{willValidate:true,validity:{valid:false},parentElement:{querySelector:selector=>selector==='.px-control-error'?error:null},form,focus(){this.focused=true;}});form.querySelector=()=>field;
 const root={querySelectorAll:selector=>selector==='.px-control[data-validate],.px-dropdown-native[data-validate]'?[field]:[]};
 const cleanup=mountBehaviors(root,[]);
 field.dispatchEvent(new Event('input'));assert.equal(error.hidden,true);
 field.dispatchEvent(new Event('blur'));assert.equal(error.textContent,'Required');assert.equal(field.getAttribute('aria-describedby'),'helper error');
 field.validity.valid=true;field.dispatchEvent(new Event('input'));assert.equal(error.hidden,true);assert.equal(field.getAttribute('aria-describedby'),'helper');
 field.validity.valid=false;const invalid=new Event('invalid',{cancelable:true});field.dispatchEvent(invalid);assert.equal(invalid.defaultPrevented,true);assert.equal(field.focused,true);
 form.dispatchEvent(new Event('reset'));await Promise.resolve();assert.equal(error.hidden,true);assert.equal(field.getAttribute('aria-invalid'),'false');
 field.dispatchEvent(new Event('blur'));form.dispatchEvent(new Event('reset'));cleanup();await Promise.resolve();
 assert.equal(field.getAttribute('aria-invalid'),null);assert.equal(field.getAttribute('aria-describedby'),'helper');assert.equal(error.hidden,true);
 field.dispatchEvent(new Event('blur'));assert.equal(error.hidden,true);
});
