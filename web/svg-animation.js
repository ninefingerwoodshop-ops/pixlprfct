import {icon} from './icons.js';
import {installInspectorDropdowns} from './inspector-dropdown.js';
import {numberField,choose} from './inspector-settings.js';
import {LocalDrafts,withDraftLock} from './local-drafts.js';
import {LocalPersistence} from './local-persistence.js';
import {localRecovery} from './local-recovery.js';
import {CloudSession,cloudRequest} from './cloud-session.js';
import {installSvgCloudEditing} from './svg-animation-cloud.js';
import {projectRoute,projectUrl} from './project-navigation.js';
import {projectFile} from './project-file.js';
import {readDesignFile} from './design-import.js';
import {installDesktop} from './desktop-integration.js';
import {properties,isSvgAnimation,validateAnimation,putKey,trackValue,deleteKey,setMotionPath} from './svg-animation-model.js';
import {sanitizeSvg,normalizeSvgAnimation,animationLayers,animationScene,baseValue} from './svg-animation-svg.js';
import {installSvgTimeline} from './svg-animation-timeline.js';
import {captureMotionPath,pathKinds} from './svg-animation-path.js';
import {easingEditor} from './svg-animation-easing.js';
import {morphData,moveMorphPoint} from './svg-animation-morph.js';
import {installMorphNodes} from './svg-animation-nodes.js';
import {installSvgExport} from './svg-animation-export.js';

