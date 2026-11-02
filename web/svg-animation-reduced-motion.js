const NS='http://www.w3.org/2000/svg';

// CSS works in SVG image embeds, where scripts cannot control SMIL. Keep an
// independent first-frame scene so gradients, morphs and motion paths freeze too.
export function reducedMotionFallback(root,firstFrame){
 const animated=document.createElementNS(NS,'g'),still=document.createElementNS(NS,'g'),style=document.createElementNS(NS,'style');
 animated.setAttribute('data-pixl-animated','');still.setAttribute('data-pixl-still','');root.setAttribute('data-pixl-reduced-motion','');
 const ids=new Map(),used=new Set([root,...root.querySelectorAll('[id]')].map(n=>n.id));
 for(const node of firstFrame.querySelectorAll('[id]')){let id=node.id+'-still';while(used.has(id))id+='-copy';used.add(id);ids.set(node.id,id);node.id=id;}
 const remap=value=>value.replace(/url\(\s*['"]?#([\w.-]+)['"]?\s*\)/g,(match,id)=>ids.has(id)?`url(#${ids.get(id)})`:match);
 for(const node of firstFrame.querySelectorAll('*'))for(const attr of [...node.attributes]){
  if(attr.localName==='href'&&ids.has(attr.value.slice(1))&&attr.value.startsWith('#'))node.setAttributeNS(attr.namespaceURI,attr.name,'#'+ids.get(attr.value.slice(1)));
  else if(attr.value.includes('url('))node.setAttributeNS(attr.namespaceURI,attr.name,remap(attr.value));
 }
 // A paint inherited from the SVG root must resolve inside the still scene too.
 for(const name of ['fill','stroke']){const value=root.style.getPropertyValue(name)||root.getAttribute(name);if(value?.includes('url('))still.style.setProperty(name,remap(value));}
 for(const child of [...root.childNodes])if(!['title','desc'].includes(child.localName))animated.append(child);
 for(const child of [...firstFrame.childNodes])if(!['title','desc'].includes(child.localName))still.append(child);
 const scope='svg[data-pixl-reduced-motion]';
 style.textContent=`${scope}>[data-pixl-still]{display:none}@media(prefers-reduced-motion:reduce){${scope}>[data-pixl-animated]{display:none}${scope}>[data-pixl-still]{display:inline}${scope}{cursor:default!important}}`;
 root.append(style,animated,still);
}
