import {choose} from './inspector-settings.js';
import {animatedSvg} from './svg-animation-svg.js';
import {interactionSettings} from './svg-animation-interactions.js';

export function installSvgExport({read,save,editable,download,dropdowns,report,stop}){
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text)n.textContent=text;return n;};
 const dialog=el('dialog','svg-export-dialog');dialog.id='svg-export-dialog';dialog.setAttribute('aria-label','Export SVG');
 const title=el('h2','','Export SVG'),layout=el('div','svg-export-layout'),preview=el('section','svg-export-preview'),frame=el('iframe'),hint=el('p','svg-export-preview-hint'),refresh=el('button','','Restart preview'),controls=el('section','svg-export-controls'),actions=el('div','svg-dialog-actions'),cancel=el('button','','Cancel'),store=el('button','','Save settings'),exportButton=el('button','primary','Download SVG');
 frame.title='Export preview';frame.setAttribute('sandbox','allow-scripts');refresh.type=cancel.type=store.type=exportButton.type='button';preview.append(frame,hint,refresh);layout.append(preview,controls);actions.append(cancel,store,exportButton);dialog.append(title,layout,actions);document.body.append(dialog);
 let pending,format,source,previewPayload=null;
 window.addEventListener('message',event=>{if(event.source===frame.contentWindow&&event.data?.type==='pxl-svg-preview-ready'&&dialog.open&&previewPayload)frame.contentWindow.postMessage(previewPayload,'*');});
 const documentWithSettings=()=>({...source,svg_animation:{...source.svg_animation,interaction:{...pending.interaction},loop:pending.loop}});
 const changed=()=>JSON.stringify(pending)!==JSON.stringify({interaction:interactionSettings(read().svg_animation),loop:read().svg_animation.loop});
 const safely=fn=>()=>{try{fn();}catch(error){report(error.message);}};
 function updatePreview(){
  const animated=format==='animated',trigger=pending.interaction.trigger,svg=animatedSvg(documentWithSettings(),{animated});
  // Use an opaque sandbox and the bundled controller; srcdoc would inherit the
  // desktop policy that correctly blocks inline scripts in the editor.
  previewPayload={type:'pxl-svg-preview',svg,interaction:animated&&trigger!=='load'?{...pending.interaction,duration:source.svg_animation.duration,loop:pending.loop}:null};
  frame.src=new URL('./svg-animation-preview.html',import.meta.url).href;
  hint.textContent=!animated?'First frame · static SVG':trigger==='hover'?'Move your pointer over the preview, then away. Keyboard focus also starts playback.':trigger==='click'?'Click the preview to play. Click again to test the response. Enter and Space also work.':'Plays automatically. Restart the preview to watch from the beginning.';
  store.disabled=!editable()||!changed();
 }
 function renderControls(){
  controls.replaceChildren();const summary=el('p','svg-export-summary',`${source.svg_animation.tracks.length} property tracks · ${source.svg_animation.duration/1000}s`);controls.append(summary);
  const field=(label,options,value,change)=>{const row=el('label','svg-export-field',label),select=choose(label,options,value,safelyValue(change));row.append(select);controls.append(row);return select;};
  function safelyValue(fn){return value=>{try{fn(value);renderControls();updatePreview();}catch(error){report(error.message);}};}
  const type=field('SVG export format',[['animated','Animated SVG',!source.svg_animation.tracks.length],['static','Static SVG · first frame']],format,value=>{format=value;});type.id='svg-export-format';
  if(format==='animated'){
   field('Animation start',[['load','On load'],['hover','On hover'],['click','On click']],pending.interaction.trigger,value=>{pending.interaction.trigger=value;});
   if(pending.interaction.trigger==='hover')field('On mouse out',[['pause','Pause'],['reset','Reset'],['reverse','Reverse'],['continue','Continue']],pending.interaction.onLeave,value=>{pending.interaction.onLeave=value;});
   if(pending.interaction.trigger==='click')field('On second click',[['pause','Pause / resume'],['restart','Restart'],['reverse','Reverse'],['continue','Continue']],pending.interaction.onClick,value=>{pending.interaction.onClick=value;});
   field('Repeat',[['once','Once'],['loop','Loop']],pending.loop?'loop':'once',value=>{pending.loop=value==='loop';});
  }
  const interactive=format==='animated'&&pending.interaction.trigger!=='load',note=el('p','svg-export-embedding',interactive?'Use this interactive SVG inline or in an <object>. Hover and click do not work in <img> tags or CSS backgrounds. The player is included in the file.':'A self-contained SVG. Embed it as an image or open it directly in a browser.');controls.append(note);dropdowns();
 }
 function persist(){if(changed()&&editable()){const latest=read();save({...latest,svg_animation:{...latest.svg_animation,interaction:{...pending.interaction},loop:pending.loop}});}}
 refresh.onclick=safely(updatePreview);cancel.onclick=()=>dialog.close();
 store.onclick=safely(()=>{if(!editable())return;persist();dialog.close();});
 exportButton.onclick=safely(()=>{const output=animatedSvg(documentWithSettings(),{animated:format==='animated'});persist();download(source.name.replace(/[<>:"/\\|?*]/g,'-')+'.svg',output,'image/svg+xml');dialog.close();report('SVG exported.');});
 dialog.addEventListener('close',()=>{previewPayload=null;frame.src='about:blank';});
 return {show(){stop();source=structuredClone(read());pending={interaction:interactionSettings(source.svg_animation),loop:source.svg_animation.loop};format=source.svg_animation.tracks.length?'animated':'static';renderControls();dialog.showModal();updatePreview();},dialog};
}
