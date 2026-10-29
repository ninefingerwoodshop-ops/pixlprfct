import {element,action,settingIcon,choose,numberField,settingRow,syncInput,settingsPopover,colorField} from './inspector-settings.js';
export const newLayoutGuide=()=>({kind:'grid',size:10,count:5,gutter:20,margin:0,alignment:'stretch',color:'#ff0000',opacity:.1,visible:true});
export const guideLabel=g=>g.kind==='grid'?`Grid ${g.size}px`:`${g.count} ${g.kind}${g.alignment==='stretch'?'':` (${g.size}px)`}`;
const kinds=[['grid','Grid'],['columns','Columns'],['rows','Rows']],controllers=new WeakMap();
function create(host){
 host.classList.add('setting-section');host.replaceChildren();const heading=element('div','setting-section-heading'),list=element('div','setting-list');heading.append(element('h3','','Layout guide'));host.append(heading,list);
 const c={shape:null,rows:new Map()},popup=settingsPopover(host,'layout guide settings'),library=settingsPopover(host,'layout guide styles');popup.panel.classList.add('guide-settings-popover');
 const grids=()=>c.shape.layout_grids??[],current=()=>grids()[popup.key],linked=()=>c.api?.styles.find(s=>s.id===c.shape.guide_style);
 const commit=next=>{const style=linked();style?c.api.save({...style,grids:next},0):c.change({...c.shape,layout_grids:next});};
 const patch=(index,value)=>commit(grids().map((g,i)=>i===index?{...g,...value}:g));
 const open=index=>{const row=c.rows.get(index);if(row){row.scrollIntoView({block:'nearest'});popup.show(index,row);renderPopup();}else c.pending=index;};
 const add=action('Add layout guide','plus',()=>{const index=grids().length;commit([...grids(),newLayoutGuide()]);if(!c.shown)c.toggle();open(index);});
 const styles=action('Layout guide styles and visibility','styles',()=>{if(library.open)library.close(true);else{library.show('styles',heading);renderLibrary();}});styles.setAttribute('aria-haspopup','dialog');styles.setAttribute('aria-expanded','false');heading.append(styles,add);
 function renderPopup(){const g=current();if(!g){popup.close();return;}
  popup.update(g.kind+':'+g.alignment,(head,body)=>{
   head.append(choose('Layout guide type',kinds,g.kind,kind=>patch(popup.key,{kind})));
   const numeric=(label,key,min,max,disabled=false,placeholder='')=>{const field=numberField('Guide '+(popup.key+1)+' '+label,g[key],value=>patch(popup.key,{[key]:value}),{min,max,step:key==='count'?1:'any',disabled});const input=field.querySelector('input');input.dataset.setting=key;if(placeholder){input.value='';input.placeholder=placeholder;input.dataset.auto='true';}body.append(settingRow(label,field));};
   if(g.kind==='grid')numeric('Size','size',1,1000000);else numeric('Count','count',1,256);
   body.append(settingRow('Color',colorField(body,'Guide '+(popup.key+1),()=>current()??g,value=>patch(popup.key,value))));
   if(g.kind!=='grid'){
    const rows=g.kind==='rows';body.append(settingRow('Type',choose('Guide alignment',[['start',rows?'Top':'Left'],['end',rows?'Bottom':'Right'],['center','Center'],['stretch','Stretch']],g.alignment,alignment=>patch(popup.key,{alignment}))));
    numeric(rows?'Height':'Width','size',1,1000000,g.alignment==='stretch',g.alignment==='stretch'?'Auto':'');
    numeric(g.alignment==='stretch'?'Margin':'Offset','margin',0,1000000,g.alignment==='center');numeric('Gutter','gutter',0,1000000);
   }
  },(_,body)=>{for(const input of body.querySelectorAll('[data-setting]'))if(!input.dataset.auto)syncInput(input,g[input.dataset.setting]);body.querySelector('.setting-color-field')?.sync();});
 }
 function renderLibrary(){if(!library.open)return;const style=linked();library.update(String(c.shape.guide_style)+':'+JSON.stringify(c.api?.styles.map(s=>[s.id,s.name])),(head,body)=>{
  head.append(element('span','','Layout guide styles'));
  const visibility=element('button','setting-text-button',c.shown?'Hide all guides · Shift G':'Show all guides · Shift G');visibility.dataset.globalGuides='true';visibility.onclick=()=>c.toggle();body.append(visibility);
  if(!c.api)return;
  body.append(choose('Layout guide style',[[0,'Custom guides (no style)'],...c.api.styles.map(s=>[s.id,s.name])],c.shape.guide_style??0,id=>c.api.apply(Number(id))));
  const name=element('input');name.type='text';name.maxLength=128;name.required=true;name.placeholder='Guide style name';name.setAttribute('aria-label','Guide style name');name.value=style?.name??'';body.append(name);
  const button=(label,fn)=>{const b=element('button','setting-text-button',label);b.onclick=fn;body.append(b);};
  const named=fn=>{if(name.value.trim())fn(name.value.trim());else{name.setCustomValidity('Enter a style name');name.reportValidity();}};name.oninput=()=>name.setCustomValidity('');
  button('Save as new guide style',()=>named(value=>c.api.save({id:0,name:value,grids:grids()},c.shape.id)));
  if(style){body.append(element('p','setting-note','Editing these guides updates every frame linked to this style.'));button('Rename guide style',()=>named(value=>c.api.save({...linked(),name:value},0)));button('Detach guide style',()=>c.api.apply(0));button('Delete guide style',()=>c.api.remove(linked().id));}
 },(_,body)=>{body.querySelector('[data-global-guides]').textContent=c.shown?'Hide all guides · Shift G':'Show all guides · Shift G';});}
 c.update=(shape,change,shown,toggle,api)=>{
  if(c.shape?.id!==shape?.id){popup.close();library.close();c.pending=null;list.replaceChildren();c.rows.clear();}Object.assign(c,{shape,change,shown,toggle,api});host.hidden=shape?.kind!=='frame';if(host.hidden){popup.close();library.close();return;}
  const all=grids();add.disabled=all.length>=8;for(const [index,row] of c.rows)if(!all[index]){row.remove();c.rows.delete(index);if(popup.key===index)popup.close();}
  all.forEach((g,index)=>{let row=c.rows.get(index);if(!row){row=element('div','setting-item guide-item');row.dataset.guide=String(index);row.setAttribute('role','group');const edit=action('Layout guide '+(index+1)+' settings',g.kind,()=>popup.key===index&&popup.open?popup.close(true):open(index));edit.setAttribute('aria-haspopup','dialog');edit.setAttribute('aria-expanded','false');const type=choose('Guide '+(index+1)+' type',kinds,g.kind,kind=>patch(index,{kind}));const eye=action('','eye',()=>patch(index,{visible:!grids()[index].visible})),remove=action('Remove layout guide '+(index+1),'minus',()=>{popup.close();commit(grids().filter((_,i)=>i!==index));});row.append(edit,type,eye,remove);row.controls={edit,type,eye};c.rows.set(index,row);}
   const {edit,type,eye}=row.controls;edit.innerHTML=settingIcon(g.kind);type.value=g.kind;for(const option of type.options)option.label=option.value===g.kind?guideLabel(g):kinds.find(([kind])=>kind===option.value)[1];eye.innerHTML=settingIcon(g.visible?'eye':'hidden');eye.title=(g.visible?'Hide ':'Show ')+'guide '+(index+1);eye.setAttribute('aria-label',eye.title);eye.setAttribute('aria-pressed',String(g.visible));row.classList.toggle('setting-disabled',!g.visible);row.setAttribute('aria-label','Layout guide '+(index+1));if(list.children[index]!==row)list.insertBefore(row,list.children[index]??null);
  });if(c.pending!=null&&c.rows.has(c.pending)){const index=c.pending,id=shape.id;c.pending=null;queueMicrotask(()=>{if(c.shape?.id===id)open(index);});}if(popup.open){popup.anchor(c.rows.get(popup.key));renderPopup();}renderLibrary();
 };
 return c;
}
export function renderGuideControls(host,shape,change,shown,toggle,stylesApi){let c=controllers.get(host);if(!c){c=create(host);controllers.set(host,c);}c.update(shape,change,shown,toggle,stylesApi);}
