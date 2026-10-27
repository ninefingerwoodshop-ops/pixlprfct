import {gridTracks} from './grid-canvas.js';
import {areaTrackDefinition} from './grid-area-track-values.js';
import {gridTrackCss} from './grid-model.js';
const px=(value,unit,available,font)=>unit==='%'?value*available/100:unit==='em'?value*font:['','px'].includes(unit)?value:null;
export function areaResizeConstraints(original,requested,parent,plan){
 if(!original?.layout_item?.grid_container||!original.layout_item.grid_cell?.area||!requested||!parent||!plan)return [];
 const cell=plan.placements.find(p=>p.id===original.id);if(!cell)return [];
 const messages=[],l=parent.auto_layout,font=parent.typography?.font_size??16;
 for(const [axis,size,start,span,gap,label] of [['columns','width',cell.column,cell.column_span,plan.column_gap,'Column'],['rows','height',cell.row,cell.row_span,plan.row_gap,'Row']]){
  const delta=requested[size]-original[size];if(Math.abs(delta)<.5)continue;
  const values=plan[axis],actual=values.slice(start-1,start-1+span).reduce((a,b)=>a+b,0)+(gap??0)*(span-1);
  if(delta>0?requested[size]<=actual+.5:requested[size]>=actual-.5)continue;
  const available=parent[size]-(size==='width'?(l.padding_left??0)+(l.padding_right??0):(l.padding_top??0)+(l.padding_bottom??0));
  for(let i=start;i<start+span;i++){
   const track=areaTrackDefinition(parent,`${axis}-${i}`),measured=values[i-1];
   const min=track.mode==='minmax'?px(track.min??0,track.min_unit||'px',available,font):track.min;
   const max=track.mode==='minmax'?px(track.value,track.max_unit||'fr',available,font):track.max;
   const effectiveMax=max==null?null:Math.max(min??0,max);
   if(delta<0&&min!=null&&measured<=min+.5)messages.push({axis,index:i,limit:'min',message:`${label} ${i}: minimum ${Number(min.toFixed(2))} px reached`});
   else if(delta>0&&effectiveMax!=null&&measured>=effectiveMax-.5)messages.push({axis,index:i,limit:'max',message:`${label} ${i}: maximum ${Number(effectiveMax.toFixed(2))} px reached`});
   else if(track.mode==='minmax')messages.push({axis,index:i,limit:null,message:`${label} ${i}: sized by ${gridTrackCss(track)}`});
  }
 }
 return messages;
}

export function areaResizeFeedback(...args){return areaResizeConstraints(...args).map(c=>c.message).join(' · ');}
export function resizeLimitBoxes(frame,plan,constraints){
 const tracks=gridTracks(frame._rotationHit??frame,plan),cols=tracks.columns,rows=tracks.rows;
 if(!cols.length||!rows.length)return [];
 return constraints.filter(c=>c.limit).flatMap(c=>{
  const track=tracks[c.axis][c.index-1];if(!track)return [];
  return [{...c,x:c.axis==='columns'?track.start:cols[0].start,y:c.axis==='rows'?track.start:rows[0].start,
   width:c.axis==='columns'?track.end-track.start:cols.at(-1).end-cols[0].start,
   height:c.axis==='rows'?track.end-track.start:rows.at(-1).end-rows[0].start}];
 });
}
export function drawResizeLimits(ctx,frame,plan,constraints,zoom){
 if(!frame||!plan)return;
 const boxes=resizeLimitBoxes(frame,plan,constraints);if(!boxes.length)return;
 const pose=frame._rotationHit??frame;
 ctx.save();ctx.translate(pose.x,pose.y);ctx.rotate(-(pose.rotation??0)*Math.PI/180);ctx.translate(-pose.x,-pose.y);
 ctx.lineWidth=2/zoom;ctx.setLineDash([6/zoom,3/zoom]);ctx.fillStyle='#b4530924';ctx.strokeStyle='#92400e';
 for(const b of boxes){ctx.fillRect(b.x,b.y,b.width,b.height);ctx.strokeRect(b.x,b.y,b.width,b.height);}
 ctx.setLineDash([]);ctx.font=`600 ${11/zoom}px Inter,sans-serif`;ctx.textBaseline='top';
 for(const b of boxes){const text=`${b.axis==='columns'?'Column':'Row'} ${b.index} · ${b.limit==='min'?'Min':'Max'}`,w=ctx.measureText(text).width+12/zoom,x=b.x+4/zoom,y=b.y+4/zoom;ctx.fillStyle='#92400e';ctx.fillRect(x,y,w,20/zoom);ctx.fillStyle='#fff';ctx.fillText(text,x+6/zoom,y+4/zoom);}
 ctx.restore();
}

