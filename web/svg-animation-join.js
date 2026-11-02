import {morphPath,morphData} from './svg-animation-morph.js';
import {joinTransformedPaths} from './svg-animation-drawing-model.js';
import {mirroringAttribute,readMirroring,writeMirroring} from './svg-animation-mirroring.js';

const NS='http://www.w3.org/2000/svg';
const excluded='defs,clipPath,mask,pattern,marker,symbol,filter';
const pathValue=node=>readMirroring(morphPath(node.getAttribute('d')),node.getAttribute(mirroringAttribute));
const ancestors=node=>{const result=[];while(node){result.push(node);node=node.parentElement;}return result;};

export function joinPathElements({source,scene,animation,fromId,from,toId,to}){
 const first=source.querySelector('#'+fromId),second=source.querySelector('#'+toId);
 if(!first||!second||first===second||first.localName!=='path'||second.localName!=='path'||first.closest(excluded)||second.closest(excluded))throw new Error('Choose endpoints on two separate artwork paths.');
 const a=ancestors(first),b=ancestors(second),common=a.find(node=>b.includes(node)),exclusive=new Set([...a.slice(0,a.indexOf(common)),...b.slice(0,b.indexOf(common))].map(node=>node.id));
 // A shared ancestor's animation still addresses the merged artwork. Independent
 // animation cannot be combined into one element without changing its motion.
 if(animation.tracks.some(track=>exclusive.has(track.element)))throw new Error('Remove individual path or group animation before joining these paths. Shared parent animation can stay.');
 const removed=[second,...second.querySelectorAll('[id]')].map(node=>node.id).filter(Boolean),ids=new Set(removed);
 for(const node of [source,...source.querySelectorAll('*')]){
  if(second.contains(node))continue;
  for(const attr of node.attributes){
   const references=[...attr.value.matchAll(/url\(\s*['"]?#([\w.-]+)['"]?\s*\)/g)].map(match=>match[1]);
   if(attr.localName==='href'&&attr.value.startsWith('#'))references.push(attr.value.slice(1));
   if(references.some(id=>ids.has(id)))throw new Error('This path is referenced by other artwork. Remove those references before joining it.');
  }
 }
 const firstMatrix=scene.querySelector('#'+fromId)?.getScreenCTM(),secondMatrix=scene.querySelector('#'+toId)?.getScreenCTM();
 if(!firstMatrix||!secondMatrix)throw new Error('The paths are no longer available.');
 if([firstMatrix,secondMatrix].some(matrix=>Math.abs(matrix.a*matrix.d-matrix.b*matrix.c)<1e-12))throw new Error('Restore the size of collapsed paths before joining them.');
 const next=joinTransformedPaths(pathValue(first),from,pathValue(second),to,firstMatrix.inverse().multiply(secondMatrix));
 const root=source.cloneNode(true),retained=root.querySelector('#'+fromId);retained.setAttribute('d',morphData(next.value));
 const modes=writeMirroring(next.value);if(modes)retained.setAttribute(mirroringAttribute,modes);else retained.removeAttribute(mirroringAttribute);
 root.querySelector('#'+toId).remove();return {...next,root,removed};
}

// Reuse the existing circular vector-anchor treatment. The targets are only
// active while the user is choosing the second endpoint of a join.
export function installPathJoinTargets({host,read,join,report}){
 const overlay=document.createElementNS(NS,'svg');overlay.classList.add('svg-path-join-targets');overlay.setAttribute('aria-label','Join path endpoints');host.append(overlay);
 const clear=()=>{overlay.replaceChildren();overlay.setAttribute('hidden','');};
 function update(){
  clear();const state=read();if(!state)return;overlay.removeAttribute('hidden');const box=host.getBoundingClientRect();
  for(const node of state.root.querySelectorAll('path')){
   if(node.id===state.selected||node.closest(excluded))continue;
   let value;try{value=morphPath(node.getAttribute('d'));}catch{continue;}
   const matrix=node.getScreenCTM(),style=getComputedStyle(node);if(!matrix||style.display==='none'||style.visibility==='hidden'||node.getClientRects().length===0)continue;
   value.forEach((path,pathIndex)=>{if(path.closed)return;for(const index of [0,path.points.length-1]){
    const point=new DOMPoint(...path.points[index].slice(0,2)).matrixTransform(matrix);if(!Number.isFinite(point.x)||!Number.isFinite(point.y))continue;
    const hit=document.createElementNS(NS,'g');hit.classList.add('svg-morph-point','anchor');hit.dataset.joinTarget=node.id;hit.dataset.joinPath=String(pathIndex);hit.dataset.joinAnchor=String(index);
    hit.setAttribute('role','button');hit.setAttribute('tabindex',state.enabled?'0':'-1');hit.setAttribute('aria-disabled',String(!state.enabled));hit.setAttribute('aria-label',`Join ${node.getAttribute('data-layer-name')||node.id} endpoint ${pathIndex+1}.${index+1}`);hit.setAttribute('transform',`translate(${point.x-box.left} ${point.y-box.top})`);
    for(const [radius,cls] of [[8,'svg-morph-hit'],[3,'svg-morph-glyph']]){const dot=document.createElementNS(NS,'circle');dot.setAttribute('r',String(radius));dot.classList.add(cls);hit.append(dot);}
    const activate=()=>{if(!read()?.enabled)return;try{join(node.id,[pathIndex,index]);}catch(error){report(error.message);}};
    hit.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();hit.focus({preventScroll:true});};
    hit.onclick=e=>{e.preventDefault();e.stopPropagation();activate();};hit.onkeydown=e=>{if(!['Enter',' '].includes(e.key))return;e.preventDefault();e.stopPropagation();activate();};overlay.append(hit);
   }});
  }
 }
 return {update,clear};
}
