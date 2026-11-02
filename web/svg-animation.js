import {installPanelDocks} from './panel-docks.js';
import {svgGradient,ownGradient} from './svg-animation-gradients.js';
import {installSvgGradientInspector} from './svg-animation-gradient-inspector.js';
import {installTooltips} from './tooltips.js';
import {icon} from './icons.js';
import {installInspectorDropdowns} from './inspector-dropdown.js';
import {numberField,settingRow,choose} from './inspector-settings.js';
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
import {keyframeId,keyframeTiming,keyframeEasing,setKeyframeEasing,deleteKeyframes} from './svg-animation-keyframes.js';
import {morphData,moveMorphPoint} from './svg-animation-morph.js';
import {installMorphNodes} from './svg-animation-nodes.js';
import {installSvgExport} from './svg-animation-export.js';
import {installTransformHandles} from './svg-animation-transform.js';
import {installSvgDrawing} from './svg-animation-drawing.js';
import {prepareSvgImport} from './svg-animation-import.js';
import {chooseSvgImport} from './svg-animation-import-dialog.js';
import {installDetachablePanels} from './detachable-panels.js';
import {pickSvgElement} from './svg-animation-picking.js';

let panels,panelDocks;
const $=id=>document.getElementById(id)??panels?.find(id),el=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;};
const button=(label,glyph,run)=>{const b=el('button');b.type='button';b.title=label;b.setAttribute('aria-label',label);if(glyph)b.innerHTML=icon(glyph);else b.textContent=label;b.onclick=run;return b;};
let doc,local,cloud,drafts,selected=null,keySelection=null,currentTime=0,running=false,raf=0,timeline,dropdowns,preview,layerList=[],sourceRoot,zoom=1,autoFit=true;
let history=[],future=[],updateRecovery=()=>{},loading=true,team=null;
let gradientInspector,drawing,nodeEditor,transformEditor,transformSceneBefore=null,morphEditing=false,morphPoint=[0,0];
let importing=false;
const drawingDefaults={fill:{color:'#ffffff',opacity:1,none:true},stroke:{color:'#ffffff',opacity:1,none:false},strokeWidth:2};
const snapshot=()=>JSON.stringify(doc),animation=()=>doc.svg_animation;
function report(message){$('svg-message').textContent=message;$('svg-notice').hidden=false;}
function download(name,data,type){const url=URL.createObjectURL(new Blob([data],{type})),link=el('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function downloadProject(){const file=projectFile(snapshot());download(file.name,file.data,file.type);local?.downloaded(snapshot());}
function safe(action){return (...args)=>{try{const result=action(...args);result?.catch?.(e=>report(e.message));}catch(e){report(e.message);}};}
function syncAddress(){if(local?.enabled&&drafts.activeId)window.history.replaceState(null,'',projectUrl({kind:'local',id:drafts.activeId,design_type:'svg-animation'}));}
function changed(){if(loading)return;validateAnimation(doc);if(local?.enabled)local.changed();else{cloud.remember();cloud.changed();}syncAddress();}
function canEdit(){if(team&&!team.editable()){report(team.message());if(preview)render();return false;}return true;}
function commit(next){transformEditor?.cancel();validateAnimation(next);if(JSON.stringify(next)===snapshot()||!canEdit())return;stop();history.push(snapshot());if(history.length>80)history.shift();future=[];doc=next;currentTime=Math.min(currentTime,animation().duration);changed();render();}
function changeAnimation(next){commit({...doc,svg_animation:next});}
function undo(redo=false){drawing?.cancel();transformEditor?.cancel();const from=redo?future:history,to=redo?history:future;if(!from.length||!canEdit())return;stop();to.push(snapshot());doc=JSON.parse(from.pop());keySelection=null;timeline.clearSelection();currentTime=Math.min(currentTime,animation().duration);changed();render();}
function stop(){running=false;cancelAnimationFrame(raf);timeline?.update();}
function seek(time){drawing?.suspend();transformEditor?.cancel();nodeEditor?.cancel();stop();currentTime=Math.max(0,Math.min(animation().duration,Number.isFinite(time)?time:0));paint();renderFields();timeline?.update();}
function play(){drawing?.suspend();transformEditor?.cancel();nodeEditor?.cancel();if(running){stop();paint();return;}if(!animation().tracks.length)return;running=true;const start=performance.now()-(currentTime>=animation().duration?0:currentTime);const tick=now=>{if(!running)return;const elapsed=now-start;currentTime=animation().loop?elapsed%animation().duration:Math.min(elapsed,animation().duration);if(!animation().loop&&elapsed>=animation().duration)running=false;paint();renderFields();timeline.update();if(running)raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);timeline.update();}
function currentLayer(){return layerList.find(l=>l.id===selected);}
function currentTrack(property){return animation().tracks.find(t=>t.element===selected&&t.property===property);}
function valueAt(property){const t=currentTrack(property),layer=currentLayer();return t?trackValue(t,currentTime):layer?baseValue(layer.node,property):properties[property].initial;}
function originFor(layer){try{const b=layer.node.getBBox(),m=layer.node.transform?.baseVal.consolidate()?.matrix;let p=new DOMPoint(b.x+b.width/2,b.y+b.height/2);if(m)p=p.matrixTransform(m);return [p.x,p.y];}catch{return [0,0];}}
function keyValue(property,value,time=currentTime){
 const layer=currentLayer();if(!layer||!canEdit())return;const t=currentTrack(property),easing=t?.keys.find(k=>k.time===time)?.easing??'linear';
 let next=putKey(animation(),selected,property,time,value,easing,baseValue(layer.node,property));next.origins={...next.origins,[selected]:next.origins[selected]??originFor(layer)};
 timeline.clearSelection();keySelection={element:selected,property,time:Math.round(time)};changeAnimation(next);
}
function addAnimator(property){if(!property||!selected||!canEdit())return;drawing?.suspend();const layer=currentLayer(),initial=valueAt(property);let next=putKey(animation(),selected,property,Math.round(currentTime),initial,'linear',baseValue(layer.node,property));if(!next.tracks.find(t=>t.element===selected&&t.property===property).keys.some(k=>k.time===next.duration))next=putKey(next,selected,property,next.duration,initial);next.origins={...next.origins,[selected]:next.origins[selected]??originFor(layer)};if(property==='morph'){morphEditing=true;morphPoint=[0,0];}timeline.clearSelection();keySelection={element:selected,property,time:Math.round(currentTime)};changeAnimation(next);renderInspector();}
function selectLayer(id){if(id!==selected)gradientInspector?.close();drawing?.cancel();transformEditor?.cancel();nodeEditor?.cancel();selected=id;morphEditing=false;morphPoint=[0,0];keySelection=null;timeline.clearSelection();renderLayers();renderInspector();renderMotionGuide();paint();}
function paint(){if(!preview)return;preview.seek(currentTime);paintSelection();nodeEditor?.update();drawing?.update();}
function paintSelection(){transformEditor?.update();}
const transformProperties=['x','y','rotation','scaleX','scaleY'];
function transformState(){
 const node=selected&&!morphEditing&&!drawing?.active?preview?.root.querySelector('#'+selected):null,layer=currentLayer();if(!node||!layer)return null;
 return {document:doc,element:selected,time:currentTime,node,frame:preview.frames.get(selected)??node.parentElement,origin:animation().origins[selected]??originFor(layer),values:Object.fromEntries(transformProperties.map(p=>[p,valueAt(p)])),enabled:!team||team.editable()};
}
function previewTransform(values){
 if(!transformSceneBefore){
  transformSceneBefore=preview;const a=animation(),tracks=a.tracks.filter(t=>t.element!==selected||!transformProperties.includes(t.property));
  for(const property of transformProperties)tracks.push({element:selected,property,keys:[{time:0,value:valueAt(property),easing:'linear'}]});
  preview=animationScene({...a,tracks,origins:{...a.origins,[selected]:a.origins[selected]??originFor(currentLayer())}});$('svg-art').replaceChildren(preview.root);renderMotionGuide();
 }
 preview.seek(currentTime,{[selected]:values});for(const [property,value] of Object.entries(values))if(fields.has(property))fields.get(property).value=String(Number(value.toFixed(3)));
}
function restoreTransform(){if(!transformSceneBefore)return;preview=transformSceneBefore;transformSceneBefore=null;$('svg-art').replaceChildren(preview.root);paint();renderFields();}
function keyTransform(values){
 const layer=currentLayer();if(!layer||!canEdit())return;let next=animation(),changedProperty=null;
 for(const property of transformProperties){if(Math.abs(values[property]-valueAt(property))<.000001)continue;const easing=currentTrack(property)?.keys.find(k=>k.time===Math.round(currentTime))?.easing??'linear';next=putKey(next,selected,property,currentTime,values[property],easing,baseValue(layer.node,property));changedProperty=property;}
 if(!changedProperty)return;next.origins={...next.origins,[selected]:next.origins[selected]??originFor(layer)};timeline.clearSelection();keySelection={element:selected,property:changedProperty,time:Math.round(currentTime)};changeAnimation(next);
}
function fit(){transformEditor?.cancel();const box=$('workspace').getBoundingClientRect(),view=preview.root.viewBox.baseVal;if(autoFit)zoom=Math.max(.05,Math.min(1,(box.width-96)/view.width,(box.height-160)/view.height));Object.assign($('svg-stage').style,{width:view.width*zoom+'px',height:view.height*zoom+'px'});$('svg-zoom-value').textContent=Math.round(zoom*100)+'%';$('svg-canvas-size').textContent=`SVG · ${view.width} × ${view.height}`;paint();}
function render(){
 transformEditor?.cancel();nodeEditor?.cancel();
 const {root}=sanitizeSvg(animation().svg);sourceRoot=root;
 // The offscreen SVG resolves inherited paint and geometry without animation.
 const measure=$('svg-measure');measure.replaceChildren(root);layerList=animationLayers(root);
 if(!layerList.some(l=>l.id===selected)){selected=null;morphEditing=false;}
 if(!currentTrack('morph'))morphEditing=false;
 preview=animationScene(animation());$('svg-art').replaceChildren(preview.root);renderMotionGuide();$('svg-empty').hidden=layerList.length>0||drawing?.active;
 if(document.activeElement!==$('svg-name'))$('svg-name').value=doc.name;document.title=doc.name+' · SVG Animation · PixlPrfct';
 $('svg-undo').disabled=!history.length;$('svg-redo').disabled=!future.length;$('svg-export').disabled=!layerList.length;
 renderLayers();renderInspector();fit();timeline?.render();dropdowns?.();
}
function renderLayers(){const host=$('svg-layers'),query=$('svg-search').value.trim().toLowerCase();host.replaceChildren();for(const layer of layerList.filter(l=>l.name.toLowerCase().includes(query))){const b=button('Select '+layer.name,null,()=>selectLayer(layer.id));b.className='svg-layer';b.dataset.element=layer.id;b.style.paddingLeft=16+layer.depth*12+'px';b.setAttribute('aria-pressed',String(selected===layer.id));b.replaceChildren();const glyph=el('span');glyph.innerHTML=icon(({g:'group',rect:'rectangle',circle:'ellipse',ellipse:'ellipse',path:'pen',text:'text'})[layer.kind]??'file');b.append(glyph,el('span','',layer.name));host.append(b);}if(!host.childElementCount)host.append(el('p','svg-layer-header',query?'No matching elements':'No elements yet'));}
const fields=new Map(),diamonds=new Map(),morphFields=new Map();
function section(title,key=title.toLowerCase().replaceAll(' ','-')){const s=el('section','property-section');s.dataset.panelSection=key;s.append(el('h3','',title));$('svg-properties').append(s);return s;}
function selectControl(label,options){return choose(label,options,options[0][0],()=>{});}
function renderMotionGuide(){
 preview.root.querySelectorAll('[data-motion-guide]').forEach(n=>n.remove());const motion=preview.motionGuides.find(g=>g.element===selected);if(!motion)return;
 const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('data-motion-guide','');path.setAttribute('d',motion.d);path.setAttribute('fill','none');path.setAttribute('stroke','#0d99ff');path.setAttribute('stroke-width','1');path.setAttribute('stroke-dasharray','4 4');path.setAttribute('vector-effect','non-scaling-stroke');path.style.pointerEvents='none';motion.parent.append(path);
}
function propertyRow(section,property){
 const p=properties[property],row=el('div','svg-property-row'),label=el('span','',p.gradientRotation?'Rotation':p.label),control=p.color?el('input'):numberField(p.label,valueAt(property),safe(value=>property==='strokeWidth'&&!currentTrack(property)?changeDrawingPaint(property,value):keyValue(property,value)),{min:p.min,max:p.max,step:property.startsWith('scale')?'.001':property==='opacity'?'.01':'any'}),input=p.color?control:control.querySelector('input');input.setAttribute('aria-label',p.label);if(p.color){input.type='text';input.onchange=safe(()=>currentTrack(property)?keyValue(property,input.value.toLowerCase()):changeDrawingPaint(property,{color:input.value.toLowerCase()}));}input.onkeydown=e=>{if(e.key==='Enter')input.blur();if(e.key==='Escape'){input.value=String(valueAt(property));input.blur();}};
 const key=button('Add or remove '+p.label+' keyframe','keyframe',safe(()=>{const active=currentTrack(property)?.keys.some(k=>k.time===Math.round(currentTime));if(active){keySelection=null;changeAnimation(deleteKey(animation(),selected,property,Math.round(currentTime)));}else keyValue(property,valueAt(property));}));row.append(label,control,key);section.append(row);fields.set(property,input);diamonds.set(property,key);
}
function morphInspector(layer){
 if(!pathKinds.has(layer.kind))return null;const host=section('Morph'),track=currentTrack('morph');
 const edit=button(morphEditing?'Done editing nodes':'Edit nodes',null,safe(()=>{stop();if(!track){addAnimator('morph');return;}drawing?.suspend();morphEditing=!morphEditing;renderInspector();paint();}));edit.className='svg-node-edit';edit.setAttribute('aria-pressed',String(morphEditing));host.append(edit);
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
 if(!layer){const help=section('SVG Animation');help.append(el('p','','Import an SVG or add a shape, then select an element to animate its properties.'));if(drawing?.active)drawing.paintControls(section('Path appearance'),'Drawing ');const info=section('Animation');info.append(el('p','',`${animation().duration/1000}s · ${animation().tracks.length} property tracks · ${animation().loop?'Looping':'Plays once'}`));panels?.sync();return;}
 const heading=section(layer.name,'selection'),animator=selectControl('Add animator',[['','Add animator…'],...Object.entries(properties).filter(([,v])=>!v.motion&&(!(v.gradient||v.gradientRotation)||!!svgGradient(layer.node,v.channel))&&(!(v.color)||!svgGradient(layer.node,v.attribute))&&(!v.morph||pathKinds.has(layer.kind))).map(([k,v])=>[k,v.label])]);animator.onchange=safe(()=>addAnimator(animator.value));heading.append(animator);
 if(layer.kind==='path'){const base=section('Path'),actions=el('div','svg-path-actions'),remove=button('Delete path','trash',safe(deleteSelectedPath));remove.id='svg-delete-path';remove.disabled=!!team&&!team.editable();actions.append(button('Edit base path',null,()=>drawing.setMode('direct')),remove);base.append(actions);drawing?.paintControls(base,'Drawing ');if(currentTrack('morph'))base.append(el('p','svg-hint','This path has a Morph animator. Edit its timed nodes, or remove that animator before editing the base path.'));}
 const morphSection=morphInspector(layer);
 const motionSection=section('Motion path'),motion=currentTrack('motionProgress'),paths=layerList.filter(l=>pathKinds.has(l.kind)&&l.id!==selected&&!layer.node.contains(l.node)),pathPicker=selectControl('Motion path',[['','No motion path'],...(motion?[['current',motion.motion.name+' (assigned)']]:[]),...paths.map(l=>[l.id,l.name])]);pathPicker.value=motion?'current':'';
 pathPicker.onchange=safe(()=>{try{if(pathPicker.value==='current')return;const route=pathPicker.value?captureMotionPath(paths.find(l=>l.id===pathPicker.value).node,layer.node):null;if(route&&motion)route.rotate=motion.motion.rotate;keySelection=null;changeAnimation(setMotionPath(animation(),selected,route,originFor(layer)));}catch(error){renderInspector();throw error;}});motionSection.append(pathPicker);
 if(motion){const orient=choose('Path orientation',[['none','Keep orientation'],['auto','Auto rotate'],['auto-reverse','Auto rotate · reverse']],motion.motion.rotate,safe(value=>changeAnimation(setMotionPath(animation(),selected,{...motion.motion,rotate:value},originFor(layer)))));motionSection.append(orient);propertyRow(motionSection,'motionProgress');motionSection.append(el('p','svg-hint','The element’s origin follows the path. Add progress keys to control timing or reverse direction.'));}
 else motionSection.append(el('p','svg-hint',paths.length?'Choose an SVG path or shape for this element to follow.':'Import artwork containing a separate path or shape to use as a route.'));
 const groups=[['Transform',['x','y','rotation','scaleX','scaleY']],['Appearance',['opacity']]];
 for(const [title,keys] of groups){const s=section(title);for(const property of keys)propertyRow(s,property);}
 for(const channel of ['fill','stroke']){const s=section(channel==='fill'?'Fill':'Stroke');gradientInspector?.row(s,channel);if(svgGradient(layer.node,channel)){propertyRow(s,channel+'GradientRotation');const add=button(currentTrack(channel+'Gradient')?'Add gradient stops keyframe':'Animate gradient stops','keyframe',safe(()=>currentTrack(channel+'Gradient')?keyValue(channel+'Gradient',valueAt(channel+'Gradient')):addAnimator(channel+'Gradient')));add.className='svg-node-edit';add.append(el('span','',currentTrack(channel+'Gradient')?'Add stop keyframe':'Animate gradient stops'));s.append(add);}else propertyRow(s,channel);if(channel==='stroke'){propertyRow(s,'strokeWidth');propertyRow(s,'strokeOffset');}}
 const origin=section('Transform origin'),pair=el('div','svg-field-pair svg-origin');for(const [index,name] of ['Origin X','Origin Y'].entries()){const label=el('label','',name),input=numberField(name,(animation().origins[selected]??originFor(layer))[index],safe(value=>{const values=[...(animation().origins[selected]??originFor(layer))];values[index]=value;changeAnimation({...animation(),origins:{...animation().origins,[selected]:values}});}));label.append(input);pair.append(label);}origin.append(pair,button('Center origin',null,()=>changeAnimation({...animation(),origins:{...animation().origins,[selected]:originFor(layer)}})));
 const easing=section('Keyframe easing'),track=keySelection?.property?currentTrack(keySelection.property):null,key=track?.keys.find(k=>k.time===keySelection.time);
 let timing;
 if(key){
  const before=animation(),existing=new Set(before.tracks.flatMap(t=>t.keys.map(k=>keyframeId({...t,time:k.time})))),keys=(keySelection.keys??[keySelection]).filter(k=>existing.has(keyframeId(k))),state=keyframeEasing(before,keys),disabled=!!team&&!team.editable();
  const checkCurrent=()=>{if(animation()!==before||!easing.isConnected)throw new Error('The keyframe selection changed. Select the keyframes again.');};
  timing=section('Keyframe timing');timing.classList.add('svg-keyframe-timing');const range=keyframeTiming(before,keys),primary={element:keySelection.element,property:keySelection.property,time:keySelection.time};
  for(const [label,value,maximum,locked,run] of [
   ['Selection start',range.start,before.duration-range.duration,disabled,value=>timeline.retime(keys,value,range.duration,primary)],
   ['Selection duration',range.duration,before.duration-range.start,disabled||range.duration===0,value=>timeline.retime(keys,range.start,value,primary)],
  ]){
   const control=numberField(label,value,safe(next=>{try{checkCurrent();run(next);}catch(error){renderInspector();throw error;}}),{min:label==='Selection duration'&&range.duration?1:0,max:maximum,step:1,disabled:locked});
   const input=control.querySelector('input'),keydown=input.onkeydown;input.onkeydown=e=>{keydown?.(e);if(e.key==='Enter'||e.key==='Escape')input.blur();};
   timing.append(settingRow(label==='Selection start'?'Start (ms)':'Duration (ms)',control));
  }
  timing.append(el('p','svg-hint',range.duration?'Duration scales the selected keys from their first keyframe.':'Select keys at different times to scale their duration.'));
  easing.append(easingEditor({value:key.easing,mixed:state.mixed,disabled,change:safe(value=>{checkCurrent();changeAnimation(setKeyframeEasing(before,keys,value));})}));
  easing.append(el('p','svg-hint',state.count>1?`${state.count} keyframes selected. ${state.mixed?'Choose an easing to apply to all. ':''}Easing applies from each key toward the next keyframe.`:`${properties[track.property].label} · ${key.time} ms. Easing applies toward the next keyframe.`));
  const removeKeys=button(state.count>1?'Delete selected keyframes':'Delete keyframe',null,safe(()=>{checkCurrent();if(!canEdit())return;const next=deleteKeyframes(before,keys);keySelection=null;timeline.clearSelection();changeAnimation(next);}));removeKeys.disabled=disabled;easing.append(removeKeys);
 }else easing.append(el('p','svg-hint','Select a keyframe to edit its easing curve.'));
 (morphEditing&&morphSection?morphSection:heading).after(easing);
 if(timing)easing.before(timing);
 const remove=section('Element');remove.append(button('Delete element',null,safe(deleteElement)));renderFields();panels?.sync();dropdowns?.();
}
function renderFields(){gradientInspector?.update();for(const [property,input] of fields){if(input.ownerDocument.activeElement!==input){const value=valueAt(property);input.value=typeof value==='number'?Number(value.toFixed(4)):value;}}for(const [property,key] of diamonds)key.setAttribute('aria-pressed',String(!!currentTrack(property)?.keys.some(k=>k.time===Math.round(currentTime))));if(morphFields.size&&currentTrack('morph')){const point=valueAt('morph')[morphPoint[0]]?.points[morphPoint[1]];if(point)for(const [offset,input] of morphFields)if(input.ownerDocument.activeElement!==input)input.value=Number(point[offset].toFixed(4));}}
function drawingPaints(){
 const layer=currentLayer();if(!layer)return drawingDefaults;const style=getComputedStyle(layer.node);
 const result={strokeWidth:valueAt('strokeWidth')};
 for(const name of ['fill','stroke'])result[name]={color:valueAt(name),none:!currentTrack(name)&&style.getPropertyValue(name)==='none',opacity:Number.parseFloat(style.getPropertyValue(name+'-opacity'))||0};
 return result;
}
function changeDrawingPaint(name,value){
 if(!canEdit())return;
 if(name!=='strokeWidth'&&value.color&&!/^#[\da-f]{6}$/i.test(value.color))throw new Error('Enter a six-digit hexadecimal color.');
 if(name!=='strokeWidth'&&value.color)value={...value,color:value.color.toLowerCase()};
 if(name==='strokeWidth'&&(!Number.isFinite(value)||value<0||value>10000))throw new Error('Stroke width must be between 0 and 10,000.');
 if(!selected){if(name==='strokeWidth')drawingDefaults[name]=value;else drawingDefaults[name]={...drawingDefaults[name],...value,...(value.color?{none:false}:{})};drawing?.update();return;}
 if(currentTrack(name)){
  if(name==='strokeWidth'||value.color){keyValue(name,name==='strokeWidth'?value:value.color);return;}
  if(value.none!==undefined)throw new Error('Remove the color animator before setting this paint to none.');
 }
 const root=sourceRoot.cloneNode(true),node=root.querySelector('#'+selected),set=(attribute,value)=>{node.style.removeProperty(attribute);node.setAttribute(attribute,String(value));};
 if(name==='strokeWidth')set('stroke-width',value);
 else{if(value.color)set(name,value.color);if(value.none!==undefined)set(name,value.none?'none':drawingPaints()[name].color);if(value.opacity!==undefined)set(name+'-opacity',value.opacity);}
 const result=sanitizeSvg(new XMLSerializer().serializeToString(root));changeAnimation({...animation(),svg:result.svg});
}
function gradientPaint(channel){
 const layer=currentLayer();if(!layer)return null;const gradient=svgGradient(layer.node,channel);
 return {id:layer.id,color:valueAt(channel),kind:gradient?.kind??null,stops:gradient?(currentTrack(channel+'Gradient')?valueAt(channel+'Gradient'):gradient.stops):null,rotation:valueAt(channel+'GradientRotation'),animated:!!currentTrack(channel+'Gradient')};
}
function editGradient(channel,patch){
 if(!canEdit())return;const layer=currentLayer();if(!layer)return;
 if(patch.stops&&currentTrack(channel+'Gradient')){keyValue(channel+'Gradient',patch.stops);return;}
 const root=sourceRoot.cloneNode(true),node=root.querySelector('#'+selected),existing=svgGradient(layer.node,channel);let tracks=animation().tracks;
 if(patch.kind==='solid'){node.style.removeProperty(channel);node.setAttribute(channel,existing?.stops[0]?.color??valueAt(channel));tracks=tracks.filter(t=>t.element!==selected||![channel+'Gradient',channel+'GradientRotation'].includes(t.property));}
 else{const gradient=existing?{...existing,attributes:{...existing.attributes},stops:patch.stops??existing.stops}:{kind:'linear',attributes:{x1:'0%',y1:'0%',x2:'100%',y2:'0%'},stops:[{offset:0,color:valueAt(channel),opacity:1},{offset:1,color:'#ffffff',opacity:1}]};
  if(patch.kind&&patch.kind!==gradient.kind){gradient.kind=patch.kind;gradient.attributes={gradientUnits:gradient.attributes.gradientUnits??'objectBoundingBox'};}
  ownGradient(root,node,channel,gradient);tracks=tracks.filter(t=>t.element!==selected||t.property!==channel);
 }
 const result=sanitizeSvg(new XMLSerializer().serializeToString(root));changeAnimation({...animation(),svg:result.svg,tracks});
}
function deleteElement(){const layer=currentLayer();if(!layer)return;const root=sourceRoot.cloneNode(true),node=root.querySelector('#'+selected),ids=new Set([selected,...node.querySelectorAll('[id]')].map(n=>typeof n==='string'?n:n.id));node.remove();const next={...animation(),svg:new XMLSerializer().serializeToString(root),tracks:animation().tracks.filter(t=>!ids.has(t.element)),origins:Object.fromEntries(Object.entries(animation().origins).filter(([id])=>!ids.has(id)))};selected=null;keySelection=null;changeAnimation(next);}
function deleteSelectedPath(){if(currentLayer()?.kind!=='path'||!canEdit())return;drawing?.cancel();transformEditor?.cancel();nodeEditor?.cancel();stop();deleteElement();}
function addShape(kind){const root=sourceRoot.cloneNode(true),view=root.viewBox.baseVal,node=document.createElementNS('http://www.w3.org/2000/svg',kind);node.setAttribute('fill','#0d99ff');node.setAttribute('data-layer-name',kind==='rect'?'Rectangle':'Ellipse');if(kind==='rect'){for(const [k,v] of Object.entries({x:view.x+view.width*.3,y:view.y+view.height*.3,width:view.width*.4,height:view.height*.4,rx:16}))node.setAttribute(k,v);}else for(const [k,v] of Object.entries({cx:view.x+view.width/2,cy:view.y+view.height/2,rx:view.width*.2,ry:view.height*.2}))node.setAttribute(k,v);root.append(node);const result=sanitizeSvg(new XMLSerializer().serializeToString(root));selected=result.root.lastElementChild.id;changeAnimation({...animation(),svg:result.svg});}
async function importSvg(file){
 if(!file||!canEdit())return;if(importing)throw new Error('Finish the current SVG import first.');importing=true;
 try{
  if((file.size??file.data?.byteLength)>2_000_000)throw new Error('SVG must be smaller than 2 MB.');
  transformEditor?.cancel();stop();const before=doc;
  const source=file.data?new TextDecoder('utf-8',{fatal:true}).decode(file.data):await file.text(),result=sanitizeSvg(source);
  if(doc!==before)throw new Error('The document changed while importing. Import the SVG again.');if(!canEdit())return;
  const mode=layerList.length?await chooseSvgImport(file.name??'Imported SVG',()=>dropdowns?.()):'replace';if(!mode)return;
  if(doc!==before)throw new Error('The document changed while importing. Import the SVG again.');if(!canEdit())return;
  const prepared=prepareSvgImport(animation(),result.svg,{mode,name:(file.name??'Imported SVG').replace(/\.svg$/i,'')});
  drawing?.suspend();nodeEditor?.cancel();selected=prepared.selected;keySelection=null;morphEditing=false;timeline.clearSelection();if(mode==='replace')currentTime=0;
  changeAnimation(prepared.animation);if(mode==='replace'){autoFit=true;fit();}
  report((mode==='add'?'SVG added to the canvas.':'SVG artwork replaced.')+(result.warnings.length?' '+result.warnings.join(' '):''));
 }finally{importing=false;}
}
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
 document.body.innerHTML=`<main><aside class="left-panel" aria-label="SVG elements"><div class="svg-file-heading"><img src="./favicon.svg" alt="PixlPrfct"><input id="svg-name" aria-label="Document name" maxlength="256"></div><div class="svg-type">${icon('mode-motion')}SVG Animation</div><div class="svg-file-actions"><button id="svg-home" aria-label="Projects" title="Projects">${icon('layout-grid')}</button><button id="svg-import" aria-label="Import SVG" title="Import SVG">${icon('upload')}</button><button id="svg-download" aria-label="Download .pixl copy" title="Download">${icon('download')}</button><button id="svg-show-elements" aria-label="Show Elements panel" title="Show Elements panel" hidden>${icon('layers')}</button><button id="svg-dock-elements" aria-label="Dock Elements panel" title="Dock Elements panel" hidden>${icon('panel-left')}</button></div><section class="svg-elements-panel" data-detachable-panel="elements" data-panel-label="Elements"><div class="svg-layer-header panel-parent-heading"><strong>Elements</strong></div><input id="svg-search" class="svg-layer-search" type="search" aria-label="Search elements" placeholder="Search elements"><div id="svg-layers" class="svg-layers"></div></section><div id="svg-footer" class="svg-footer"><span id="svg-save-status" role="status"></span><button id="svg-cloud-retry" aria-label="Retry cloud save" title="Retry cloud save" hidden><span class="panel-action-glyph" aria-hidden="true">${icon('refresh')}</span><span class="panel-action-label">Retry cloud save</span></button><button id="svg-cloud-copy" aria-label="Save on this device" title="Save on this device" hidden><span class="panel-action-glyph" aria-hidden="true">${icon('download')}</span><span class="panel-action-label">Save on this device</span></button></div></aside>
 <section id="workspace" class="svg-workspace" aria-label="SVG canvas"><div class="svg-canvas-header"><span id="svg-canvas-size"></span><div class="svg-zoom"><button id="svg-zoom-out" aria-label="Zoom out">−</button><button id="svg-zoom-value" aria-label="Fit SVG to canvas">100%</button><button id="svg-zoom-in" aria-label="Zoom in">+</button></div></div><div id="svg-stage" class="svg-stage"><div id="svg-art" class="svg-art"></div></div><div id="svg-empty" class="svg-empty">${icon('mode-motion')}<h2>Make your SVG move</h2><p>Import an SVG, animate its elements, and export a file that plays on its own.</p><div class="svg-empty-actions"><button id="svg-empty-import" class="primary">Import SVG</button><button id="svg-example">Try an example</button></div></div><div id="svg-notice" class="svg-note" role="status" hidden><button id="svg-dismiss" aria-label="Dismiss message">×</button><span id="svg-message"></span></div><div id="svg-toolbox" class="svg-toolbox toolbox" aria-label="SVG tools"></div></section>
 <aside class="right-panel" aria-label="Animation properties"><section id="svg-inspector-panel" data-detachable-panel="inspector" data-panel-label="Inspector" data-panel-side="right"><div class="panel-parent-heading panel-tear-heading"><strong>Inspector</strong></div><header class="svg-inspector-header"><strong>Animation</strong><button id="svg-export" class="primary">Export</button></header><div id="svg-properties"></div></section></aside></main>
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
  if(record.collaboration){const host=el('div','svg-team-editing');$('svg-footer').prepend(host);team=await installSvgCloudEditing({session:cloud,record,host,changed:()=>{if(team&&!team.editable()){transformEditor?.cancel();drawing?.cancel();}const remove=$('svg-delete-path');if(remove)remove.disabled=!!team&&!team.editable();if(preview){transformEditor?.update();nodeEditor?.update();drawing?.update();}},load:body=>{doc=normalizeSvgAnimation(JSON.parse(body)).document;history=[];future=[];keySelection=null;currentTime=0;if(timeline)render();},report});}
 }
 const home=safe(async()=>{stop();if(local.enabled)await local.flush();else await cloud.flush();await team?.finish();const workspace=new URLSearchParams(location.search).get('workspace');location.assign('/'+(workspace?'?workspace='+encodeURIComponent(workspace):''));});
 $('svg-home').onclick=home;$('svg-home').setAttribute('aria-label','All projects');$('svg-name').onchange=safe(()=>commit({...doc,name:$('svg-name').value.trim()||'Untitled animation'}));$('svg-name').onkeydown=e=>{if(e.key==='Enter')e.target.blur();};$('svg-search').oninput=renderLayers;
 $('svg-import').onclick=$('svg-empty-import').onclick=()=>$('svg-file').click();$('svg-file').onchange=safe(async()=>{const file=$('svg-file').files[0];try{await importSvg(file);}finally{$('svg-file').value='';}});$('svg-example').onclick=safe(example);$('svg-download').onclick=downloadProject;$('svg-dismiss').onclick=()=>{$('svg-notice').hidden=true;};
 $('workspace').ondragover=e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault();};$('workspace').ondrop=safe(e=>{e.preventDefault();return importSvg(e.dataTransfer.files[0]);});
 const canvasElement=(target,e)=>pickSvgElement(preview.root,layerList,target,e?.clientX,e?.clientY);
 $('svg-art').onclick=e=>{selectLayer(canvasElement(e.target,e));$('svg-stage').focus({preventScroll:true});};
 for(const [id,factor] of [['svg-zoom-out',1/1.25],['svg-zoom-in',1.25]])$(id).onclick=()=>{autoFit=false;zoom=Math.max(.05,Math.min(8,zoom*factor));fit();};$('svg-zoom-value').onclick=()=>{autoFit=true;fit();};
 const toolbar=$('svg-toolbox'),selectTool=button('Select element','select',()=>{drawing.setMode('select');$('svg-stage').focus({preventScroll:true});});selectTool.id='svg-select-tool';selectTool.title='Select element (V)';selectTool.setAttribute('aria-keyshortcuts','V');toolbar.append(selectTool,button('Add rectangle','rectangle',safe(()=>{drawing?.setMode('select');addShape('rect');})),button('Add ellipse','ellipse',safe(()=>{drawing?.setMode('select');addShape('ellipse');})));
 drawing=installSvgDrawing({restorePanel:()=>panels?.dock('pen'),host:$('svg-stage'),workspace:$('workspace'),toolbar,read:()=>({root:preview?.root,source:sourceRoot,selected,animation:animation(),running,enabled:!team||team.editable(),defaults:drawingDefaults,paints:drawingPaints()}),select:selectLayer,change:(root,id)=>{if(!canEdit())return;const result=sanitizeSvg(new XMLSerializer().serializeToString(root));selected=id;changeAnimation({...animation(),svg:result.svg});},start:()=>{transformEditor?.cancel();nodeEditor?.cancel();stop();morphEditing=false;},refresh:()=>{if(preview){$('svg-empty').hidden=layerList.length>0||drawing.active;renderInspector();paint();}},paint:changeDrawingPaint,remove:deleteSelectedPath,report});
 const undoButton=button('Undo','undo',()=>undo()),redoButton=button('Redo','redo',()=>undo(true));undoButton.id='svg-undo';redoButton.id='svg-redo';toolbar.append(undoButton,redoButton,el('span','svg-toolbar-label','SVG Animation'));
 gradientInspector=installSvgGradientInspector({read:gradientPaint,edit:editGradient,key:keyValue,animate:addAnimator,editable:()=>!team||team.editable(),dropdowns:()=>dropdowns?.(),report});
 const exporter=installSvgExport({read:()=>doc,save:commit,editable:()=>!team||team.editable(),download,dropdowns:()=>dropdowns?.(),report,stop:()=>{stop();paint();}});$('svg-export').onclick=()=>exporter.show();
 transformEditor=installTransformHandles({host:$('svg-stage'),read:transformState,start:()=>{nodeEditor?.cancel();stop();},preview:previewTransform,restore:restoreTransform,change:keyTransform,report,pick:(target,e)=>{
  if(drawing?.active||morphEditing||!$('svg-art').contains(target))return false;
  // A selected group's children drag that group; otherwise select the hit layer.
  const current=selected&&preview.root.querySelector('#'+selected),id=current?.contains(target)?selected:canvasElement(target,e);if(id!==selected)selectLayer(id);return !!id;
 }});
 nodeEditor=installMorphNodes({host:$('svg-stage'),read:()=>morphEditing&&!running&&currentTrack('morph')?{node:preview.root.querySelector('#'+selected),value:valueAt('morph'),selection:morphPoint,enabled:!team||team.editable()}:null,select:(path,index)=>{morphPoint=[path,index];renderInspector();},change:safe(value=>keyValue('morph',value)),preview:value=>{preview.root.querySelector('#'+selected)?.setAttribute('d',morphData(value));paintSelection();},report});
 timeline=installSvgTimeline({read:animation,layers:()=>layerList,change:changeAnimation,editable:()=>!team||team.editable(),destination:()=>{const layer=currentLayer();return layer?{element:layer.id,origin:originFor(layer)}:null;},selectKey:(key,keys)=>{drawing?.suspend();transformEditor.cancel();nodeEditor.cancel();keySelection=key?{...key,keys}:null;if(key?.element&&selected!==key.element){selected=key.element;morphPoint=[0,0];morphEditing=false;}if(key?.property==='morph')morphEditing=true;renderLayers();renderInspector();renderMotionGuide();paint();},seek,time:()=>currentTime,play,playing:()=>running,report,addKey:(track,time)=>{selected=track.element;keyValue(track.property,trackValue(track,time),time);seek(time);}});
 dropdowns=installInspectorDropdowns(document.body);new ResizeObserver(()=>{if(preview)fit();}).observe($('workspace'));
 const keydown=e=>{if(e.defaultPrevented||e.target.closest('input,textarea,select,[role=listbox],[role=menu],dialog,[popover],[contenteditable=true]'))return;if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo(e.shiftKey);}else if(['Delete','Backspace'].includes(e.key)&&!e.defaultPrevented&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&!drawing.drafting&&currentLayer()?.kind==='path'&&(e.target===document.body||e.target.closest('#svg-stage,.svg-layer'))&&!e.target.closest('.svg-morph-point')){e.preventDefault();safe(deleteSelectedPath)();}else if(e.key===' '){e.preventDefault();play();}else if(e.key==='Escape'){selectLayer(null);}};
 window.addEventListener('keydown',keydown);
 const panelLayout=()=>{panelDocks?.sync();const detached=panels?.isDetached('elements')??false;document.body.classList.toggle('svg-elements-detached',detached);$('svg-show-elements').hidden=!detached;$('svg-dock-elements').hidden=!detached;timeline.layout();drawing.update();};
 const toolsPanel=$('svg-toolbox');toolsPanel.dataset.detachablePanel='tools';toolsPanel.dataset.panelLabel='Drawing tools';toolsPanel.dataset.panelSide='bottom';const toolHeading=el('div','panel-parent-heading panel-tear-heading');toolHeading.append(el('strong','','Drawing tools'));toolsPanel.prepend(toolHeading);
 panels=installDetachablePanels({parentKeys:['elements','inspector','pen','tools','timeline'],dropdowns:()=>dropdowns,keydown:e=>{drawing.keydown(e);if(!e.defaultPrevented)keydown(e);},report,changed:panelLayout});
 panelDocks=installPanelDocks({panels,changed:()=>{timeline.layout();fit();}});
 const syncPanels=panels.sync;panels.sync=()=>{syncPanels();panelDocks.sync();};panels.sync();
 $('svg-show-elements').onclick=()=>panels.show('elements');$('svg-dock-elements').onclick=()=>panels.dock('elements');installTooltips();
 window.addEventListener('beforeunload',e=>{const dirty=local.enabled?local.dirty():cloud.isDirty();if(dirty){if(local.enabled)local.remember();else cloud.remember();e.preventDefault();e.returnValue='';}});
 window.addEventListener('pagehide',()=>{stop();if(local.enabled)local.remember();else cloud.remember();});
 installDesktop({importFile:importProject,focusedDocument:()=>panels?.focusedDocument()??document,report:e=>report(e.message),commands:{save:downloadProject,undo:()=>undo(),redo:()=>undo(true)}});
 loading=false;render();if(local.enabled&&snapshot()!==local.ack)local.changed();else if(cloud?.isDirty()&&!cloud.error)cloud.changed();
}
start().catch(error=>{console.error(error);const host=$('svg-loading')??document.body;host.replaceChildren(el('p','',error.message));const link=el('a','','Back to Projects');link.href='/';host.append(link);});
