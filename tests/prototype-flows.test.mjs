import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import init,{Editor} from '../web/pkg/pixlprfct_core.js';
import {prototypeState} from '../web/prototype.js';
import {connectionHandle,connectionHit,connectionTarget,connectedShape,connectionCurve,connectionAt} from '../web/prototype-connections.js';
import {interactions,withInteractions} from '../web/prototype-interactions.js';
await init({module_or_path:await readFile(new URL('../web/pkg/pixlprfct_core_bg.wasm',import.meta.url))});
const doc=e=>JSON.parse(e.snapshot()),get=(e,id)=>doc(e).shapes.find(s=>s.id===id),edit=(e,id,p)=>e.update(JSON.stringify({...get(e,id),...p}));
test('named flow starts persist and validate atomically without inheriting from main components',()=>{
 const e=new Editor(),f=e.add('frame',0,0),r=e.add('rectangle',0,0);edit(e,f,{flow_name:'Checkout'});const before=e.snapshot();for(const flow_name of [' '.repeat(2),'x'.repeat(129)]){assert.throws(()=>edit(e,f,{flow_name}));assert.equal(e.snapshot(),before);}assert.throws(()=>edit(e,r,{flow_name:'Not a frame'}));
 e.create_component(f);const i=e.create_instance(f,400,0);assert.equal(get(e,i).flow_name,'');edit(e,i,{flow_name:'Mobile checkout'});edit(e,f,{flow_name:'Purchase',fill:'#ff0000'});assert.equal(get(e,i).flow_name,'Mobile checkout');assert.equal(get(e,i).fill,'#ff0000');
 const copy=new Editor();copy.load(e.snapshot());assert.equal(copy.snapshot(),e.snapshot());copy.free();e.free();
});
test('choosing a new flow clears overlays and gives Restart a new start',()=>{
 const e=new Editor(),a=e.add('frame',0,0),b=e.add('frame',400,0),s=prototypeState(doc(e),a);s.open({target:b});assert.equal(s.start(b),true);assert.equal(s.active,b);assert.equal(s.canBack,false);assert.deepEqual(s.overlays,[]);s.navigate(a);s.restart();assert.equal(s.current,b);assert.equal(s.start(999),false);e.free();
});
test('canvas connections target visible clipped frames, preserve overlay settings and undo as one edit',()=>{
 const e=new Editor(),a=e.add('frame',0,0),b=e.add('frame',500,0);edit(e,a,{width:200,height:100});edit(e,b,{width:200,height:100});const s=get(e,a),h=connectionHandle(s,2);assert.deepEqual(h,{x:206,y:50});assert.equal(connectionHit(s,h,2),true);assert.equal(connectionHit(s,{x:220,y:50},2),false);assert.equal(connectionTarget(doc(e).shapes,a,{x:550,y:50}),b);assert.equal(connectionTarget(doc(e).shapes,a,{x:50,y:50}),0);
 const before=e.snapshot();e.update(JSON.stringify(connectedShape(s,b)));assert.equal(get(e,a).prototype.target,b);e.undo();assert.equal(e.snapshot(),before);
 const overlay=connectedShape({...s,prototype:{action:'overlay',target:a,close_on_outside:true,overlay_position:'top-left'}},b);assert.equal(overlay.prototype.action,'overlay');assert.equal(overlay.prototype.close_on_outside,true);
 edit(e,b,{hidden:true});assert.equal(connectionTarget(doc(e).shapes,a,{x:550,y:50}),0);e.free();
});
test('canvas wire selection resolves the source and interaction at different zoom levels',()=>{
 const a={id:1,kind:'frame',x:0,y:0,width:200,height:100,prototype:{action:'navigate',target:2}},b={id:2,kind:'frame',x:500,y:160,width:200,height:100};
 for(const zoom of [.25,1,2]){
  const curve=connectionCurve(a,b,zoom),mid={x:(curve[0].x+3*curve[1].x+3*curve[2].x+curve[3].x)/8,y:(curve[0].y+3*curve[1].y+3*curve[2].y+curve[3].y)/8};
  assert.deepEqual(connectionAt([a,b],mid,zoom),{source:1,index:0});
  assert.equal(connectionAt([a,b],{x:mid.x,y:mid.y+40/zoom},zoom),null);
  assert.equal(connectionAt([a,{...b,hidden:true}],mid,zoom),null);
  assert.equal(connectionAt([{...a,prototype:{action:'back',target:2}},b],mid,zoom),null);
 }
});
test('overlapping destinations have independently selectable interaction curves',()=>{
 const a={id:1,kind:'frame',x:0,y:0,width:200,height:100,prototype:{action:'navigate',target:2},additional_interactions:[{trigger:'mouseenter',action:'overlay',target:2}]},b={id:2,kind:'frame',x:500,y:0,width:200,height:100};
 assert.deepEqual(connectionAt([a,b],{x:356,y:38},1),{source:1,index:0});
 assert.deepEqual(connectionAt([a,b],{x:356,y:62},1),{source:1,index:1});
});
test('reconnecting and deleting a selected secondary interaction preserve other links and undo',()=>{
 const e=new Editor(),a=e.add('frame',0,0),b=e.add('frame',500,0),c=e.add('frame',1000,0);
 const primary={action:'navigate',target:b,transition:'slide-left'},secondary={trigger:'mouseenter',action:'overlay',target:b,transition:'dissolve',duration:700,easing:'ease-out',close_on_outside:true};
 e.update(JSON.stringify(withInteractions(get(e,a),[primary,secondary])));const before=e.snapshot();
 e.update(JSON.stringify(connectedShape(get(e,a),c,1)));const links=interactions(get(e,a));assert.equal(links[0].target,b);assert.equal(links[0].transition,'slide-left');assert.equal(links[1].target,c);assert.equal(links[1].action,'overlay');assert.equal(links[1].duration,700);assert.equal(links[1].close_on_outside,true);
 e.undo();assert.equal(e.snapshot(),before);
 e.update(JSON.stringify(withInteractions(get(e,a),interactions(get(e,a)).filter((_,index)=>index!==1))));assert.equal(interactions(get(e,a)).length,1);assert.equal(get(e,a).prototype.target,b);e.undo();assert.equal(e.snapshot(),before);e.free();
});
