import {chromeInsets,orientedFrameSize} from './device-chrome.js';
import {visibleInTree,lockedInTree} from './selection.js';
import {icon,componentLabelType} from './icons.js';
export const FRAME_PRESETS=[
 // Matched against Figma's live Frame menu on 2026-10-26 (viewport pixels).
 ['Phone',[
  ['iPhone Duo, Closed',466,678,'iphone-fold'],['iPhone Duo, Open',890,626,'iphone-fold'],
  ['iPhone 18 Pro',402,874,'iphone'],['iPhone 18 Pro Max',440,956,'iphone'],
  ['iPhone 17',402,874,'iphone'],['iPhone 16 & 17 Pro',402,874,'iphone'],
  ['iPhone 16',393,852,'iphone'],['iPhone 16 & 17 Pro Max',440,956,'iphone'],
  ['iPhone 16 Plus',430,932,'iphone'],['iPhone Air',420,912,'iphone'],
  ['iPhone 14 & 15 Pro Max',430,932,'iphone'],['iPhone 14 & 15 Pro',393,852,'iphone'],
  ['iPhone 13 & 14',390,844,'iphone-notch'],['iPhone 14 Plus',428,926,'iphone-notch'],
  ['Android Compact',412,917,'phone'],['Android Medium',700,840,'phone']]],
 ['Tablet',[["iPad mini 8.3",744,1133,'ipad'],['Surface Pro 8',1440,960,'surface'],['iPad Pro 11"',834,1194,'ipad'],['iPad Pro 12.9"',1024,1366,'ipad'],['Android Expanded',1280,800,'tablet']]],
 ['Desktop',[["MacBook Air",1280,832,'desktop'],['MacBook Pro 14"',1512,982,'desktop'],['MacBook Pro 16"',1728,1117,'desktop'],['Desktop',1440,1024,'desktop'],['Wireframes',1440,1024,'desktop'],['TV',1280,720,'desktop']]],
 ['Presentation',[['Slide 16:9',1920,1080],['Slide 4:3',1024,768]]],
 ['Social',[['Square post',1080,1080],['Portrait post',1080,1350],['Story',1080,1920]]],
 ['Paper',[['A4 · 96 dpi',794,1123],['Letter · 96 dpi',816,1056]]]
];
export function installFramePresets(panel,create){
 const section=document.createElement('section');section.className='frame-presets';section.hidden=true;
 const title=document.createElement('h3');title.textContent='Frame';const help=document.createElement('p');help.textContent='Choose a preset, or drag on the canvas for a custom size.';section.append(title,help);
 let orientation=null;
 const orientationRow=document.createElement('div');orientationRow.className='device-orientation';orientationRow.setAttribute('role','group');orientationRow.setAttribute('aria-label','Frame orientation');
 const presetButtons=[];
 for(const value of ['portrait','landscape']){const button=document.createElement('button');button.type='button';button.textContent=value[0].toUpperCase()+value.slice(1);button.setAttribute('aria-pressed','false');button.onclick=()=>{orientation=value;for(const b of orientationRow.children)b.setAttribute('aria-pressed',String(b===button));for(const item of presetButtons){const size=orientedFrameSize(item.width,item.height,orientation);item.size.textContent=size.width+' × '+size.height;}};orientationRow.append(button);}section.append(orientationRow);
 for(const [category,items] of FRAME_PRESETS){const group=document.createElement('details'),summary=document.createElement('summary');summary.textContent=category;group.open=['Phone','Desktop'].includes(category);group.append(summary);
  for(const [name,width,height,shell] of items){const b=document.createElement('button'),label=document.createElement('span'),size=document.createElement('span');b.type='button';label.textContent=name;size.textContent=width+' × '+height;b.append(label,size);presetButtons.push({width,height,size});b.onclick=()=>create({name,...orientedFrameSize(width,height,orientation),device_chrome:shell??'',device_chrome_hidden:true,device_chrome_breakpoints:{tablet:600,desktop:1024}});group.append(b);}section.append(group);
 }
 panel.prepend(section);return active=>{if(section.parentElement!==panel)panel.prepend(section);section.hidden=!active;panel.classList.toggle('choosing-frame',active);};
}
export function installFrameLabels(canvas,{select,rename,beginDrag}){
 const overlay=document.createElement('div');overlay.className='frame-labels';canvas.after(overlay);const entries=new Map();
 return (scene,pan,zoom,selected,enabled)=>{
  const box=canvas.getBoundingClientRect(),parent=canvas.parentElement.getBoundingClientRect();overlay.style.left=box.left-parent.left+'px';overlay.style.top=box.top-parent.top+'px';overlay.style.width=box.width+'px';overlay.style.height=box.height+'px';
  const byId=new Map(scene.map(s=>[s.id,s]));
  const frames=scene.filter(s=>{
   if(s.kind!=='frame'||!visibleInTree(s,scene))return false;
   let ancestor=byId.get(s.parent_id);
   while(ancestor){if(ancestor.kind==='frame')return false;ancestor=byId.get(ancestor.parent_id);}
   return true;
  });const live=new Set(frames.map(s=>s.id));
  for(const [id,row] of entries)if(!live.has(id)){row.remove();entries.delete(id);}
  for(const frame of frames){let row=entries.get(frame.id);if(!row){row=document.createElement('div');row.className='frame-label';const button=document.createElement('button');button.type='button';row.append(button);entries.set(frame.id,row);overlay.append(row);
    let press=null,dragged=false;
    button.onpointerdown=e=>{if(e.button!==0||row.dataset.locked==='true')return;e.stopPropagation();press={pointerId:e.pointerId,clientX:e.clientX,clientY:e.clientY};dragged=false;button.setPointerCapture(e.pointerId);};
    button.onpointermove=e=>{if(!press||e.pointerId!==press.pointerId||Math.hypot(e.clientX-press.clientX,e.clientY-press.clientY)<4)return;const start=press;press=null;dragged=true;beginDrag?.(frame.id,start,e);};
    button.onpointerup=()=>{press=null;};
    button.onpointercancel=()=>{press=null;};
    button.onlostpointercapture=()=>{press=null;};
    button.onclick=e=>{e.stopPropagation();if(dragged){dragged=false;return;}select(frame.id);};
    button.ondblclick=e=>{e.stopPropagation();if(row.dataset.locked==='true')return;const input=document.createElement('input');input.value=button.textContent;input.setAttribute('aria-label','Frame name');button.hidden=true;row.append(input);let done=false;
     const finish=commit=>{if(done)return;done=true;const value=input.value.trim();input.remove();button.hidden=false;if(commit&&value&&value!==button.textContent)rename(frame.id,value);button.focus();};
     input.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();finish(true);}if(e.key==='Escape'){e.preventDefault();finish(false);}};input.onblur=()=>finish(true);input.focus();input.select();
    };
   }
   const button=row.firstElementChild,type=componentLabelType(frame);
   row.dataset.componentType=type;
   button.replaceChildren();
   if(type){const glyph=document.createElement('span');glyph.className='frame-label-icon';glyph.setAttribute('aria-hidden','true');glyph.innerHTML=icon(type==='master'?'component':'instance');button.append(glyph);}
   const name=document.createElement('span');name.className='frame-label-name';name.textContent=frame.name;button.append(name);
   button.setAttribute('aria-label','Select frame '+frame.name);button.title='Double-click to rename';row.dataset.locked=String(lockedInTree(frame,scene));row.classList.toggle('selected',selected.has(frame.id));row.style.left=pan.x+frame.x*zoom+'px';row.style.top=pan.y+frame.y*zoom-chromeInsets(frame.device_chrome_hidden?'none':frame.device_chrome,frame.width,frame.height,frame.device_chrome_breakpoints)[0]*zoom-25+'px';row.style.maxWidth=Math.max(80,frame.width*zoom)+'px';row.style.pointerEvents=enabled?'auto':'none';
  }
 };
}

export function migrateChromeDocument(doc){
 const presets=new Set(FRAME_PRESETS.flatMap(([,items])=>items.map(([name])=>name)));
 return {...doc,shapes:(doc.shapes??[]).map(s=>{
  if(s.kind!=='frame'||s.device_chrome_breakpoints)return s;
  const custom=!s.parent_id&&!presets.has(s.name),wasEnabled=s.device_chrome&&s.device_chrome!=='none'&&!s.device_chrome_hidden;
  return {...s,device_chrome_breakpoints:{tablet:600,desktop:1024},...(custom?{device_chrome:['iphone','iphone-notch','iphone-fold','ipad','auto-apple'].includes(s.device_chrome)?'auto-apple':'auto',device_chrome_hidden:!wasEnabled}:{})};
 })};
}
