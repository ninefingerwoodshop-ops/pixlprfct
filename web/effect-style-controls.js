import {appearance} from './appearance.js';
import {effectEntries,defaultShadow} from './effect-editor.js';
import {element,action,settingIcon,settingRow,syncInput,settingsPopover,settingsMenu} from './inspector-settings.js';

export function effectStyleValues(a={}) {
 return {shadows:structuredClone(a.shadows??[]),layer_blur:a.layer_blur??0,layer_blur_enabled:a.layer_blur_enabled??true,layer_blur_present:a.layer_blur_present??false,backdrop_blur:a.backdrop_blur??0,backdrop_blur_enabled:a.backdrop_blur_enabled??true,backdrop_blur_present:a.backdrop_blur_present??false};
}

export function createEffectStyleControls(host,heading,renderEffects) {
 const library=settingsPopover(host,'Effect styles',{width:216}),editor=settingsPopover(host,'Edit effect style',{width:304});
 library.panel.classList.add('effect-style-picker');editor.panel.classList.add('effect-style-editor');
 const properties=element('div','effect-style-properties');
 const menu=settingsMenu(library.panel,'Effect style actions');
 let shape=null,api=null,draft=null,query='';
 const linked=()=>api?.styles.find(s=>s.id===shape?.effect_style);
 const chip=element('div','setting-item effect-style-chip'),pick=element('button','effect-edit');pick.type='button';pick.setAttribute('aria-haspopup','dialog');
 const edit=action('Edit effect style','edit',()=>openEditor(linked())),detach=action('Detach effect style','detach',()=>api.apply(0));
 chip.append(pick,edit,detach);host.append(chip);
 const styles=action('Apply effect style','styles',()=>openLibrary());styles.setAttribute('aria-haspopup','dialog');heading.insertBefore(styles,heading.lastElementChild);
 pick.onclick=()=>openLibrary();
 const save=value=>{if(!draft.id){draft=value;renderEditor();}else api.save(value,0);};
 function openLibrary(){library.show('styles',heading);renderLibrary();library.body.querySelector('input')?.focus();}
 function openEditor(style){
  if(!style){const effects=effectStyleValues(appearance(shape));if(!effectEntries(effects).length)effects.shadows=[defaultShadow()];draft={id:0,name:'',description:'',effects};}
  else draft=structuredClone(style);
  library.close();editor.panel.setAttribute('aria-label',draft.id?'Edit effect style':'Create new effect style');editor.show(draft.id,heading);renderEditor();editor.body.querySelector('input')?.focus();
 }
 function renderLibrary(){
  if(!library.open)return;
  library.update('picker',(head,body)=>{
   head.append(element('span','','Effect styles'),action('Create effect style','plus',()=>openEditor()));
   const search=element('input','effect-style-search');search.type='search';search.placeholder='Search';search.setAttribute('aria-label','Search effect styles');search.value=query;search.oninput=()=>{query=search.value;renderItems();};
   body.append(search,element('div','effect-style-list'));
  });renderItems();
 }
 function renderItems(){
  const list=library.body.querySelector('.effect-style-list');if(!list)return;list.replaceChildren();
  for(const style of api.styles.filter(s=>s.name.toLowerCase().includes(query.toLowerCase()))){
   const row=element('div','effect-style-option'),button=element('button','effect-style-apply');button.type='button';button.innerHTML=settingIcon('drop');button.append(element('span','',style.name));button.title=style.description||style.name;button.setAttribute('aria-label','Apply '+style.name);button.setAttribute('aria-pressed',String(style.id===shape.effect_style));button.onclick=()=>{api.apply(style.id);library.close();};
   const edit=action('Edit '+style.name,'edit',()=>openEditor(style));row.append(button,edit);
   row.oncontextmenu=e=>{e.preventDefault();menu.show(edit,[{label:'Edit style',glyph:'edit',run:()=>openEditor(style)},{label:'Delete style',glyph:'minus',run:()=>api.remove(style.id)}]);};list.append(row);
  }
  if(!list.children.length)list.append(element('p','setting-note',query?'No matching styles':'No effect styles yet'));
 }
 function renderEditor(){
  if(!editor.open||!draft)return;
  editor.update(String(draft.id),(head,body)=>{
   head.append(element('span','',draft.id?'Edit effect style':'Create new effect style'));
   const preview=element('div','effect-style-preview');preview.append(element('div','effect-style-preview-disc'));body.append(preview);
   const name=element('input');name.type='text';name.maxLength=128;name.required=true;name.placeholder='New effect style';name.setAttribute('aria-label','Effect style name');name.value=draft.name;
   const description=element('textarea');description.maxLength=2000;description.rows=1;description.placeholder="What's it for?";description.setAttribute('aria-label','Effect style description');description.value=draft.description??'';
   name.oninput=()=>name.setCustomValidity('');
   name.onchange=()=>{if(name.value.trim())save({...draft,name:name.value.trim()});else if(draft.id){name.setCustomValidity('Enter a style name');name.reportValidity();}};
   description.onchange=()=>save({...draft,description:description.value});
   body.append(settingRow('Name',name),settingRow('Description',description),properties);
   if(!draft.id){const create=element('button','setting-text-button effect-style-create','Create style');create.onclick=()=>{if(!name.value.trim()){name.setCustomValidity('Enter a style name');name.reportValidity();return;}const id=api.save({...draft,name:name.value.trim(),description:description.value},shape.id);if(id)editor.close();};body.append(create);}
   else {const remove=element('button','setting-text-button effect-style-delete','Delete style');remove.onclick=()=>{api.remove(draft.id);if(!api.styles.some(s=>s.id===draft.id))editor.close();};body.append(remove);}
  },(_,body)=>{
   syncInput(body.querySelector('input'),draft.name);syncInput(body.querySelector('textarea'),draft.description??'');
   const surface=body.querySelector('.effect-style-preview-disc'),e=draft.effects;
   surface.style.boxShadow=e.shadows.filter(s=>s.visible!==false).map(s=>`${s.kind==='inner'?'inset ':''}${s.x}px ${s.y}px ${s.blur}px ${s.spread??0}px ${s.color}${Math.round(s.opacity*255).toString(16).padStart(2,'0')}`).join(',')||'none';
   surface.style.filter=e.layer_blur_enabled!==false&&e.layer_blur?`blur(${e.layer_blur/2}px)`:'none';surface.style.backdropFilter=e.backdrop_blur_enabled!==false&&e.backdrop_blur?`blur(${e.backdrop_blur/2}px)`:'none';
   renderEffects(properties,{id:1,kind:'effect-style',appearance:{...appearance({}),...e}},next=>save({...draft,effects:effectStyleValues(next.appearance)}));properties.querySelector('h3').textContent='Properties';
  });
 }
 return {update(next,nextApi){
  if(shape?.id!==next?.id){library.close();editor.close();}
  shape=next;api=nextApi;styles.hidden=!shape||!api;chip.hidden=!linked();
  if(!shape||!api){library.close();editor.close();return false;}
  const style=linked();if(style){pick.innerHTML=settingIcon('drop');pick.append(element('span','',style.name));pick.setAttribute('aria-label','Effect style '+style.name);pick.title=style.name;}
  if(editor.open&&draft?.id){const current=api.styles.find(s=>s.id===draft.id);if(current)draft=structuredClone(current);else editor.close();}
  renderLibrary();renderEditor();return !!style;
 }};
}
