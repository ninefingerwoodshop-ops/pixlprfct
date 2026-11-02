import {editorDOM} from './editor-dom.js';
export function installPagesResize(){
 const handle=editorDOM.getElementById('pages-resize'),panel=editorDOM.getElementById('page-switch-menu');let drag=null;
 const set=height=>{const value=Math.round(Math.max(64,Math.min(innerHeight*.45,height)));panel.style.setProperty('--pages-height',value+'px');handle.setAttribute('aria-valuenow',value);handle.setAttribute('aria-valuemin',64);handle.setAttribute('aria-valuemax',Math.round(innerHeight*.45));};
 const save=()=>{try{localStorage.setItem('pixlprfct.pages-height',panel.clientHeight);}catch{}};
 try{const value=Number(localStorage.getItem('pixlprfct.pages-height'));set(value||160);}catch{set(160);}
 handle.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();drag={y:e.clientY,height:panel.clientHeight};handle.setPointerCapture(e.pointerId);};
 handle.onpointermove=e=>{if(drag)set(drag.height+e.clientY-drag.y);};
 handle.onpointerup=()=>{if(drag){drag=null;save();}};
 handle.onpointercancel=()=>{if(drag){set(drag.height);drag=null;}};
 handle.onkeydown=e=>{if(e.key==='Escape'&&drag){set(drag.height);drag=null;return;}if(['ArrowUp','ArrowDown','Home','End'].includes(e.key)){e.preventDefault();set(e.key==='Home'?64:e.key==='End'?innerHeight*.45:panel.clientHeight+(e.key==='ArrowDown'?10:-10));save();}};
}
