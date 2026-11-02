import {editorDOM} from './editor-dom.js';
import {renderSegmentedInspector} from './segmented-control.js';
import {passwordConfig} from './password-control.js';
import {numberConfig} from './number-control.js';
import {fileConfig} from './file-control.js';
import {textareaConfig} from './textarea-control.js';
import {calendarConfig} from './calendar-control.js';
import {renderDropdownInspector} from './dropdown-inspector.js';
import {renderControlParts} from './control-parts.js';
import {icon,iconWeights,iconPaths} from './icons.js';
import {disclosureButton} from './inspector-disclosure.js';
import {showContextMenu} from './context-menu.js';
import {controlTypes,controlStates,controlPreviewStates,newControl,supportsReadonly,parseControlStates} from './controls.js';
const make=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
export function installControlInspector({current,document:doc,change,redraw,preview,selectChild,resetShared}){
 const section=make('section');section.id='control-inspector';section.className='property-section';
 editorDOM.querySelector('#properties').prepend(section);
 let signature='',lastId=null,state='default',part='input',showOverrides=false,extraStates=[];
 const render=()=>{
  const shape=current(),component=shape?.component;
  const eligible=shape?.control&&!component||component&&(component?.type==='master'||component.source===component.master);
  section.hidden=!eligible;if(!eligible)return;
  if(lastId!==shape.id){if(lastId!==null)controlPreviewStates.delete(lastId);lastId=shape.id;state='default';extraStates=[];showOverrides=false;signature='';}
  const key=JSON.stringify([shape.id,shape.control,shape.control_state,shape.typography,doc().shapes.filter(s=>s.parent_id===shape.id).map(s=>[s.id,s.name]),shape.variable_bindings,doc().variables]);if(key===signature)return;signature=key;
  section.replaceChildren(make('h3','Control'));
  let group=make('div');group.className='control-fields';section.append(group);
  const newGroup=title=>{group=make('div');group.className='control-fields control-group';const heading=make('h4',title);group.append(heading);section.append(group);return group;};
  const field=(title,node)=>{const label=make('label');label.className='control-field';label.append(make('span',title),node);group.append(label);return node;};
  const type=make('select');type.setAttribute('aria-label','Component control type');
  for(const kind of ['',...controlTypes]){const option=make('option',kind?kind==='button'?'Button':kind==='switch'?'Switch':kind==='checkbox'?'Checkbox':kind==='radio'?'Radio':kind==='segmented'?'Segmented control':kind==='password'?'Password field':kind==='number'?'Number input':kind==='file'?'File upload':kind==='date'?'Date picker':kind==='textarea'?'Text area':kind==='select'?'Dropdown':`Input · ${kind}`:'No native control');option.value=kind;type.append(option);}type.value=shape.control?.kind??'';if(component?.type!=='instance')field('HTML control',type);
  const labelSource=()=>{const shapes=doc().shapes;return component?.type==='master'&&shape.control?.kind==='button'?shapes.find(s=>{if(s.kind!=='text'||s.hidden)return false;let parent=s.parent_id;while(parent){if(parent===shape.id)return true;parent=shapes.find(p=>p.id===parent)?.parent_id;}return false;}):null;};
  const save=patch=>{const source=labelSource();if(source&&patch&&Object.keys(patch).length===1&&'label' in patch){change({...source,text:patch.label});return;}const fresh=doc().shapes.find(s=>s.id===shape.id);if(fresh)change({...fresh,variable_bindings:Object.fromEntries(Object.entries(fresh.variable_bindings??{}).filter(([path])=>!Object.keys(patch??{}).some(key=>path==='control.'+key))),control:patch===null?null:{...fresh.control,...patch}});};
  type.onchange=()=>{controlPreviewStates.delete(shape.id);state='default';extraStates=[];const existing=doc().shapes.find(s=>s.id===shape.id)?.control;save(type.value?{...newControl(type.value,shape.name),...existing,kind:type.value,...(type.value==='select'&&!existing?.options?.length?{options:['Option 1','Option 2']}: {})}:null);};
  if(!shape.control)return;
  const c=shape.control;
  const sharedSource=c.starter_linked?doc().shapes.filter(s=>s.control?.starter_linked&&s.control.base_collection===c.base_collection&&s.component?.type!=='instance').sort((a,b)=>a.id-b.id)[0]:null;
  const inheritsShared=sharedSource&&sharedSource.id!==shape.id;
  if(sharedSource&&component?.type!=='instance'){
   const note=make('p',inheritsShared?'Shared appearance from '+sharedSource.name+'. Enable Appearance override for component-specific changes.':'This starter defines the shared appearance for this collection. Other starters inherit its settings.');note.className='control-hint';group.append(note);
   if(inheritsShared&&c.shared_overrides?.length){const reset=make('button','Reset to shared defaults');reset.type='button';reset.onclick=()=>resetShared(shape.id);group.append(reset);}
  }

  const tokenField=(title,node,key,kind)=>{
   const path='control.'+key,row=make('div');row.className='control-source-row';node.disabled=!!shape.variable_bindings?.[path];row.append(node);
   const bind=make('button');bind.type='button';bind.className='input-variable-trigger control-variable-trigger';bind.innerHTML=icon('variables');bind.setAttribute('aria-label','Apply variable to '+title);
   bind.onclick=e=>{const choices=doc().variables.values.filter(v=>v.kind===kind).map(v=>({label:v.name,run:()=>{const fresh=doc().shapes.find(s=>s.id===shape.id);change({...fresh,variable_bindings:{...fresh.variable_bindings,[path]:v.id}});}}));
    if(shape.variable_bindings?.[path])choices.push({label:'Detach variable',run:()=>save({[key]:c[key]})});
    if(!choices.length)choices.push({label:'No compatible variables',enabled:false});showContextMenu(e,choices,bind);
   };row.append(bind);return field(title,row);
  };

  const colorField=(title,value,apply,variableKey=null,wrap=null,bound=false)=>{
   const color=make('input');color.type='text';color.value=value||'';color.placeholder='Inherit';color.setAttribute('aria-label',title);color.oninput=()=>color.setCustomValidity('');
   color.onchange=()=>{const value=color.value.trim();if(value&&!/^(#[\da-f]{3}|#[\da-f]{6}|#[\da-f]{8}|transparent|currentColor)$/i.test(value)){color.setCustomValidity('Enter a hex color, or leave blank to inherit.');color.reportValidity();return;}apply(value);};
   const picker=make('input');picker.type='color';picker.value=/^#[\da-f]{6}$/i.test(value||'')?value:'#222222';picker.setAttribute('aria-label',title+' picker');picker.onchange=()=>apply(picker.value);
   if(wrap){wrap(color);picker.disabled=bound;color.after(picker);}
   else if(variableKey){tokenField(title,color,variableKey,'color');picker.disabled=!!shape.variable_bindings?.['control.'+variableKey];color.after(picker);}
   else{const row=make('div');row.className='control-source-row';row.append(color,picker);field(title,row);}
  };

  const text=(title,key,placeholder='')=>{const input=make(c.kind==='textarea'&&['value','placeholder'].includes(key)?'textarea':'input');input.setAttribute('aria-label',title);input.value=c[key]??'';input.placeholder=placeholder;input.oninput=()=>save({[key]:input.value});return field(title,input);};
  const radioOptions=(instance=false)=>{
   if(!instance){
    newGroup('Radio options');
    const options=c.options??[];
    options.forEach((value,index)=>{
     const row=make('div');row.className='control-source-row';
     const input=make('input');input.value=value;input.setAttribute('aria-label','Radio option '+(index+1));
     input.oninput=()=>input.setCustomValidity('');
     input.onchange=()=>{const label=input.value.trim();if(!label||options.some((v,i)=>i!==index&&v===label)){input.setCustomValidity('Enter a unique, nonempty option label.');input.reportValidity();return;}save({options:options.map((v,i)=>i===index?label:v),...(c.value===value?{value:label}:{})});};
     const remove=make('button');remove.type='button';remove.innerHTML=icon('minus');remove.setAttribute('aria-label','Remove radio option '+(index+1));remove.title='Remove option';remove.disabled=options.length===1;
     remove.onclick=()=>save({options:options.filter((_,i)=>i!==index),...(c.value===value?{value:'',checked:false}:{})});row.append(input,remove);group.append(row);
    });
    const add=make('button','Add option');add.type='button';add.onclick=()=>{const values=options.length?[...options]:[c.label||'Option 1'];let number=values.length+1;while(values.includes('Option '+number))number++;save({options:[...values,'Option '+number]});};group.append(add);
   }
   if(c.options?.length){const select=make('select');select.setAttribute('aria-label','Selected radio option');for(const value of ['',...c.options]){const o=make('option',value||'None');o.value=value;select.append(o);}select.value=c.value||'';select.onchange=()=>save({value:select.value});field('Selected option',select);}
  };
  const helperVisibility=()=>{
   const label=make('label');label.className='control-check';
   const input=make('input');input.type='checkbox';input.checked=!c.hide_helper;
   input.setAttribute('aria-label','Show helper message');input.onchange=()=>save({hide_helper:!input.checked});
   label.append(make('span','Show helper message'),input);group.append(label);
  };
  const stateLabels={default:c.kind==='radio'?'Unselected':c.kind==='switch'?'Off':c.kind==='checkbox'?'Unchecked':'Default',hover:'Hover',focus:'Focus',active:'Pressed / active',selected:c.kind==='radio'?'Selected':c.kind==='switch'?'On':c.kind==='checkbox'?'Checked':'Checked / selected',indeterminate:'Indeterminate',readonly:'Read only',disabled:'Disabled',required:'Required',invalid:'Validation error'};
  const allowedStates=controlStates.filter(value=>!(['segmented','switch','button','radio'].includes(c.kind)&&['indeterminate','required','invalid','readonly'].includes(value))&&!(value==='indeterminate'&&c.kind!=='checkbox')&&!(value==='readonly'&&!supportsReadonly(c.kind))&&!(value==='selected'&&!['segmented','button','checkbox','switch','radio','select'].includes(c.kind)));
  const selectedStates=()=>component?.type==='instance'?parseControlStates(shape.control_state):[state,...extraStates].filter(v=>v!=='default');
  const setStates=values=>{
   const next=[...new Set(values)].filter(v=>v!=='default'&&!(c.kind==='checkbox'&&values[0]==='indeterminate'&&v==='selected')&&!(c.kind==='checkbox'&&values[0]==='selected'&&v==='indeterminate')),value=next.join(',')||'default';
   if(component?.type==='instance'){const fresh=doc().shapes.find(s=>s.id===shape.id);controlPreviewStates.delete(shape.id);change({...fresh,control_state:value});}
   else{state=next[0]||'default';extraStates=next.slice(1);controlPreviewStates.set(shape.id,value);signature='';render();redraw();}
  };
  const stateField=()=>{
   const chooser=make('select');chooser.setAttribute('aria-label',component?.type==='instance'?'Instance state':'Control visual state');
   for(const value of allowedStates){const option=make('option',stateLabels[value]);option.value=value;chooser.append(option);}
   chooser.value=selectedStates()[0]||'default';chooser.onchange=()=>setStates(chooser.value==='default'?[]:[chooser.value,...selectedStates().slice(1).filter(v=>v!==chooser.value)]);field('State',chooser);
   const combine=make('button','Combine states');combine.type='button';combine.setAttribute('aria-label','Combine control states');
   combine.onclick=e=>showContextMenu(e,allowedStates.filter(v=>v!=='default'&&v!==selectedStates()[0]).map(value=>({label:(selectedStates().includes(value)?'✓ ':'')+stateLabels[value],run:()=>setStates(selectedStates().includes(value)?selectedStates().filter(v=>v!==value):[...selectedStates(),value])})),combine);group.append(combine);
   if(selectedStates().length>1){const summary=make('p',selectedStates().map(v=>stateLabels[v]).join(' + '));summary.className='control-hint';summary.setAttribute('role','status');group.append(summary);}
  };
  if(component?.type==='instance'){
   text('Label','label');
   stateField();
   if(c.kind==='radio'){text('Radio group','name');if(c.options?.length)radioOptions(true);else text('Value','value');}
   if(c.kind==='segmented')renderSegmentedInspector({c,save,field,newGroup,make,instance:true});
   if(c.kind==='select')renderDropdownInspector({id:shape.id,c,save,field,newGroup,make,instance:true});
   if(supportsReadonly(c.kind)||['select','file'].includes(c.kind)){
    if(!['select','file'].includes(c.kind)){text('Value','value');text('Placeholder','placeholder');}helperVisibility();if(!c.hide_helper)text('Helper message','helper_message');if(selectedStates().includes('invalid'))text('Validation message','validation_message');
   }
   const hint=make('p','State appearance is inherited from the main component.');hint.className='control-hint';section.append(hint);
   const run=make('button','Try native control');run.className='control-preview';run.onclick=preview;section.append(run);return;
  }
  text((supportsReadonly(c.kind)||['select','file'].includes(c.kind)||['checkbox','switch','button','radio'].includes(c.kind))?'Label':'Accessible label','label');
  if(['checkbox','switch','radio'].includes(c.kind)){
   const position=make('select');position.setAttribute('aria-label','Label position');
   for(const [value,title] of [['right','Right of control'],['left','Left of control']]){const option=make('option',title);option.value=value;position.append(option);}
   position.value=c.label_position==='left'?'left':'right';position.onchange=()=>save({label_position:position.value});field('Label position',position);
  }
  stateField();
  const children=doc().shapes.filter(s=>s.parent_id===shape.id);
  if(children.length){newGroup('Contents');for(const child of children){const button=make('button',child.name);button.type='button';button.className='control-content-layer';button.setAttribute('aria-label','Edit '+child.name);button.onclick=()=>selectChild?.(child.id);group.append(button);}}
  newGroup('Control properties');text(c.kind==='radio'?'Radio group':'Name','name');
  if(c.kind==='radio'){const hint=make('p','Use the same group name for mutually exclusive options and a different value for each option.');hint.className='control-hint';group.append(hint);}
  if(c.kind==='segmented')renderSegmentedInspector({c,save,field,newGroup,make});
  if(c.kind==='radio')radioOptions();
  if(c.kind==='textarea'){
   newGroup('Text area');const cfg=textareaConfig(c),set=patch=>save({textarea:{...cfg,...patch}});
   const rows=make('input');rows.type='number';rows.min=1;rows.max=30;rows.step=1;rows.value=cfg.rows;rows.setAttribute('aria-label','Visible rows');rows.onchange=()=>{if(rows.reportValidity())set({rows:Number(rows.value)});};field('Visible rows',rows);
   const resize=make('select');resize.setAttribute('aria-label','Text area resizing');for(const [value,label] of [['none','None'],['vertical','Vertical'],['horizontal','Horizontal'],['both','Both directions']]){const option=make('option',label);option.value=value;resize.append(option);}resize.value=cfg.resize;resize.onchange=()=>set({resize:resize.value});field('Allow resizing',resize);
   const count=make('input');count.type='checkbox';count.checked=cfg.count;count.setAttribute('aria-label','Show character count');count.onchange=()=>set({count:count.checked});const row=make('label');row.className='control-check';row.append(make('span','Show character count'),count);group.append(row);
  }

  if(!['segmented','file','select'].includes(c.kind)&&!(c.kind==='radio'&&c.options?.length))text(c.kind==='select'?'Selected option':'Value','value');
  if(supportsReadonly(c.kind)||['select','file'].includes(c.kind)){if(!['select','file'].includes(c.kind))text('Placeholder','placeholder');helperVisibility();if(!c.hide_helper)text('Helper message','helper_message');if(selectedStates().includes('invalid'))text('Validation message','validation_message');}
  if(supportsReadonly(c.kind)||c.kind==='button'){
   newGroup(c.kind==='button'?'Button icons':'Input icons');
   for(const side of ['left','right']){
    const key=side+'_adornment',title=side==='left'?'Left':'Right';
    const a={enabled:false,outside:false,icon:'',text:side==='left'?'$':'%',...c[key]};
    const set=patch=>save({[key]:{...a,...patch}});
    const bindField=(label,node,property,kind)=>{
     const path='control.'+key+'.'+property,row=make('div');row.className='control-source-row';node.disabled=!!shape.variable_bindings?.[path];row.append(node);
     const bind=make('button');bind.type='button';bind.className='input-variable-trigger control-variable-trigger';bind.innerHTML=icon('variables');bind.setAttribute('aria-label','Apply variable to '+label);
     bind.onclick=e=>{const choices=doc().variables.values.filter(v=>v.kind===kind).map(v=>({label:v.name,run:()=>{const fresh=doc().shapes.find(s=>s.id===shape.id);change({...fresh,variable_bindings:{...fresh.variable_bindings,[path]:v.id}});}}));
      if(shape.variable_bindings?.[path])choices.push({label:'Detach variable and inherit',run:()=>{const fresh=structuredClone(doc().shapes.find(s=>s.id===shape.id));delete fresh.variable_bindings[path];fresh.control[key][property]=kind==='color'?'':null;change(fresh);}});
      if(!choices.length)choices.push({label:'No compatible variables',enabled:false});showContextMenu(e,choices,bind);
     };row.append(bind);field(label,row);
    };
    const toggle=make('input');toggle.type='checkbox';toggle.checked=a.enabled;toggle.setAttribute('aria-label','Show '+side+' icon');toggle.onchange=()=>set({enabled:toggle.checked,text:a.text||(side==='left'?'$':'%'),...(c.kind==='button'&&!a.icon&&!a.text?{icon:side==='left'?'plus':'arrow-right'}:{})});
    const row=make('label');row.className='control-check';row.append(make('span','Show '+side+' icon'),toggle);group.append(row);
    if(!a.enabled)continue;
    const content=make('select');content.setAttribute('aria-label',title+' icon content');
    for(const [value,label] of [['text','Text or symbol'],['icon','Library icon']]){const o=make('option',label);o.value=value;content.append(o);}
    content.value=a.icon?'icon':'text';content.onchange=()=>set({icon:content.value==='icon'?'asterisk':''});field(title+' content',content);
    if(a.icon){const picker=make('select');picker.setAttribute('aria-label',title+' library icon');for(const name of Object.keys(iconPaths).sort()){const o=make('option',name.replaceAll('-',' '));o.value=name;picker.append(o);}picker.value=a.icon;picker.onchange=()=>set({icon:picker.value});field(title+' icon',picker);}
    else{const input=make('input');input.value=a.text;input.setAttribute('aria-label',title+' symbol');input.onchange=()=>set({text:input.value});field(title+' symbol',input);}
    const placement=make('select');placement.setAttribute('aria-label',title+' icon placement');for(const [value,label] of [['inside','Inside input'],['outside','Outside input']]){const o=make('option',label);o.value=value;placement.append(o);}placement.value=a.outside?'outside':'inside';placement.onchange=()=>set({outside:placement.value==='outside'});if(c.kind!=='button')field(title+' placement',placement);
    colorField(title+' icon color',a.color,value=>set({color:value}),null,node=>bindField(title+' icon color',node,'color','color'),!!shape.variable_bindings?.['control.'+key+'.color']);
    for(const [property,label,placeholder,min,max] of [['size','Size','20',8,128],['gap','Spacing','8',0,64],['offset','Vertical offset','0',-128,128]]){
     const input=make('input');input.type='number';input.min=min;input.max=max;input.value=a[property]??'';input.placeholder=placeholder;input.setAttribute('aria-label',title+' icon '+label.toLowerCase());input.onchange=()=>{const value=input.value===''?null:Number(input.value);if(value!==null&&(!Number.isFinite(value)||value<min||value>max)){input.reportValidity();return;}set({[property]:value});};bindField(title+' '+label.toLowerCase(),input,property,'number');
    }
    if(a.icon){const weight=make('select');weight.setAttribute('aria-label',title+' icon weight');for(const [name,value] of [['Inherit',''],...Object.entries(iconWeights)]){const option=make('option',name[0].toUpperCase()+name.slice(1));option.value=String(value);weight.append(option);}if(a.weight!=null&&!Object.values(iconWeights).includes(a.weight)){const option=make('option','Custom');option.value=a.weight;weight.append(option);}weight.value=a.weight==null?'':String(a.weight);weight.onchange=()=>set({weight:weight.value===''?null:Number(weight.value)});bindField(title+' weight',weight,'weight','number');}

   }
  }
  if(supportsReadonly(c.kind)||['select','file'].includes(c.kind)){
   newGroup('Validation rules');
   const requirement=make('select');requirement.setAttribute('aria-label','Field requirement');for(const [value,label] of [['false','Optional'],['true','Required']]){const o=make('option',label);o.value=value;requirement.append(o);}requirement.value=String(!!c.required);requirement.onchange=()=>save({required:requirement.value==='true'});field('Requirement',requirement);
   const trigger=make('select');trigger.setAttribute('aria-label','Validate on');for(const [value,label] of [['blur','Leaving the field'],['input','While typing'],['submit','Form submission'],['none','Off']]){const o=make('option',label);o.value=value;trigger.append(o);}trigger.value=c.validation_trigger||'blur';trigger.onchange=()=>save({validation_trigger:trigger.value});if(c.kind!=='file')field('Validate on',trigger);
   if(trigger.value!=='none'){
    if(['text','password','email','tel','url','search','textarea'].includes(c.kind)){
     for(const [key,label] of [['min_length','Minimum length'],['max_length','Maximum length']]){const input=make('input');input.type='number';input.min=0;input.step=1;input.value=c[key]??'';input.placeholder='None';input.setAttribute('aria-label',label);input.onchange=()=>{const value=input.value===''?null:Number(input.value);if(value!==null&&(!Number.isInteger(value)||value<0||value>100000)){input.reportValidity();return;}save({[key]:value});};field(label,input);}
     if(c.kind!=='textarea'){const pattern=make('input');pattern.value=c.pattern||'';pattern.placeholder='e.g. [A-Z]{3}';pattern.setAttribute('aria-label','Validation pattern');pattern.onchange=()=>{try{if(pattern.value)new RegExp(pattern.value,'v');pattern.setCustomValidity('');save({pattern:pattern.value});}catch{pattern.setCustomValidity('Enter a valid regular expression.');pattern.reportValidity();}};field('Pattern',pattern);}
    }
    const hint=make('p',c.kind==='file'?'File type, size, and count limits are checked when files are selected.':'The input type also validates email addresses, URLs, dates, and numeric limits. Set the error message in the Validation error state.');hint.className='control-hint';group.append(hint);
   }
  }
  const behavior=['button','file','email','number','range','date','datetime-local','month','week','time','image'].includes(c.kind)?newGroup('Control options'):group;
  const checkbox=(title,key)=>{const input=make('input');input.type='checkbox';input.checked=!!c[key];input.onchange=()=>save({[key]:input.checked});const label=make('label');label.className='control-check';label.append(make('span',title),input);behavior.append(label);};
  if(c.kind==='button')checkbox('Toggle button','toggle');
  if((supportsReadonly(c.kind)||['select','file'].includes(c.kind))&&selectedStates().includes('required')&&(!inheritsShared||showOverrides)){
   newGroup('Required indicator');
   const marker=make('select');marker.setAttribute('aria-label','Required indicator');
   for(const [value,label] of [['asterisk','Asterisk (*)'],['star','Star (★)'],['dot','Dot (•)'],['text','Required text'],['icon-asterisk','Asterisk icon'],['icon-star','Star icon'],['icon-plus','Plus icon'],['svg','Custom SVG'],['none','None']]){const o=make('option',label);o.value=value;marker.append(o);}
   marker.value=c.required_icon||'asterisk';marker.onchange=()=>save({required_icon:marker.value});tokenField('Required indicator',marker,'required_icon','string');
   if(c.required_icon==='svg'){
    const source=make('textarea');source.rows=4;source.placeholder='<svg viewBox="0 0 24 24">…</svg>';source.setAttribute('aria-label','Required SVG');source.value=c.required_svg||'';
    const applySvg=raw=>{
     if(raw.length>100000)throw Error('Use an SVG smaller than 100 KB.');
     if(raw.trim()){const xml=new DOMParser().parseFromString(raw,'image/svg+xml');if(xml.querySelector('parsererror')||xml.documentElement.localName!=='svg')throw Error('Enter a valid SVG image.');}
     source.setCustomValidity('');save({required_svg:raw});
    };
    source.oninput=()=>source.setCustomValidity('');source.onchange=()=>{try{applySvg(source.value);}catch(error){source.setCustomValidity(error.message);source.reportValidity();}};tokenField('SVG markup',source,'required_svg','string');
    const upload=make('input');upload.type='file';upload.accept='.svg,image/svg+xml';upload.setAttribute('aria-label','Upload required SVG');
    upload.onchange=async()=>{const file=upload.files?.[0];if(!file)return;try{if(file.size>100000)throw Error('Use an SVG smaller than 100 KB.');applySvg(await file.text());}catch(error){source.setCustomValidity(error.message);source.reportValidity();}};field('Upload SVG',upload);
   }
   if(c.required_icon!=='none'){
    colorField('Required icon color',c.required_icon_color,value=>save({required_icon_color:value}),'required_icon_color');

    const offset=make('input');offset.type='number';offset.min='-128';offset.max='128';offset.step='.5';offset.value=c.required_icon_offset??0;offset.setAttribute('aria-label','Required icon vertical offset');offset.title='Pixels: negative moves up, positive moves down.';
    offset.onchange=()=>{const value=Number(offset.value);if(Number.isFinite(value)&&value>=-128&&value<=128)save({required_icon_offset:value});};tokenField('Vertical offset',offset,'required_icon_offset','number');
    const hint=make('p','Negative moves up; positive moves down.');hint.className='control-hint';group.append(hint);
   }
   if(c.required_icon?.startsWith('icon-')){
    const weight=make('select'),currentWeight=c.required_icon_weight||iconWeights.regular;weight.setAttribute('aria-label','Required icon weight');for(const [name,value] of Object.entries(iconWeights)){const option=make('option',name[0].toUpperCase()+name.slice(1));option.value=value;weight.append(option);}if(!Object.values(iconWeights).includes(currentWeight)){const option=make('option','Custom (existing)');option.value=currentWeight;option.disabled=true;weight.append(option);}weight.value=String(currentWeight);weight.onchange=()=>save({required_icon_weight:Number(weight.value)});tokenField('Icon weight',weight,'required_icon_weight','number');
   }
   if(c.required_icon==='svg'||c.required_icon?.startsWith('icon-')){
    const size=make('input');size.type='number';size.min='1';size.max='128';size.value=c.required_icon_size||14;size.setAttribute('aria-label','Required icon size');size.onchange=()=>{const value=Number(size.value);if(value>=1&&value<=128)save({required_icon_size:value});};tokenField('Icon size',size,'required_icon_size','number');
   }
  }
  if(['file','email'].includes(c.kind))checkbox('Multiple','multiple');
  if(['number','range','date','datetime-local','month','week','time'].includes(c.kind)){text('Minimum','min');text('Maximum','max');text('Step','step');}
  if(c.kind==='password'){
   newGroup('Password field');const cfg=passwordConfig(c),set=patch=>save({password:{...cfg,...patch}});
   for(const [key,title] of [['toggle','Show visibility toggle'],['strength','Show strength estimate'],['requirements','Show requirements'],['uppercase','Require uppercase letter'],['lowercase','Require lowercase letter'],['digit','Require number'],['symbol','Require symbol']]){const input=make('input');input.type='checkbox';input.checked=cfg[key];input.setAttribute('aria-label',title);input.onchange=()=>set({[key]:input.checked});const row=make('label');row.className='control-check';row.append(make('span',title),input);group.append(row);}
   const autocomplete=make('select');autocomplete.setAttribute('aria-label','Password autofill');for(const [value,title] of [['new-password','New password'],['current-password','Current password'],['off','Off']]){const option=make('option',title);option.value=value;autocomplete.append(option);}autocomplete.value=cfg.autocomplete;autocomplete.onchange=()=>set({autocomplete:autocomplete.value});field('Autofill',autocomplete);
   const hint=make('p','The strength estimate uses length and character variety; it does not check breached passwords. Use Minimum length above to set the length requirement.');hint.className='control-hint';group.append(hint);
  }
  if(c.kind==='number'){
   newGroup('Number input');const cfg=numberConfig(c),set=patch=>save({number:{...cfg,...patch}});
   const check=(key,title)=>{const input=make('input');input.type='checkbox';input.checked=cfg[key];input.setAttribute('aria-label',title);input.onchange=()=>set({[key]:input.checked});const label=make('label');label.className='control-check';label.append(make('span',title),input);group.append(label);};
   check('buttons','Show stepper buttons');
   const format=make('select');format.setAttribute('aria-label','Number format');for(const [value,title] of [['plain','Plain number'],['decimal','Decimal'],['currency','Currency'],['percent','Percentage']]){const o=make('option',title);o.value=value;format.append(o);}format.value=cfg.format;format.onchange=()=>set({format:format.value});field('Format',format);
   if(cfg.format!=='plain'){
    const locale=make('select');locale.setAttribute('aria-label','Number locale');for(const [value,title] of [['en-US','English (US)'],['en-GB','English (UK)'],['de-DE','German'],['fr-FR','French'],['ja-JP','Japanese']]){const o=make('option',title);o.value=value;locale.append(o);}locale.value=cfg.locale;locale.onchange=()=>set({locale:locale.value});field('Locale',locale);
    if(cfg.format==='currency'){const currency=make('select');currency.setAttribute('aria-label','Currency');for(const value of ['USD','EUR','GBP','CAD','AUD','JPY','INR']){const o=make('option',value);o.value=value;currency.append(o);}currency.value=cfg.currency;currency.onchange=()=>set({currency:currency.value});field('Currency',currency);}
    const decimals=make('input');decimals.type='number';decimals.min=0;decimals.max=10;decimals.step=1;decimals.value=cfg.decimals??'';decimals.placeholder='Automatic';decimals.setAttribute('aria-label','Decimal places');decimals.onchange=()=>{if(decimals.reportValidity())set({decimals:decimals.value===''?null:Number(decimals.value)});};field('Decimal places',decimals);check('grouping','Group thousands');
    const hint=make('p','Formatting applies when the field is not focused. The underlying numeric value is preserved.'+(cfg.format==='percent'?' A value of 0.25 displays as 25%.':''));hint.className='control-hint';group.append(hint);
   }
  }
  if(c.kind==='file'){
   text('Accepted file types','accept','.pdf, image/*');newGroup('File upload');const cfg=fileConfig(c),set=patch=>save({upload:{...cfg,...patch}});
   const button=make('input');button.value=cfg.button;button.setAttribute('aria-label','Choose files label');button.onchange=()=>set({button:button.value});field('Button label',button);
   for(const [key,title] of [['drop','Allow drag and drop'],['list','Show file list']]){const input=make('input');input.type='checkbox';input.checked=cfg[key];input.setAttribute('aria-label',title);input.onchange=()=>set({[key]:input.checked});const label=make('label');label.className='control-check';label.append(make('span',title),input);group.append(label);}
   for(const [key,title] of [['max_size','Maximum file size (MB)'],...(c.multiple?[['max_files','Maximum files']]:[])]){const input=make('input');input.type='number';input.min=0;input.step=key==='max_files'?1:.1;input.value=cfg[key]||'';input.placeholder='Unlimited';input.setAttribute('aria-label',title);input.onchange=()=>{if(input.reportValidity())set({[key]:Number(input.value)});};field(title,input);}
   const hint=make('p','Files are selected locally. Connect an upload handler in Development to send them to your server.');hint.className='control-hint';group.append(hint);
  }
  if(c.kind==='image')text('Image URL','src');
  if(c.kind==='date'){
   const cfg=calendarConfig(c),set=patch=>save({calendar:{...cfg,...patch}});const section=newGroup('Calendar panel'),heading=section.querySelector('h4');heading.textContent='';const label=make('label');label.className='control-check control-check-heading';const toggle=make('input');toggle.type='checkbox';toggle.checked=cfg.preview_open;toggle.setAttribute('aria-label','Show calendar panel');toggle.onchange=()=>set({preview_open:toggle.checked});label.append(make('span','Calendar panel'),toggle);heading.append(label);
   if(cfg.preview_open){
    const week=make('select');week.setAttribute('aria-label','First day of week');for(const [v,title] of [[0,'Sunday'],[1,'Monday']]){const o=make('option',title);o.value=v;week.append(o);}week.value=cfg.week_start;week.onchange=()=>set({week_start:Number(week.value)});field('Week starts',week);
    const width=make('input');width.type='number';width.min=240;width.max=600;width.value=cfg.width;width.setAttribute('aria-label','Calendar width');width.onchange=()=>{if(width.checkValidity())set({width:Number(width.value)});else width.reportValidity();};field('Panel width',width);
    for(const [key,title] of [['today','Show Today'],['clear','Show Clear']]){const row=make('label');row.className='control-check';const box=make('input');box.type='checkbox';box.checked=cfg[key];box.onchange=()=>set({[key]:box.checked});row.append(make('span',title),box);group.append(row);}
   }
  }
  if(c.kind==='select')renderDropdownInspector({id:shape.id,c,save,field,newGroup,make});
  const partsGroup=newGroup('');
  const overrideHeading=partsGroup.querySelector('h4');
  const override=disclosureButton('Appearance override',expanded=>{showOverrides=expanded;signature='';render();},showOverrides);
  overrideHeading.append(override);
  if(showOverrides){
   const note=make('p','Changes here override the shared variables for this control only. Blank values inherit. Collapsing this section keeps your overrides.');note.className='control-hint';partsGroup.append(note);
   renderControlParts({host:partsGroup,shape,state,part,onPart:value=>{part=value;signature='';render();},read:whole=>whole?doc():doc().shapes.find(s=>s.id===shape.id),change:next=>{signature='';change(next);}});
  }
  const run=make('button','Try native control');run.className='control-preview';run.onclick=preview;section.append(run);
  const hint=make('p','Preview native interactions and keyboard behavior.');hint.className='control-hint';section.append(hint);
 };
 return render;
}
