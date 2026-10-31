import {createEffectStyleControls} from './effect-style-controls.js';
import {appearance} from './appearance.js';
import {glassPreset} from './glass-controls.js';
import {effectEntries,effectNames,addEffect,editEffect,removeEffect,convertEffect,moveShadow} from './effect-editor.js';
import {element,action,settingIcon,choose,numberField,settingRow,syncInput,settingsPopover,settingsMenu,colorField} from './inspector-settings.js';
const controllers=new WeakMap();
function create(host){
 host.classList.add('setting-section');host.replaceChildren();const heading=element('div','setting-section-heading'),title=element('h3','','Effects'),list=element('div','setting-list');heading.append(title);host.append(heading,list);
 const c={shape:null,change:null,rows:new Map()},popup=settingsPopover(host,'effect settings'),menu=settingsMenu(host,'Add effect');
 const style=()=>appearance(c.shape),entries=()=>effectEntries(style()),current=()=>entries().find(e=>e.key===popup.key);
 const save=next=>c.change({...c.shape,appearance:next});const patch=value=>{if(current())save(editEffect(style(),popup.key,value));};
 const open=(key,glass=false)=>{c.glass=glass;const row=c.rows.get(key);if(row){row.scrollIntoView({block:'nearest'});popup.show(key,row);renderPopup();}else c.pending=key;};
 const types=(adding=false)=>Object.entries(effectNames).map(([type,name])=>[type,name,(type==='drop'||type==='inner')?(style().shadows??[]).length>=8&&(adding||!popup.key?.startsWith('shadow-')):entries().some(e=>e.key===type)&&(adding||popup.key!==type)]);
 const add=action('Add effect','plus',()=>menu.show(add,[...types(true).map(([type,label,disabled])=>({label,glyph:type==='inner'||type==='drop'?type:'blur',disabled,run:()=>{const key=type==='inner'||type==='drop'?'shadow-'+(style().shadows??[]).length:type;save(addEffect(style(),type));open(key);}})),{label:'Glassmorphism',glyph:'blur',disabled:!['frame','rectangle','ellipse','polygon','star'].includes(c.shape.kind),run:()=>{c.glass=true;c.pending='backdrop_blur';c.change(glassPreset(c.shape));}}]));add.setAttribute('aria-haspopup','menu');add.setAttribute('aria-expanded','false');heading.append(add);
 function renderPopup(){
  const entry=current();if(!entry){popup.close();return;}const shadow=entry.key.startsWith('shadow-');
  popup.update(entry.type+':'+!!c.glass,(head,body)=>{
   const glyph=element('span','setting-title-icon');glyph.innerHTML=settingIcon(shadow?entry.type:'blur');head.append(glyph,choose('Effect type',types(),entry.type,type=>{const next=convertEffect(style(),popup.key,type);popup.retarget(next.key);c.pending=next.key;save(next.style);}));
   if(shadow){for(const [key,label,prefix] of [['x','Position','X'],['y','','Y'],['blur','Blur',settingIcon('blur')],['spread','Spread',settingIcon('spread')]]){const field=numberField('Shadow '+(entry.index+1)+' '+({x:'X',y:'Y',blur:'Blur',spread:'Spread'}[key]),entry.value[key],value=>patch({[key]:value}),{min:key==='blur'?0:-100000,prefix});field.querySelector('input').dataset.setting=key;body.append(settingRow(label,field));}
    body.append(settingRow('Color',colorField(body,'Shadow '+(entry.index+1),()=>current()?.value??entry.value,patch,c.api?.document?{document:()=>c.api.document(),shape:()=>c.shape}:undefined)));
   }else{const field=numberField(effectNames[entry.type],entry.value.blur,blur=>patch({blur}),{min:0,max:entry.type==='backdrop_blur'?200:100000,prefix:settingIcon('blur')});field.querySelector('input').dataset.setting='blur';body.append(settingRow('Blur',field));
    if(entry.type==='backdrop_blur'&&!c.glass&&['frame','rectangle','ellipse','polygon','star'].includes(c.shape.kind)){const glass=element('button','setting-text-button','Glassmorphism settings');glass.onclick=()=>{c.glass=true;renderPopup();};body.append(glass);}
    if(c.glass&&entry.type==='backdrop_blur'){
     body.append(element('p','setting-note','Glassmorphism'));
     const editGlass=patch=>c.change({...c.shape,...patch,appearance:{...style(),...patch.appearance}});
     body.append(settingRow('Tint',colorField(body,'Glass tint',()=>({color:c.shape.fill,opacity:style().fill_opacity??1}),value=>editGlass({fill:value.color??c.shape.fill,appearance:{gradient:null,...('opacity' in value?{fill_opacity:value.opacity}:{})}}))));
     for(const [key,label,max] of [['corner_radius','Corner radius',1000000],['stroke_width','Border width',1000]]){const field=numberField('Glass '+label.toLowerCase(),key==='stroke_width'?c.shape.stroke_width:style()[key],value=>editGlass(key==='stroke_width'?{stroke_width:value}:{appearance:{corner_radius:value,corner_radii:null}}),{min:0,max});field.querySelector('input').dataset.glass=key;body.append(settingRow(label,field));}
     body.append(settingRow('Border',colorField(body,'Glass border',()=>({color:style().stroke_color??'#ffffff',opacity:style().stroke_opacity??1}),value=>editGlass({appearance:{...('color' in value?{stroke_color:value.color,stroke_gradient:null}:{}),...('opacity' in value?{stroke_opacity:value.opacity}:{})}}))));
    }
   }
  },(_,body)=>{for(const input of body.querySelectorAll('[data-setting]'))syncInput(input,entry.value[input.dataset.setting]);for(const input of body.querySelectorAll('[data-glass]'))syncInput(input,input.dataset.glass==='stroke_width'?c.shape.stroke_width:style()[input.dataset.glass]);for(const color of body.querySelectorAll('.setting-color-field'))color.sync();});
 }
 c.update=(shape,change,api)=>{if(c.shape?.id!==shape?.id){popup.close();menu.close();c.pending=null;list.replaceChildren();c.rows.clear();}c.shape=shape;c.change=change;c.api=api;host.hidden=!shape;if(!shape){c.styles?.update(null,api);return;}
  if(api?.styles&&!c.styles)c.styles=createEffectStyleControls(host,heading,renderShadowControls);const linked=c.styles?.update(shape,api);list.hidden=!!linked;add.hidden=!!linked;
  const all=entries();for(const [key,row] of c.rows)if(!all.some(e=>e.key===key)){row.remove();c.rows.delete(key);if(popup.key===key)popup.close();}
  all.forEach((entry,index)=>{let row=c.rows.get(entry.key);if(!row){row=element('div','setting-item effect-item');row.dataset.effect=entry.key;row.setAttribute('role','group');const edit=element('button','effect-edit');edit.type='button';edit.setAttribute('aria-haspopup','dialog');edit.setAttribute('aria-expanded','false');edit.onclick=()=>popup.key===entry.key&&popup.open?popup.close(true):open(entry.key);const eye=action('','eye',()=>{const now=entries().find(e=>e.key===entry.key);save(editEffect(style(),entry.key,{visible:!now.value.visible}));});const remove=action('','minus',()=>{popup.close();save(removeEffect(style(),entry.key));});row.append(edit,eye,remove);c.rows.set(entry.key,row);
    if(entry.key.startsWith('shadow-')){
     row.draggable=true;edit.setAttribute('aria-description','Drag to reorder shadows, or use Alt and Up or Down.');
     const move=to=>{const from=Number(entry.key.slice(7));popup.close();save(moveShadow(style(),from,to));c.rows.get('shadow-'+to)?.querySelector('button')?.focus();};
     edit.onkeydown=event=>{if(event.altKey&&['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();event.stopPropagation();move(Number(entry.key.slice(7))+(event.key==='ArrowUp'?-1:1));}};
     row.ondragstart=event=>{c.dragged=Number(entry.key.slice(7));event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',entry.key);};
     row.ondragend=()=>{c.dragged=null;for(const r of c.rows.values())r.classList.remove('setting-drop-target');};
     row.ondragover=event=>{if(c.dragged!=null){event.preventDefault();row.classList.add('setting-drop-target');}};
     row.ondragleave=()=>row.classList.remove('setting-drop-target');row.ondrop=event=>{event.preventDefault();row.classList.remove('setting-drop-target');if(c.dragged!=null){popup.close();save(moveShadow(style(),c.dragged,Number(entry.key.slice(7))));c.dragged=null;}};
    }}
   const [edit,eye,remove]=row.children;edit.innerHTML=settingIcon(entry.type==='inner'||entry.type==='drop'?entry.type:'blur');edit.append(element('span','',effectNames[entry.type]));edit.setAttribute('aria-label',effectNames[entry.type]+' settings '+(index+1));eye.innerHTML=settingIcon(entry.value.visible?'eye':'hidden');eye.title=(entry.value.visible?'Hide ':'Show ')+'effect '+(index+1);eye.setAttribute('aria-label',eye.title);eye.setAttribute('aria-pressed',String(entry.value.visible));remove.title='Remove effect '+(index+1);remove.setAttribute('aria-label',remove.title);row.classList.toggle('setting-disabled',!entry.value.visible);row.setAttribute('aria-label','Effect '+(index+1));if(list.children[index]!==row)list.insertBefore(row,list.children[index]??null);
  });if(c.pending!=null&&c.rows.has(c.pending)){const key=c.pending,id=shape.id,glass=c.glass;c.pending=null;queueMicrotask(()=>{if(c.shape?.id===id)open(key,glass);});}if(popup.open){popup.anchor(c.rows.get(popup.key));renderPopup();}
 };
 return c;
}
export function renderShadowControls(host,shape,change,api){let c=controllers.get(host);if(!c){c=create(host);controllers.set(host,c);}c.update(shape,change,api);}
