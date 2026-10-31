import {properties,easingPoints,trackValue,exportKeys,validateAnimation} from './svg-animation-model.js';
import {pathSampler,pathKinds,pathGeometry} from './svg-animation-path.js';
import {morphPath,morphData} from './svg-animation-morph.js';
import {interactionSettings,interactionScript} from './svg-animation-interactions.js';
const NS='http://www.w3.org/2000/svg';
const tags=new Set('svg g defs path rect circle ellipse line polyline polygon text tspan use symbol linearGradient radialGradient stop clipPath mask title desc image pattern marker filter feGaussianBlur feOffset feFlood feComposite feMerge feMergeNode feColorMatrix feBlend'.split(' '));
const drawable=new Set('g path rect circle ellipse line polyline polygon text use image'.split(' '));
const paint=new Set('fill fill-opacity fill-rule stroke stroke-width stroke-opacity stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit opacity color display visibility clip-path clip-rule mask filter font-family font-size font-weight font-style text-anchor dominant-baseline letter-spacing stop-color stop-opacity paint-order vector-effect transform transform-origin'.split(' '));
const attrs=new Set(('id viewBox width height x y x1 y1 x2 y2 cx cy r rx ry d points transform preserveAspectRatio gradientUnits gradientTransform spreadMethod offset fx fy fr clipPathUnits maskUnits maskContentUnits patternUnits patternContentUnits patternTransform markerWidth markerHeight refX refY orient markerUnits textLength lengthAdjust dx dy rotate pathLength stdDeviation in in2 result operator k1 k2 k3 k4 values type mode flood-color flood-opacity '+[...paint].join(' ')).split(' '));
const serialize=root=>new XMLSerializer().serializeToString(root);
const safePaint=value=>!/[<>\\\u0000-\u001f]/.test(value)&&!/(?:@|expression\s*\(|javascript\s*:|https?\s*:|data\s*:|\/\*)/i.test(value)&&(!/url\s*\(/i.test(value)||/^url\(\s*['"]?#[\w.-]+['"]?\s*\)$/.test(value));
export function sanitizeSvg(source){
 if(typeof source!=='string'||source.length>2_000_000)throw new Error('SVG must be smaller than 2 MB.');
 if(/<!DOCTYPE|<!ENTITY/i.test(source))throw new Error('SVG document types and entities are not supported.');
 const parsed=new DOMParser().parseFromString(source,'image/svg+xml'),original=parsed.documentElement;
 if(parsed.querySelector('parsererror')||original.localName!=='svg'||original.namespaceURI!==NS)throw new Error('Choose a valid SVG file.');
 if(original.querySelectorAll('*').length>5000)throw new Error('SVGs can contain up to 5,000 elements.');
 const warnings=new Set();
 // Resolve static stylesheet declarations before removing stylesheet nodes.
 // No imported stylesheet is ever inserted into the application document.
 const declarations=new Map();
 for(const style of original.querySelectorAll('style')){
  try{const sheet=new CSSStyleSheet();sheet.replaceSync(style.textContent);for(const rule of sheet.cssRules){if(!rule.selectorText||!rule.style){warnings.add('CSS rules other than static selectors were removed.');continue;}let matches;try{matches=original.querySelectorAll(rule.selectorText);}catch{warnings.add('An unsupported CSS selector was removed.');continue;}for(const node of matches){const data=declarations.get(node)??new Map();for(const name of rule.style)data.set(name,rule.style.getPropertyValue(name));declarations.set(node,data);}}}catch{warnings.add('An unsupported stylesheet was removed.');}
 }
 const ids=new Map(),used=new Set();let sequence=0;
 function copy(node){
  if(node.nodeType===3)return document.createTextNode(node.textContent);
  if(node.nodeType!==1)return null;
  if(!tags.has(node.localName)||node.namespaceURI!==NS){if(node.localName!=='style')warnings.add('Unsupported or active SVG content was removed.');return null;}
  const out=document.createElementNS(NS,node.localName);
  for(const a of node.attributes){const name=a.name,value=a.value.replace(/[\r\n\t]/g,' ');if(name==='id'||name==='style'||name==='class'||name.startsWith('xmlns')||name==='data-layer-name')continue;
   if(a.localName==='href'){
    if(/^#[\w.-]+$/.test(value)||node.localName==='image'&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\s]+$/.test(value))out.setAttribute('href',value);else warnings.add('External resource links were removed.');
   }else if(attrs.has(name)&&safePaint(value))out.setAttribute(name,value);else if(/^on/i.test(name)||/url\s*\(/i.test(value))warnings.add('Active or external SVG content was removed.');
  }
  const inline=document.createElement('span').style;inline.cssText=node.getAttribute('style')??'';const styles=declarations.get(node)??new Map();for(const name of inline)styles.set(name,inline.getPropertyValue(name));
  for(const [name,value] of styles){if(paint.has(name)&&safePaint(value))out.style.setProperty(name,value);else warnings.add('Unsupported styling was removed.');}
  const old=node.id;let id=/^pxv\d+$/.test(old)&&!used.has(old)?old:'';if(!id){do{id='pxv'+(++sequence);}while(used.has(id)||original.querySelector(`[id="${id}"]`));}used.add(id);out.id=id;if(old&&!ids.has(old))ids.set(old,id);
  out.setAttribute('data-layer-name',(node.getAttribute('data-layer-name')||old||node.localName).slice(0,256));
  for(const child of node.childNodes){const next=copy(child);if(next)out.append(next);}return out;
 }
 const root=copy(original);
 for(const node of [root,...root.querySelectorAll('*')])for(const a of [...node.attributes]){
  if(a.name==='href'&&a.value.startsWith('#')){const mapped=ids.get(a.value.slice(1));if(mapped)node.setAttribute(a.name,'#'+mapped);else node.removeAttribute(a.name);}
  else if(/url\(/i.test(a.value))node.setAttribute(a.name,a.value.replace(/url\(\s*['"]?#([\w.-]+)['"]?\s*\)/g,(_,id)=>ids.has(id)?`url(#${ids.get(id)})`:'none'));
 }
 let view=(root.getAttribute('viewBox')??'').trim().split(/[\s,]+/).map(Number);
 if(view.length!==4||view.some(n=>!Number.isFinite(n))||view[2]<=0||view[3]<=0){const width=parseFloat(root.getAttribute('width'))||512,height=parseFloat(root.getAttribute('height'))||512;view=[0,0,width,height];}
 if(view.some(n=>Math.abs(n)>100000)||view[2]<=0||view[3]<=0)throw new Error('The SVG canvas dimensions are unsupported.');
 root.setAttribute('viewBox',view.join(' '));root.setAttribute('width',String(view[2]));root.setAttribute('height',String(view[3]));
 // Canonical attribute order keeps a read-only reopen from becoming a save.
 for(const node of [root,...root.querySelectorAll('*')]){const attributes=[...node.attributes].map(a=>[a.name,a.value]).sort(([a],[b])=>a.localeCompare(b));for(const a of [...node.attributes])node.removeAttribute(a.name);for(const [name,value] of attributes)node.setAttribute(name,value);}
 return {svg:serialize(root),root,warnings:[...warnings],width:view[2],height:view[3]};
}
export function animationLayers(root){
 return [...root.querySelectorAll('*')].filter(n=>drawable.has(n.localName)&&!n.closest('defs,clipPath,mask,pattern,marker,symbol,filter')&&!n.closest('[data-animation-wrapper]')).map(node=>({id:node.id,name:node.getAttribute('data-layer-name')||node.localName,kind:node.localName,depth:ancestors(node,root),node}));
}
function ancestors(node,root){let depth=0;while(node.parentElement&&node.parentElement!==root){depth++;node=node.parentElement;}return depth;}
export function baseValue(node,property){
 const p=properties[property];if(!p.attribute)return p.initial;
 if(p.morph)return morphPath(pathGeometry(node));
 const style=getComputedStyle(node),raw=style.getPropertyValue(p.attribute)||node.getAttribute(p.attribute);
 if(p.color){const rgb=raw?.match(/^rgba?\(\s*(\d+)[, ]+\s*(\d+)[, ]+\s*(\d+)/);if(rgb)return '#'+rgb.slice(1,4).map(n=>Math.min(255,Number(n)).toString(16).padStart(2,'0')).join('');if(/^#[\da-f]{6}$/i.test(raw))return raw;return p.initial;}
 const n=parseFloat(raw);return Number.isFinite(n)?n:p.initial;
}
const group=()=>document.createElementNS(NS,'g');
export function animationScene(animation){
 const {root}=sanitizeSvg(animation.svg),bindings=[],motionGuides=[];
 // Transform wrappers retain the imported transforms, groups, masks and paint.
 for(const id of new Set(animation.tracks.map(t=>t.element))){
  let node=root.querySelector('#'+id);if(!node)throw new Error('An animation refers to a missing SVG element.');
  const tracks=animation.tracks.filter(t=>t.element===id),origin=animation.origins[id]??[0,0];
  if(tracks.some(t=>t.property==='morph')){if(!pathKinds.has(node.localName))throw new Error('Morph tracks require a path or geometric shape.');if(node.localName!=='path'){const path=document.createElementNS(NS,'path');for(const a of node.attributes)if(!['x','y','width','height','rx','ry','cx','cy','r','x1','y1','x2','y2','points'].includes(a.name))path.setAttribute(a.name,a.value);path.append(...node.childNodes);node.replaceWith(path);node=path;}}
  let outer=node;
  const transforms=tracks.filter(t=>!properties[t.property].attribute&&!properties[t.property].motion);
  if(transforms.length){const inner=group();inner.setAttribute('transform',`translate(${-origin[0]} ${-origin[1]})`);outer.replaceWith(inner);inner.append(outer);outer=inner;
   for(const property of ['scaleY','scaleX','rotation']){const track=transforms.find(t=>t.property===property);if(track){const wrap=group();outer.replaceWith(wrap);wrap.append(outer);outer=wrap;bindings.push({node:wrap,track,attribute:'transform',type:property==='rotation'?'rotate':'scale',value:v=>property==='rotation'?String(v):property==='scaleX'?`${v} 1`:`1 ${v}`});}}
   const pivot=group();pivot.setAttribute('transform',`translate(${origin.join(' ')})`);outer.replaceWith(pivot);pivot.append(outer);outer=pivot;
   for(const property of ['y','x']){const track=transforms.find(t=>t.property===property);if(track){const wrap=group();outer.replaceWith(wrap);wrap.append(outer);outer=wrap;bindings.push({node:wrap,track,attribute:'transform',type:'translate',value:v=>property==='x'?`${v} 0`:`0 ${v}`});}}
  }
  for(const track of tracks.filter(t=>properties[t.property].attribute)){const attribute=properties[track.property].attribute;node.style.removeProperty(attribute);bindings.push({node,track,attribute,value:properties[track.property].morph?morphData:v=>String(v)});}
  const motion=tracks.find(t=>t.property==='motionProgress');
  if(motion){const pivot=group(),wrap=group(),sample=pathSampler(motion.motion.d);pivot.setAttribute('transform',`translate(${-origin[0]} ${-origin[1]})`);outer.replaceWith(wrap);wrap.append(pivot);pivot.append(outer);motionGuides.push({element:id,parent:wrap.parentElement,d:motion.motion.d});
   bindings.push({node:wrap,track:motion,attribute:'transform',motion:true,value:v=>{const p=sample(v/100),angle=motion.motion.rotate==='none'?0:p.angle+(motion.motion.rotate==='auto-reverse'?180:0);return `translate(${p.x} ${p.y}) rotate(${angle})`;}});
  }
 }
 const seek=time=>{for(const b of bindings){const value=b.value(trackValue(b.track,time));b.node.setAttribute(b.attribute,b.type?`${b.type}(${value})`:value);}};seek(0);
 return {root,bindings,motionGuides,seek};
}
export function animatedSvg(doc,{animated=true}={}){
 validateAnimation(doc);const a=doc.svg_animation,{root,bindings}=animationScene(a),settings=interactionSettings(a),interactive=animated&&bindings.length>0&&settings.trigger!=='load';
 if(animated)for(const b of bindings){const keys=exportKeys(b.track,a.duration),node=document.createElementNS(NS,b.motion?'animateMotion':b.type?'animateTransform':'animate');
  if(b.motion){if(interactive)b.node.setAttribute('data-pixl-motion','');else b.node.removeAttribute('transform');node.setAttribute('path',b.track.motion.d);node.setAttribute('rotate',b.track.motion.rotate==='none'?'0':b.track.motion.rotate);node.setAttribute('keyPoints',keys.map(k=>k.value/100).join(';'));}
  else{node.setAttribute('attributeName',b.attribute);if(b.type)node.setAttribute('type',b.type);node.setAttribute('values',keys.map(k=>b.value(k.value)).join(';'));}
  node.setAttribute('dur',a.duration+'ms');node.setAttribute('begin',interactive?'indefinite':'0s');node.setAttribute('repeatCount',!interactive&&a.loop?'indefinite':'1');node.setAttribute('fill','freeze');node.setAttribute('calcMode','spline');
  node.setAttribute('keyTimes',keys.map(k=>k.time/a.duration).join(';'));node.setAttribute('keySplines',keys.slice(0,-1).map(k=>easingPoints(k.easing).join(' ')).join(';'));b.node.append(node);
 }
 if(interactive){root.setAttribute('tabindex','0');root.setAttribute('role','button');root.setAttribute('aria-label',doc.name+' animation');root.style.cursor=settings.trigger==='click'?'pointer':'default';root.style.pointerEvents='all';const script=document.createElementNS(NS,'script');script.textContent=interactionScript(settings,a.duration,a.loop);root.append(script);}
 for(const node of root.querySelectorAll('[data-layer-name]'))node.removeAttribute('data-layer-name');
 return serialize(root);
}
export function normalizeSvgAnimation(doc){validateAnimation(doc);const {svg,warnings}=sanitizeSvg(doc.svg_animation.svg);const next={...doc,svg_animation:{...doc.svg_animation,svg}};animationScene(next.svg_animation);return {document:next,warnings};}
