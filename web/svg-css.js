// A deliberately small CSS reader for <style> blocks in imported SVG files.
// Design tools export paint as class rules (`.cls-1{fill:#f00}`), which is all
// this supports: type, class, id and universal selectors, alone or compounded,
// in comma-separated lists. Anything else is refused so artwork is never
// imported with silently missing styles.
const IDENT='-?[_a-zA-Z][-_a-zA-Z0-9]*';
const COMPOUND=new RegExp(`^(\\*|${IDENT})?((?:[.#]${IDENT})*)$`);

function selector(text){
 const source=text.trim(),match=source.match(COMPOUND);
 if(!source||!match||(!match[1]&&!match[2]))throw new Error('Unsupported SVG CSS selector: '+source.slice(0,60)+'. Use element, class or id selectors.');
 const parts=match[2].match(new RegExp(`[.#]${IDENT}`,'g'))??[],ids=parts.filter(p=>p[0]==='#').map(p=>p.slice(1)),classes=parts.filter(p=>p[0]==='.').map(p=>p.slice(1)),tag=match[1]&&match[1]!=='*'?match[1]:null;
 return {tag,ids,classes,specificity:ids.length*10000+classes.length*100+(tag?1:0)};
}

/**
 * @param {string} css Text of one or more <style> elements.
 * @param {Set<string>} allowed Property names the importer understands.
 * @returns {{tag:string|null,ids:string[],classes:string[],specificity:number,order:number,declarations:[string,string][]}[]}
 */
export function parseSvgCss(css,allowed){
 const text=css.replace(/\/\*[\s\S]*?\*\//g,' ').replace(/<!--|-->/g,' ');
 if(text.includes('@'))throw new Error('Unsupported SVG CSS rule: @'+(text.match(/@([-a-zA-Z]*)/)?.[1]??'')+'. Media queries, imports and fonts are not supported.');
 const rules=[];let rest=text,order=0;
 while(rest.trim()){
  const open=rest.indexOf('{'),close=rest.indexOf('}');
  if(open<0||close<open||rest.slice(open+1,close).includes('{'))throw new Error('Invalid SVG CSS');
  const declarations=[];
  for(const part of rest.slice(open+1,close).split(';')){
   if(!part.trim())continue;
   const at=part.indexOf(':'),key=part.slice(0,at).trim().toLowerCase(),value=part.slice(at+1).trim();
   if(at<0||!key||!value)throw new Error('Invalid SVG CSS declaration');
   if(/!\s*important\s*$/i.test(value))throw new Error('Unsupported SVG CSS: !important');
   // Checked for every rule, matched or not: an unknown property is never dropped silently.
   if(!allowed.has(key))throw new Error('Unsupported SVG style: '+key);
   declarations.push([key,value]);
  }
  for(const item of rest.slice(0,open).split(','))rules.push({...selector(item),order:order++,declarations});
  if(rules.length>2000)throw new Error('SVG CSS has too many rules');
  rest=rest.slice(close+1);
 }
 // Later and more specific rules win, so apply them last.
 return rules.sort((a,b)=>a.specificity-b.specificity||a.order-b.order);
}

/** Declarations from every rule matching this element, least important first. */
export function matchSvgCss(rules,tag,attrs){
 if(!rules.length)return [];
 const classes=new Set((attrs.class??'').split(/\s+/).filter(Boolean)),id=attrs.id??null,found=[];
 for(const rule of rules){
  if(rule.tag&&rule.tag!==tag)continue;
  if(rule.ids.some(value=>value!==id)||rule.classes.some(value=>!classes.has(value)))continue;
  found.push(...rule.declarations);
 }
 return found;
}