const previousTrackLimits=new WeakMap();
const trackScrollOrigins=new WeakMap();
const manualTrackScroll=new WeakMap();
const resumeConfirmations=new WeakMap();
const shownResumeConfirmation=new WeakSet();
function cancelResumeTimer(scroller){
 const pending=resumeConfirmations.get(scroller);
 if(pending)clearTimeout(pending.timer);
 resumeConfirmations.delete(scroller);
}
export function clearResumeConfirmation(scroller){
 cancelResumeTimer(scroller);
 const notice=scroller.querySelector?.('#track-scroll-resumed');
 if(notice){notice.hidden=true;notice.classList?.remove('is-leaving');notice.classList?.remove('is-repeat');const status=notice.querySelector('[role="status"]');if(status)status.textContent='';}
}
function confirmScrollResumed(scroller){
 cancelResumeTimer(scroller);
 const notice=scroller.querySelector?.('#track-scroll-resumed');if(!notice)return;
 notice.classList?.remove('is-leaving');
 // Subsequent resumes in this drag should not flash from transparent again.
 if(shownResumeConfirmation.has(scroller))notice.classList?.add('is-repeat');
 shownResumeConfirmation.add(scroller);
 const status=notice.querySelector('[role="status"]');if(status&&status.textContent!=='Automatic scrolling resumed.')status.textContent='Automatic scrolling resumed.';
 notice.hidden=false;
 const pending={timer:null};resumeConfirmations.set(scroller,pending);
 pending.timer=setTimeout(()=>{
  if(resumeConfirmations.get(scroller)!==pending)return;
  const view=scroller.ownerDocument?.defaultView;
  if(!view||view.matchMedia('(prefers-reduced-motion: reduce)').matches){clearResumeConfirmation(scroller);return;}
  notice.classList.add('is-leaving');
  const duration=view.getComputedStyle(notice).animationDuration.split(',')[0].trim();
  const milliseconds=parseFloat(duration)*(duration.endsWith('ms')?1:1000);
  pending.timer=setTimeout(()=>{if(resumeConfirmations.get(scroller)===pending)clearResumeConfirmation(scroller);},Number.isFinite(milliseconds)?milliseconds:120);
 },1800);
}
function showScrollPause(scroller,paused){
 if(paused)clearResumeConfirmation(scroller);
 const notice=scroller.querySelector?.('#track-scroll-paused');if(!notice)return;
 notice.hidden=!paused;
 const status=notice.querySelector('[role="status"]');
 const text=paused?'Automatic scrolling paused for this drag.':'';
 if(status&&status.textContent!==text)status.textContent=text;
}
export function isResumeScrollShortcut(event){
 return !event.isComposing&&!event.repeat&&event.altKey&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey
  &&(event.code==='KeyR'||(!event.code&&event.key?.toLowerCase()==='r'))
  &&!event.target?.closest?.('input,textarea,select,[contenteditable="true"],[role="textbox"]');
}
function trackScrollContainer(panel){
 return panel.closest?.('.inspector-content')??panel.closest?.('.right-panel');
}
function watchManualScroll(panel){
 if(manualTrackScroll.has(panel))return;
 const scroller=panel.closest?.('.right-panel');if(!scroller)return;
 const content=trackScrollContainer(panel);
 const state={manual:false,cleanup:()=>{}};
 const resume=scroller.querySelector?.('#resume-track-scroll');
 const view=panel.ownerDocument?.defaultView;
 const shortcut=e=>{if(!state.manual||!isResumeScrollShortcut(e))return;e.preventDefault();e.stopImmediatePropagation();resumeTrackScroll(panel);};
 view?.addEventListener('keydown',shortcut,{capture:true});
 const hint=scroller.querySelector?.('#resume-track-scroll-shortcut');
 if(hint)hint.textContent=/Mac|iPhone|iPad/.test(view?.navigator?.platform??'')?'⌥ R':'Alt+R';
 const resumeClick=e=>{e.stopPropagation();resumeTrackScroll(panel);};
 resume?.addEventListener?.('click',resumeClick);
 const claim=()=>{if(state.manual)return;state.manual=true;showScrollPause(scroller,true);};
 const wheel=e=>{if(!e.ctrlKey&&(e.deltaY||e.deltaX))claim();};
 const key=e=>{if(!e.target?.closest?.('input,textarea,select,button,[contenteditable="true"]')&&['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(e.key))claim();};
 const pointer=e=>{const r=content.getBoundingClientRect();if(e.clientX>=r.left+content.clientLeft+content.clientWidth)claim();};
 const listeners=[['wheel',wheel],['touchmove',claim],['keydown',key],['pointerdown',pointer]];
 for(const [type,fn] of listeners)content.addEventListener?.(type,fn,{passive:true});
 state.cleanup=()=>{clearResumeConfirmation(scroller);shownResumeConfirmation.delete(scroller);view?.removeEventListener('keydown',shortcut,{capture:true});resume?.removeEventListener?.('click',resumeClick);showScrollPause(scroller,false);for(const [type,fn] of listeners)content.removeEventListener?.(type,fn);};
 manualTrackScroll.set(panel,state);
}
export function resumeTrackScroll(panel){
 const state=manualTrackScroll.get(panel),scroller=panel.closest?.('.right-panel');
 if(!state?.manual||!scroller)return;
 state.manual=false;
 // Restore to the user's latest chosen position after this resumed segment.
 trackScrollOrigins.delete(panel);
 showScrollPause(scroller,false);
 confirmScrollResumed(scroller);
 for(const card of (previousTrackLimits.get(panel)??new Map()).keys())if(revealTrackLimit(card,panel))break;
}
export function revealTrackLimit(card,panel){
 if(manualTrackScroll.get(panel)?.manual)return false;
 const scroller=trackScrollContainer(panel);
 if(!scroller||!card.getClientRects().length)return false;
 const view=scroller.getBoundingClientRect(),rect=card.getBoundingClientRect();
 const top=view.top+scroller.clientTop+8,bottom=view.top+scroller.clientTop+scroller.clientHeight-8;
 let delta=0;
 if(rect.top<top)delta=rect.top-top;
 else if(rect.bottom>bottom)delta=rect.height>bottom-top?rect.top-top:rect.bottom-bottom;
 if(!delta)return false;
 // Scroll only the inspector, without changing focus or canvas pointer capture.
 if(!trackScrollOrigins.has(panel))trackScrollOrigins.set(panel,{scroller,top:scroller.scrollTop});
 scroller.scrollTop+=delta;
 return true;
}
export function updateTrackLimitControls(panel,constraints,dragging=constraints.length>0){
 if(dragging)watchManualScroll(panel);
 const limits=new Map(constraints.filter(c=>c.limit).map(c=>[`${c.axis}-${c.index}`,c]));
 const previous=previousTrackLimits.get(panel)??new Map(),next=new Map(),newlyLimited=[];
 for(const card of panel.querySelectorAll('[data-area-track-control]')){
  const constraint=limits.get(card.dataset.areaTrackControl),feedback=card.querySelector('.area-track-limit');
  card.classList.toggle('at-size-limit',!!constraint);
  if(constraint){next.set(card,constraint.limit);if(previous.get(card)!==constraint.limit)newlyLimited.push(card);}
  if(feedback){feedback.hidden=!constraint;const text=constraint?`${constraint.limit==='min'?'Minimum':'Maximum'} reached — change this track’s size limits to resize further.`:'';if(feedback.textContent!==text)feedback.textContent=text;}
 }
 previousTrackLimits.set(panel,next);
 // Reveal one new limit per transition, avoiding jumps between simultaneous limits.
 if(dragging){for(const card of newlyLimited)if(revealTrackLimit(card,panel))break;}
 else {
  const origin=trackScrollOrigins.get(panel);
  const manual=manualTrackScroll.get(panel);
  if(origin){if(!manual?.manual)origin.scroller.scrollTop=origin.top;trackScrollOrigins.delete(panel);}
  manual?.cleanup();manualTrackScroll.delete(panel);
 }
}
