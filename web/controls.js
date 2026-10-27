import {segmentedMarkup,segmentedCss} from './segmented-control.js';
import {passwordConfig,passwordMarkup,passwordCss} from './password-control.js';
import {numberMarkup,numberCss} from './number-control.js';
import {fileMarkup,fileCss} from './file-control.js';
import {textareaConfig} from './textarea-control.js';
import {calendarMarkup,calendarCss} from './calendar-control.js';
import {hasHugControlHeight} from './control-sizing.js';
import {dropdownDefaults,dropdownMarkup,dropdownCss} from './dropdown-control.js';
import {icon,iconPaths} from './icons.js';
import {controlPartsCss,partDeclarations} from './control-parts.js';
export const controlTypes=['segmented','button','checkbox','switch','radio','text','password','email','number','tel','url','search','date','datetime-local','month','week','time','range','color','file','hidden','image','submit','reset','select','textarea'];
export const controlStates=['default','required','hover','focus','active','selected','indeterminate','readonly','invalid','disabled'];
export const controlPreviewStates=new Map();
export const parseControlStates=value=>String(value||'default').split(',').filter(s=>controlStates.includes(s)&&s!=='default');
export function controlWithStates(control,value){
 const states=new Set(parseControlStates(value)),result={...control};
 for(const [flag,state] of Object.entries({disabled:'disabled',readonly:'readonly',checked:'selected',required:'required',invalid:'invalid'}))result[flag]=!!control[flag]||states.has(state);
 if(control.kind==='checkbox'){result.indeterminate=states.has('indeterminate');if(result.indeterminate)result.checked=false;}
 return result;
}
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const readOnlyTypes=['text','password','email','number','tel','url','search','date','datetime-local','month','week','time','textarea'];
export const supportsReadonly=kind=>readOnlyTypes.includes(kind);
export function newControl(kind,label){return {kind,label,label_position:'right',dropdown:kind==='select'?{...dropdownDefaults}:null,validation_trigger:'blur',pattern:'',min_length:kind==='password'?8:null,max_length:null,toggle:false,name:'',value:'',placeholder:'',helper_message:'',hide_helper:false,validation_message:'',invalid:false,disabled:false,readonly:false,checked:false,required:false,required_icon:'asterisk',required_svg:'',required_icon_size:14,required_icon_weight:1.5,required_icon_offset:0,required_icon_color:'',multiple:false,min:'',max:'',step:'',accept:'',src:'',options:kind==='segmented'?['Option 1','Option 2','Option 3']:kind==='select'?['Option 1','Option 2']:[],states:{}};}
const radioOptionControl=(c,id,label,index)=>({...c,options:[],label,name:c.name||'px-radio-group-'+id,value:label,checked:c.value===label||(!c.value&&c.checked&&index===0),width_sizing:'fixed'});
export function controlMarkup(control,id){
 if(control?.kind==='segmented')return segmentedMarkup(control,id);
 if(control?.kind==='radio'&&control.options?.length)return '<div class="px-radio-options" role="radiogroup" aria-label="'+esc(control.label||'Options')+'">'+control.options.map((label,i)=>'<div class="px-radio-option px-node-'+id+'-option-'+i+'">'+controlMarkup(radioOptionControl(control,id,label,i),id+'-option-'+i)+'</div>').join('')+'</div>';
 const markup=bareControlMarkup(control,id);
 if(['checkbox','switch','radio'].includes(control?.kind))return markup.replace(' class=', ' id="px-check-'+id+'" class=')+'<label class="px-control-label" for="px-check-'+id+'">'+esc(control.label)+'</label>';
 if(!control||!(supportsReadonly(control.kind)||['select','file'].includes(control.kind)))return markup;
 const c=control,base='px-field-'+id;
 const descriptions=[c.kind==='password'&&passwordConfig(c).requirements?base+'-requirements':'',c.kind==='password'&&passwordConfig(c).strength?base+'-strength':'',c.kind==='textarea'&&textareaConfig(c).count?base+'-count':'',...['left','right'].filter(side=>c[side+'_adornment']?.enabled).map(side=>base+'-'+side),c.helper_message&&!c.hide_helper?base+'-help':'',c.invalid?base+'-error':''].filter(Boolean).join(' ');
 const native=markup.replace(' class=',` id="${base}" aria-invalid="${!!c.invalid}"${descriptions?` aria-describedby="${descriptions}"`:''} class=`);
 return (c.label?`<label class="px-control-label" for="${base}">${esc(c.label)}${c.required?requiredMarker(c.required_icon,c.required_svg,c.required_icon_size,c.required_icon_weight,c.required_icon_offset,c.required_icon_color):''}</label>`:'')+native+(c.kind==='password'?passwordMarkup(c,id):'')+(c.kind==='number'?numberMarkup(c,id):'')+(c.kind==='date'?calendarMarkup(c,id):'')+controlAdornmentMarkup(c,base)+`<div class="px-control-messages">${c.helper_message&&!c.hide_helper?`<div id="${base}-help" class="px-control-help">${esc(c.helper_message)}</div>`:''}<div id="${base}-error" class="px-control-error" role="alert"${c.invalid?'':' hidden="hidden"'}>${c.invalid?esc(c.validation_message||'Please check this value.'):''}</div>${c.kind==='textarea'&&textareaConfig(c).count?`<div id="${base}-count" class="px-character-count">${String(c.value||'').length}${Number.isInteger(c.max_length)?' / '+c.max_length:''} characters</div>`:''}</div>`;
}
function controlAdornmentMarkup(control,base){
 return ['left','right'].map(side=>{
  const a=control[side+'_adornment'];if(!a?.enabled)return '';
  const isIcon=Object.hasOwn(iconPaths,a.icon??'');
  const weight=Number.isFinite(a.weight)?Math.max(.5,Math.min(4,a.weight)):1.5;
  const content=isIcon?icon(a.icon).replace('stroke-width="1.5"','stroke-width="'+weight+'"'):esc(a.text);
  return `<span id="${base}-${side}" class="px-control-adornment px-control-adornment-${side}"${isIcon?` role="img" aria-label="${esc(a.icon.replaceAll('-',' '))}"`:''}>${content}</span>`;
 }).join('');
}
export function requiredMarker(value,svg='',size=14,weight=1.5,offset=0,color=''){
 const tint=/^(#[\da-f]{3,8}|transparent|currentColor)$/i.test(color)?color:'';
 const position=`position:relative;top:${Number.isFinite(offset)?Math.max(-128,Math.min(128,offset)):0}px;${tint?'color:'+tint+';':''}`;
 const pixels=Number.isFinite(size)&&size>0?Math.min(128,size):14;
 if(value==='svg'&&svg&&tint){const url=esc('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg));return `<span class="px-control-required" aria-hidden="true" style="${position}display:inline-block;vertical-align:middle;width:${pixels}px;height:${pixels}px;background-color:currentColor;mask:url(&quot;${url}&quot;) center/contain no-repeat;-webkit-mask:url(&quot;${url}&quot;) center/contain no-repeat"></span>`;}
 if(value==='svg')return svg?`<span class="px-control-required" aria-hidden="true" style="${position}"><img alt="" width="${pixels}" height="${pixels}" src="${esc('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg))}" style="display:inline-block;vertical-align:middle;object-fit:contain" /></span>`:'';
 if(['icon-asterisk','icon-star','icon-plus'].includes(value))return `<span class="px-control-required" aria-hidden="true" style="${position}display:inline-flex;vertical-align:middle;width:${pixels}px;height:${pixels}px">${icon(value.slice(5)).replace('stroke-width="1.5"',`stroke-width="${Number.isFinite(weight)&&weight>0?Math.min(8,weight):1.5}"`).replace('<svg ', '<svg width="100%" height="100%" ')}</span>`;
 const symbol=({asterisk:'*',star:'★',dot:'•',text:'Required',none:''})[value||'asterisk']??'*';
 return symbol?`<span class="px-control-required" aria-hidden="true" style="${position}">${symbol}</span>`:'';
}
function buttonContent(c,id){
 const adornment=side=>controlAdornmentMarkup({...c,left_adornment:side==='left'?c.left_adornment:null,right_adornment:side==='right'?c.right_adornment:null},'px-button-'+id).replace(/ role="img" aria-label="[^"]*"/g,'').replace('<span ','<span aria-hidden="true" ');
 return adornment('left')+'<span class="px-button-label">'+esc(c.label)+'</span>'+adornment('right');
}
function bareControlMarkup(control,id){
 if(!control||!controlTypes.includes(control.kind))return '';
 if(control.kind==='file')return fileMarkup(control,id);
 if(control.kind==='select'&&control.dropdown)return dropdownMarkup(control,id);
 const c=control,kind=c.kind,attr=(key,value)=>value!==''&&value!=null?` ${key}="${esc(value)}"`:'';
 let attrs=` class="px-control" data-control-id="${id}" aria-label="${esc(c.label||'Control')}"`+attr('name',c.name)+(c.disabled?' disabled="disabled"':'')+(c.readonly&&supportsReadonly(kind)?' readonly="readonly"':'')+(c.required?' required="required"':'');
 if(supportsReadonly(kind)){
  const trigger=['input','blur','submit','none'].includes(c.validation_trigger)?c.validation_trigger:'blur';
  attrs+=attr('data-validate',trigger)+attr('data-error-message',c.validation_message);
  if(c.pattern&&kind!=='textarea')attrs+=attr('pattern',c.pattern);
  for(const [property,attribute] of [['min_length','minlength'],['max_length','maxlength']])if(Number.isInteger(c[property])&&c[property]>=0)attrs+=attr(attribute,c[property]);
 }
 if(kind==='button')return `<button${attrs} type="button"${c.toggle?` data-toggle="true" aria-pressed="${c.checked?'true':'false'}"`:c.checked?' aria-pressed="true"':''}>${buttonContent(c,id)}</button>`;
 if(kind==='textarea')return `<textarea${attrs}${attr('rows',textareaConfig(c).rows)}${attr('placeholder',c.placeholder)}>${esc(c.value)}</textarea>`;
 if(kind==='select')return `<select${attrs}${attr('data-initial-value',c.value)}${c.multiple?' multiple="multiple"':''}>${(c.options??[]).map(option=>`<option value="${esc(option)}"${option===c.value?' selected="selected"':''}>${esc(option)}</option>`).join('')}</select>`;
 if(c.width_sizing==='hug'&&supportsReadonly(kind))attrs+=attr('size',Math.max(1,Array.from(c.value||c.placeholder||' ').length));
 if(kind==='password')attrs+=attr('autocomplete',passwordConfig(c).autocomplete);
 if(kind==='switch')attrs+=' role="switch"';
 attrs+=attr('type',kind==='switch'?'checkbox':kind)+attr('placeholder',c.placeholder)+attr('min',c.min)+attr('max',c.max)+attr('step',c.step);
 if(kind==='checkbox'&&c.indeterminate)attrs+=' data-indeterminate="true" aria-checked="mixed"';
 if(['checkbox','switch','radio'].includes(kind)&&c.checked)attrs+=' checked="checked"';
 if(['email','file'].includes(kind)&&c.multiple)attrs+=' multiple="multiple"';
 if(kind==='file')attrs+=attr('accept',c.accept);
 else attrs+=attr('value',c.value);
 if(kind==='image'){const src=/^(https?:|data:image\/|\/)/i.test(c.src??'')?c.src:'';attrs+=attr('src',src)+attr('alt',c.label);}
 return `<input${attrs}>`;
}
const safeColor=value=>/^(#[\da-f]{3,8}|transparent|currentColor)$/i.test(value??'')?value:'';
export function controlCss(control,id,{interactive=false,initialState='',surface={}}={}){
 if(!control||!controlTypes.includes(control.kind))return '';
 if(control.kind==='segmented')return segmentedCss(control,id,{interactive,initialState:(!interactive&&controlPreviewStates.get(id))||initialState});
 // Text areas derive their initial height from rows, not the single-line input height.
 if(['textarea','file'].includes(control.kind)){control=structuredClone(control);for(const style of Object.values(control.states??{}))if(style.parts?.input)delete style.parts.input.height;}
 if(control.kind==='radio'&&control.options?.length){
  const selected=controlWithStates(control,(!interactive&&controlPreviewStates.get(id))||initialState);
  const states=parseControlStates((!interactive&&controlPreviewStates.get(id))||initialState).filter(s=>s!=='selected').join(',');
  return `.px-node-${id}{height:max-content;min-height:0;max-height:none;background:transparent;border:0;padding:0;overflow:visible}.px-node-${id}::after{display:none}.px-node-${id}>.px-radio-options{display:flex;flex-direction:column;gap:8px}.px-node-${id} .px-radio-option{position:relative;width:100%;box-sizing:border-box}`+control.options.map((label,i)=>controlCss(radioOptionControl(selected,id,label,i),id+'-option-'+i,{interactive,initialState:states,surface})).join('');
 }
 const root=`.px-node-${id}`,native=`${root}>.px-control`,kind=control.kind;
 let css=`${root}{color:${safeColor(control.base_text_color)||'#222'}}${native}{box-sizing:border-box;position:absolute;inset:0;width:100%;height:100%;margin:0;border:0;border-radius:inherit;background:transparent;color:inherit;font:inherit;z-index:2;min-width:0;min-height:0}${native}:focus-visible{outline:2px solid #0d99ff;outline-offset:2px}${native}:disabled{cursor:not-allowed}${root}:has(>.px-control:disabled){opacity:.5}`;
 if(kind==='button')css+=`${native}{cursor:pointer}${root} [data-control-text]{visibility:hidden}`;
 if(supportsReadonly(kind)||['select','file'].includes(kind))css+=`${root}{display:flex;flex-direction:column;gap:6px;overflow:visible}${native}{position:relative;inset:auto;flex:1 1 auto;min-height:32px;height:auto;width:100%;border:1px solid #cbd5e1;border-radius:inherit;background:inherit}${root}>.px-control-label{display:block;flex:none;font-size:12px;font-weight:500;line-height:1.4;color:inherit}${root}>.px-control-messages{flex:none;font-size:12px;line-height:1.4;color:#64748b}${root}>.px-control-messages:not(:has(>:not([hidden]))){display:none}${root} .px-control-error{color:#dc2626}${native}[aria-invalid="true"]{border-color:#dc2626}`;
 if(interactive&&kind==='hidden')css+=`${root}{display:none!important}`;
 const editable=!['button','checkbox','switch','radio','hidden','image','submit','reset'].includes(kind);
 if(editable)css+=`${native}{padding:8px}${root}>.px-node,${root}>.px-paint{visibility:hidden}`;
 if(['checkbox','switch','radio'].includes(kind))css+=`${native}{appearance:auto;accent-color:currentColor;cursor:pointer}`;
 // In design mode controls are visual only: pointer and keyboard editing stays with the canvas.
 if(!interactive)css+=`${native}{pointer-events:none}`;

 // The wrapper carries placement only; all visual paint belongs to the native element.
 css+=root+'{background:transparent;border:0;border-radius:0;box-shadow:none;padding:0;opacity:1;filter:none;backdrop-filter:none}'+root+'::after{display:none}';
 css+=`${root} .px-control-required{display:inline-block;margin-left:4px;color:inherit}`;
 css+=native+'{'+Object.entries(surface).map(([k,v])=>k+':'+v).join(';')+'}';
 if(hasHugControlHeight({control})&&!['checkbox','switch','radio','button'].includes(kind))css+=root+'{height:max-content;align-items:stretch}'+native+'{position:relative;inset:auto;flex:none;height:40px}';
 if(kind==='button'){
  css+=native+'{display:flex;align-items:center;justify-content:center;gap:0;white-space:normal;overflow-wrap:anywhere}'+native+' .px-button-label{min-width:0}'+native+' .px-control-adornment{display:inline-flex;align-items:center;justify-content:center;flex:none;line-height:1;pointer-events:none}';
  if(control.starter)css+=native+'{position:relative;inset:auto;width:100%;height:auto;min-height:40px;padding:10px 16px}';
  for(const side of ['left','right']){const a=control[side+'_adornment'];if(!a?.enabled)continue;
   const size=Number.isFinite(a.size)?Math.max(8,Math.min(128,a.size)):20,gap=Number.isFinite(a.gap)?Math.max(0,Math.min(64,a.gap)):8,offset=Number.isFinite(a.offset)?Math.max(-128,Math.min(128,a.offset)):0;
   css+=native+' .px-control-adornment-'+side+'{font-size:'+size+'px;color:'+(safeColor(a.color)||'inherit')+';transform:translateY('+offset+'px);margin-'+(side==='left'?'right':'left')+':'+gap+'px}'+native+' .px-control-adornment-'+side+' svg{width:'+size+'px;height:'+size+'px}';
  }
 }
 if(kind==='date')css+=calendarCss(control,id,interactive);
 const selectors={default:root,required:`${root}:has(>.px-control[required],>.px-dropdown-native[required],>.px-file-native[required])`,invalid:`${root}:has(>.px-control[aria-invalid="true"])`,hover:`${root}:has(>.px-control:hover:not(:disabled))`,focus:`${root}:has(>.px-control:focus-visible)`,active:`${root}:has(>.px-control:active:not(:disabled))`,selected:`${root}:has(>.px-control:is(:checked,[aria-pressed="true"]))`,indeterminate:`${root}:has(>.px-control:is(:indeterminate,[data-indeterminate]))`,readonly:`${root}:has(>.px-control[readonly])`,disabled:`${root}:has(>.px-control:disabled)`};
 if(kind==='select'&&control.dropdown){css+=dropdownCss(id);if(!interactive&&control.dropdown.preview_open){const row=control.label?2:1;css+=`${root} .px-dropdown-chevron{transform:rotate(180deg)}${root}{display:grid;grid-template-columns:minmax(0,1fr);gap:6px}${root}>.px-control-label{grid-column:1;grid-row:1}${root}>.px-dropdown-trigger{grid-column:1;grid-row:${row}}${root}>.px-control-messages{grid-column:1;grid-row:${row+1}}${root}>.px-dropdown-menu{display:block;position:absolute;grid-column:1/2;grid-row:${row}/${row+1};top:calc(100% + 4px);left:0;width:${control.dropdown.menu_width||'100%'}${control.dropdown.menu_width?'px':''};max-height:${control.dropdown.menu_height||280}px;pointer-events:none;z-index:5}`;}}
 if(control.base_text_color){
  css+=root+'{color:'+safeColor(control.base_text_color)+'}'+root+' .px-control-messages,'+native+'::placeholder{color:inherit;opacity:1}';
  if(kind==='select')css+=root+' .px-dropdown-menu,'+root+' .px-dropdown-option,'+root+' .px-dropdown-category,'+root+' .px-dropdown-placeholder{color:'+safeColor(control.base_text_color)+'}';
 }
 const forced=!interactive?(controlPreviewStates.get(id)||initialState):null;
 const activeStates=new Set(parseControlStates(forced||initialState));
 for(const [flag,state] of Object.entries({required:'required',invalid:'invalid',disabled:'disabled',readonly:'readonly',checked:'selected'}))if(control[flag])activeStates.add(state);
 if(control.indeterminate)activeStates.add('indeterminate');
 if(activeStates.has('disabled'))for(const state of ['hover','focus','active'])activeStates.delete(state);
 for(const state of controlStates){
  const style=control.states?.[state];if(!style)continue;
  const selector=forced?state==='default'||activeStates.has(state)?root:null:(interactive&&['checkbox','switch','radio','button'].includes(kind)&&['selected','indeterminate','disabled'].includes(state)?selectors[state]:parseControlStates(initialState).includes(state)&&activeStates.has(state)?root:selectors[state]);if(!selector)continue;
  const declarations=[];
  if(safeColor(style.background))declarations.push('background:'+style.background);
  if(safeColor(style.color))declarations.push('color:'+style.color);
  if(Number.isFinite(style.opacity))declarations.push('opacity:'+Math.max(0,Math.min(1,style.opacity)));
  if(Number.isFinite(style.radius))declarations.push('border-radius:'+Math.max(0,style.radius)+'px');
  css+=`${selector}>.px-control{${declarations.join(';')}}`;
  if(safeColor(style.background)&&!['checkbox','switch','radio'].includes(kind))css+=`${selector}>.px-control{background:${style.background}}`;
  if(safeColor(style.border_color))css+=`${selector}>.px-control{border:1px solid ${style.border_color}}`;
  if(safeColor(style.color))css+=`${selector} [data-control-text]{color:${style.color}!important}`;
  css+=controlPartsCss(style.parts,selector);
  const inputWidth=style.parts?.input?.width;
  if(!['switch','button'].includes(kind)&&Number.isFinite(inputWidth))css+=selector+'{width:'+inputWidth+'px}';

 }
 if(kind==='switch'){
  css+=root+'{display:flex;align-items:center;justify-content:'+(control.label_position==='left'?'flex-end':'flex-start')+';gap:8px;overflow:visible;height:var(--px-switch-height,24px);min-height:var(--px-switch-height,24px);max-height:var(--px-switch-height,24px)}'+root+'>.px-control-label{order:'+(control.label_position==='left'?-1:0)+';cursor:pointer;line-height:1.4}'+native+'{position:relative;inset:auto;flex:none;appearance:none;width:44px;height:var(--px-switch-height,24px);padding:0;border:1px solid #64748b;border-radius:999px;background:#64748b;cursor:pointer}'+native+'::after{content:"";position:absolute;top:50%;left:var(--px-switch-inset,2px);width:var(--px-switch-thumb,18px);height:var(--px-switch-thumb,18px);transform:translateY(-50%);border-radius:999px;background:#fff;pointer-events:none}'+native+':checked{background:#2563eb;border-color:#2563eb}'+native+':checked::after{left:calc(100% - var(--px-switch-inset,2px) - var(--px-switch-thumb,18px))}';
  for(const state of controlStates){const style=control.states?.[state];if(!style)continue;
   const selector=forced?state==='default'||activeStates.has(state)?root:null:interactive&&['selected','disabled'].includes(state)?selectors[state]:activeStates.has(state)?root:selectors[state];if(!selector)continue;
   css+=controlPartsCss(style.parts,selector);
   for(const [value,name] of [[style.parts?.input?.height,'height'],[style.parts?.thumb?.size,'thumb'],[style.parts?.thumb?.gap,'inset']])if(Number.isFinite(value))css+=selector+'{--px-switch-'+name+':'+Math.max(0,value)+'px}';
  }
  css+='@media(forced-colors:active){'+native+'{border-color:ButtonText;background:Canvas}'+native+':checked{background:Highlight}'+native+'::after{background:ButtonText}'+native+':checked::after{background:HighlightText}}';
 }
 if(['checkbox','radio'].includes(kind)){
  css+=root+'{justify-content:'+(control.label_position==='left'?'flex-end':'flex-start')+'}';
  css+=root+'>.px-control-label{order:'+(control.label_position==='left'?-1:0)+'}';
  css+=root+'{display:flex;align-items:center;gap:8px;overflow:visible;height:var(--px-checkbox-size,20px);min-height:var(--px-checkbox-size,20px);max-height:var(--px-checkbox-size,20px)}'+native+'{position:relative;inset:auto;flex:none;appearance:none;width:var(--px-checkbox-size,20px);height:var(--px-checkbox-size,20px);padding:0;border:1px solid #475569;border-radius:4px;background:#fff;cursor:pointer}'+native+'::after{content:"";display:block;position:absolute;inset:3px;background:currentColor;clip-path:polygon(12% 44%,38% 70%,88% 16%,100% 30%,38% 94%,0 58%);opacity:0}'+native+':checked::after{opacity:1}'+native+':is(:indeterminate,[data-indeterminate])::after{opacity:1;clip-path:inset(42% 8%)}'+root+'>.px-control-label{cursor:pointer;line-height:1.4}'+native+':disabled+label{cursor:not-allowed}';
  if(kind==='radio')css+=native+'::after{background:#2563eb}';
  for(const state of controlStates){const style=control.states?.[state];if(!style)continue;const selector=forced?state==='default'||activeStates.has(state)?root:null:(interactive&&['selected','indeterminate','disabled'].includes(state)?selectors[state]:activeStates.has(state)?root:selectors[state]);if(!selector)continue;
   css+=controlPartsCss(style.parts,selector);
   if(kind==='radio'&&Number.isFinite(style.parts?.dot?.size))css+=selector+'{--px-radio-dot:'+Math.max(0,style.parts.dot.size)+'px}';
   const size=style.parts?.input?.height;if(Number.isFinite(size))css+=selector+'{--px-checkbox-size:'+size+'px}'+selector+'>.px-control{width:var(--px-checkbox-size);height:var(--px-checkbox-size)}';
  }
  if(kind==='radio')css+=native+'{border-radius:50%}'+native+'::after{inset:auto;top:50%;left:50%;transform:translate(-50%,-50%);width:var(--px-radio-dot,10px);height:var(--px-radio-dot,10px);max-width:100%;max-height:100%;border-radius:50%;clip-path:none}';
  css+='@media(forced-colors:active){'+native+'{border-color:ButtonText}'+native+'::after{background:ButtonText}}';
 }
 if(control.width_sizing==='hug'&&!['checkbox','switch','radio'].includes(kind))css+=native+'{width:auto;min-width:0}'+root+'{width:max-content}';
 if(supportsReadonly(kind)&&['left','right'].some(side=>control[side+'_adornment']?.enabled)){
  const outside=side=>control[side+'_adornment']?.enabled&&control[side+'_adornment'].outside;
  css+=`${root}{display:grid;grid-template-columns:${outside('left')?'auto':'0px'} minmax(0,1fr) ${outside('right')?'auto':'0px'};column-gap:0;row-gap:6px}${native}{grid-column:2;grid-row:2}${root}>.px-control-label{grid-column:1/-1;grid-row:1}${root}>.px-control-messages{grid-column:1/-1;grid-row:3}${root}>.px-control-adornment{grid-row:2;align-self:center;z-index:3;pointer-events:none;display:flex;align-items:center;justify-content:center;white-space:nowrap;font:inherit;line-height:1;color:inherit}${root}>.px-control-adornment svg{width:20px;height:20px}`;
  for(const side of ['left','right']){
   const a=control[side+'_adornment'];if(!a?.enabled)continue;
   const size=Number.isFinite(a.size)?Math.max(8,Math.min(128,a.size)):20,gap=Number.isFinite(a.gap)?Math.max(0,Math.min(64,a.gap)):8,offset=Number.isFinite(a.offset)?Math.max(-128,Math.min(128,a.offset)):0;
   css+=`${root}>.px-control-adornment-${side}{font-size:${size}px;transform:translateY(${offset}px);color:${safeColor(a.color)||'inherit'};grid-column:${a.outside?(side==='left'?1:3):2};justify-self:${side==='left'?'start':'end'};margin-${side==='left'?'right':'left'}:${a.outside?gap:0}px;${!a.outside?'margin-'+side+':'+gap+'px;max-width:calc(100% - '+(gap*2)+'px);overflow:hidden;':''}}`;
   css+=`${root}>.px-control-adornment-${side} svg{width:${size}px;height:${size}px}`;
   if(!a.outside)css+=`${native}{padding-${side}:${size+gap*2}px!important}`;
  }
 }
 if(hasHugControlHeight({control})&&!['checkbox','switch','radio'].includes(kind))css+=root+'{height:max-content;min-height:0;max-height:none}';
 if(kind==='number'){
  css+=numberCss(control,id,interactive);
  for(const state of controlStates){const style=control.states?.[state];if(!style)continue;const selector=forced?state==='default'||activeStates.has(state)?root:null:activeStates.has(state)?root:selectors[state];if(!selector)continue;
   const textStyle=Object.fromEntries(Object.entries(style.parts?.input??{}).filter(([key])=>['color','font_family','font_size','font_weight','line_height','letter_spacing','text_align','font_style','text_decoration'].includes(key)));
   if(style.color)textStyle.color=style.color;css+=selector+'>.px-number-format{'+partDeclarations(textStyle)+'}';
  }
 }
 if(kind==='password')css+=passwordCss(control,id,interactive);
 if(kind==='file')css+=fileCss(id);
 if(kind==='textarea')css+=`${native}{height:auto;resize:${interactive&&!control.disabled&&!control.readonly?textareaConfig(control).resize:'none'};overflow:auto;max-width:100%}${root} .px-character-count{text-align:right;font-size:12px;line-height:1.4;color:inherit}`;
 return css;
}