const $=id=>document.getElementById(id),el=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;};
const button=(label,glyph,run)=>{const b=el('button');b.type='button';b.title=label;b.setAttribute('aria-label',label);if(glyph)b.innerHTML=icon(glyph);else b.textContent=label;b.onclick=run;return b;};
let doc,local,cloud,drafts,selected=null,keySelection=null,currentTime=0,running=false,raf=0,timeline,dropdowns,preview,layerList=[],sourceRoot,zoom=1,autoFit=true;
let history=[],future=[],updateRecovery=()=>{},loading=true,team=null;
let nodeEditor,morphEditing=false,morphPoint=[0,0];
const snapshot=()=>JSON.stringify(doc),animation=()=>doc.svg_animation;
function report(message){$('svg-message').textContent=message;$('svg-notice').hidden=false;}
function download(name,data,type){const url=URL.createObjectURL(new Blob([data],{type})),link=el('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function downloadProject(){const file=projectFile(snapshot());download(file.name,file.data,file.type);local?.downloaded(snapshot());}
function safe(action){return (...args)=>{try{const result=action(...args);result?.catch?.(e=>report(e.message));}catch(e){report(e.message);}};}
function syncAddress(){if(local?.enabled&&drafts.activeId)window.history.replaceState(null,'',projectUrl({kind:'local',id:drafts.activeId,design_type:'svg-animation'}));}
function changed(){if(loading)return;validateAnimation(doc);if(local?.enabled)local.changed();else{cloud.remember();cloud.changed();}syncAddress();}
function canEdit(){if(team&&!team.editable()){report(team.message());if(preview)render();return false;}return true;}
function commit(next){validateAnimation(next);if(JSON.stringify(next)===snapshot()||!canEdit())return;stop();history.push(snapshot());if(history.length>80)history.shift();future=[];doc=next;currentTime=Math.min(currentTime,animation().duration);changed();render();}
function changeAnimation(next){commit({...doc,svg_animation:next});}
function undo(redo=false){const from=redo?future:history,to=redo?history:future;if(!from.length||!canEdit())return;stop();to.push(snapshot());doc=JSON.parse(from.pop());keySelection=null;timeline.clearSelection();currentTime=Math.min(currentTime,animation().duration);changed();render();}
function stop(){running=false;cancelAnimationFrame(raf);timeline?.update();}
function seek(time){nodeEditor?.cancel();stop();currentTime=Math.max(0,Math.min(animation().duration,Number.isFinite(time)?time:0));paint();renderFields();timeline?.update();}
function play(){nodeEditor?.cancel();if(running){stop();paint();return;}if(!animation().tracks.length)return;running=true;const start=performance.now()-(currentTime>=animation().duration?0:currentTime);const tick=now=>{if(!running)return;const elapsed=now-start;currentTime=animation().loop?elapsed%animation().duration:Math.min(elapsed,animation().duration);if(!animation().loop&&elapsed>=animation().duration)running=false;paint();renderFields();timeline.update();if(running)raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);timeline.update();}
function currentLayer(){return layerList.find(l=>l.id===selected);}
function currentTrack(property){return animation().tracks.find(t=>t.element===selected&&t.property===property);}
function valueAt(property){const t=currentTrack(property),layer=currentLayer();return t?trackValue(t,currentTime):layer?baseValue(layer.node,property):properties[property].initial;}
function originFor(layer){try{const b=layer.node.getBBox(),m=layer.node.transform?.baseVal.consolidate()?.matrix;let p=new DOMPoint(b.x+b.width/2,b.y+b.height/2);if(m)p=p.matrixTransform(m);return [p.x,p.y];}catch{return [0,0];}}
function keyValue(property,value,time=currentTime){
 const layer=currentLayer();if(!layer)return;const t=currentTrack(property),easing=t?.keys.find(k=>k.time===time)?.easing??'linear';
 let next=putKey(animation(),selected,property,time,value,easing,baseValue(layer.node,property));next.origins={...next.origins,[selected]:next.origins[selected]??originFor(layer)};
 keySelection={element:selected,property,time:Math.round(time)};changeAnimation(next);
}
function addAnimator(property){if(!property||!selected)return;const layer=currentLayer(),initial=valueAt(property);let next=putKey(animation(),selected,property,Math.round(currentTime),initial,'linear',baseValue(layer.node,property));if(!next.tracks.find(t=>t.element===selected&&t.property===property).keys.some(k=>k.time===next.duration))next=putKey(next,selected,property,next.duration,initial);next.origins={...next.origins,[selected]:next.origins[selected]??originFor(layer)};if(property==='morph'){morphEditing=true;morphPoint=[0,0];}keySelection={element:selected,property,time:Math.round(currentTime)};changeAnimation(next);renderInspector();}
function selectLayer(id){nodeEditor?.cancel();selected=id;morphEditing=false;morphPoint=[0,0];keySelection=null;timeline.clearSelection();renderLayers();renderInspector();renderMotionGuide();paint();}
function paint(){if(!preview)return;preview.seek(currentTime);paintSelection();nodeEditor?.update();}
function paintSelection(){const node=selected?preview.root.querySelector('#'+selected):null,outline=$('svg-selection');outline.hidden=!node||morphEditing;if(node){const rect=node.getBoundingClientRect(),stage=$('svg-stage').getBoundingClientRect();Object.assign(outline.style,{left:rect.left-stage.left+'px',top:rect.top-stage.top+'px',width:rect.width+'px',height:rect.height+'px'});}}
function fit(){const box=$('workspace').getBoundingClientRect(),view=preview.root.viewBox.baseVal;if(autoFit)zoom=Math.max(.05,Math.min(1,(box.width-96)/view.width,(box.height-160)/view.height));Object.assign($('svg-stage').style,{width:view.width*zoom+'px',height:view.height*zoom+'px'});$('svg-zoom-value').textContent=Math.round(zoom*100)+'%';$('svg-canvas-size').textContent=`SVG · ${view.width} × ${view.height}`;paint();}
function render(){
 nodeEditor?.cancel();
 const {root}=sanitizeSvg(animation().svg);sourceRoot=root;
 // The offscreen SVG resolves inherited paint and geometry without animation.
 const measure=$('svg-measure');measure.replaceChildren(root);layerList=animationLayers(root);
 if(!layerList.some(l=>l.id===selected)){selected=null;morphEditing=false;}
 if(!currentTrack('morph'))morphEditing=false;
 preview=animationScene(animation());$('svg-art').replaceChildren(preview.root);renderMotionGuide();$('svg-empty').hidden=layerList.length>0;
 if(document.activeElement!==$('svg-name'))$('svg-name').value=doc.name;document.title=doc.name+' · SVG Animation · PixlPrfct';
 $('svg-undo').disabled=!history.length;$('svg-redo').disabled=!future.length;$('svg-export').disabled=!layerList.length;
 renderLayers();renderInspector();fit();timeline?.render();dropdowns?.();
}
function renderLayers(){const host=$('svg-layers'),query=$('svg-search').value.trim().toLowerCase();host.replaceChildren();for(const layer of layerList.filter(l=>l.name.toLowerCase().includes(query))){const b=button('Select '+layer.name,null,()=>selectLayer(layer.id));b.className='svg-layer';b.dataset.element=layer.id;b.style.paddingLeft=16+layer.depth*12+'px';b.setAttribute('aria-pressed',String(selected===layer.id));b.replaceChildren();const glyph=el('span');glyph.innerHTML=icon(({g:'group',rect:'rectangle',circle:'ellipse',ellipse:'ellipse',path:'pen',text:'text'})[layer.kind]??'file');b.append(glyph,el('span','',layer.name));host.append(b);}if(!host.childElementCount)host.append(el('p','svg-layer-header',query?'No matching elements':'No elements yet'));}
const fields=new Map(),diamonds=new Map(),morphFields=new Map();
function section(title){const s=el('section','property-section');s.append(el('h3','',title));$('svg-properties').append(s);return s;}
function selectControl(label,options){return choose(label,options,options[0][0],()=>{});}
function renderMotionGuide(){
 preview.root.querySelectorAll('[data-motion-guide]').forEach(n=>n.remove());const motion=preview.motionGuides.find(g=>g.element===selected);if(!motion)return;
 const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('data-motion-guide','');path.setAttribute('d',motion.d);path.setAttribute('fill','none');path.setAttribute('stroke','#0d99ff');path.setAttribute('stroke-width','1');path.setAttribute('stroke-dasharray','4 4');path.setAttribute('vector-effect','non-scaling-stroke');path.style.pointerEvents='none';motion.parent.append(path);
}
function propertyRow(section,property){
 const p=properties[property],row=el('div','svg-property-row'),label=el('span','',p.label),control=p.color?el('input'):numberField(p.label,valueAt(property),safe(value=>keyValue(property,value)),{min:p.min,max:p.max,step:property.startsWith('scale')||property==='opacity'?'.01':'any'}),input=p.color?control:control.querySelector('input');input.setAttribute('aria-label',p.label);if(p.color){input.type='text';input.onchange=safe(()=>keyValue(property,input.value.toLowerCase()));}input.onkeydown=e=>{if(e.key==='Enter')input.blur();if(e.key==='Escape'){input.value=String(valueAt(property));input.blur();}};
 const key=button('Add or remove '+p.label+' keyframe','keyframe',safe(()=>{const active=currentTrack(property)?.keys.some(k=>k.time===Math.round(currentTime));if(active){keySelection=null;changeAnimation(deleteKey(animation(),selected,property,Math.round(currentTime)));}else keyValue(property,valueAt(property));}));row.append(label,control,key);section.append(row);fields.set(property,input);diamonds.set(property,key);
}
function morphInspector(layer){
 if(!pathKinds.has(layer.kind))return null;const host=section('Morph'),track=currentTrack('morph');
 const edit=button(morphEditing?'Done editing nodes':'Edit nodes',null,safe(()=>{stop();if(!track){addAnimator('morph');return;}morphEditing=!morphEditing;renderInspector();paint();}));edit.className='svg-node-edit';edit.setAttribute('aria-pressed',String(morphEditing));host.append(edit);
 if(!track){host.append(el('p','svg-hint','Edit this shape’s nodes at the playhead to animate its form.'));return host;}
 const key=button('Add or remove Morph keyframe','keyframe',safe(()=>{const time=Math.round(currentTime);if(track.keys.some(k=>k.time===time)){keySelection=null;changeAnimation(deleteKey(animation(),selected,'morph',time));}else keyValue('morph',valueAt('morph'));}));key.className='svg-morph-key';host.append(key);diamonds.set('morph',key);
 if(morphEditing){const value=valueAt('morph');if(!value[morphPoint[0]]?.points[morphPoint[1]])morphPoint=[0,0];const point=value[morphPoint[0]].points[morphPoint[1]],caption=el('p','svg-hint',`Node ${morphPoint[0]+1}.${morphPoint[1]+1} · drag on the canvas or enter coordinates.`);host.append(caption);
  for(const [kind,label,offset] of [['anchor','Position',0],['in','Incoming handle',2],['out','Outgoing handle',4]]){const row=el('div','svg-node-coordinates');row.append(el('span','',label));for(const [axis,name] of ['X','Y'].entries()){const control=numberField('Morph '+label+' '+name,point[offset+axis],safe(v=>{const values=valueAt('morph'),p=values[morphPoint[0]].points[morphPoint[1]],next=moveMorphPoint(values,...morphPoint,kind,axis===0?v:p[offset],axis===1?v:p[offset+1]);keyValue('morph',next);}),{prefix:name,disabled:!!team&&!team.editable()});const input=control.querySelector('input'),keydown=input.onkeydown;input.onkeydown=e=>{keydown?.(e);if(e.key==='Enter')input.blur();};morphFields.set(offset+axis,input);row.append(control);}host.append(row);}
  host.append(el('p','svg-hint','Arrow keys move a focused node by 1 unit; Shift moves 10. Escape cancels a drag.'));
 }else host.append(el('p','svg-hint','Select Edit nodes to change this shape at the current time.'));
 return host;
}
function renderInspector(){
 const host=$('svg-properties');host.replaceChildren();fields.clear();diamonds.clear();morphFields.clear();const layer=currentLayer();
 if(!layer){const help=section('SVG Animation');help.append(el('p','','Import an SVG or add a shape, then select an element to animate its properties.'));const info=section('Animation');info.append(el('p','',`${animation().duration/1000}s · ${animation().tracks.length} property tracks · ${animation().loop?'Looping':'Plays once'}`));return;}
 const heading=section(layer.name),animator=selectControl('Add animator',[['','Add animator…'],...Object.entries(properties).filter(([,v])=>!v.motion&&(!v.morph||pathKinds.has(layer.kind))).map(([k,v])=>[k,v.label])]);animator.onchange=safe(()=>addAnimator(animator.value));heading.append(animator);
 const morphSection=morphInspector(layer);
 const motionSection=section('Motion path'),motion=currentTrack('motionProgress'),paths=layerList.filter(l=>pathKinds.has(l.kind)&&l.id!==selected&&!layer.node.contains(l.node)),pathPicker=selectControl('Motion path',[['','No motion path'],...(motion?[['current',motion.motion.name+' (assigned)']]:[]),...paths.map(l=>[l.id,l.name])]);pathPicker.value=motion?'current':'';
 pathPicker.onchange=safe(()=>{try{if(pathPicker.value==='current')return;const route=pathPicker.value?captureMotionPath(paths.find(l=>l.id===pathPicker.value).node,layer.node):null;if(route&&motion)route.rotate=motion.motion.rotate;keySelection=null;changeAnimation(setMotionPath(animation(),selected,route,originFor(layer)));}catch(error){renderInspector();throw error;}});motionSection.append(pathPicker);
 if(motion){const orient=choose('Path orientation',[['none','Keep orientation'],['auto','Auto rotate'],['auto-reverse','Auto rotate · reverse']],motion.motion.rotate,safe(value=>changeAnimation(setMotionPath(animation(),selected,{...motion.motion,rotate:value},originFor(layer)))));motionSection.append(orient);propertyRow(motionSection,'motionProgress');motionSection.append(el('p','svg-hint','The element’s origin follows the path. Add progress keys to control timing or reverse direction.'));}
 else motionSection.append(el('p','svg-hint',paths.length?'Choose an SVG path or shape for this element to follow.':'Import artwork containing a separate path or shape to use as a route.'));
 const groups=[['Transform',['x','y','rotation','scaleX','scaleY']],['Appearance',['opacity','fill','stroke','strokeWidth','strokeOffset']]];
 for(const [title,keys] of groups){const s=section(title);for(const property of keys)propertyRow(s,property);}
 const origin=section('Transform origin'),pair=el('div','svg-field-pair svg-origin');for(const [index,name] of ['Origin X','Origin Y'].entries()){const label=el('label','',name),input=numberField(name,(animation().origins[selected]??originFor(layer))[index],safe(value=>{const values=[...(animation().origins[selected]??originFor(layer))];values[index]=value;changeAnimation({...animation(),origins:{...animation().origins,[selected]:values}});}));label.append(input);pair.append(label);}origin.append(pair,button('Center origin',null,()=>changeAnimation({...animation(),origins:{...animation().origins,[selected]:originFor(layer)}})));
 const easing=section('Keyframe easing'),track=keySelection?.property?currentTrack(keySelection.property):null,key=track?.keys.find(k=>k.time===keySelection.time);
 if(key)easing.append(easingEditor({value:key.easing,change:safe(value=>{const next=structuredClone(animation()),t=next.tracks.find(t=>t.element===selected&&t.property===track.property);t.keys.find(k=>k.time===key.time).easing=value;changeAnimation(next);})}));
 easing.append(el('p','svg-hint',key?`${properties[track.property].label} · ${key.time} ms. Easing applies toward the next keyframe.`:'Select a keyframe to edit its easing curve.'));(morphEditing&&morphSection?morphSection:heading).after(easing);
 if(key)easing.append(button('Delete keyframe',null,()=>{changeAnimation(deleteKey(animation(),selected,track.property,key.time));keySelection=null;renderInspector();}));
 const remove=section('Element');remove.append(button('Delete element',null,safe(deleteElement)));renderFields();dropdowns?.();
}
function renderFields(){for(const [property,input] of fields){if(document.activeElement!==input){const value=valueAt(property);input.value=typeof value==='number'?Number(value.toFixed(4)):value;}}for(const [property,key] of diamonds)key.setAttribute('aria-pressed',String(!!currentTrack(property)?.keys.some(k=>k.time===Math.round(currentTime))));if(morphFields.size&&currentTrack('morph')){const point=valueAt('morph')[morphPoint[0]]?.points[morphPoint[1]];if(point)for(const [offset,input] of morphFields)if(document.activeElement!==input)input.value=Number(point[offset].toFixed(4));}}
function deleteElement(){const layer=currentLayer();if(!layer)return;const root=sourceRoot.cloneNode(true),node=root.querySelector('#'+selected),ids=new Set([selected,...node.querySelectorAll('[id]')].map(n=>typeof n==='string'?n:n.id));node.remove();const next={...animation(),svg:new XMLSerializer().serializeToString(root),tracks:animation().tracks.filter(t=>!ids.has(t.element)),origins:Object.fromEntries(Object.entries(animation().origins).filter(([id])=>!ids.has(id)))};selected=null;keySelection=null;changeAnimation(next);}
function addShape(kind){const root=sourceRoot.cloneNode(true),view=root.viewBox.baseVal,node=document.createElementNS('http://www.w3.org/2000/svg',kind);node.setAttribute('fill','#0d99ff');node.setAttribute('data-layer-name',kind==='rect'?'Rectangle':'Ellipse');if(kind==='rect'){for(const [k,v] of Object.entries({x:view.x+view.width*.3,y:view.y+view.height*.3,width:view.width*.4,height:view.height*.4,rx:16}))node.setAttribute(k,v);}else for(const [k,v] of Object.entries({cx:view.x+view.width/2,cy:view.y+view.height/2,rx:view.width*.2,ry:view.height*.2}))node.setAttribute(k,v);root.append(node);const result=sanitizeSvg(new XMLSerializer().serializeToString(root));selected=result.root.lastElementChild.id;changeAnimation({...animation(),svg:result.svg});}
async function importSvg(file){if(!file)return;if((file.size??file.data?.byteLength)>2_000_000)throw new Error('SVG must be smaller than 2 MB.');const result=sanitizeSvg(file.data?new TextDecoder('utf-8',{fatal:true}).decode(file.data):await file.text());selected=null;keySelection=null;currentTime=0;changeAnimation({...animation(),svg:result.svg,tracks:[],origins:{}});autoFit=true;fit();report(result.warnings.length?'Imported SVG. '+result.warnings.join(' '):'SVG imported. Select an element and add an animator.');}
async function importProject(file){if(/\.svg$/i.test(file.name))return importSvg(file);let {body}=await readDesignFile(file);const parsed=JSON.parse(body);if(isSvgAnimation(parsed))body=JSON.stringify(normalizeSvgAnimation(parsed).document);if(local.enabled)await local.flush();else await cloud.flush();await team?.finish();const saved=await withDraftLock(()=>drafts.create(body));location.assign(projectUrl({...saved,kind:'local',body}));}
function example(){const source='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="blue"><stop stop-color="#0d99ff"/><stop offset="1" stop-color="#9b7bff"/></linearGradient></defs><circle id="Orbit" cx="256" cy="256" r="142" fill="none" stroke="#555555" stroke-width="2"/><g id="Satellite"><circle cx="256" cy="114" r="24" fill="url(#blue)"/></g><rect id="Core" x="200" y="200" width="112" height="112" rx="28" fill="url(#blue)"/><path id="Spark" d="M240 256h32m-16-16v32" stroke="white" stroke-width="6" stroke-linecap="round"/></svg>';
 const result=sanitizeSvg(source),sat=animationLayers(result.root).find(l=>l.name==='Satellite'),core=animationLayers(result.root).find(l=>l.name==='Core');let next={...animation(),svg:result.svg,tracks:[],origins:{[sat.id]:[256,256],[core.id]:[256,256]},duration:3000,loop:true};next=putKey(next,sat.id,'rotation',0,0);next=putKey(next,sat.id,'rotation',3000,360);next=putKey(next,core.id,'scaleX',0,1,'ease-in-out');next=putKey(next,core.id,'scaleX',1500,1.15,'ease-in-out');next=putKey(next,core.id,'scaleX',3000,1);selected=sat.id;changeAnimation(next);
}


async function start(){
 const route=projectRoute(location.search);if(!route){location.replace('/');return;}
 let store,tabStore;try{store=localStorage;tabStore=sessionStorage;}catch{}
 drafts=new LocalDrafts(store,tabStore);let record;
 if(route.kind==='local')record={body:await withDraftLock(()=>drafts.activate(route.id))};else record=await cloudRequest('/'+encodeURIComponent(route.id));
 const parsed=JSON.parse(record.body);if(!isSvgAnimation(parsed)){location.replace('/editor/index.html'+location.search);return;}if(record.deleted_at)throw new Error('This project is in Trash. Restore it from Projects.');doc=normalizeSvgAnimation(parsed).document;
 document.body.innerHTML=`<main><aside class="left-panel" aria-label="SVG elements"><div class="svg-file-heading"><img src="./favicon.svg" alt="PixlPrfct"><input id="svg-name" aria-label="Document name" maxlength="256"></div><div class="svg-type">${icon('mode-motion')}SVG Animation</div><div class="svg-file-actions"><button id="svg-home">${icon('layout-grid')}Projects</button><button id="svg-import">${icon('download')}Import SVG</button></div><div class="svg-layer-header">Elements</div><input id="svg-search" class="svg-layer-search" type="search" aria-label="Search elements" placeholder="Search elements"><div id="svg-layers" class="svg-layers"></div><div id="svg-footer" class="svg-footer"><span id="svg-save-status" role="status"></span><button id="svg-download">Download .pixl copy</button><button id="svg-cloud-retry" hidden>Retry cloud save</button><button id="svg-cloud-copy" hidden>Save on this device</button></div></aside>
 <section id="workspace" class="svg-workspace" aria-label="SVG canvas"><div class="svg-canvas-header"><span id="svg-canvas-size"></span><div class="svg-zoom"><button id="svg-zoom-out" aria-label="Zoom out">−</button><button id="svg-zoom-value" aria-label="Fit SVG to canvas">100%</button><button id="svg-zoom-in" aria-label="Zoom in">+</button></div></div><div id="svg-stage" class="svg-stage"><div id="svg-art" class="svg-art"></div><div id="svg-selection" class="svg-selection" hidden></div></div><div id="svg-empty" class="svg-empty">${icon('mode-motion')}<h2>Make your SVG move</h2><p>Import an SVG, animate its elements, and export a file that plays on its own.</p><div class="svg-empty-actions"><button id="svg-empty-import" class="primary">Import SVG</button><button id="svg-example">Try an example</button></div></div><div id="svg-notice" class="svg-note" role="status" hidden><button id="svg-dismiss" aria-label="Dismiss message">×</button><span id="svg-message"></span></div><div id="svg-toolbox" class="svg-toolbox toolbox" aria-label="SVG tools"></div></section>
 <aside class="right-panel" aria-label="Animation properties"><header class="svg-inspector-header"><strong>Animation</strong><button id="svg-export" class="primary">Export</button></header><div id="svg-properties"></div></aside></main>
 <div id="svg-measure" style="position:fixed;left:-200000px;top:0;visibility:hidden;pointer-events:none" aria-hidden="true"></div><input id="svg-file" type="file" accept=".svg,image/svg+xml" hidden>
`;
 const status=text=>{$('svg-save-status').textContent=text;};
 local=new LocalPersistence({drafts,snapshot,storage:tabStore,status:error=>{status(error?'Local changes need recovery':'Saved on this device');updateRecovery(error);syncAddress();}});local.enabled=route.kind==='local';
 if(local.enabled){local.adopt(record.body);const recovered=local.recovery();if(recovered){doc=normalizeSvgAnimation(JSON.parse(recovered.body)).document;local.restore(recovered);report('Recovered unsaved edits from this tab.');}status('Saved on this device');}
 updateRecovery=localRecovery({session:local,host:$('svg-footer'),download:downloadProject,load:body=>{doc=normalizeSvgAnimation(JSON.parse(body)).document;history=[];future=[];render();},report});
 if(route.kind==='cloud'){
  const recoveryKey='pixlprfct.svg-cloud-recovery:'+route.id;let recovery;try{recovery=JSON.parse(tabStore?.getItem(recoveryKey)??'null');}catch{}
  cloud=new CloudSession({snapshot,status:text=>{status(text.startsWith('Cloud conflict')?'Cloud conflict — download a copy or save on this device':text.startsWith('Cloud save failed')?'Cloud save failed — retry or save on this device':text);$('svg-cloud-retry').hidden=!cloud?.error||cloud.error.status===409;$('svg-cloud-copy').hidden=!cloud?.error&&!record.collaboration;},storage:null});cloud.adopt(record,record.body);
  cloud.remember=()=>{try{if(cloud.isDirty())tabStore?.setItem(recoveryKey,JSON.stringify({body:snapshot(),ack:cloud.ack}));else tabStore?.removeItem(recoveryKey);}catch{}};
  if(recovery?.body&&recovery.body!==record.body){doc=normalizeSvgAnimation(JSON.parse(recovery.body)).document;if(recovery.ack!==record.body){cloud.error=Object.assign(new Error('This cloud file changed while your edits were unsaved. Download a copy or save on this device.'),{status:409});status(cloud.error.message);$('svg-cloud-retry').hidden=true;$('svg-cloud-copy').hidden=false;}else report('Recovered unsaved cloud edits from this tab.');}
  $('svg-cloud-retry').onclick=safe(async()=>{await cloud.flush();cloud.remember();});$('svg-cloud-copy').onclick=safe(async()=>{const file=await withDraftLock(()=>drafts.create(snapshot()));tabStore?.removeItem(recoveryKey);team?.close();team=null;cloud.detach();local.enabled=true;local.adopt(snapshot());location.assign(projectUrl({...file,kind:'local',design_type:'svg-animation'}));});
  if(record.collaboration){const host=el('div','svg-team-editing');$('svg-footer').prepend(host);team=await installSvgCloudEditing({session:cloud,record,host,load:body=>{doc=normalizeSvgAnimation(JSON.parse(body)).document;history=[];future=[];keySelection=null;currentTime=0;if(timeline)render();},report});}
 }
 const home=safe(async()=>{stop();if(local.enabled)await local.flush();else await cloud.flush();await team?.finish();const workspace=new URLSearchParams(location.search).get('workspace');location.assign('/'+(workspace?'?workspace='+encodeURIComponent(workspace):''));});
 $('svg-home').onclick=home;$('svg-home').setAttribute('aria-label','All projects');$('svg-name').onchange=safe(()=>commit({...doc,name:$('svg-name').value.trim()||'Untitled animation'}));$('svg-name').onkeydown=e=>{if(e.key==='Enter')e.target.blur();};$('svg-search').oninput=renderLayers;
 $('svg-import').onclick=$('svg-empty-import').onclick=()=>$('svg-file').click();$('svg-file').onchange=safe(async()=>{const file=$('svg-file').files[0];try{await importSvg(file);}finally{$('svg-file').value='';}});$('svg-example').onclick=safe(example);$('svg-download').onclick=downloadProject;$('svg-dismiss').onclick=()=>{$('svg-notice').hidden=true;};
 $('workspace').ondragover=e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault();};$('workspace').ondrop=safe(e=>{e.preventDefault();return importSvg(e.dataTransfer.files[0]);});
 $('svg-art').onclick=e=>{let node=e.target;while(node&&node!==preview.root){if(layerList.some(l=>l.id===node.id)){selectLayer(node.id);return;}node=node.parentElement;}selectLayer(null);};
 for(const [id,factor] of [['svg-zoom-out',1/1.25],['svg-zoom-in',1.25]])$(id).onclick=()=>{autoFit=false;zoom=Math.max(.05,Math.min(8,zoom*factor));fit();};$('svg-zoom-value').onclick=()=>{autoFit=true;fit();};
 const toolbar=$('svg-toolbox');toolbar.append(button('Select element','select',()=>{selectLayer(null);}),button('Add rectangle','rectangle',safe(()=>addShape('rect'))),button('Add ellipse','ellipse',safe(()=>addShape('ellipse'))));
 const undoButton=button('Undo','undo',()=>undo()),redoButton=button('Redo','redo',()=>undo(true));undoButton.id='svg-undo';redoButton.id='svg-redo';toolbar.append(undoButton,redoButton,el('span','svg-toolbar-label','SVG Animation'));
 const exporter=installSvgExport({read:()=>doc,save:commit,editable:()=>!team||team.editable(),download,dropdowns:()=>dropdowns?.(),report,stop:()=>{stop();paint();}});$('svg-export').onclick=()=>exporter.show();
 nodeEditor=installMorphNodes({host:$('svg-stage'),read:()=>morphEditing&&!running&&currentTrack('morph')?{node:preview.root.querySelector('#'+selected),value:valueAt('morph'),selection:morphPoint,enabled:!team||team.editable()}:null,select:(path,index)=>{morphPoint=[path,index];renderInspector();},change:safe(value=>keyValue('morph',value)),preview:value=>{preview.root.querySelector('#'+selected)?.setAttribute('d',morphData(value));paintSelection();},report});
 timeline=installSvgTimeline({read:animation,layers:()=>layerList,change:changeAnimation,editable:()=>!team||team.editable(),selectKey:key=>{nodeEditor.cancel();keySelection=key;if(key?.element&&selected!==key.element){selected=key.element;morphPoint=[0,0];morphEditing=false;}if(key?.property==='morph')morphEditing=true;renderLayers();renderInspector();renderMotionGuide();paint();},seek,time:()=>currentTime,play,playing:()=>running,report,addKey:(track,time)=>{selected=track.element;keyValue(track.property,trackValue(track,time),time);seek(time);}});
 dropdowns=installInspectorDropdowns(document.body);new ResizeObserver(()=>{if(preview)fit();}).observe($('workspace'));
 window.addEventListener('keydown',e=>{if(e.target.closest('input,textarea,select,[role=listbox],[role=menu],dialog'))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo(e.shiftKey);}else if(e.key===' '){e.preventDefault();play();}else if(e.key==='Escape'){selectLayer(null);}});
 window.addEventListener('beforeunload',e=>{const dirty=local.enabled?local.dirty():cloud.isDirty();if(dirty){if(local.enabled)local.remember();else cloud.remember();e.preventDefault();e.returnValue='';}});
 window.addEventListener('pagehide',()=>{stop();if(local.enabled)local.remember();else cloud.remember();});
 installDesktop({importFile:importProject,report:e=>report(e.message),commands:{save:downloadProject,undo:()=>undo(),redo:()=>undo(true)}});
 loading=false;render();if(local.enabled&&snapshot()!==local.ack)local.changed();else if(cloud?.isDirty()&&!cloud.error)cloud.changed();
}
start().catch(error=>{console.error(error);const host=$('svg-loading')??document.body;host.replaceChildren(el('p','',error.message));const link=el('a','','Back to Projects');link.href='/';host.append(link);});
