// Formatted descriptions. The stored value stays a plain string; a small,
// fixed Markdown subset is interpreted for display: **bold**, *italic* or
// _italic_, `code`, [text](https://…) links, and "- " / "1. " list lines.
// Rendering builds DOM nodes from text only. Description text is never parsed
// as HTML, and links are limited to http, https and mailto.
const SAFE_LINK=/^(https?:\/\/|mailto:)[^\s<>"]+$/i;
const word=c=>c!==undefined&&/[\p{L}\p{N}]/u.test(c);
const space=c=>c===undefined||/\s/.test(c);

// Find the closing marker for an emphasis run opened at `from`.
function closing(text,from,marker){
 for(let i=from;i<text.length;i++){
  if(text[i]==='\\'){i++;continue;}
  if(text[i]==='`'){const end=text.indexOf('`',i+1);if(end>0){i=end;continue;}}
  if(!text.startsWith(marker,i)||space(text[i-1]))continue;
  // A single * must not be half of a ** pair; _ must end at a word boundary.
  if(marker==='*'&&(text[i+1]==='*'||text[i-1]==='*'))continue;
  if(marker==='_'&&word(text[i+1]))continue;
  return i;
 }
 return -1;
}
export function parseInline(text,style={}){
 const runs=[];let plain='';
 const flush=()=>{if(plain){runs.push({text:plain,...style});plain='';}};
 for(let i=0;i<text.length;){
  const c=text[i];
  if(c==='\\'&&'\\*_`[]()'.includes(text[i+1]??'\n')){plain+=text[i+1];i+=2;continue;}
  if(c==='`'){const end=text.indexOf('`',i+1);if(end>i+1){flush();runs.push({text:text.slice(i+1,end),...style,code:true});i=end+1;continue;}}
  if(c==='['){
   const close=text.indexOf('](',i+1),end=close>0?text.indexOf(')',close+2):-1;
   if(close>i+1&&end>0&&!text.slice(i+1,close).includes('\n')){
    const href=text.slice(close+2,end).trim();
    if(SAFE_LINK.test(href)){flush();runs.push(...parseInline(text.slice(i+1,close),{...style,href}));i=end+1;continue;}
   }
  }
  const marker=text.startsWith('**',i)?'**':c==='*'||c==='_'?c:'';
  // An opening marker is followed by text; _ also starts at a word boundary.
  if(marker&&!space(text[i+marker.length])&&!(marker==='_'&&word(text[i-1]))){
   const end=closing(text,i+marker.length+1,marker);
   if(end>0){flush();runs.push(...parseInline(text.slice(i+marker.length,end),{...style,[marker==='**'?'bold':'italic']:true}));i=end+marker.length;continue;}
  }
  plain+=c;i++;
 }
 flush();return runs;
}
// Blocks: paragraphs (single newlines are line breaks) and lists.
export function parseDescription(text){
 const blocks=[];let paragraph=[];
 const end=()=>{if(paragraph.length){blocks.push({type:'paragraph',lines:paragraph.map(line=>parseInline(line))});paragraph=[];}};
 for(const raw of String(text??'').replace(/\r\n?/g,'\n').split('\n')){
  const item=/^\s{0,3}(?:([-*•])|(\d{1,3})[.)])\s+(.*)$/.exec(raw);
  if(item){
   end();const ordered=!!item[2],last=blocks.at(-1);
   if(last?.type==='list'&&last.ordered===ordered)last.items.push(parseInline(item[3]));
   else blocks.push({type:'list',ordered,items:[parseInline(item[3])]});
  }else if(!raw.trim())end();
  else paragraph.push(raw.trim());
 }
 end();return blocks;
}
export const hasFormatting=text=>parseDescription(text).some(b=>b.type==='list'||b.lines.some(line=>line.some(run=>run.bold||run.italic||run.code||run.href)));
// For tooltips and other plain-text surfaces.
export function plainDescription(text){
 const flat=runs=>runs.map(run=>run.text).join('');
 return parseDescription(text).map(b=>b.type==='list'?b.items.map((item,i)=>(b.ordered?`${i+1}. `:'• ')+flat(item)).join('\n'):b.lines.map(flat).join('\n')).join('\n\n');
}
export function renderDescription(text,doc=document){
 const fragment=doc.createDocumentFragment();
 const inline=(host,runs)=>{
  for(const run of runs){
   let node=doc.createTextNode(run.text);
   for(const [on,tag] of [[run.code,'code'],[run.italic,'em'],[run.bold,'strong']])if(on){const wrap=doc.createElement(tag);wrap.append(node);node=wrap;}
   if(run.href){const link=doc.createElement('a');link.href=run.href;link.target='_blank';link.rel='noopener noreferrer';link.append(node);node=link;}
   host.append(node);
  }
 };
 for(const block of parseDescription(text)){
  if(block.type==='list'){
   const list=doc.createElement(block.ordered?'ol':'ul');
   for(const item of block.items){const li=doc.createElement('li');inline(li,item);list.append(li);}
   fragment.append(list);
  }else{
   const p=doc.createElement('p');
   block.lines.forEach((line,i)=>{if(i)p.append(doc.createElement('br'));inline(p,line);});
   fragment.append(p);
  }
 }
 return fragment;
}
// Toolbar edits on a textarea value. Returns the new value and selection.
const wraps={bold:'**',italic:'*',code:'`'};
export function formatSelection(value,start,end,kind){
 const selected=value.slice(start,end);
 if(wraps[kind]){
  const m=wraps[kind],n=m.length;
  // Toggle off when the selection is already wrapped, inside or outside.
  if(selected.length>=2*n&&selected.startsWith(m)&&selected.endsWith(m)&&!(kind==='italic'&&selected.startsWith('**')))return {value:value.slice(0,start)+selected.slice(n,-n)+value.slice(end),start,end:end-2*n};
  if(value.slice(start-n,start)===m&&value.slice(end,end+n)===m&&!(kind==='italic'&&value.slice(start-2,start)==='**'))return {value:value.slice(0,start-n)+selected+value.slice(end+n),start:start-n,end:end-n};
  const inner=selected||{bold:'bold text',italic:'italic text',code:'code'}[kind];
  return {value:value.slice(0,start)+m+inner+m+value.slice(end),start:start+n,end:start+n+inner.length};
 }
 if(kind==='link'){
  const label=selected||'link text',url='https://';
  const next=value.slice(0,start)+`[${label}](${url})`+value.slice(end),at=start+label.length+3;
  return {value:next,start:at,end:at+url.length};
 }
 if(kind==='bulleted'||kind==='numbered'){
  const from=value.lastIndexOf('\n',start-1)+1,after=value.indexOf('\n',Math.max(end-1,start)),to=after<0?value.length:after;
  const lines=value.slice(from,to).split('\n'),marker=/^\s{0,3}(?:[-*•]|\d{1,3}[.)])\s+/;
  const already=lines.every(line=>!line.trim()||(kind==='bulleted'?/^\s{0,3}[-*•]\s+/:/^\s{0,3}\d{1,3}[.)]\s+/).test(line));
  let count=0;
  const block=lines.map(line=>{if(!line.trim())return line;const bare=line.replace(marker,'');return already?bare:(kind==='bulleted'?'- ':`${++count}. `)+bare;}).join('\n');
  return {value:value.slice(0,from)+block+value.slice(to),start:from,end:from+block.length};
 }
 return {value,start,end};
}
