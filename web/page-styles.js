import {icon} from './icons.js';
import {element,action,settingsMenu} from './inspector-settings.js';
import {paintPreview} from './paint-preview.js';

// Figma's unselected Page inspector: categories, slash groups and 32px style rows.
export function installPageStyles({document:read,open,save,remove,textLayout}){
 const host=document.getElementById('page-styles'),heading=element('div','setting-section-heading'),title=element('h3','','Styles'),menu=settingsMenu(host,'Style actions');heading.append(title);host.append(heading);
 const create=action('Create style','plus',()=>menu.show(create,[['text','Text'],['color','Color'],['effect','Effect']].map(([kind,label])=>({label,glyph:kind==='effect'?'drop':kind,run:()=>open(kind,null,create)}))));create.setAttribute('aria-haspopup','menu');heading.append(create);
 const definitions=[['text','Text styles','text_styles'],['color','Color styles','color_styles'],['effect','Effect styles','effect_styles']],categories=new Map(),collapsed=new Set();let signature='';
 for(const [kind,label] of definitions){const section=element('div','page-style-category'),head=element('div','page-style-category-heading'),list=element('div','page-style-list');head.append(element('span','',label),action('Create '+kind+' style','plus',()=>open(kind,null,head)));section.append(head,list);host.append(section);categories.set(kind,list);}
 function unique(kind,name){const field=definitions.find(v=>v[0]===kind)[2],names=new Set((read()[field]??[]).map(s=>s.name.toLowerCase()));let next=name,n=2;while(names.has(next.toLowerCase()))next=name+' '+n++;return next;}
 function rename(kind,style,button){const input=element('input','page-style-rename');input.value=style.name;input.maxLength=128;input.setAttribute('aria-label','Rename '+kind+' style');button.replaceWith(input);input.focus();input.select();let done=false;const finish=commit=>{if(done)return;done=true;if(commit&&input.value.trim()&&input.value.trim()!==style.name)save(kind,{...style,name:input.value.trim()});signature='';update();};input.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();finish(true);}if(e.key==='Escape'){e.preventDefault();finish(false);}};input.onblur=()=>finish(true);}
 function update(){const previews=new Map((read().color_styles??[]).map(style=>[style.id,paintPreview(style,read(),16,16,textLayout)]));const next=JSON.stringify([definitions.map(([, ,field])=>read()[field]??[]),[...previews]]);if(signature===next)return;signature=next;
  for(const [kind,,field] of definitions){const list=categories.get(kind);list.replaceChildren();const groups=new Set();for(const style of [...(read()[field]??[])].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}))){const path=style.name.split('/').map(s=>s.trim()),group=path.slice(0,-1).join(' / '),key=kind+':'+group;
    if(group&&!groups.has(group)){groups.add(group);const fold=element('button','page-style-group');fold.innerHTML=icon(collapsed.has(key)?'chevron-right':'chevron-down');fold.append(element('span','',group));fold.type='button';fold.setAttribute('aria-expanded',String(!collapsed.has(key)));fold.onclick=()=>{if(collapsed.has(key))collapsed.delete(key);else collapsed.add(key);signature='';update();};list.append(fold);}if(group&&collapsed.has(key))continue;
    const row=element('div','page-style-row'),sample=element('span','page-style-sample '+kind,kind==='text'?'Ag':''),name=element('button','page-style-name',path.at(-1)),edit=action('Edit '+kind+' style '+style.name,'edit',()=>open(kind,style,row));name.type='button';name.title=style.description||style.name;name.setAttribute('aria-label',kind+' style '+style.name);name.ondblclick=()=>rename(kind,style,name);name.onkeydown=e=>{if(e.key==='F2'){e.preventDefault();rename(kind,style,name);}else if(e.key==='Enter')open(kind,style,row);};
    if(kind==='color')sample.style.background=previews.get(style.id);
    row.classList.toggle('grouped',!!group);row.append(sample,name);if(kind==='text')row.append(element('small','page-style-metrics',`· ${style.typography.font_size}/${Math.round(style.typography.font_size*style.typography.line_height)}`));row.append(edit);row.oncontextmenu=e=>{e.preventDefault();menu.show(edit,[{label:'Edit style',glyph:'edit',run:()=>open(kind,style,row)},{label:'Rename',glyph:'edit',run:()=>rename(kind,style,name)},{label:'Duplicate',glyph:'plus',run:()=>save(kind,{...style,id:0,name:unique(kind,style.name+' copy')})},{label:'Delete style',glyph:'minus',run:()=>remove(kind,style.id)}]);};list.append(row);
   }
  }
 }
 return update;
}
