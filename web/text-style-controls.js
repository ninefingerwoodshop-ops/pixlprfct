import {textStyle,letterSpacing,textTransform} from './typography.js';
import {fontInput} from './google-fonts.js';
import {element,action,settingRow,syncInput,settingsPopover,settingsMenu,choose,numberField} from './inspector-settings.js';

export function parseLetterSpacing(value){
 const match=/^\s*(-?(?:\d+(?:\.\d*)?|\.\d+))\s*(%|px)?\s*$/i.exec(value);
 if(!match||Math.abs(Number(match[1]))>1000)throw new Error('Use a letter spacing between -1000 and 1000, in px or %.');
 return {letter_spacing:Number(match[1]),letter_spacing_unit:match[2]?.toLowerCase()??'px'};
}
const spacingValue=t=>(t.letter_spacing??0)+(t.letter_spacing_unit==='%'?'%':'px');
const cases=[['','As typed'],['upper','Uppercase'],['lower','Lowercase'],['title','Title case']];
export function installTextStyleControls({current,change,document:read,save,apply,remove}){
 const host=document.getElementById('text-section'),heading=element('div','setting-section-heading typography-heading'),title=host.querySelector('h3');title.before(heading);heading.append(title);host.classList.add('setting-section');
 const library=settingsPopover(host,'Text styles',{width:216}),editor=settingsPopover(host,'Edit text style',{width:304}),type=settingsPopover(host,'Type settings',{width:304});
 library.panel.classList.add('effect-style-picker','text-style-picker');editor.panel.classList.add('effect-style-editor','text-style-editor');
 const menu=settingsMenu(library.panel,'Text style actions');let shape=null,draft=null,query='',pageEditor=false;
 const styles=()=>read().text_styles??[],linked=()=>styles().find(s=>s.id===shape?.text_style);
 const pick=action('Apply text style','styles',()=>{library.show('styles',heading);renderLibrary();library.body.querySelector('input')?.focus();});pick.setAttribute('aria-haspopup','dialog');heading.append(pick);
 const chip=element('div','setting-item text-style-chip'),name=element('button','effect-edit'),edit=action('Edit text style','edit',()=>openEditor(linked())),detach=action('Detach text style','detach',()=>apply(0));name.type='button';name.onclick=()=>pick.click();chip.append(name,edit,detach);heading.after(chip);
 const line=document.getElementById('line-height').closest('.type-grid'),label=element('label','','Letter spacing'),spacing=element('input');spacing.id='letter-spacing';spacing.type='text';spacing.setAttribute('aria-label','Letter spacing');label.append(spacing);line.append(label);
 spacing.oninput=()=>spacing.setCustomValidity('');spacing.onchange=()=>{try{const s=current();if(s)change({...s,typography:{...textStyle(s),...parseLetterSpacing(spacing.value)}});}catch(error){spacing.setCustomValidity(error.message);spacing.reportValidity();}};
 const typeButton=action('Type settings','',()=>{type.show('type',typeButton);renderType();});typeButton.innerHTML='<svg class="setting-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 7h14M8 12h11M5 17h14M9 5v4M15 10v4M10 15v4"/></svg>';typeButton.setAttribute('aria-haspopup','dialog');typeButton.classList.add('type-settings-trigger');host.querySelector('.text-align-tools').append(typeButton);
 function patchType(value){const s=current();if(s)change({...s,typography:{...textStyle(s),...value}});}
 function renderType(){type.update('type',(head,body)=>{
  head.append(element('span','','Type settings'));body.append(element('strong','','Basics'));
  body.append(settingRow('Alignment',choose('Type horizontal alignment',[['left','Left'],['center','Center'],['right','Right']],textStyle(shape).align,value=>patchType({align:value}))));
  const group=element('div','type-case-options');group.setAttribute('role','group');group.setAttribute('aria-label','Case');
  for(const [value,label] of cases){const b=element('button','',({ '':'−',upper:'AA',lower:'aa',title:'Aa'})[value]);b.type='button';b.setAttribute('aria-label',label);b.title=label;b.dataset.case=value;b.onclick=()=>patchType({text_case:value});group.append(b);}body.append(settingRow('Case',group));
 },(_,body)=>{const t=textStyle(shape);for(const b of body.querySelectorAll('[data-case]'))b.setAttribute('aria-pressed',String(b.dataset.case===(t.text_case==='original'?'':t.text_case??'')));const select=body.querySelector('select');if(select)select.value=t.align;});}
 function openEditor(style,anchor=heading,fromPage=false){pageEditor=fromPage;draft=style?structuredClone(style):{id:0,name:'',description:'',typography:{...textStyle(shape??{height:24,typography:{font_family:'Inter',font_size:12,font_weight:400,line_height:1.2,letter_spacing:0,letter_spacing_unit:'px',text_case:'',align:'left',vertical_align:'top',sizing:'fixed',wrap:true}})}};library.close();editor.panel.setAttribute('aria-label',draft.id?'Edit text style':'Create new text style');editor.show(draft.id,anchor);renderEditor();editor.body.querySelector('input')?.focus();}
 function saveDraft(value){if(!draft.id){draft=value;renderEditor();}else save(value,0);}
 function renderLibrary(){library.update('picker',(head,body)=>{head.append(element('span','','Text styles'),action('Create text style','plus',()=>openEditor()));const search=element('input','effect-style-search');search.type='search';search.placeholder='Search';search.setAttribute('aria-label','Search text styles');search.value=query;search.oninput=()=>{query=search.value;renderItems();};body.append(search,element('div','effect-style-list'));});renderItems();}
 function renderItems(){const list=library.body.querySelector('.effect-style-list');if(!list)return;list.replaceChildren();let group='';
  for(const s of [...styles()].filter(s=>s.name.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>a.name.localeCompare(b.name))){
   const path=s.name.split('/').map(v=>v.trim()),next=path.slice(0,-1).join(' / ');if(next&&next!==group)list.append(element('div','text-style-group',next));group=next;
   const row=element('div','effect-style-option'),b=element('button','effect-style-apply'),sample=element('span','text-style-sample','Ag'),caption=element('span','text-style-caption');caption.append(element('span','',path.at(-1)),element('small','',`${s.typography.font_size} / ${Math.round(s.typography.font_size*s.typography.line_height)}`));b.type='button';b.setAttribute('aria-label','Apply '+s.name);b.setAttribute('aria-pressed',String(shape?.text_style===s.id));b.append(sample,caption);b.onclick=()=>{apply(s.id);library.close();};const edit=action('Edit '+s.name,'edit',()=>openEditor(s));row.append(b,edit);row.oncontextmenu=e=>{e.preventDefault();menu.show(edit,[{label:'Edit style',glyph:'edit',run:()=>openEditor(s)},{label:'Delete style',glyph:'minus',run:()=>remove(s.id)}]);};list.append(row);
  }if(!list.children.length)list.append(element('p','setting-note',query?'No matching styles':'No text styles yet'));
 }
 function renderEditor(){if(!editor.open||!draft)return;editor.update(String(draft.id)+':'+pageEditor,(head,body)=>{
  head.append(element('span','',draft.id?'Edit text style':'Create new text style'));if(pageEditor)body.append(element('div','text-style-preview page-text-preview','Rag123'));editor.panel.classList.toggle('page-text-editor',pageEditor);
  const name=element('input');name.maxLength=128;name.placeholder='New text style';name.required=true;name.setAttribute('aria-label','Text style name');name.value=draft.name;
  const description=element('textarea');description.rows=1;description.maxLength=2000;description.placeholder="What's it for?";description.setAttribute('aria-label','Text style description');description.value=draft.description??'';
  name.oninput=()=>name.setCustomValidity('');name.onchange=()=>{if(name.value.trim())saveDraft({...draft,name:name.value.trim()});};description.onchange=()=>saveDraft({...draft,description:description.value});
  body.append(settingRow('Name',name),settingRow('Description',description));
  const more=element('details','text-style-properties');more.open=pageEditor||!!draft.id;more.append(element('summary','',pageEditor?'Properties':'Show more options'));const props=element('div');more.append(props);body.append(more);
  const changeType=patch=>saveDraft({...draft,typography:{...draft.typography,...patch}}),family=fontInput(draft.typography.font_family,value=>changeType({font_family:value}));family.setAttribute('aria-label','Text style font family');
  const spacing=element('input');spacing.setAttribute('aria-label','Text style letter spacing');spacing.dataset.typeField='spacing';spacing.oninput=()=>spacing.setCustomValidity('');spacing.onchange=()=>{try{changeType(parseLetterSpacing(spacing.value));}catch(error){spacing.setCustomValidity(error.message);spacing.reportValidity();}};
  if(pageEditor){
   props.append(family);const sizes=element('div','page-text-metrics-row'),metrics=element('div','page-text-metrics-row');
   const weight=choose('Text style Weight',[[100,'Thin'],[200,'Extra Light'],[300,'Light'],[400,'Regular'],[500,'Medium'],[600,'Semibold'],[700,'Bold'],[800,'Extra Bold'],[900,'Black']],String(draft.typography.font_weight),value=>changeType({font_weight:Number(value)}));
   const size=numberField('Text style Size',draft.typography.font_size,value=>changeType({font_size:value}),{min:1,max:512});size.querySelector('input').dataset.typeField='font_size';
   const height=numberField('Text style Line height',draft.typography.line_height*100,value=>changeType({line_height:value/100}),{min:50,max:400});height.querySelector('input').dataset.typeField='line_height';height.querySelector('input').dataset.multiplier='100';height.append(element('span','setting-percent','%'));
   sizes.append(weight,size);metrics.append(height,spacing);props.append(sizes,metrics);
  }else{
   props.append(settingRow('Font',family));for(const [key,label,min,max] of [['font_size','Size',1,512],['font_weight','Weight',100,900],['line_height','Line height',.5,4]]){const field=numberField('Text style '+label,draft.typography[key],value=>changeType({[key]:value}),{min,max,step:key==='font_weight'?100:'any'});field.querySelector('input').dataset.typeField=key;props.append(settingRow(label,field));}
   props.append(settingRow('Letter spacing',spacing),settingRow('Case',choose('Text style case',cases,draft.typography.text_case??'',value=>changeType({text_case:value}))),element('div','text-style-preview','Ag'));
  }
  const footer=element('button','setting-text-button effect-style-create',draft.id?'Done':'Create style');footer.onclick=()=>{if(!name.value.trim()){name.setCustomValidity('Enter a style name');name.reportValidity();return;}if(draft.id||save({...draft,name:name.value.trim(),description:description.value},(pageEditor?0:shape?.id??0)))editor.close();};body.append(footer);
 },(_,body)=>{syncInput(body.querySelector('input'),draft.name);syncInput(body.querySelector('textarea'),draft.description??'');for(const field of body.querySelectorAll('[data-type-field]'))syncInput(field,field.dataset.typeField==='spacing'?spacingValue(draft.typography):draft.typography[field.dataset.typeField]*Number(field.dataset.multiplier??1));const family=body.querySelector('[aria-label="Text style font family"]');if(family)syncInput(family,draft.typography.font_family);const weight=body.querySelector('select[aria-label="Text style Weight"]');if(weight)weight.value=String(draft.typography.font_weight);const preview=body.querySelector('.text-style-preview');Object.assign(preview.style,{fontFamily:draft.typography.font_family,fontSize:(pageEditor?32:Math.min(draft.typography.font_size,64))+'px',fontWeight:draft.typography.font_weight,letterSpacing:letterSpacing(draft.typography)+'px',textTransform:textTransform(draft.typography)});});}
 const update=next=>{if(shape?.id!==next?.id){library.close();editor.close();type.close();}shape=next?.kind==='text'?next:null;const linkedStyle=linked();chip.hidden=!linkedStyle;if(linkedStyle){name.textContent=linkedStyle.name;name.setAttribute('aria-label','Text style '+linkedStyle.name);}if(shape)syncInput(spacing,spacingValue(textStyle(shape)));if(editor.open&&draft?.id){const found=styles().find(s=>s.id===draft.id);if(found)draft=structuredClone(found);else editor.close();}if(library.open)renderLibrary();if(type.open&&shape)renderType();renderEditor();};
 update.openPage=(style,anchor)=>openEditor(style,anchor,true);return update;
}
