// Direct editing of a formatted description, as in Figma's Edit slot property
// popover: the text is edited as it will look, and saved as the same
// Markdown-style markers rich-description.js reads.
import {renderDescription} from './rich-description.js';

const BLOCKS=new Set(['P','DIV','H1','H2','H3','H4','H5','H6','UL','OL','LI','PRE','BLOCKQUOTE','SECTION','ARTICLE']);
const escapeText=text=>text.replace(/ /g,' ').replace(/([\\*_~`[\]])/g,'\\$1');
// A paragraph line that would read back as a heading, list item or fence keeps its first mark as text.
const escapeLine=line=>line.replace(/^(\s{0,3})(#{1,3}\s)/,'$1\\$2').replace(/^(\s{0,3})([-•]\s)/,'$1\\$2').replace(/^(\s{0,3}\d{1,3})([.)]\s)/,'$1\\$2');
const safeHref=href=>/^(https?:\/\/|mailto:)[^\s()]+$/i.test(href??'')?href:null;
const tagOf=node=>(node.nodeName??'').toUpperCase();
const styled=(node,ctx)=>{
 const style=node.style??{},tag=tagOf(node),weight=String(style.fontWeight??'');
 return {
  bold:!ctx.bold&&(tag==='B'||tag==='STRONG'||weight==='bold'||Number(weight)>=600),
  italic:!ctx.italic&&(tag==='I'||tag==='EM'||style.fontStyle==='italic'),
  strike:!ctx.strike&&(tag==='S'||tag==='STRIKE'||tag==='DEL'||String(style.textDecoration??style.textDecorationLine??'').includes('line-through')),
 };
};
// Markers go inside any surrounding spaces, or they would not read back as formatting.
const wrap=(inner,mark)=>{const m=/^(\s*)([\s\S]*?)(\s*)$/.exec(inner);return m[2]?m[1]+mark+m[2]+mark+m[3]:inner;};
function inline(node,ctx={}){
 if(node.nodeType===3)return escapeText(node.nodeValue??node.textContent??'');
 if(node.nodeType!==1)return '';
 const tag=tagOf(node);
 if(tag==='BR')return '\n';
 if(tag==='CODE'){const text=(node.textContent??'').replace(/`/g,'').replace(/\s+/g,' ');return text.trim()?wrap(text,'`'):text;}
 const flags=styled(node,ctx),next={...ctx,bold:ctx.bold||flags.bold,italic:ctx.italic||flags.italic,strike:ctx.strike||flags.strike};
 let text=[...node.childNodes].map(child=>inline(child,next)).join('');
 if(tag==='A'){const href=safeHref(node.getAttribute?.('href'));if(href&&text.trim())text=wrap(text,'\u0000').replace('\u0000','[').replace('\u0000',`](${href})`);}
 if(flags.strike)text=wrap(text,'~~');if(flags.italic)text=wrap(text,'*');if(flags.bold)text=wrap(text,'**');
 return text;
}
const oneLine=text=>text.replace(/\s*\n\s*/g,' ').trim();
// The marker string for an edited tree.
export function serializeRich(root){
 const out=[];let run='';
 const flush=()=>{const text=run.replace(/^\n+|\n+$/g,'');run='';if(text.trim())out.push(text.split('\n').map(escapeLine).join('\n'));};
 const walk=parent=>{
  for(const node of parent.childNodes){
   const tag=node.nodeType===1?tagOf(node):'';
   if(!BLOCKS.has(tag)){run+=inline(node);continue;}
   flush();
   if(/^H[1-6]$/.test(tag)){const text=oneLine(inline(node));if(text)out.push('# '+text);}
   else if(tag==='UL'||tag==='OL'){const items=[...node.childNodes].filter(child=>child.nodeType===1&&tagOf(child)==='LI').map(item=>oneLine(inline(item))).filter(Boolean);if(items.length)out.push(items.map((text,i)=>(tag==='OL'?`${i+1}. `:'- ')+text).join('\n'));}
   else if(tag==='PRE'){const text=(node.textContent??'').replace(/\n+$/,'');if(text.trim())out.push('```\n'+text+'\n```');}
   else if([...node.childNodes].some(child=>child.nodeType===1&&BLOCKS.has(tagOf(child)))){walk(node);flush();}
   else{run=inline(node);flush();}
  }
 };
 walk(root);flush();return out.join('\n\n');
}

export const RICH_TOOLS=[['bold','text-bold','Bold'],['italic','text-italic','Italic'],['strike','text-strikethrough','Strikethrough'],['heading','heading-1','Heading'],['bulleted','list-bulleted','Bulleted list'],['numbered','list-numbered','Numbered list'],['link','link','Link'],['code','text-code','Code'],['codeblock','code-block','Code block']];

