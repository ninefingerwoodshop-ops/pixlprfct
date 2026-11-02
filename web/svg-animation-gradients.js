// Resolve paint servers without changing shared imported definitions. Each edited
// or animated paint gets its own flattened server, including inherited stops.
const NS='http://www.w3.org/2000/svg';
const attributes=['gradientUnits','gradientTransform','spreadMethod','x1','y1','x2','y2','cx','cy','r','fx','fy','fr'];
let colorContext;
function paintProperty(node,name,fallback,inherits=false){
 for(let n=node;n;n=n.parentElement){const raw=(n.isConnected?getComputedStyle(n).getPropertyValue(name):n.style?.getPropertyValue(name)||n.getAttribute(name))?.trim();if(raw==='inherit')continue;if(!raw||raw==='unset'){if(inherits)continue;return fallback;}return raw==='initial'?fallback:raw;}return fallback;
}
function stopColor(stop){
 let raw=paintProperty(stop,'stop-color','#000000');if(raw.toLowerCase()==='currentcolor')raw=paintProperty(stop,'color','#000000',true);
 // Canvas resolves every browser-supported CSS color even when an imported SVG
 // is disconnected during scene construction or export. Preserve color alpha.
 if(!colorContext){const canvas=document.createElement('canvas');canvas.width=canvas.height=1;colorContext=canvas.getContext('2d',{willReadFrequently:true});}
 colorContext.fillStyle='#000000';colorContext.fillStyle=raw;const normalized=colorContext.fillStyle;
 if(/^#[\da-f]{6}$/i.test(normalized))return {color:normalized,alpha:1};
 const rgb=normalized.match(/^rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)$/);
 if(rgb)return {color:'#'+rgb.slice(1,4).map(n=>Math.round(Number(n)).toString(16).padStart(2,'0')).join(''),alpha:Number(rgb[4]??1)};
 colorContext.clearRect(0,0,1,1);colorContext.fillRect(0,0,1,1);
 const rgba=colorContext.getImageData(0,0,1,1).data;return {color:'#'+[...rgba.slice(0,3)].map(n=>n.toString(16).padStart(2,'0')).join(''),alpha:rgba[3]/255};
}
function paintValue(node,channel){
 const computed=node.isConnected?getComputedStyle(node).getPropertyValue(channel):'';if(computed)return computed;
 for(let n=node;n;n=n.parentElement){const raw=n.style?.getPropertyValue(channel)||n.getAttribute(channel);if(raw)return raw;}return '';
}
export function svgGradient(node,channel){
 if(!node)return null;const match=paintValue(node,channel).match(/url\(\s*["']?(?:[^#)]*#)([-\w.]+)["']?\s*\)/);if(!match)return null;
 const root=node.ownerSVGElement??node,source=root.querySelector('[id="'+match[1]+'"]');if(!source||!['linearGradient','radialGradient'].includes(source.localName))return null;
 const result={kind:source.localName==='linearGradient'?'linear':'radial',attributes:{},stops:[],source},seen=new Set();
 for(let n=source;n&&!seen.has(n);){seen.add(n);for(const name of attributes)if(result.attributes[name]===undefined&&n.hasAttribute(name))result.attributes[name]=n.getAttribute(name);
  if(!result.stops.length)result.stops=[...n.children].filter(s=>s.localName==='stop').map(s=>{const opacity=paintProperty(s,'stop-opacity','1'),paint=stopColor(s);return {offset:Math.max(0,Math.min(1,s.offset.baseVal)),color:paint.color,opacity:paint.alpha*Math.max(0,Math.min(1,parseFloat(opacity)/(opacity.endsWith('%')?100:1)))};});
  const href=n.getAttribute('href');n=href?.startsWith('#')?root.querySelector('[id="'+href.slice(1)+'"]'):null;
 }
 let previous=0;for(const stop of result.stops){stop.offset=Math.max(previous,stop.offset);previous=stop.offset;}return result;
}
export function gradientCenter(gradient,root){
 if(gradient.attributes.gradientUnits!=='userSpaceOnUse')return [.5,.5];
 const view=root.viewBox.baseVal,coordinate=(value,axis)=>String(value).endsWith('%')?(axis?view.y:view.x)+parseFloat(value)/100*(axis?view.height:view.width):parseFloat(value);
 const a=gradient.attributes;if(gradient.kind==='radial')return [coordinate(a.cx??'50%',0),coordinate(a.cy??'50%',1)];
 return [(coordinate(a.x1??0,0)+coordinate(a.x2??'100%',0))/2,(coordinate(a.y1??0,1)+coordinate(a.y2??0,1))/2];
}
export function ownGradient(root,node,channel,gradient){
 let seq=Math.max(0,...[root,...root.querySelectorAll('[id]')].map(n=>Number(n.id.match(/^pxv(\d+)$/)?.[1])||0));
 const create=tag=>{const n=document.createElementNS(NS,tag);n.id='pxv'+(++seq);return n;};
 let defs=[...root.children].find(n=>n.localName==='defs');if(!defs){defs=create('defs');root.prepend(defs);}
 const server=create(gradient.kind==='radial'?'radialGradient':'linearGradient');for(const [name,value] of Object.entries(gradient.attributes))server.setAttribute(name,value);
 for(const s of gradient.stops){const stop=create('stop');stop.setAttribute('offset',s.offset);stop.setAttribute('stop-color',s.color);stop.setAttribute('stop-opacity',s.opacity);server.append(stop);}defs.append(server);
 node.style.removeProperty(channel);node.setAttribute(channel,`url(#${server.id})`);return server;
}
export function gradientBindings(root,node,tracks){
 const bindings=[];
 for(const channel of ['fill','stroke']){
  const rotation=tracks.find(t=>t.property===channel+'GradientRotation'),stops=tracks.find(t=>t.property===channel+'Gradient');if(!rotation&&!stops)continue;
  const gradient=svgGradient(node,channel);if(!gradient)throw new Error('Gradient animation requires a '+channel+' gradient.');
  if(stops&&stops.keys.some(k=>k.value.length!==gradient.stops.length))throw new Error('Gradient keyframes must match the number of paint stops.');
  const server=ownGradient(root,node,channel,gradient);
  if(rotation){const center=gradientCenter(gradient,root);bindings.push({node:server,track:rotation,attribute:'gradientTransform',type:'rotate',baseTransform:gradient.attributes.gradientTransform??'',value:v=>`${v} ${center.join(' ')}`});}
  if(stops)for(const [i,stop] of [...server.children].entries())for(const [name,attribute] of [['color','stop-color'],['offset','offset'],['opacity','stop-opacity']])bindings.push({node:stop,track:stops,attribute,value:v=>String(v[i][name])});
 }
 return bindings;
}
