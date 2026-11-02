import {editorDOM} from './editor-dom.js';
import {controlPreviewStates} from './controls.js';
import {snippets,createBehavior,validateBehavior,behaviorSource} from './behaviors.js';
import {cssExport} from './css-renderer.js';
import {exportShapes} from './export.js';
const el=(tag,text,attrs={})=>{const node=document.createElement(tag);if(text)node.textContent=text;for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);return node;};
export function installDevelopment({getDocument,getSelection,save,textLayout}){
 const panel=editorDOM.querySelector('.right-panel'),tabs=panel.querySelector('.inspector-tabs');
 const design=editorDOM.querySelector('#design-inspector'),prototype=editorDOM.querySelector('#prototype-inspector');
 const prototypeEmpty=editorDOM.querySelector('#prototype-empty');
 const dev=el('div',null,{id:'inspector-development',class:'inspector-content',role:'tabpanel',hidden:''});panel.append(dev);
 const caption=editorDOM.querySelector('#selection-caption'),zoom=tabs.querySelector('.zoom-control');
 if(zoom)panel.querySelector('.inspector-top').append(zoom);
 tabs.replaceChildren();tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Inspector mode');
 const inspect=el('div',null,{id:'inspector-inspect',class:'inspector-content',role:'tabpanel',hidden:''});panel.append(inspect);
 const hosts={design,prototype,development:dev,inspect};
 let mode='design',selected=null,timer=null,pending=null,signature='',preview=null;
 const buttons=[];
 function activate(next){flush();mode=next;const isDev=['development','inspect'].includes(mode);for(const [key,node] of Object.entries(hosts))node.hidden=key!==mode;for(const button of buttons){button.hidden=mode==='motion'?button.dataset.mode!=='motion':isDev?!['development','inspect'].includes(button.dataset.mode):!['design','prototype'].includes(button.dataset.mode);const active=button.dataset.mode===mode;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;}if(mode!=='development')stopPreview();window.dispatchEvent(new CustomEvent('inspector-mode-change',{detail:mode}));render();}
 for(const [key,label] of [['design','Design'],['prototype','Prototype'],['inspect','Inspect'],['development','Code']]){
  const button=el('button',label,{role:'tab',id:'tab-'+key,'aria-controls':hosts[key].id,'aria-selected':String(key===mode),tabindex:key===mode?'0':'-1'});button.dataset.mode=key;button.hidden=['inspect','development'].includes(key);button.onclick=()=>activate(key);
  button.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const visible=buttons.filter(b=>!b.hidden),index=visible.indexOf(button),next=event.key==='Home'?0:event.key==='End'?visible.length-1:(index+(event.key==='ArrowRight'?1:visible.length-1))%visible.length;activate(visible[next].dataset.mode);visible[next].focus();};
  buttons.push(button);tabs.append(button);hosts[key].setAttribute('aria-labelledby',button.id);
 }
 let inspectKey='';
 function renderInspect(shape){const key=JSON.stringify(shape);if(inspectKey===key)return;inspectKey=key;inspect.replaceChildren();if(!shape){inspect.append(el('p','Select a layer to inspect its dimensions, styles, and code.',{class:'development-empty'}));return;}
  const section=el('section',null,{class:'development-section'});section.append(el('h3',shape.name),el('p',`${Math.round(shape.width)} × ${Math.round(shape.height)} px · ${shape.kind}`));
  const doc=getDocument(),shapes=exportShapes(doc.shapes.filter(s=>s.page_id===doc.active_page),[shape.id],'selection');
  try{const output=cssExport(shapes,{variables:doc.variables,pageModes:doc.pages.find(p=>p.id===doc.active_page)?.variable_modes,sourceShapes:doc.shapes,textLayout});
   for(const [label,value] of [['CSS',output.css],['HTML',output.html]]){const details=el('details',null,{class:'behavior-card',...(label==='CSS'?{open:''}:{})});details.append(el('summary',label));const code=el('textarea',null,{readonly:'',rows:'12',class:'behavior-code','aria-label':label+' code',spellcheck:'false'});code.value=value;const copy=el('button','Copy '+label,{class:'wide-button'});copy.onclick=async()=>{try{await navigator.clipboard.writeText(value);copy.textContent='Copied';}catch{code.focus();code.select();copy.textContent='Select and copy the code';}};details.append(code,copy);section.append(details);}
   for(const warning of output.warnings??[])section.append(el('p',warning));
  }catch(error){section.append(el('p',error.message));}const exportButton=el('button','Export project…',{class:'wide-button'});exportButton.onclick=()=>editorDOM.getElementById('export').click();section.append(exportButton);inspect.append(section);
 }
 caption.classList.add('development-caption');tabs.after(caption);
 function flush(){clearTimeout(timer);timer=null;const draft=pending;pending=null;if(draft){const shape=getDocument().shapes.find(s=>s.id===draft.id);if(shape)save({...shape,behaviors:draft.behaviors});}}
 function queue(behaviors){pending={id:selected,behaviors};clearTimeout(timer);timer=setTimeout(flush,450);}
 function stopPreview(){if(preview){preview.close();preview=null;}}
 function showPreview(){
  flush();stopPreview();const doc=getDocument();const shapes=exportShapes(doc.shapes.filter(s=>s.page_id===doc.active_page),[selected],'selection').map(s=>({...s,control_state:controlPreviewStates.get(s.id)||s.control_state}));
  let source;try{source=behaviorSource(shapes,{module:false});}catch(error){status.textContent=error.message;return;}
  const result=cssExport(shapes,{textLayout,variables:doc.variables,pageModes:doc.pages.find(p=>p.id===doc.active_page)?.variable_modes,sourceShapes:doc.shapes,name:'Behavior preview'});
  const dialog=el('dialog',null,{class:'behavior-preview-dialog','aria-label':'Behavior preview'}),header=el('div',null,{class:'behavior-preview-header'}),close=el('button','Close preview');
  const frame=el('iframe',null,{sandbox:'allow-scripts',title:'Isolated behavior preview'}),errors=el('p','',{role:'status'});
  close.onclick=()=>dialog.close();header.append(el('strong','Behavior preview'),close);dialog.append(header,frame,errors);document.body.append(dialog);preview=dialog;
  const token=crypto.randomUUID(),report=`message=>parent.postMessage({type:'behavior-error',token:${JSON.stringify(token)},message},'*')`;
  const script=source+`\nconst report=${report};\nwindow.addEventListener('error',e=>report(e.message));\nwindow.addEventListener('unhandledrejection',e=>report(String(e.reason)));\nmountBehaviors(document,behaviors,report);`;
  const csp=`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; form-action 'none'">`;
  frame.srcdoc=result.html.replace('<head>','<head>'+csp).replace('<link rel="stylesheet" href="styles.css">','<style>'+result.css.replace(/<\/style/gi,'<\\/style')+'</style>').replace('</body>','<script>'+script.replace(/<\/script/gi,'<\\/script')+'</script></body>');
  const listener=e=>{if(e.source===frame.contentWindow&&e.data?.token===token)errors.textContent=String(e.data.message);};window.addEventListener('message',listener);
  dialog.addEventListener('close',()=>{window.removeEventListener('message',listener);dialog.remove();if(preview===dialog)preview=null;},{once:true});dialog.showModal();
 }
 const status=el('p','',{role:'status',class:'development-status'});
 function render(force=false){
  const selection=getSelection(),shape=selection.length===1?selection[0]:null;
  prototypeEmpty.hidden=!!shape;
  if(mode==='inspect')renderInspect(shape);
  if(selected!==shape?.id){flush();stopPreview();selected=shape?.id??null;signature='';}
  const key=JSON.stringify(shape?.behaviors??[]);
  if(!force&&key===signature&&dev.childNodes.length)return;
  // Do not replace an editor during a save while the user is typing.
  if(!force&&dev.contains(editorDOM.activeElement)&&pending===null&&selected===shape?.id){signature=key;return;}
  signature=key;dev.replaceChildren();
  if(!shape){dev.append(el('p',selection.length?'Select one item to edit its JavaScript.':'Select an item to attach a behavior.',{class:'development-empty'}));return;}
  const intro=el('section',null,{class:'development-section'});intro.append(el('h3','Behaviors'),el('p','Attach portable JavaScript to '+shape.name+'. Runs in preview and web exports.'));
  const previewButton=el('button','Run preview',{class:'wide-button'});previewButton.onclick=showPreview;intro.append(previewButton);dev.append(intro);
  const library=el('section',null,{class:'development-section'}),search=el('input',null,{type:'search',placeholder:'Search snippets…','aria-label':'Search snippets'}),list=el('div',null,{class:'snippet-list'});
  library.append(el('h3','Snippet library'),search,list);dev.append(library);
  function renderLibrary(){const matches=snippets.filter(s=>(s.name+' '+s.category).toLowerCase().includes(search.value.toLowerCase()));list.replaceChildren(...matches.map(snippet=>{const button=el('button',null,{class:'snippet-choice'});button.append(el('span',snippet.name),el('small',snippet.category));button.onclick=()=>{flush();const current=getDocument().shapes.find(s=>s.id===selected);save({...current,behaviors:[...(current.behaviors??[]),createBehavior(snippet)]});render(true);};return button;}));if(!matches.length)list.append(el('p','No matching snippets.'));}search.oninput=renderLibrary;renderLibrary();
  let behaviors=structuredClone(shape.behaviors??[]);
  const attached=el('section',null,{class:'development-section'});attached.append(el('h3','Attached ('+behaviors.length+')'));dev.append(attached);
  if(!behaviors.length)attached.append(el('p','Choose a snippet above or start with Custom JavaScript.'));
  for(const behavior of behaviors){
   const card=el('details',null,{class:'behavior-card',open:''}),summary=el('summary',behavior.name);card.append(summary);
   const label=(name,control)=>{const l=el('label',name);l.append(control);card.append(l);};
   const name=el('input',null,{'aria-label':'Behavior name',maxlength:'100'});name.value=behavior.name;label('Name',name);
   const enabled=el('input',null,{type:'checkbox'});enabled.checked=behavior.enabled;label('Enabled',enabled);
   const trigger=el('select',null,{'aria-label':'Behavior trigger'});for(const [value,title] of [['load','On load'],['click','On click'],['hover','On hover'],['view','When visible']])trigger.append(el('option',title,{value}));trigger.value=behavior.trigger;label('Trigger',trigger);
   const duration=el('input',null,{type:'number',min:'0',max:'60000','aria-label':'Duration in milliseconds'});duration.value=behavior.duration;label('Duration (ms)',duration);
   const distance=el('input',null,{type:'number','aria-label':'Distance in pixels'});distance.value=behavior.distance;label('Distance (px)',distance);
   const code=el('textarea',null,{class:'behavior-code','aria-label':behavior.name+' JavaScript',spellcheck:'false',rows:'12'});code.value=behavior.code;label('JavaScript',code);
   const error=el('p',validateBehavior(behavior.code),{class:'behavior-error',role:'status'});card.append(error);
   function changed(){behavior.name=name.value;summary.textContent=name.value;behavior.enabled=enabled.checked;behavior.trigger=trigger.value;behavior.duration=Math.max(0,Math.min(60000,Number(duration.value)||0));behavior.distance=Number(distance.value)||0;behavior.code=code.value;error.textContent=validateBehavior(code.value);status.textContent=error.textContent?'Draft saved; fix the error before running.':'Saved automatically';queue(behaviors);}
   for(const control of [name,enabled,trigger,duration,distance,code])control.addEventListener('input',changed);
   const remove=el('button','Remove behavior',{class:'danger'});remove.onclick=()=>{flush();const current=getDocument().shapes.find(s=>s.id===selected);save({...current,behaviors:(current.behaviors??[]).filter(b=>b.id!==behavior.id)});render(true);};card.append(remove);attached.append(card);
  }
  const help=el('details',null,{class:'development-section'});help.append(el('summary','JavaScript API'),el('p','element: this layer. api.children(): direct child layers. api.find(selector): a descendant. api.on(element, event, handler): managed event listener. api.animate(keyframes, options, target): animation. api.style(target, values): styles restored on cleanup. api.cleanup(fn): release your own timers or resources. Return a cleanup function if needed.'),el('p','Portable JavaScript exports to HTML, React, Vue and Angular. JSX, Vue templates and Angular decorators are not supported in this editor. Preview has no network access.'));
  dev.append(help,status);
 }
 window.addEventListener('pagehide',flush);
 return {render,flush,activate,preview:showPreview,addPanel(key,label,node){hosts[key]=node;panel.append(node);const button=el('button',label,{role:'tab','aria-controls':node.id,'aria-selected':'false',hidden:''});button.dataset.mode=key;button.id='tab-'+key;button.onclick=()=>activate(key);node.setAttribute('role','tabpanel');node.setAttribute('aria-labelledby',button.id);buttons.push(button);tabs.append(button);}};
}
