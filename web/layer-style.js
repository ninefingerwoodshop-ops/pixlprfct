import {layoutClass} from './layout-class.js';

// A stable selector lets copied layers and component instances keep their CSS
// without retaining the source layer's numeric ID or user-facing class name.
export const layerStyleRoot='.px-node-__self__';
const escaped=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const key=rule=>JSON.stringify([rule.conditions,rule.selector]);

export function parseLayerStyles(source){
 if(source.length>65536)throw new Error('CSS must be 64 KB or smaller.');
 const rules=new Map();let i=0;
 const space=()=>{while(i<source.length){if(/\s/.test(source[i]))i++;else if(source.startsWith('/*',i)){const end=source.indexOf('*/',i+2);if(end<0)throw new Error('Unclosed CSS comment.');i=end+2;}else break;}};
 const read=stops=>{let result='',quote='',depth=0;for(;i<source.length;i++){const c=source[i];if(quote){result+=c;if(c==='\\'){result+=source[++i]??'';}else if(c===quote)quote='';continue;}if(c==='"'||c==="'"){quote=c;result+=c;continue;}if(source.startsWith('/*',i)){const end=source.indexOf('*/',i+2);if(end<0)throw new Error('Unclosed CSS comment.');i=end+1;result+=' ';continue;}if(c==='\\'){result+=c+(source[++i]??'');continue;}if(!depth&&stops.includes(c))break;if(c==='('||c==='[')depth++;if(c===')'||c===']'){if(!depth)throw new Error('Unmatched CSS bracket.');depth--;}result+=c;}if(quote||depth)throw new Error('Unclosed CSS string or bracket.');return result.trim();};
 const block=(conditions=[],nested=false)=>{while(i<source.length){space();if(i>=source.length)break;if(source[i]==='}'){if(!nested)throw new Error('Unexpected closing brace.');i++;return;}const selector=read('{};');if(source[i]!=='{'||!selector)throw new Error('Use a selector followed by a CSS declaration block.');i++;
   if(selector.startsWith('@')){if(!/^@(media|supports|container|layer)\b\s*[^{};]+$/i.test(selector))throw new Error('Use @media, @supports, @container, or @layer for grouped rules.');block([...conditions,selector],true);continue;}
   const declarations={};let closed=false;
   while(i<source.length){space();if(source[i]==='}'){i++;closed=true;break;}const property=read(':;{}');if(source[i]!==':'||!/^--[\w-]+$|^-?[a-z][a-z0-9-]*$/i.test(property))throw new Error('Expected a CSS property and colon.');i++;const value=read(';{}');if(!value||source[i]==='{')throw new Error('Enter a value; put nested selectors in separate CSS rules.');declarations[property.startsWith('--')?property:property.toLowerCase()]=value;if(source[i]===';')i++;else if(source[i]==='}'){i++;closed=true;break;}else throw new Error('Missing closing brace.');}
   if(!closed)throw new Error('Missing closing brace.');
   const rule={selector,conditions,declarations},id=key(rule),previous=rules.get(id);if(previous)Object.assign(previous.declarations,declarations);else rules.set(id,rule);
  }if(nested)throw new Error('Missing closing brace.');};
 block();return [...rules.values()];
}

export function formatLayerStyles(rules){return rules.map(rule=>{let css=`${rule.selector} {\n${Object.entries(rule.declarations).map(([name,value])=>`  ${name}: ${value};`).join('\n')}\n}`;for(const condition of [...rule.conditions].reverse())css=`${condition} {\n${css.split('\n').map(line=>'  '+line).join('\n')}\n}`;return css;}).join('\n\n');}
export function normalizeLayerStyles(source,shape){
 const classPattern=new RegExp('\\.'+escaped(layoutClass(shape))+'(?:(?![\\w-])|(?=-option-\\d))','g'),nodePattern=new RegExp('\\.px-node-'+shape.id+'(?!\\d)','g');
 const rules=new Map();for(const rule of parseLayerStyles(source)){rule.selector=rule.selector.replace(classPattern,layerStyleRoot).replace(nodePattern,layerStyleRoot);const id=key(rule),previous=rules.get(id);if(previous)Object.assign(previous.declarations,rule.declarations);else rules.set(id,rule);}return [...rules.values()];
}
function scoped(rules){
 for(const rule of rules){
  // Every selector branch must start at this layer. Splitting only top-level
  // commas preserves :is(), :not(), and attribute selector values.
  let depth=0,quote='',start=0;const selectors=[];
  for(let i=0;i<=rule.selector.length;i++){const c=rule.selector[i];if(quote){if(c==='\\')i++;else if(c===quote)quote='';continue;}if(c==='"'||c==="'"){quote=c;continue;}if(c==='('||c==='[')depth++;else if(c===')'||c===']')depth--;else if((c===','&&!depth)||i===rule.selector.length){selectors.push(rule.selector.slice(start,i).trim());start=i+1;}}
  if(selectors.some(selector=>!selector.startsWith(layerStyleRoot)||/^[+~]/.test(selector.slice(layerStyleRoot.length).trim())))throw new Error('Start each selector with this layer’s CSS class. Styles are scoped to the selected layer.');
 }return rules;
}
export function layerStyleOverrides(generated,edited,shape){
 const base=new Map(normalizeLayerStyles(generated,shape).map(rule=>[key(rule),rule])),next=scoped(normalizeLayerStyles(edited,shape)),result=[];
 for(const rule of next){const original=base.get(key(rule)),declarations={};for(const [name,value] of Object.entries(rule.declarations))if(original?.declarations[name]!==value)declarations[name]=value;
  for(const name of Object.keys(original?.declarations??{}))if(!(name in rule.declarations))declarations[name]='initial';
  if(Object.keys(declarations).length)result.push({...rule,declarations});base.delete(key(rule));
 }
 for(const rule of base.values())result.push({...rule,declarations:Object.fromEntries(Object.keys(rule.declarations).map(name=>[name,'initial']))});
 return formatLayerStyles(result);
}
export function editableLayerStyles(generated,shape){
 const rules=new Map(normalizeLayerStyles(generated,shape).map(rule=>[key(rule),rule]));
 for(const rule of scoped(parseLayerStyles(shape.custom_css??''))){const previous=rules.get(key(rule));if(previous)Object.assign(previous.declarations,rule.declarations);else rules.set(key(rule),rule);}
 return formatLayerStyles([...rules.values()].map(rule=>({...rule,selector:rule.selector.replaceAll(layerStyleRoot,'.'+layoutClass(shape))})));
}
export function renderLayerStyles(shape){return formatLayerStyles(scoped(parseLayerStyles(shape.custom_css??'')).map(rule=>({...rule,selector:rule.selector.replaceAll(layerStyleRoot,'.px-node-'+shape.id)})));}
