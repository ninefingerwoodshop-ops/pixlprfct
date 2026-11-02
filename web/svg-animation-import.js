import {sanitizeSvg} from './svg-animation-svg.js';
const NS='http://www.w3.org/2000/svg';
const serialize=root=>new XMLSerializer().serializeToString(root);
// An imported viewport retains its own default paints instead of inheriting
// the destination SVG's root styling. Non-inherited effects stay on the root.
const inherited='color fill fill-opacity fill-rule stroke stroke-width stroke-opacity stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit visibility clip-rule font-family font-size font-weight font-style text-anchor dominant-baseline letter-spacing paint-order'.split(' ');
export function addSvgArtwork(existing,incoming,name='Imported SVG'){
 const {root}=sanitizeSvg(existing),added=sanitizeSvg(incoming),viewport=added.root;
 const used=new Set([root,...root.querySelectorAll('[id]')].map(n=>n.id));let sequence=0;
 const allocate=()=>{let id;do{id='pxv'+(++sequence);}while(used.has(id));used.add(id);return id;};
 const ids=new Map();for(const node of [viewport,...viewport.querySelectorAll('*')]){const old=node.id;node.id=allocate();ids.set(old,node.id);}
 for(const node of [viewport,...viewport.querySelectorAll('*')])for(const a of [...node.attributes]){
  if(a.name==='href'&&a.value.startsWith('#'))node.setAttribute('href','#'+ids.get(a.value.slice(1)));
  else if(/url\(/i.test(a.value))node.setAttribute(a.name,a.value.replace(/url\(\s*['"]?#([\w.-]+)['"]?\s*\)/g,(_,id)=>`url(#${ids.get(id)})`));
 }
 for(const property of inherited)if(!viewport.hasAttribute(property)&&!viewport.style.getPropertyValue(property))viewport.style.setProperty(property,'initial');
 const view=root.viewBox.baseVal;
 viewport.setAttribute('x',String(view.x+(view.width-added.width)/2));viewport.setAttribute('y',String(view.y+(view.height-added.height)/2));
 const group=document.createElementNS(NS,'g');group.id=allocate();group.setAttribute('data-layer-name',name.slice(0,256)||'Imported SVG');group.append(viewport);root.append(group);
 const result=sanitizeSvg(serialize(root));return {...result,warnings:[...new Set([...added.warnings,...result.warnings])],selected:group.id};
}

// Prepare an atomic replacement for the editor's normal commit/undo path.
// Callers choose the mode explicitly; reading a file never mutates a document.
export function prepareSvgImport(animation,source,{mode,name}={}){
 if(mode!=='add'&&mode!=='replace')throw new Error('Choose Add or Replace for the SVG import.');
 const result=mode==='add'?addSvgArtwork(animation.svg,source,name):sanitizeSvg(source);
 return {animation:{...animation,svg:result.svg,...(mode==='replace'?{tracks:[],origins:{}}:{})},selected:result.selected??null,warnings:result.warnings};
}
