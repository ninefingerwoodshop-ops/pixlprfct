import {visibleInTree,lockedInTree} from './selection.js';
export const FRAME_PRESETS=[
 ['Phone',[['Phone compact',375,667],['Phone',390,844],['Phone large',430,932],['Android',360,800]]],
 ['Tablet',[['Tablet',768,1024],['Tablet large',1024,1366]]],
 ['Desktop',[['Laptop',1440,900],['Desktop',1920,1080],['Desktop wide',2560,1440]]],
 ['Presentation',[['Slide 16:9',1920,1080],['Slide 4:3',1024,768]]],
 ['Social',[['Square post',1080,1080],['Portrait post',1080,1350],['Story',1080,1920]]],
 ['Paper',[['A4 · 96 dpi',794,1123],['Letter · 96 dpi',816,1056]]]
];
export function installFramePresets(panel,create){
 const section=document.createElement('section');section.className='frame-presets';section.hidden=true;
 const title=document.createElement('h3');title.textContent='Frame';const help=document.createElement('p');help.textContent='Choose a preset, or drag on the canvas for a custom size.';section.append(title,help);
 for(const [category,items] of FRAME_PRESETS){const group=document.createElement('details'),summary=document.createElement('summary');summary.textContent=category;group.open=['Phone','Desktop'].includes(category);group.append(summary);
  for(const [name,width,height] of items){const b=document.createElement('button'),label=document.createElement('span'),size=document.createElement('span');b.type='button';label.textContent=name;size.textContent=width+' × '+height;b.append(label,size);b.onclick=()=>create({name,width,height});group.append(b);}section.append(group);
 }
 panel.prepend(section);return active=>{if(section.parentElement!==panel)panel.prepend(section);section.hidden=!active;panel.classList.toggle('choosing-frame',active);};
}
export function installFrameLabels(canvas,{select,rename}){
 const overlay=document.createElement('div');overlay.className='frame-labels';canvas.after(overlay);const entries=new Map();
 return (scene,pan,zoom,selected,enabled)=>{
  const box=canvas.getBoundingClientRect(),parent=canvas.parentElement.getBoundingClientRect();overlay.style.left=box.left-parent.left+'px';overlay.style.top=box.top-parent.top+'px';overlay.style.width=box.width+'px';overlay.style.height=box.height+'px';
  const frames=scene.filter(s=>s.kind==='frame'&&visibleInTree(s,scene));const live=new Set(frames.map(s=>s.id));
  for(const [id,row] of entries)if(!live.has(id)){row.remove();entries.delete(id);}
  for(const frame of frames){let row=entries.get(frame.id);if(!row){row=document.createElement('div');row.className='frame-label';const button=document.createElement('button');button.type='button';row.append(button);entries.set(frame.id,row);overlay.append(row);
    button.onclick=e=>{e.stopPropagation();select(frame.id);};
    button.ondblclick=e=>{e.stopPropagation();if(row.dataset.locked==='true')return;const input=document.createElement('input');input.value=button.textContent;input.setAttribute('aria-label','Frame name');button.hidden=true;row.append(input);let done=false;
     const finish=commit=>{if(done)return;done=true;const value=input.value.trim();input.remove();button.hidden=false;if(commit&&value&&value!==button.textContent)rename(frame.id,value);button.focus();};
     input.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();finish(true);}if(e.key==='Escape'){e.preventDefault();finish(false);}};input.onblur=()=>finish(true);input.focus();input.select();
    };
   }
   const button=row.firstElementChild;button.textContent=frame.name;button.setAttribute('aria-label','Select frame '+frame.name);button.title='Double-click to rename';row.dataset.locked=String(lockedInTree(frame,scene));row.classList.toggle('selected',selected.has(frame.id));row.style.left=pan.x+frame.x*zoom+'px';row.style.top=pan.y+frame.y*zoom-25+'px';row.style.maxWidth=Math.max(80,frame.width*zoom)+'px';row.style.pointerEvents=enabled?'auto':'none';
  }
 };
}
