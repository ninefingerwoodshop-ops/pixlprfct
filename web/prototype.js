import {Editor} from './pkg/pixlprfct_core.js';
import {chromeInsets,deviceChromeSvg,orientFrame,deviceScreenRadius} from './device-chrome.js';
import {interactions,withInteractions,interactionFor,triggerLabels,actionSteps,sequenceLabel,MAX_FOLLOW_UPS} from './prototype-interactions.js';
import {prototypeTimers,timedInteractions} from './prototype-timers.js';
import {prototypePress} from './prototype-press.js';
import {prototypeHover} from './prototype-hover.js';
import {canvasTransitions,smartSpec} from './prototype-transition.js';
import {matchLayers,smartScene} from './prototype-smart-animate.js';
import {prototypeVariables,operatorsFor,operatorLabels,operationsFor,operationLabels,defaultLiteral,conditionHolds,nextValue,sessionVariables} from './prototype-variables.js';
import {scrolls,scrollExtent,clampScroll,scrolledScene,scrollJson,scrollBy,keyboardScrollFrame,keyScrollDelta} from './prototype-scroll.js';
import {descendants,visibleInTree} from './selection.js';
import {icon} from './icons.js';
import {showContextMenu} from './context-menu.js';
import {drawScene,radii,roundedContains} from './appearance.js';
export function prototypeFrames(doc){return doc.shapes.filter(s=>s.kind==='frame'&&!(doc.libraries??[]).some(l=>l.page_id===s.page_id)&&visibleInTree(s,doc.shapes));}
export function prototypeScene(doc,root){return descendants(doc.shapes,[root]).map(s=>s.id===root?{...s,parent_id:0,clip_content:true}:s);}
export function prototypeState(doc,start){
 const frames=new Set(prototypeFrames(doc).map(s=>s.id));if(!frames.has(start))throw new Error('Choose a visible frame to present');
 let initial=start;const history=[start],overlays=[];return{get current(){return history.at(-1);},start(id){if(!frames.has(id))return false;initial=id;overlays.length=0;history.splice(0,history.length,id);return true;},get active(){return overlays.at(-1)?.target??history.at(-1);},get overlays(){return overlays.map(o=>({...o}));},get canBack(){return overlays.length>0||history.length>1;},navigate(id){if(!frames.has(id))return false;overlays.length=0;history.push(id);return true;},open(action){if(!frames.has(action.target)||overlays.length>=16)return false;overlays.push({...action});return true;},swap(target){if(!overlays.length||!frames.has(target))return false;overlays[overlays.length-1]={...overlays.at(-1),target};return true;},close(){overlays.pop();},back(){if(overlays.length)overlays.pop();else if(history.length>1)history.pop();},restart(){overlays.length=0;history.splice(0,history.length,initial);}};
}
export function overlayPlacement(base,frame,position='center',x=0,y=0){
 if(position==='manual')return{x,y};
 return{x:position.endsWith('left')?0:position.endsWith('right')?base.width-frame.width:(base.width-frame.width)/2,y:position.startsWith('top')?0:position.startsWith('bottom')?base.height-frame.height:(base.height-frame.height)/2};
}
// Which interaction's floating panel is open, kept across re-renders of the
// inspector. Layout follows Figma's Prototype tab (inspected 2026-11-11): a
// chip per interaction in the sidebar and an "Interaction" panel beside it.
const panel={shape:0,open:false,index:0,action:0,draft:false,draftTrigger:''};
const MODAL_ID='prototype-interaction-modal';
export function closePrototypeInteraction(){panel.open=false;panel.draft=false;globalThis.document?.getElementById(MODAL_ID)?.remove();}
// Used when a connection is picked or drawn on the canvas: show that interaction's panel on the next render.
export function openPrototypeInteraction(shapeId,index){Object.assign(panel,{shape:shapeId,open:true,draft:false,index,action:0});}
const chipTrigger={click:'Click',drag:'Drag',mouseenter:'Mouse enter',mouseleave:'Mouse leave',mousedown:'Mouse down',mouseup:'Mouse up',afterdelay:'After delay'};
const actionChoices=doc=>[['navigate','Navigate to'],['back','Back'],['overlay','Open overlay'],['swap','Swap overlay'],['close','Close overlay'],...(prototypeVariables(doc).length?[['set-variable','Set variable']]:[])];
const actionIcon=action=>({navigate:'arrow-right',back:'undo',overlay:'layers',swap:'repeat',close:'close','set-variable':'variable'}[action]??'minus-circle');
export function renderPrototypeControls(host,shape,doc,change,present,{activeIndex=0,select=()=>{}}={}){
 host.replaceChildren();host.hidden=!shape;if(!shape){closePrototypeInteraction();return;}
 if(panel.shape!==shape.id){closePrototypeInteraction();Object.assign(panel,{shape:shape.id,index:0,action:0,draftTrigger:''});}
 const document=host.ownerDocument,el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!=null)node.textContent=text;return node;};
 const rerender=()=>renderPrototypeControls(host,shape,doc,change,present,{activeIndex,select});
 const field=(name,input)=>{const label=document.createElement('label');label.append(document.createTextNode(name),input);input.setAttribute('aria-label',name);host.append(label);};
 const frames=prototypeFrames(doc),list=interactions(shape),frameName=id=>frames.find(f=>f.id===id)?.name,variableName=id=>prototypeVariables(doc).find(v=>v.id===id)?.name;
 const unused=Object.keys(triggerLabels).find(t=>(shape.kind==='frame'||t!=='afterdelay')&&!list.some(p=>(p.trigger??'click')===t));
 if(panel.draft&&!unused)panel.draft=false;
 if(!panel.draft)panel.index=Math.min(panel.index,Math.max(0,list.length-1));
 if(panel.open&&!panel.draft&&!list.length)panel.open=false;
 const head=el('div','prototype-section-header'),heading=el('h3',null,'Interactions'),add=el('button','prototype-add');
 add.type='button';add.innerHTML=icon('plus');add.setAttribute('aria-label','Add interaction');add.disabled=!unused||panel.draft;
 add.onclick=()=>{Object.assign(panel,{open:true,draft:true,index:list.length,action:0,draftTrigger:unused});rerender();};
 head.append(heading,add);host.append(head);
 const chipText=p=>p?(p.action==='set-variable'?sequenceLabel({...p,then:[],condition:null},frameName,variableName):frameName(p.target)??({back:'Back',close:'Close overlay'}[p.action]??'None')):'None';
 const rows=[...list,...(panel.draft?[null]:[])];
 rows.forEach((p,index)=>{
  const row=el('div','prototype-interaction-row'),chip=el('button','prototype-chip'),remove=el('button','prototype-chip-remove');
  const open=panel.open&&panel.index===index,steps=p?actionSteps(p):[];
  chip.type='button';chip.id=`prototype-interaction-${index}`;chip.setAttribute('aria-expanded',String(open));chip.classList.toggle('active',open);
  const summary=(chipTrigger[p?.trigger??(panel.draftTrigger||'click')]??'Click')+' → '+chipText(p);
  chip.setAttribute('aria-label',`Interaction ${index+1}: ${p?(triggerLabels[p.trigger??'click']??'On click')+' → '+steps.map(step=>sequenceLabel({...step,then:[]},frameName,variableName)).join(', then '):summary}`);
  const glyph=el('span','prototype-chip-icon');glyph.innerHTML=icon(actionIcon(p?.action));
  chip.append(el('span','prototype-chip-trigger',chipTrigger[p?.trigger??(panel.draftTrigger||'click')]??'Click'),glyph,el('span','prototype-chip-target',chipText(p)+(steps.length>1?` +${steps.length-1}`:'')));
  chip.onclick=()=>{if(open)closePrototypeInteraction();else{if(index<list.length)panel.draft=false;Object.assign(panel,{open:true,index,action:0});select(Math.min(index,Math.max(0,list.length-1)));}rerender();};
  remove.type='button';remove.innerHTML=icon('minus');remove.setAttribute('aria-label','Remove interaction '+(index+1));
  remove.onclick=()=>{if(panel.index===index||!p)closePrototypeInteraction();else if(panel.index>index)panel.index--;if(p){select(Math.max(0,index-1));change(withInteractions(shape,list.filter((_,i)=>i!==index)));}else rerender();};
  row.append(chip,remove);host.append(row);
 });
 const choice=(options,value,save)=>{const select=document.createElement('select');for(const [key,text] of options){const o=document.createElement('option');o.value=key;o.textContent=text;select.append(o);}select.value=value;select.onchange=()=>save(select.value);return select;};
 // Section, labels, options and their order follow Figma's Prototype tab (inspected 2026-11-11).
 const pinnable=scrolls(doc.shapes.find(s=>s.id===shape.parent_id));
 if(shape.kind==='frame'||pinnable){const title=document.createElement('h3');title.className='prototype-scroll-title';title.textContent='Scroll behavior';host.append(title);}
 if(shape.kind==='frame')field('Overflow',choice([['none','No scrolling'],['horizontal','Horizontal'],['vertical','Vertical'],['both','Both directions']],shape.overflow_scroll??'none',value=>change({...shape,overflow_scroll:value})));
 // Only a direct child of a scrolling frame can be pinned.
 if(pinnable)field('Position',choice([['scroll','Scroll with parent'],['fixed','Fixed (stay in place)']],shape.scroll_fixed?'fixed':'scroll',value=>change({...shape,scroll_fixed:value==='fixed'})));
 if(shape.kind==='frame'){const flow=document.createElement('input');flow.type='text';flow.maxLength=128;flow.placeholder='Not a flow start';flow.value=shape.flow_name??'';flow.onchange=()=>change({...shape,flow_name:flow.value.trim()});field('Flow starting point',flow);}
 const play=document.createElement('button');play.className='wide-button';play.textContent='Present prototype';play.disabled=!frames.length;play.onclick=present;host.append(play);

 // The floating Interaction panel.
 document.getElementById(MODAL_ID)?.remove();
 if(!panel.open)return;
 const index=panel.index,p=panel.draft?null:list[index]??null,steps=p?actionSteps(p):[];panel.action=Math.min(panel.action,Math.max(0,steps.length-1));
 const modal=el('dialog','prototype-interaction-modal');modal.id=MODAL_ID;modal.setAttribute('aria-label','Interaction');modal.classList.toggle('wide',steps.length>1);
 const bar=el('header'),more=el('button','prototype-modal-add'),shut=el('button','prototype-modal-close');
 more.type=shut.type='button';more.innerHTML=icon('plus');more.setAttribute('aria-label','Add action');shut.innerHTML=icon('close');shut.setAttribute('aria-label','Close');
 shut.onclick=()=>{closePrototypeInteraction();rerender();};
 const setBase=next=>{const all=[...list];if(next)all[index]=next;else all.splice(index,1);change(withInteractions(shape,all));};
 const setSteps=then=>{const rest={...p};delete rest.then;setBase(then.length?{...rest,then}:rest);};
 const addAction=event=>showContextMenu(event,actionChoices(doc).map(([action,label])=>({label,run:()=>{const target=frames.find(f=>f.id!==shape.id)?.id??frames[0]?.id??0,needsTarget=['navigate','overlay','swap'].includes(action),variable=prototypeVariables(doc)[0];
  const step={action,target:needsTarget?target:0,...(action==='set-variable'?{variable:variable.id,operation:'set',value:defaultLiteral(variable.kind)}:{})};panel.action=steps.length;setSteps([...(p.then??[]),step]);}})),event.currentTarget,{label:'Add action',anchor:event.currentTarget});
 const removeAction=()=>{const at=panel.action;if(at===0){const [next,...rest]=p.then;const base={...next,trigger:p.trigger??'click',delay:p.delay};setBase(rest.length?{...base,then:rest}:base);}else setSteps(p.then.filter((_,i)=>i!==at-1));panel.action=Math.max(0,at-1);};
 more.hidden=!p||steps.length>1;more.disabled=steps.length>MAX_FOLLOW_UPS;more.onclick=addAction;
 bar.append(el('h2',null,'Interaction'),more,shut);modal.append(bar);
 const fields=el('div','prototype-modal-fields'),triggerBox=el('div','prototype-modal-trigger');
 const used=list.filter((_,i)=>i!==index).map(other=>other.trigger??'click');
 if(panel.action===0||!p){
  renderInteractionControls(fields,{...shape,prototype:p},doc,updated=>{if(!updated.prototype&&!p){rerender();return;}if(!updated.prototype&&p){Object.assign(panel,{draft:true,index:list.length-1,draftTrigger:p.trigger??'click'});}else if(updated.prototype&&!p)panel.draft=false;setBase(updated.prototype);},used,'',panel.draftTrigger||unused||'click');
  // A trigger picked before any action exists only lives in this panel.
  if(!p)modal.addEventListener('change',event=>{if(event.target.getAttribute?.('aria-label')==='Trigger')panel.draftTrigger=event.target.value;},true);
 }else{
  const at=panel.action-1,then=p.then;
  renderInteractionControls(fields,{...shape,prototype:then[at]},doc,updated=>setSteps(updated.prototype?then.map((s,i)=>i===at?updated.prototype:s):then.filter((_,i)=>i!==at)),[],`Then ${at+1}: `);
 }
 for(const control of fields.querySelectorAll('[aria-label]'))control.id=`prototype-${shape.id}-${index}-${control.getAttribute('aria-label').replace(/[^a-z0-9]/gi,'-')}`;
 // The trigger (and its delay) sit above the actions, as in Figma.
 for(const name of ['Trigger','Delay'])for(const control of fields.querySelectorAll(`[aria-label="${name}"]`))triggerBox.append(control.closest('label'));
 if(steps.length>1){
  const left=el('div','prototype-modal-actions'),items=el('div','prototype-modal-list'),foot=el('div','prototype-modal-foot'),plus=el('button'),minus=el('button');
  items.setAttribute('role','listbox');items.setAttribute('aria-label','Actions');
  if(panel.action!==0){const holder=el('div');renderInteractionControls(holder,{...shape,prototype:p},doc,updated=>{if(updated.prototype)setBase(updated.prototype);},used);for(const name of ['Trigger','Delay'])for(const control of holder.querySelectorAll(`[aria-label="${name}"]`))triggerBox.append(control.closest('label'));}
  // In the action list layout the trigger menu stands alone, without its caption.
  const bare=triggerBox.querySelector('[aria-label="Trigger"]');if(bare){const caption=bare.closest('label');caption.replaceWith(bare);}
  steps.forEach((step,at)=>{const item=el('button','prototype-modal-action');item.type='button';item.setAttribute('role','option');item.setAttribute('aria-selected',String(at===panel.action));item.classList.toggle('active',at===panel.action);const glyph=el('span','prototype-chip-icon');glyph.innerHTML=icon(actionIcon(step.action));
   item.append(glyph,el('span',null,(step.action==='navigate'?'Navigate to ':'')+sequenceLabel({...step,then:[]},frameName,variableName).replace(/^Go back/,'Back')));item.onclick=()=>{panel.action=at;rerender();};items.append(item);});
  plus.type=minus.type='button';plus.innerHTML=icon('plus');plus.setAttribute('aria-label','Add action');plus.disabled=steps.length>MAX_FOLLOW_UPS;plus.onclick=addAction;
  minus.innerHTML=icon('minus');minus.setAttribute('aria-label','Remove action');minus.onclick=removeAction;foot.append(plus,minus);
  left.append(triggerBox,items,foot);const body=el('div','prototype-modal-columns');body.append(left,fields);modal.append(body);
 }else{if(triggerBox.children.length)modal.append(triggerBox);modal.append(fields);}
 modal.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closePrototypeInteraction();rerender();document.getElementById(`prototype-interaction-${index}`)?.focus();}});
 modal.addEventListener('cancel',event=>event.preventDefault());
 document.body.append(modal);modal.show();
 // Beside the sidebar, level with the interaction's chip.
 const side=(host.closest('.right-panel')??host).getBoundingClientRect(),chip=document.getElementById(`prototype-interaction-${index}`)?.getBoundingClientRect(),box=modal.getBoundingClientRect(),view=document.defaultView;
 modal.style.left=Math.max(8,side.left-box.width-2)+'px';modal.style.top=Math.max(8,Math.min(view.innerHeight-box.height-8,(chip?.top??side.top+80)-12))+'px';
}
// `step` is the accessible-name prefix of a follow-up action ("Then 1: "); a
// follow-up has no trigger or delay of its own.
function renderInteractionControls(host,shape,doc,change,usedTriggers=[],step='',defaultTrigger='click'){
 host.replaceChildren();host.hidden=!shape;if(!shape)return;
 const field=(name,select)=>{const label=document.createElement('label');label.classList.toggle('long',name.length>11);label.append(document.createTextNode(name),select);select.setAttribute('aria-label',step+name);host.append(label);};
 const action=document.createElement('select');for(const [value,text] of [['none','None'],['navigate','Navigate to'],['back','Back'],['overlay','Open overlay'],['swap','Swap overlay'],['close','Close overlay'],...(prototypeVariables(doc).length||shape.prototype?.action==='set-variable'?[['set-variable','Set variable']]:[])]){const o=document.createElement('option');o.value=value;o.textContent=text;action.append(o);}action.value=shape.prototype?.action??'none';field('Action',action);
 // Variable pickers and literal inputs shared by Set variable and conditions.
 const variables=prototypeVariables(doc),kindOf=id=>variables.find(v=>v.id===Number(id))?.kind;
 const variablePicker=(selected,empty)=>{const select=document.createElement('select');if(empty){const o=document.createElement('option');o.value='0';o.textContent=empty;select.append(o);}for(const v of variables){const o=document.createElement('option');o.value=v.id;o.textContent=v.label;select.append(o);}select.value=String(selected||(empty?0:variables[0]?.id??0));if(!select.value)select.selectedIndex=0;return select;};
 const literal=(kind,value)=>{value=typeof value===({number:'number',boolean:'boolean'}[kind]??'string')?value:defaultLiteral(kind);if(kind==='boolean'){const select=document.createElement('select');for(const text of ['true','false']){const o=document.createElement('option');o.value=text;o.textContent=text;select.append(o);}select.value=String(value);return {input:select,read:()=>select.value==='true'};}const input=document.createElement('input');if(kind==='number'){input.type='number';input.min=-1e9;input.max=1e9;input.step='any';input.value=value;return {input,read:()=>Number.isFinite(Number(input.value))?Number(input.value):0};}if(kind==='color'){input.type='color';input.value=value;return {input,read:()=>input.value};}input.type='text';input.maxLength=1000;input.value=value;return {input,read:()=>input.value};};
 const setting=shape.prototype?.action==='set-variable'?shape.prototype:null,setVariable=variablePicker(setting?.variable,null),setKind=kindOf(setVariable.value),operation=document.createElement('select');for(const value of operationsFor(setKind)){const o=document.createElement('option');o.value=value;o.textContent=operationLabels[value];operation.append(o);}operation.value=setting&&operationsFor(setKind).includes(setting.operation??'set')?setting.operation??'set':'set';const setValue=literal(setKind,setting?.value);
 const guard=shape.prototype?.condition??null,guardVariable=variablePicker(guard?.variable,'Always run'),guardKind=kindOf(guardVariable.value),operator=document.createElement('select');for(const value of operatorsFor(guardKind)){const o=document.createElement('option');o.value=value;o.textContent=operatorLabels[value];operator.append(o);}operator.value=guard&&operatorsFor(guardKind).includes(guard.operator)?guard.operator:'==';const guardValue=literal(guardKind,guard?.value);
 const trigger=document.createElement('select');for(const [value,text] of Object.entries(triggerLabels).filter(([value])=>shape.kind==='frame'||value!=='afterdelay')){const o=document.createElement('option');o.value=value;o.textContent=text;o.disabled=usedTriggers.includes(value);trigger.append(o);}trigger.value=shape.prototype?.trigger??defaultTrigger;if(!step)field('Trigger',trigger);
 const frames=prototypeFrames(doc),target=document.createElement('select');for(const f of frames){const o=document.createElement('option');o.value=f.id;o.textContent=f.page_id===shape.page_id?f.name:`${doc.pages.find(p=>p.id===f.page_id)?.name??''} / ${f.name}`;target.append(o);}target.value=shape.prototype?.target??frames.find(f=>f.id!==shape.id&&f.id!==shape.parent_id)?.id??frames[0]?.id??'';if(!target.value&&frames.length)target.value=frames[0].id;
 const position=document.createElement('select');for(const value of ['center','top-left','top-right','bottom-left','bottom-right','manual']){const o=document.createElement('option');o.value=value;o.textContent=value.replaceAll('-',' ');position.append(o);}position.value=shape.prototype?.overlay_position??'center';const outside=document.createElement('input');outside.type='checkbox';outside.checked=!!shape.prototype?.close_on_outside;
 const number=(value,min,max)=>{const n=document.createElement('input');n.type='number';n.min=min;n.max=max;n.value=value;return n;};
 const delay=number(shape.prototype?.delay??800,1,600000);if(trigger.value==='afterdelay'&&!step)field('Delay',delay);
 const offsetX=number(shape.prototype?.overlay_x??0,-1000000,1000000),offsetY=number(shape.prototype?.overlay_y??0,-1000000,1000000),backdropOpacity=number((shape.prototype?.backdrop_opacity??.4)*100,0,100),backdropColor=document.createElement('input');backdropColor.type='color';backdropColor.value=shape.prototype?.backdrop_color??'#000000';
 const transition=document.createElement('select');const kinds=[['instant','Instant'],['dissolve','Dissolve'],...(['overlay','close','swap'].includes(action.value)?[]:[['smart-animate','Smart animate'],['slide-left','Slide left'],['slide-right','Slide right'],['slide-up','Slide up'],['slide-down','Slide down']])];for(const [value,text] of kinds){const o=document.createElement('option');o.value=value;o.textContent=text;transition.append(o);}transition.value=shape.prototype?.transition??'instant';if(!transition.value)transition.value='dissolve';const duration=document.createElement('input');duration.type='number';duration.min=0;duration.max=10000;duration.value=shape.prototype?.duration??300;const easing=document.createElement('select');for(const [value,text] of [['linear','Linear'],['ease-in','Ease in'],['ease-out','Ease out'],['ease-in-out','Ease in and out']]){const o=document.createElement('option');o.value=value;o.textContent=text;easing.append(o);}easing.value=shape.prototype?.easing??'ease-in-out';
 // Picking a variable of another type starts again from that type's default comparison and value.
 const setFields=()=>{const kind=kindOf(setVariable.value),fresh=kind!==setKind,how=fresh?'set':operation.value;return {variable:Number(setVariable.value),operation:how,...(how==='toggle'?{}:{value:fresh?defaultLiteral(kind):setValue.read()})};};
 const guardFields=()=>{const kind=kindOf(guardVariable.value),fresh=kind!==guardKind;return {variable:Number(guardVariable.value),operator:fresh?'==':operator.value,value:fresh?defaultLiteral(kind):guardValue.read()};};
 const save=()=>{const targets=['navigate','overlay','swap'].includes(action.value);if(targets&&!target.value)return;if(action.value==='set-variable'&&!Number(setVariable.value))return;change({...shape,prototype:action.value==='none'?null:{trigger:trigger.value,delay:Number(delay.value),action:action.value,target:targets?Number(target.value):0,overlay_position:position.value,overlay_x:Number(offsetX.value),overlay_y:Number(offsetY.value),backdrop_color:backdropColor.value,backdrop_opacity:Number(backdropOpacity.value)/100,close_on_outside:outside.checked,transition:['overlay','close','swap'].includes(action.value)&&(transition.value.startsWith('slide-')||transition.value==='smart-animate')?'dissolve':transition.value,duration:Number(duration.value),easing:easing.value,...(action.value==='set-variable'?setFields():{}),...(Number(guardVariable.value)?{condition:guardFields()}:{}),...(!step&&shape.prototype?.then?.length?{then:shape.prototype.then}:{})}});};action.onchange=save;
 if(action.value==='set-variable'){if(!variables.length){const note=document.createElement('p');note.textContent='Create a number, boolean, text or color variable first.';host.append(note);}else{field('Variable',setVariable);field('Operation',operation);if(operation.value!=='toggle')field(operation.value==='add'?'Amount':'Value',setValue.input);}}
 for(const control of [setVariable,operation,setValue.input,guardVariable,operator,guardValue.input])control.onchange=save;trigger.onchange=save;delay.onchange=save;target.onchange=save;position.onchange=save;outside.onchange=save;if(['navigate','overlay','swap'].includes(action.value))field('Destination',target);if(action.value==='overlay'){field('Overlay position',position);if(position.value==='manual'){field('Overlay X',offsetX);field('Overlay Y',offsetY);}field('Backdrop color',backdropColor);field('Backdrop opacity (%)',backdropOpacity);field('Close when clicking outside',outside);}
 for(const input of [offsetX,offsetY,backdropColor,backdropOpacity])input.onchange=save;
 if(action.value==='swap'){const note=document.createElement('p');note.textContent='Replaces the top overlay, keeping its placement, backdrop and dismissal settings. Requires an open overlay.';host.append(note);}
 transition.onchange=save;duration.onchange=save;easing.onchange=save;if(action.value!=='none'&&action.value!=='set-variable'){field('Animation',transition);if(transition.value!=='instant'){field('Easing',easing);field('Duration',duration);}}
 if(action.value!=='none'&&(variables.length||guard)){field('Run',guardVariable);if(Number(guardVariable.value)){field('Comparison',operator);field('Compared with',guardValue.input);}}

}
// Fit the complete device, while hit testing continues to use the content viewport.
export function prototypeViewport(frame,width,height,chromeVisible){
 const savedType=frame.device_chrome&&frame.device_chrome!=='none'?frame.device_chrome:null;
 const visible=chromeVisible??(!!savedType&&!frame.device_chrome_hidden);
 const type=visible?(savedType??'auto'):'none';
 const [top,right,bottom,left]=chromeInsets(type,frame.width,frame.height,frame.device_chrome_breakpoints);
 const outerWidth=frame.width+left+right,outerHeight=frame.height+top+bottom;
 const scale=Math.min(Math.max(1,width-32)/outerWidth,Math.max(1,height-32)/outerHeight);
 const chromeX=(width-outerWidth*scale)/2,chromeY=(height-outerHeight*scale)/2;
 return {x:chromeX+left*scale,y:chromeY+top*scale,scale,chromeX,chromeY,outerWidth,outerHeight,screenRadius:deviceScreenRadius(type,frame.width,frame.height,frame.device_chrome_breakpoints),svg:deviceChromeSvg(type,frame.width,frame.height,frame.device_chrome_breakpoints)};
}
export function prototypeOrientationDocument(previewEditor,doc,id,orientation,variables=null){
 previewEditor.load(JSON.stringify(doc));
 // Values set during the presentation re-resolve every bound layer in the preview copy only.
 if(variables)previewEditor.save_variables(JSON.stringify(variables));
 const frame=doc.shapes.find(s=>s.id===id);
 if(frame&&orientation){const next=orientFrame(frame,orientation);if(next.width!==frame.width||next.height!==frame.height)previewEditor.update(JSON.stringify(next));}
 return JSON.parse(previewEditor.snapshot());
}
export function presentPrototype(doc,start,editor,paint,prepare=async()=>{}){
 const previewEditor=new Editor(),orientations=new Map(),chromeVisibility=new Map();let previewDoc=doc,previewKey='';
 // Variable values changed by Set variable actions, for this presentation only.
 const overrides=new Map(),variableNames=new Map(prototypeVariables(doc).map(v=>[v.id,v.name])),resetVariables=()=>{if(overrides.size){overrides.clear();previewKey='';}};
 const variableValue=id=>{if(overrides.has(id))return overrides.get(id);try{return JSON.parse(editor.prototype_variable_value(id));}catch{return undefined;}};
 previewEditor.load(JSON.stringify(doc));
 const state=prototypeState(doc,start),dialog=document.createElement('dialog');dialog.className='prototype-player';dialog.setAttribute('aria-label','Prototype presentation');
 const toolbar=document.createElement('div');toolbar.className='prototype-toolbar';const back=document.createElement('button'),restart=document.createElement('button'),close=document.createElement('button'),chooser=document.createElement('select'),hotspots=document.createElement('input');back.textContent='Back';restart.textContent='Restart';close.textContent='Close presentation';chooser.setAttribute('aria-label','Presented frame');
 for(const f of prototypeFrames(doc)){const o=document.createElement('option');o.value=f.id;o.textContent=`${doc.pages.find(p=>p.id===f.page_id)?.name??''} / ${f.name}`;chooser.append(o);}
 const flows=document.createElement('select');flows.setAttribute('aria-label','Flow starting point');const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Choose a flow';flows.append(placeholder);for(const f of prototypeFrames(doc).filter(s=>s.flow_name)){const o=document.createElement('option');o.value=f.id;o.textContent=f.flow_name+' / '+f.name;flows.append(o);}flows.hidden=flows.options.length===1;flows.value=doc.shapes.find(s=>s.id===start)?.flow_name?start:'';flows.onchange=()=>{if(flows.value){resetVariables();state.start(Number(flows.value));visit++;render();}};toolbar.append(flows);
 hotspots.type='checkbox';const label=document.createElement('label');label.append(hotspots,document.createTextNode('Show hotspots'));toolbar.append(back,restart,chooser);
 const orientationControls=document.createElement('div');orientationControls.className='device-orientation';orientationControls.setAttribute('role','group');orientationControls.setAttribute('aria-label','Preview orientation');
 const orientationButtons=new Map();for(const value of ['portrait','landscape']){const button=document.createElement('button');button.type='button';button.textContent=value[0].toUpperCase()+value.slice(1);button.setAttribute('aria-pressed','false');button.title='Rotate preview only';button.onclick=()=>{orientations.set(state.current,value);press.reset();hover.reset();pointer=null;render();};orientationButtons.set(value,button);orientationControls.append(button);}const chromeToggle=document.createElement('input');chromeToggle.type='checkbox';
 const chromeLabel=document.createElement('label');chromeLabel.append(document.createTextNode('Show device chrome'),chromeToggle);chromeToggle.title='Show or hide chrome in this preview only';
 chromeToggle.onchange=()=>{chromeVisibility.set(state.current,chromeToggle.checked);press.reset();hover.reset();pointer=null;render();};toolbar.append(orientationControls,chromeLabel,label,close);
 const area=document.createElement('div');area.className='prototype-stage';const canvas=document.createElement('canvas');canvas.setAttribute('aria-label','Prototype screen');canvas.style.touchAction='none';area.append(canvas);
 const status=document.createElement('p');status.setAttribute('role','status');const links=document.createElement('details'),summary=document.createElement('summary'),buttons=document.createElement('div');summary.textContent='Screen interactions (keyboard accessible)';links.append(summary,buttons);dialog.append(toolbar,area,status,links);document.body.append(dialog);dialog.showModal();
 const animator=canvasTransitions(canvas,area);
 const chromeImages=new Map();
 const chromeImage=svg=>{
  if(!svg)return Promise.resolve(null);
  if(!chromeImages.has(svg))chromeImages.set(svg,new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>resolve(null);image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);}));
  return chromeImages.get(svg);
 };
 let transform=null,version=0,visit=0,pointerFrame=0,pointer=null,shown=null;
 // Scroll offsets by frame id for the presented screen, and the last paint to repeat when they change.
 const scroll=new Map();let scrollScreen=0,repaint=null,touchScroll=null;const hover=prototypeHover(),press=prototypePress(),timers=prototypeTimers(id=>activateId(id,'afterdelay'));
 let sequence=false;
 // Run one action. Returns the render that shows it, or null when it cannot apply.
 const perform=p=>{
  if(!conditionHolds(p.condition,p.condition?variableValue(p.condition.variable):undefined))return null;
  // A variable change redraws the current screen; it is not navigation.
  if(p.action==='set-variable'){overrides.set(p.variable,nextValue(p,variableValue(p.variable)));previewKey='';return render();}
  const playback={...p,transition:state.overlays.length&&p.action==='back'&&(p.transition?.startsWith('slide-')||p.transition==='smart-animate')?'dissolve':p.transition},snapshot=animator.capture(playback),leaving=playback.transition==='smart-animate'&&!state.overlays.length?shown:null;let ok=true;if(p.action==='back'){if(!state.canBack)return null;state.back();}else if(p.action==='close'){if(!state.overlays.length)return null;state.close();}else if(p.action==='overlay')ok=state.open(p);else if(p.action==='swap')ok=state.swap(p.target);else if(p.action==='navigate')ok=state.navigate(p.target);if(ok){visit++;return render(playback,snapshot,leaving);}status.textContent='Destination unavailable, no overlay to swap, or the overlay limit was reached.';return null;};
 // A trigger's actions run in order, each after the previous transition ends.
 // An action that cannot apply is skipped; Back, Restart or picking a frame stops the rest.
 const activate=async s=>{
  const steps=actionSteps(s.prototype);if(!steps.length||!dialog.open||animator.running||sequence)return;
  sequence=true;
  // A layout redraw (resize, orientation) may cut a transition short without
  // ending the sequence; `visit` only changes when something navigates.
  try{for(const step of steps){const done=perform(step),mark=visit;if(!done)continue;await done;if(mark!==visit||!dialog.open)break;}}
  finally{sequence=false;}
 };
 const render=async(config={},snapshot=null,leaving=null)=>{
  timers.pause();animator.cancel();hover.scope(state.active);
  transform=null;const ticket=++version,key=state.current+':'+(orientations.get(state.current)??'saved');
  if(key!==previewKey){previewDoc=prototypeOrientationDocument(previewEditor,doc,state.current,orientations.get(state.current),overrides.size?sessionVariables(doc.variables,overrides):null);previewKey=key;}
  if(state.current!==scrollScreen){scroll.clear();scrollScreen=state.current;}
  const baseScene=prototypeScene(previewDoc,state.current),base=baseScene[0],stack=state.overlays;
  const layers=[{scene:baseScene,offset:{x:0,y:0}},...stack.map(o=>{const scene=prototypeScene(previewDoc,o.target);return{scene,overlay:o,offset:overlayPlacement(base,scene[0],o.overlay_position,o.overlay_x??0,o.overlay_y??0)};})],active=layers.at(-1),frame=active.scene[0];
  for(const [value,button] of orientationButtons)button.setAttribute('aria-pressed',String(value==='portrait'?base.height>=base.width:base.width>base.height));
  timers.scope(visit,timedInteractions(active.scene));
  chooser.value=state.current;back.disabled=!state.canBack;buttons.replaceChildren();
  for(const s of active.scene.filter(s=>s.prototype&&visibleInTree(s,active.scene)))for(const p of interactions(s)){const b=document.createElement('button');b.textContent=s.name+' ['+({click:'Click',mouseenter:'Mouse enter',mouseleave:'Mouse leave',afterdelay:`After ${p.delay??800} ms`,mousedown:'Mouse down',mouseup:'Mouse up',drag:'Drag'}[p.trigger??'click'])+'] → '+sequenceLabel(p,id=>doc.shapes.find(f=>f.id===id)?.name,id=>variableNames.get(id)).replace(/^Go back/,'Back');b.onclick=()=>activate({...s,prototype:p});buttons.append(b);}
  status.textContent=base.name+' · '+(base.width>base.height?'Landscape':'Portrait')+(stack.length?' · Overlay: '+frame.name:'')+(keyboardScrollFrame(active.scene)?' · Scroll with the wheel, touch or arrow keys':'')+' · Click or hover linked layers. All interactions are available below.';await prepare(layers.flatMap(l=>l.scene));if(ticket!==version||!dialog.open)return;
  const width=Math.max(1,area.clientWidth),height=Math.max(1,area.clientHeight),viewport=prototypeViewport(base,width,height,chromeVisibility.get(state.current)),{x,y,scale}=viewport,dpr=window.devicePixelRatio||1;
  chromeToggle.checked=!!viewport.svg;
  const shell=await chromeImage(viewport.svg);if(ticket!==version||!dialog.open)return;
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.style.width=width+'px';canvas.style.height=height+'px';
  // Smart animate redraws the base frame from a blended scene on every frame.
  const spec=leaving&&!stack.length&&leaving.id!==state.current?smartSpec(config,animator.reduced()):null,match=spec&&matchLayers(leaving.scene,baseScene);
  const draw=baseShapes=>{
  const ctx=canvas.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.setTransform(dpr*scale,0,0,dpr*scale,dpr*x,dpr*y);ctx.beginPath();ctx.roundRect(0,0,base.width,base.height,viewport.screenRadius||radii(base));ctx.clip();
  for(let i=0;i<layers.length;i++){const l=layers[i],f=l.scene[0];if(i){ctx.save();ctx.globalAlpha=l.overlay.backdrop_opacity??.4;ctx.fillStyle=l.overlay.backdrop_color??'#000000';ctx.fillRect(0,0,base.width,base.height);ctx.restore();}ctx.save();ctx.translate(l.offset.x-f.x,l.offset.y-f.y);ctx.beginPath();ctx.roundRect(f.x,f.y,f.width,f.height,radii(f));ctx.clip();const visible=scrolledScene(i?l.scene:baseShapes,scroll);drawScene(visible,ctx,paint);
   if(hotspots.checked&&i===layers.length-1){ctx.strokeStyle='#0284c7';ctx.lineWidth=2/scale;ctx.setLineDash([5/scale,4/scale]);for(const s of visible.filter(s=>s.prototype&&visibleInTree(s,visible)))ctx.strokeRect(s.x,s.y,s.width,s.height);}ctx.restore();
  }
  ctx.restore();
  if(shell){ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);ctx.drawImage(shell,viewport.chromeX,viewport.chromeY,viewport.outerWidth*scale,viewport.outerHeight*scale);ctx.restore();}
  };
  repaint=()=>draw(baseScene);
  draw(spec?smartScene(leaving.scene,baseScene,0,match):baseScene);shown={id:state.current,scene:baseScene};
  transform={scene:active.scene,x:x+active.offset.x*scale,y:y+active.offset.y*scale,scale,frame,base,xBase:x,yBase:y,outside:stack.at(-1)?.close_on_outside??false,overlay:stack.length>0};
  if(spec)await animator.tween(t=>draw(smartScene(leaving.scene,baseScene,t,match)),spec);else await animator.play(snapshot,config);if(ticket===version&&dialog.open)timers.resume();
 };
 const locate=(clientX,clientY)=>{
  if(!transform||animator.running)return null;const r=canvas.getBoundingClientRect(),t=transform,px=clientX-r.left,py=clientY-r.top,p={x:(px-t.x)/t.scale+t.frame.x,y:(py-t.y)/t.scale+t.frame.y};
  const inside=roundedContains(t.base,{x:(px-t.xBase)/t.scale+t.base.x,y:(py-t.yBase)/t.scale+t.base.y})&&roundedContains(t.frame,p);
  const offsets=scroll.size?scrollJson(t.scene,scroll):'{}';
  return{inside,point:p,hits:inside?JSON.parse(offsets==='{}'?previewEditor.prototype_pointer_hits(t.frame.id,p.x,p.y):previewEditor.prototype_pointer_hits_scrolled(t.frame.id,p.x,p.y,offsets)):{}};
 };
 // Wheel, touch drag and keys move the content of scrolling frames; nothing navigates.
 const applyScroll=next=>{if(!next)return false;scroll.clear();for(const [id,offset] of next)scroll.set(id,offset);repaint?.();return true;};
 const scrollAt=(clientX,clientY,dx,dy)=>{const hit=locate(clientX,clientY);return !!hit?.inside&&applyScroll(scrollBy(transform.scene,scroll,hit.point,dx,dy));};
 canvas.addEventListener('wheel',event=>{const unit=event.deltaMode===1?16:event.deltaMode===2?(transform?.frame.height??400):1,scale=transform?.scale??1;if(scrollAt(event.clientX,event.clientY,event.deltaX*unit/scale,event.deltaY*unit/scale))event.preventDefault();},{passive:false});
 canvas.tabIndex=0;
 canvas.addEventListener('keydown',event=>{
  if(!transform||animator.running||event.altKey||event.ctrlKey||event.metaKey)return;
  const frame=keyboardScrollFrame(transform.scene);if(!frame)return;const extent=scrollExtent(transform.scene,frame),delta=keyScrollDelta(event.key,frame,extent);if(!delta)return;
  const from=clampScroll(extent,scroll.get(frame.id)),to=clampScroll(extent,{x:from.x+delta.x,y:from.y+delta.y});event.preventDefault();
  if(to.x!==from.x||to.y!==from.y)applyScroll(new Map([...scroll,[frame.id,to]]));
 });
 const activateId=(id,trigger)=>{const s=previewDoc.shapes.find(s=>s.id===id),p=s&&interactionFor(s,trigger);if(p)activate({...s,prototype:p});};
 canvas.onclick=event=>{if(!press.click()){event.preventDefault();return;}const hit=locate(event.clientX,event.clientY);if(!hit)return;if(!hit.inside){if(transform.overlay&&transform.outside){state.close();visit++;render();}return;}activateId(hit.hits.click,'click');};
  canvas.onpointerdown=event=>{if(event.pointerType==='touch'&&event.isPrimary)touchScroll={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};const hit=locate(event.clientX,event.clientY);activateId(press.down(event,hit?.hits),'mousedown');};
  canvas.onpointerup=event=>{if(touchScroll?.id===event.pointerId)touchScroll=null;const hit=locate(event.clientX,event.clientY);activateId(press.up(event,hit?.hits),'mouseup');};
  const releaseOutside=event=>{if(event.target!==canvas)press.cancel(event);};document.addEventListener('pointerup',releaseOutside);
  canvas.onpointermove=event=>{
  // A touch that travels scrolls the content under it and is no longer a tap.
  if(touchScroll?.id===event.pointerId&&transform){const dx=touchScroll.x-event.clientX,dy=touchScroll.y-event.clientY;if(touchScroll.moved||Math.hypot(dx,dy)>=6){if(scrollAt(event.clientX,event.clientY,dx/transform.scale,dy/transform.scale)&&!touchScroll.moved){touchScroll.moved=true;press.cancel(event);}touchScroll.x=event.clientX;touchScroll.y=event.clientY;}if(touchScroll.moved)return;}
  const dragged=press.move(event);if(dragged){activateId(dragged,'drag');return;}
  if(event.pointerType==='touch'||event.buttons)return;pointer={x:event.clientX,y:event.clientY};if(pointerFrame)return;
  pointerFrame=requestAnimationFrame(()=>{pointerFrame=0;if(!pointer)return;const hit=locate(pointer.x,pointer.y);if(!hit)return;canvas.style.cursor=(hit.hits.click||hit.hits.mousedown||hit.hits.mouseup||hit.hits.drag||hit.hits.mouseenter?.length||hit.hits.mouseleave?.length)?'pointer':'default';activateId(hover.move(hit.hits),hover.trigger);});
 };
 canvas.onpointerleave=()=>{pointer=null;if(pointerFrame)cancelAnimationFrame(pointerFrame);pointerFrame=0;canvas.style.cursor='default';const id=hover.exit();if(transform&&!animator.running)activateId(id,hover.trigger);};
 canvas.onpointercancel=event=>{touchScroll=null;press.cancel(event);pointer=null;hover.reset();};
 back.onclick=()=>{state.back();visit++;render();};restart.onclick=()=>{scroll.clear();resetVariables();state.restart();visit++;render();};chooser.onchange=()=>{state.navigate(Number(chooser.value));visit++;render();};hotspots.onchange=()=>render();close.onclick=()=>dialog.close();
 const observer=new ResizeObserver(()=>render());observer.observe(area);dialog.onclose=()=>{document.removeEventListener('pointerup',releaseOutside);press.reset();timers.reset();if(pointerFrame)cancelAnimationFrame(pointerFrame);pointer=null;hover.reset();animator.cancel();version++;observer.disconnect();previewEditor.free();dialog.remove();};render();return dialog;
}
