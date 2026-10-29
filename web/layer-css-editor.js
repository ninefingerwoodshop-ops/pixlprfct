import {workspaceWindow} from './workspace-window.js';
import {compileCssScene} from './css-renderer.js';
import {editableLayerStyles,layerStyleOverrides,parseLayerStyles,formatLayerStyles} from './layer-style.js';

export function createLayerCssEditor({current,shapes,options=()=>({}),editable=()=>true,preview,apply}){
 const content=document.createElement('div');content.className='layout-css-editor';
 const description=document.createElement('p'),help=document.createElement('p'),input=document.createElement('textarea'),status=document.createElement('p'),actions=document.createElement('div');
 help.textContent='Edit generated styles or add rules for this layer’s class, including hover states and media queries. Only your changes override the visual tools. SVG paint colors have their own rules below.';
 input.className='layout-css-source';input.spellcheck=false;input.setAttribute('aria-label','Component CSS');input.setAttribute('aria-describedby','component-css-status');status.id='component-css-status';status.setAttribute('role','status');actions.className='dialog-actions';
 const action=(label,run)=>{const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=run;actions.append(button);return button;};
 let original,generated='',timer,canEdit=false,draft;
 const check=()=>{clearTimeout(timer);if(!win.dialog.open||!canEdit)return false;try{
   if(current()?.id!==original.id||JSON.stringify(shapes().find(s=>s.id===original.id))!==JSON.stringify(original))throw new Error('The selected layer changed. Close and reopen CSS to edit its latest styles.');
   if(!editable(original))throw new Error('This component is protected. Edit its source project.');
   const custom_css=layerStyleOverrides(generated,input.value,original),rules=parseLayerStyles(custom_css);
   for(const rule of rules)for(const [property,value] of Object.entries(rule.declarations))if(!CSS.supports(property,value.replace(/\s*!important\s*$/i,'')))throw new Error(`Invalid or unsupported CSS: ${property}: ${value}`);
   const sheet=new CSSStyleSheet();sheet.replaceSync(formatLayerStyles(rules));const count=list=>[...list].reduce((total,rule)=>total+(rule.selectorText?1:rule.cssRules?count(rule.cssRules):0),0);if(count(sheet.cssRules)!==rules.length)throw new Error('Check the CSS selector or condition syntax.');
   draft={...original,custom_css};preview(draft);status.textContent=custom_css?'Live preview · Apply saves your CSS overrides.':'Generated styles · no CSS overrides.';input.removeAttribute('aria-invalid');save.disabled=false;return true;
  }catch(error){draft=null;preview(null);status.textContent=error.message;input.setAttribute('aria-invalid','true');save.disabled=true;return false;}};
 const format=action('Format CSS',()=>{try{input.value=formatLayerStyles(parseLayerStyles(input.value));check();}catch(error){status.textContent=error.message;}});
 action('Copy CSS',async()=>{try{await navigator.clipboard.writeText(input.value);status.textContent='CSS copied';}catch{status.textContent='Select the CSS and copy it manually.';}});
 const reset=action('Reset overrides',()=>{input.value=editableLayerStyles(generated,{...original,custom_css:''});check();});
 action('Cancel',()=>win.close());const save=action('Apply',()=>{if(!check())return;const next=draft;win.close();apply(next);});save.className='primary';
 content.append(description,help,input,status,actions);const win=workspaceWindow('Component CSS',content,{width:700,height:650,page:false});win.dialog.classList.add('layout-css-window');
 input.oninput=()=>{clearTimeout(timer);timer=setTimeout(check,150);};
 input.onkeydown=event=>{event.stopPropagation();if(event.key==='Escape'){event.preventDefault();win.close();}else if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();save.click();}};
 win.dialog.addEventListener('close',()=>{clearTimeout(timer);preview(null);draft=null;});
 return {isOpen:()=>win.dialog.open,open(){const shape=current();if(!shape)return;original=structuredClone(shape);canEdit=editable(shape);const scene=shapes().filter(s=>s.page_id===shape.page_id).map(s=>({...s,hidden:false}));generated=compileCssScene(scene,options()).layerCss[shape.id]??'';description.textContent=shape.name+' · '+(shape.component?.type==='master'?'Main component':shape.control?.kind??shape.kind);input.value=editableLayerStyles(generated,shape);input.readOnly=!canEdit;format.disabled=reset.disabled=save.disabled=!canEdit;status.textContent=canEdit?'Changes preview live. Apply saves them; Cancel leaves the layer unchanged.':'Protected component · CSS is read-only. Edit its main component or source project.';input.removeAttribute('aria-invalid');win.open();input.focus();}};
}
