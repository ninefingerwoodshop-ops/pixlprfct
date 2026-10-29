export const LAYER_MIME='application/x-pixlprfct-layers';
export function layerPayload(text){
 if(!text||text.length>5_000_000)return null;
 try{const value=JSON.parse(text);return value?.format==='pixlprfct.layers'?value:null;}catch{return null;}
}
export function pasteOffset(payload,target,overSelection=false,repeat=1){
 const roots=payload.shapes.filter(s=>!s.parent_id);if(!roots.length)throw new Error('Clipboard has no root layers');
 if(target)return{x:target.x+(overSelection?0:16)-Math.min(...roots.map(s=>s.x)),y:target.y+(overSelection?0:16)-Math.min(...roots.map(s=>s.y))};
 if(overSelection)return{x:0,y:0};
 return{x:24*repeat,y:24*repeat};
}

// Copied containers and the result of the last paste are sibling anchors, not
// destinations. Forget the last result as soon as the user selects elsewhere.
export function createPasteContext(){
 let copied=null,pasted=null;
 const sameIds=(a,b)=>a.length===b.length&&a.every(id=>b.includes(id));
 return{
  reset(){copied=null;pasted=null;},
  copy(text,ids){copied={text,ids:[...ids]};pasted=null;},
  select(ids){if(pasted&&!sameIds(pasted.ids,ids))pasted=null;},
  paste(text,ids,frames=null){pasted={text,ids:[...ids],frames};},
  placement(text,payload,shapes,ids,{overSelection=false,repeat=1}={}){
   const selection=ids.map(id=>shapes.find(s=>s.id===id)).filter(Boolean),current=selection.length===1?selection[0]:null;
   if(overSelection)return{parent:current?.parent_id??0,offset:pasteOffset(payload,current,true)};
   if(pasted?.text===text&&pasted.frames&&sameIds(pasted.ids,ids))return{frames:pasted.frames};
   const siblings=new Set([...(copied?.text===text?copied.ids:[]),...(pasted?.text===text?pasted.ids:[])]);
   const destinations=selection.filter(s=>['frame','group'].includes(s.kind)&&!siblings.has(s.id));
   if(selection.length>1&&destinations.length===selection.length&&destinations.every(s=>s.kind==='frame'))return{frames:ids};
   if(current&&destinations.length)return{parent:current.id,offset:pasteOffset(payload,current)};
   // A leaf or copied container anchors the paste at its current nesting level.
   // Mixed-parent selections use their closest shared ancestor.
   const ancestry=s=>{const parents=[];let parent=s.parent_id;while(parent){parents.push(parent);parent=shapes.find(s=>s.id===parent)?.parent_id;}return[...parents,0];};
   const paths=selection.map(ancestry),parent=paths[0]?.find(id=>paths.every(path=>path.includes(id)))??0;
   const anchor=selection.length?{x:Math.min(...selection.map(s=>s.x)),y:Math.min(...selection.map(s=>s.y))}:null;
   const offset=pasteOffset(payload,anchor,true);
   return{parent,offset:{x:offset.x+24*(anchor?1:repeat),y:offset.y+24*(anchor?1:repeat)}};
  },
 };
}