// The editing surface. `tool(kind)` applies one of RICH_TOOLS to the selection;
// `value()` is the marker string; `onInput` and `onCommit` report edits.
export function richEditor({document,value='',label,placeholder='',onInput=()=>{},onCommit=()=>{}}){
 const view=document.defaultView,surface=document.createElement('div'),linkBar=document.createElement('div'),linkInput=document.createElement('input');
 surface.className='rich-editor slot-description';surface.contentEditable='true';surface.spellcheck=true;surface.setAttribute('role','textbox');surface.setAttribute('aria-multiline','true');surface.setAttribute('aria-label',label);surface.dataset.placeholder=placeholder;
 linkBar.className='rich-editor-link';linkBar.hidden=true;linkInput.type='url';linkInput.placeholder='Paste or type a link';linkInput.setAttribute('aria-label','Link address');linkBar.append(linkInput);
 const set=text=>{surface.replaceChildren(renderDescription(text,document));mark();};
 const read=()=>serializeRich(surface);
 const mark=()=>surface.classList.toggle('empty',!surface.textContent.trim()&&!surface.querySelector('li,pre,h1,h2,h3,h4,h5,h6'));
 let range=null,committed=value;
 const keep=()=>{const selection=view.getSelection();if(selection?.rangeCount&&surface.contains(selection.anchorNode))range=selection.getRangeAt(0).cloneRange();};
 const restore=()=>{surface.focus();if(!range)return;const selection=view.getSelection();selection.removeAllRanges();selection.addRange(range);};
 const inside=tags=>{let node=view.getSelection()?.anchorNode;while(node&&node!==surface){if(node.nodeType===1&&tags.includes(node.nodeName))return node;node=node.parentNode;}return null;};
 const command=(name,argument=null)=>document.execCommand(name,false,argument);
 const changed=()=>{mark();keep();onInput(read());};
 const commit=()=>{const next=read();if(next===committed)return;committed=next;onCommit(next);};
 function tool(kind){
  if(kind==='link'&&!inside(['A'])){keep();linkBar.hidden=false;linkInput.value='https://';linkInput.focus();linkInput.select();return;}
  restore();
  if(kind==='bold')command('bold');else if(kind==='italic')command('italic');else if(kind==='strike')command('strikeThrough');
  else if(kind==='bulleted')command('insertUnorderedList');else if(kind==='numbered')command('insertOrderedList');
  else if(kind==='heading')command('formatBlock',inside(['H1','H2','H3','H4','H5','H6'])?'p':'h4');
  else if(kind==='codeblock')command('formatBlock',inside(['PRE'])?'p':'pre');
  else if(kind==='link')command('unlink');
  else if(kind==='code'){
   const code=inside(['CODE']),selection=view.getSelection();
   if(code){code.replaceWith(document.createTextNode(code.textContent));}
   else if(selection?.rangeCount&&!selection.isCollapsed){const picked=selection.getRangeAt(0),node=document.createElement('code');node.textContent=picked.toString();picked.deleteContents();picked.insertNode(node);selection.selectAllChildren(node);}
  }
  changed();
 }
 const applyLink=()=>{const href=safeHref(linkInput.value.trim());linkBar.hidden=true;restore();if(href&&range&&!range.collapsed){command('createLink',href);changed();}};
 linkInput.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Enter'){event.preventDefault();applyLink();}else if(event.key==='Escape'){event.preventDefault();linkBar.hidden=true;restore();}});
 linkInput.addEventListener('blur',()=>{linkBar.hidden=true;});
 surface.addEventListener('input',changed);
 surface.addEventListener('keyup',keep);surface.addEventListener('pointerup',keep);
 surface.addEventListener('focus',()=>{try{command('defaultParagraphSeparator','p');}catch{}});
 // Leaving for the link field is still editing; anything else commits.
 surface.addEventListener('blur',event=>{keep();if(event.relatedTarget!==linkInput)commit();});
 surface.addEventListener('paste',event=>{event.preventDefault();command('insertText',event.clipboardData?.getData('text/plain')??'');});
 surface.addEventListener('keydown',event=>{
  if(event.key==='Escape')return;
  event.stopPropagation();
  const mod=(event.ctrlKey||event.metaKey)&&!event.altKey,key=event.key.toLowerCase(),kind=mod&&!event.shiftKey?{b:'bold',i:'italic',e:'code',k:'link'}[key]:mod&&event.shiftKey&&key==='x'?'strike':null;
  if(kind){event.preventDefault();keep();tool(kind);}
 });
 set(value);
 return {surface,linkBar,tool,value:read,set(text){committed=text;set(text);},commit,keep};
}
