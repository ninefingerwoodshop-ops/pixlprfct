import {appearance} from './appearance.js';
import {paints} from './paints.js';
import {installPaintStacks} from './paint-stack-inspector.js';
import {installPaintPopovers} from './paint-popover.js';
import {resolveVariableValue} from './variable-manager.js';
import {paintPreview} from './paint-preview.js';
import {element,action,settingRow,syncInput,settingsPopover} from './inspector-settings.js';

export function installColorStyleControls({current,document:read,save,apply,remove,saveVariables,textLayout}){
 const popup=settingsPopover(document.body,'Edit color style',{width:304});popup.panel.classList.add('effect-style-editor','color-style-editor');
 const properties=element('section','color-style-properties');properties.append(element('h3','','Properties'));
 let draft=null,target=0,stroke=false,updatePaints=()=>{},updatePicker=()=>{};
 const styles=()=>read().color_styles??[];
 const surface=()=>{const variables=read().variables;return {id:4294967294,kind:'rectangle',width:100,height:100,fill:'#d9d9d9',page_id:read().active_page,appearance:{...appearance({}),fills:(draft?.paints??[]).map(p=>({...p,color:draft?.color_variables?.[p.id]?resolveVariableValue(variables,draft.color_variables[p.id]):p.color}))},variable_bindings:Object.fromEntries(Object.entries(draft?.color_variables??{}).map(([id,v])=>['appearance.fills.'+id+'.color',v]))};};
 const saveDraft=value=>{if(draft.id)save(value,0,false);else{draft=value;render();}};
 const change=shape=>{const ids=new Set(shape.appearance.fills.map(p=>p.id)),bindings={...draft.color_variables};for(const id of Object.keys(bindings))if(!ids.has(Number(id)))delete bindings[id];for(const p of shape.appearance.fills){const old=surface().appearance.fills.find(s=>s.id===p.id);if(old&&old.color!==p.color)delete bindings[p.id];}saveDraft({...draft,paints:shape.appearance.fills,color_variables:bindings});};
 const bind=(_,path,variable)=>{const id=Number(path.split('.')[2]),bindings={...draft.color_variables};if(variable)bindings[id]=variable;else delete bindings[id];saveDraft({...draft,paints:surface().appearance.fills,color_variables:bindings});};
 function edit(style,channel='fill',anchor=document.getElementById('page-styles'),fromPage=false){
  stroke=channel==='stroke';target=fromPage?0:current()?.id??0;
  draft=style?structuredClone(style):{id:0,name:'',description:'',paints:target?structuredClone(paints(current(),channel)):[{id:1,color:'#d9d9d9',opacity:1,visible:true}],color_variables:{}};
  if(!style&&target)for(const [path,v] of Object.entries(current().variable_bindings??{})){const match=new RegExp('^appearance\\.'+(stroke?'strokes':'fills')+'\\.(\\d+)\\.color$').exec(path);if(match)draft.color_variables[match[1]]=v;}
  popup.panel.setAttribute('aria-label',draft.id?'Edit color style':'Create new color style');popup.show(draft.id,anchor);render();popup.body.querySelector('input')?.focus();
 }
 function render(){if(!popup.open||!draft)return;popup.update(String(draft.id),(head,body)=>{
  head.append(element('span','',draft.id?'Edit color style':'Create new color style'));body.append(element('div','color-style-preview'));
  const name=element('input');name.maxLength=128;name.required=true;name.placeholder='New color style';name.setAttribute('aria-label','Color style name');name.oninput=()=>name.setCustomValidity('');name.onchange=()=>{if(name.value.trim())saveDraft({...draft,name:name.value.trim()});};
  const description=element('textarea');description.rows=1;description.maxLength=2000;description.placeholder="What's it for?";description.setAttribute('aria-label','Color style description');description.onchange=()=>saveDraft({...draft,description:description.value});
  body.append(settingRow('Name',name),settingRow('Description',description),properties);
  const done=element('button','setting-text-button effect-style-create',draft.id?'Done':'Create style');done.type='button';done.onclick=()=>{if(!name.value.trim()){name.setCustomValidity('Enter a style name');name.reportValidity();return;}if(draft.id||save({...draft,name:name.value.trim(),description:description.value},target,stroke))popup.close();};body.append(done);
 },(_,body)=>{syncInput(body.querySelector('input'),draft.name);syncInput(body.querySelector('textarea'),draft.description??'');const preview=body.querySelector('.color-style-preview');preview.style.background=paintPreview(draft,read(),272,104,textLayout);updatePaints(surface());updatePicker(surface());});}
 // Reuse the same stack and full paint picker as the layer inspector.
 const hosts={fill:properties};updatePaints=installPaintStacks(surface,change,{document:read,bind,hosts,idPrefix:'style-'});updatePicker=installPaintPopovers({current:surface,change,document:read,bind,saveVariables,hosts,idPrefix:'style-'});popup.panel.append(document.getElementById('style-fill-paint-popover'));
 const chips=['fill','stroke'].map(channel=>{const host=channel==='fill'?document.getElementById('paint-label').closest('section'):document.getElementById('stroke-section'),chip=element('div','setting-item color-style-chip'),name=element('button','effect-edit');name.type='button';const launch=()=>{const style=styles().find(s=>s.id===current()?.[channel+'_style']);if(style)edit(style,channel,host);};name.onclick=launch;chip.append(name,action('Edit '+channel+' color style','edit',launch),action('Detach '+channel+' color style','detach',()=>apply(0,channel)));host.querySelector('.paint-section-heading').after(chip);return {channel,chip,name,host};});
 return {edit,openPage:(style,anchor)=>edit(style,'fill',anchor,true),remove,update(){for(const {channel,chip,name,host} of chips){const style=styles().find(s=>s.id===current()?.[channel+'_style']);chip.hidden=!style;name.textContent=style?.name??'';name.setAttribute('aria-label',channel+' color style '+(style?.name??''));host.querySelector('.paint-stack').hidden=!!style;host.querySelector('.paint-add').hidden=!!style;}if(popup.open&&draft?.id){const style=styles().find(s=>s.id===draft.id);if(style)draft=structuredClone(style);else popup.close();}render();}};
}
