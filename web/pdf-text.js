// Invisible text layer for PDF export. Pages are still painted as one image by
// the canvas renderer; these runs sit over the pixels in text render mode 3 so
// viewers can select, copy and search the words. Nothing here draws artwork.
import {layoutText,textStyle,spacedMeasure} from './typography.js';
import {worldShape,worldPoint,rotatedContains} from './rotation.js';
import {pathGlyphs} from './canvas-tools.js';

// Control characters have no place in a text run and upset some extractors.
const clean=text=>text.replace(/[\u0000-\u001f\u007f\u2028\u2029]/g,' ');

// Word-sized pieces of a laid-out line, each with its offset and width in the
// line. Trailing spaces stay with their word so copied text keeps its spacing.
export function lineRuns(text,measure){
 const runs=[];let prefix='';
 for(const token of text.match(/^\s+|\S+\s*/gu)??[]){
  const start=measure(prefix);prefix+=token;
  if(token.trim())runs.push({text:token,offset:start,width:measure(prefix)-start});
 }
 return runs;
}

// `measure(shape,text)` returns the advance of `text` in the shape's font, without
// letter spacing. Runs come back in page points with a top-left origin:
// {text,x,y,width,size,angle} where x,y is the start of the baseline and angle
// is counter-clockwise degrees, matching layer rotation.
export function pdfTextRuns(shapes,box,measure,baselineOf){
 const byId=new Map(shapes.map(s=>[s.id,s])),world=new Map(),runs=[];
 const worldOf=s=>{if(!world.has(s.id))world.set(s.id,worldShape(s,shapes,byId));return world.get(s.id);};
 const page={x:box.x,y:box.y,width:box.width,height:box.height};
 for(const shape of shapes){
  if(shape.kind!=='text'||!shape.text)continue;
  const chain=[shape];for(let p=byId.get(shape.parent_id),seen=new Set();p&&!seen.has(p.id);p=byId.get(p.parent_id)){seen.add(p.id);chain.push(p);}
  if(chain.some(s=>s.hidden||(s.appearance?.opacity??1)===0))continue;
  const a=shape.appearance??{};
  // A layer with neither fill nor stroke paints no glyphs, so it gets no text either.
  if(a.fill_enabled===false&&!a.stroke_enabled)continue;
  const clips=chain.slice(1).filter(s=>s.kind==='frame'&&s.clip_content).map(worldOf),own=worldOf(shape),style=textStyle(shape),size=style.font_size;
  if(!(size>0))continue;
  const widthOf=spacedMeasure(text=>measure(shape,text),style);
  // `local` is in the layer's unrotated space; rotation pivots on its top-left corner.
  const add=(text,local,width,angle,clipToLayer)=>{
   text=clean(text);if(!text.trim()||!(width>0))return;
   const rad=angle*Math.PI/180,middle={x:local.x+Math.cos(rad)*width/2,y:local.y-Math.sin(rad)*width/2-size*.3};
   if(clipToLayer&&!rotatedContains({...shape,rotation:0},middle))return;
   const start=worldPoint({...own,x:shape.x,y:shape.y},local),center=worldPoint({...own,x:shape.x,y:shape.y},middle);
   // worldPoint pivots on the given origin; shift from the local origin to the world one.
   const dx=own.x-shape.x,dy=own.y-shape.y,at={x:start.x+dx,y:start.y+dy},mid={x:center.x+dx,y:center.y+dy};
   if(!rotatedContains({...page,rotation:0},mid)||clips.some(clip=>!rotatedContains(clip,mid)))return;
   runs.push({text,x:at.x-box.x,y:at.y-box.y,width,size,angle:angle+(own.rotation??0)});
  };
  if(shape.editor_meta?.text_path){
   // Path text is one run along the chord from its first to its last glyph.
   const glyphs=pathGlyphs(shape,text=>measure(shape,text));if(!glyphs.length)continue;
   const first=glyphs[0],last=glyphs.at(-1),half=g=>widthOf(g.text)/2;
   const from={x:first.x-Math.cos(first.angle)*half(first),y:first.y-Math.sin(first.angle)*half(first)},to={x:last.x+Math.cos(last.angle)*half(last),y:last.y+Math.sin(last.angle)*half(last)};
   const width=Math.hypot(to.x-from.x,to.y-from.y);
   add(glyphs.map(g=>g.text).join(''),from,width,-Math.atan2(to.y-from.y,to.x-from.x)*180/Math.PI,false);
   continue;
  }
  const baseline=baselineOf(shape),layout=layoutText(shape,text=>measure(shape,text),baseline),fraction=style.align==='center'?.5:style.align==='right'?1:0;
  for(const line of layout.lines){
   const left=line.x-fraction*widthOf(line.text);
   for(const run of lineRuns(line.text,widthOf))add(run.text,{x:left+run.offset,y:line.y+layout.baseline},run.width,0,true);
  }
 }
 return runs;
}
