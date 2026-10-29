import {editorRole} from './canvas-tools.js';
import {icon} from './icons.js';
export function installToolInspector({current,change,remove,exportSlice}){
 const host=document.createElement('section');host.className='property-section canvas-tool-inspector';host.hidden=true;document.getElementById('design-inspector').prepend(host);let signature='';
 const el=(tag,text,attrs={})=>{const e=document.createElement(tag);if(text)e.textContent=text;for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);return e;};
 function render(){const shape=current(),meta=shape?.editor_meta,role=editorRole(shape),key=JSON.stringify([shape?.id,meta]);host.hidden=!meta||!role&&!meta.text_path;if(host.hidden)return;if(signature===key)return;if(host.contains(document.activeElement)&&document.activeElement.matches('textarea,input')&&signature.startsWith('['+shape.id+','))return;signature=key;host.replaceChildren();
  const title=el('h3',meta.text_path?'Text on path':role[0].toUpperCase()+role.slice(1));host.append(title);
  const save=patch=>{const s=current();if(s?.id===shape.id)change({...s,editor_meta:{...s.editor_meta,...patch}});};
  if(['comment','annotation','spec'].includes(role)){
   const body=el('textarea',null,{'aria-label':role==='spec'?'Specification':role==='comment'?'Comment':'Annotation',rows:role==='spec'?'10':'4',maxlength:'10000',placeholder:role==='spec'?'Describe behavior, requirements, and acceptance criteria…':'Write a '+role+'…'});body.value=meta.body||'';body.oninput=()=>save({body:body.value});host.append(body);
   if(role==='comment'){const resolve=el('button',meta.resolved?'Reopen comment':'Resolve comment',{class:'wide-button','aria-pressed':String(meta.resolved)});resolve.onclick=()=>save({resolved:!meta.resolved});host.append(resolve);for(const [i,text] of (meta.replies??[]).entries()){const entry=el('div',null,{class:'comment-reply'}),del=el('button',null,{'aria-label':'Delete reply '+(i+1)});del.innerHTML=icon('trash');del.onclick=()=>save({replies:meta.replies.filter((_,n)=>n!==i)});entry.append(el('p',text),del);host.append(entry);}const reply=el('textarea',null,{'aria-label':'Reply',rows:'2',maxlength:'10000',placeholder:'Reply…'}),add=el('button','Add reply',{class:'wide-button'});add.onclick=()=>{if(reply.value.trim()){save({replies:[...(current().editor_meta.replies??[]),reply.value.trim()]});signature='';render();}};host.append(reply,add);}
  }
  if(role==='section')host.append(el('p','Organize frames and layers in this section. Its boundary stays out of exports.'));
  if(role==='measurement')host.append(el('p',`${Math.round(shape.width)} × ${Math.round(shape.height)} px · ${Math.round(Math.hypot(shape.width,shape.height))} px diagonal`));
  if(role==='slice'){host.append(el('p','Export the artwork inside this region.'));const button=el('button','Export slice…',{class:'wide-button'});button.onclick=exportSlice;host.append(button);}
  if(meta.text_path){const text=el('textarea',null,{'aria-label':'Path text',rows:'3',maxlength:'10000'});text.value=shape.text;text.oninput=()=>change({...current(),text:text.value});host.append(text);const row=el('label','Start offset (%)'),offset=el('input',null,{type:'number',min:'0',max:'100','aria-label':'Path start offset'});offset.value=Math.round(meta.text_path.offset*100);offset.onchange=()=>save({text_path:{...meta.text_path,offset:Math.min(1,Math.max(0,Number(offset.value)/100))}});offset.onblur=()=>offset.onchange();offset.onkeydown=e=>{if(e.key==='Enter')offset.onchange();};row.append(offset);host.append(row);const reverse=el('button','Reverse direction',{class:'wide-button'});reverse.onclick=()=>save({text_path:{...meta.text_path,reverse:!meta.text_path.reverse}});host.append(reverse);const detach=el('button','Detach text from path',{class:'wide-button'});detach.onclick=()=>save({text_path:null});host.append(detach);}
  const del=el('button','Delete '+(role||'text'),{class:'wide-button danger'});del.onclick=remove;host.append(del);
 }
 host.addEventListener('focusout',()=>requestAnimationFrame(()=>render()));
 render.focus=()=>{signature='';render();host.scrollIntoView({block:'nearest'});host.querySelector('textarea,input')?.focus();};return render;
}
