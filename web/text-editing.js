import {fontCss, textStyle} from './typography.js';

// Keep layout previews out of document history. A completed editing session is
// one document undo step; native text undo remains available while typing.
export function textEditSession(editor, shape) {
  shape=structuredClone(shape);
  let text=shape.text, document=JSON.parse(editor.snapshot());
  return {
    id:shape.id,
    get text(){return text;},
    get document(){return document;},
    preview(value){
      value=value.replace(/\r\n?/g,'\n');
      if(new TextEncoder().encode(value).length>10_000)throw new Error('This text is too long for one layer. Split it into smaller text layers.');
      const next=JSON.parse(editor.preview_update_many(JSON.stringify([{...shape,text:value}])));
      text=value;document=next;return next;
    },
    commit(){
      if(!text){editor.remove_many(JSON.stringify([shape.id]));return true;}
      if(text!==shape.text)editor.update(JSON.stringify({...shape,text}));return text!==shape.text;
    },
  };
}

// Chromium normally uses literal newlines in plaintext-only editors. Handle
// block/BR markup too, including the final placeholder BR used for an empty line.
export function editableText(root) {
  let result='';
  const walk=parent=>{
    let previousBlock=false;
    for(const [index,node] of [...parent.childNodes].entries()){
      const block=['DIV','P'].includes(node.nodeName);
      if(index>0&&(block||previousBlock))result+='\n';
      if(node.nodeType===3)result+=node.nodeValue;
      else if(node.nodeName==='BR'){
        if(node.nextSibling)result+='\n';
      }else walk(node);
      previousBlock=block;
    }
  };
  walk(root);return result.replace(/\r\n?/g,'\n');
}

export function textWordRange(text, offset) {
  const words=[...new Intl.Segmenter(undefined,{granularity:'word'}).segment(text)];
  const word=words.find(w=>offset>=w.index&&offset<w.index+w.segment.length)??words.at(-1);
  return word?[word.index,word.index+word.segment.length]:[0,0];
}

export function drawnText(start,end,zoom=1) {
  const dragged=Math.hypot(end.x-start.x,end.y-start.y)*zoom>4;
  return {id:0,kind:'text',name:'Text',x:dragged?Math.min(start.x,end.x):start.x,y:dragged?Math.min(start.y,end.y):start.y,
    width:dragged?Math.max(1,Math.abs(end.x-start.x)):1,height:dragged?Math.max(1,Math.abs(end.y-start.y)):32,
    fill:'#000000',text:'',hidden:false,typography:{sizing:dragged?'fixed':'width',font_size:32,font_family:'Manrope',font_weight:600,align:'left',line_height:1.2,wrap:true}};
}

export function mountTextEditor(canvas,{input,finish,zoom}) {
  const host=document.createElement('div');host.className='canvas-text-editor';host.hidden=true;
  const field=document.createElement('div');field.className='canvas-text-input';field.contentEditable='plaintext-only';field.setAttribute('role','textbox');field.setAttribute('aria-multiline','true');field.setAttribute('aria-label','Edit text on canvas');field.setAttribute('aria-describedby','hint');field.spellcheck=false;
  host.append(field);canvas.after(host);
  let composing=false;
  field.addEventListener('input',()=>input(editableText(field)));
  field.addEventListener('compositionstart',()=>{composing=true;});
  field.addEventListener('compositionend',()=>{composing=false;input(editableText(field));});
  field.addEventListener('keydown',event=>{
    event.stopPropagation();
    if(composing||event.isComposing||event.keyCode===229)return;
    if(event.key==='Escape'||event.key==='Enter'&&(event.metaKey||event.ctrlKey)){
      event.preventDefault();finish({focus:true});
    }else if((event.metaKey||event.ctrlKey)&&['+','=','-','0'].includes(event.key)){
      event.preventDefault();zoom(event.key);
    }else if(event.key==='Tab')finish({focus:false});
    else if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='s'){
      event.preventDefault();if(finish({focus:true}))document.getElementById('save').click();
    }
  });
  // The canvas owns pan/zoom even while the caret has focus.
  host.addEventListener('wheel',event=>{
    event.preventDefault();canvas.dispatchEvent(new WheelEvent('wheel',{deltaX:event.deltaX,deltaY:event.deltaY,deltaMode:event.deltaMode,ctrlKey:event.ctrlKey,metaKey:event.metaKey,shiftKey:event.shiftKey,clientX:event.clientX,clientY:event.clientY}));
  },{passive:false});
  return {
    contains:target=>host.contains(target),
    value:()=>editableText(field),
    open(shape){field.textContent=shape.text;field.removeAttribute('aria-invalid');host.hidden=false;},
    focus(point,word=false){
      field.focus({preventScroll:true});
      const selection=window.getSelection(),range=document.createRange();
      range.selectNodeContents(field);
      if(point){
        const caret=document.caretRangeFromPoint?.(point.clientX,point.clientY);
        if(caret&&field.contains(caret.startContainer)){
          range.setStart(caret.startContainer,caret.startOffset);range.collapse(true);
          if(word&&caret.startContainer.nodeType===3){const [a,b]=textWordRange(caret.startContainer.nodeValue,caret.startOffset);range.setStart(caret.startContainer,a);range.setEnd(caret.startContainer,b);}
        }else range.collapse(false);
      }
      selection.removeAllRanges();selection.addRange(range);
    },
    invalid(value){field.setAttribute('aria-invalid',String(value));},
    close(){host.hidden=true;field.textContent='';composing=false;},
    render(shape,{pan,zoom,layout,css=false,baselineOffset=0}){
      if(host.hidden)return;
      const t=textStyle(shape),step=t.font_size*t.line_height;
      const contentHeight=css?layout.lines.length*step:layout.height;
      const offset=Math.max(0,shape.height-contentHeight)*(t.vertical_align==='center'?.5:t.vertical_align==='bottom'?1:0)+(css?0:baselineOffset);
      Object.assign(host.style,{transform:`translate(${pan.x+shape.x*zoom}px,${pan.y+shape.y*zoom}px) scale(${zoom}) rotate(${-(shape.rotation??0)}deg)`});
      // The real scene paints the glyphs, preserving gradients, strokes,
      // opacity, effects and clipping. This surface supplies caret/selection.
      Object.assign(field.style,{font:fontCss(t),lineHeight:String(t.line_height),textAlign:t.align,
        width:`${Math.max(1,shape.width)}px`,minHeight:`${Math.max(step,shape.height-offset)}px`,marginTop:`${offset}px`,
        whiteSpace:t.wrap?'pre-wrap':'pre',overflowWrap:t.wrap?'anywhere':'normal'});
    },
  };
}
