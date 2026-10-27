import test from 'node:test';import assert from 'node:assert/strict';
import {areaResizeFeedback as feedback} from '../web/grid-resize-feedback.js';
const shape={id:2,width:100,height:80,layout_item:{grid_container:true,grid_cell:{area:'body'}}};
const parent={width:400,height:300,auto_layout:{grid:{columns:[{mode:'minmax',value:180,min:80,min_unit:'px',max_unit:'px'}],rows:[{mode:'fixed',value:80,min:40,max:120}]}}};
const plan=(w,h=80)=>({columns:[w],rows:[h],placements:[{id:2,column:1,row:1,column_span:1,row_span:1}]});
test('reports minimum and maximum only when dragging beyond the resolved limit',()=>{
 assert.match(feedback(shape,{width:40,height:80},parent,plan(80)),/Column 1: minimum 80 px reached/);
 assert.match(feedback(shape,{width:250,height:160},parent,plan(180,120)),/Column 1: maximum 180 px reached · Row 1: maximum 120 px reached/);
 assert.equal(feedback(shape,{width:140,height:80},parent,plan(140)),'');
 assert.equal(feedback(shape,null,parent,plan(180)),'');
});
test('distinguishes responsive sizing from an actual maximum and resolves percent bounds',()=>{
 const responsive=structuredClone(parent);responsive.auto_layout.grid.columns[0]={mode:'minmax',min:25,min_unit:'%',value:1,max_unit:'fr'};
 assert.match(feedback(shape,{width:300,height:80},responsive,plan(200)),/sized by minmax\(25%,1fr\)/);
 assert.match(feedback(shape,{width:50,height:80},responsive,plan(100)),/minimum 100 px reached/);
});

test('highlights exact limiting tracks, spanning the grid and excluding responsive-only feedback',async()=>{
 const {areaResizeConstraints,resizeLimitBoxes}=await import('../web/grid-resize-feedback.js');
 const frame={...parent,x:10,y:20,auto_layout:{...parent.auto_layout,padding_left:5,padding_top:7}};
 const measured=plan(180,120),constraints=areaResizeConstraints(shape,{width:250,height:160},frame,measured);
 assert.deepEqual(constraints.map(c=>[c.axis,c.index,c.limit]),[['columns',1,'max'],['rows',1,'max']]);
 const boxes=resizeLimitBoxes(frame,measured,constraints);
 assert.equal(boxes.length,2);assert.deepEqual([boxes[0].x,boxes[0].y,boxes[0].width,boxes[0].height],[15,27,180,120]);
 assert.deepEqual(resizeLimitBoxes(frame,measured,[{axis:'columns',index:1,limit:null}]),[]);
 assert.deepEqual(areaResizeConstraints(shape,null,frame,measured),[]);
});

test('inspector highlights only limiting tracks and clears them when drag ends or limit changes',async()=>{
 const {updateTrackLimitControls}=await import('../web/grid-resize-feedback.js');
 const card=key=>({dataset:{areaTrackControl:key},classList:{toggle(name,value){this.active=value;}},feedback:{textContent:'',hidden:true},querySelector(){return this.feedback;}});
 const column=card('columns-1'),row=card('rows-2'),panel={querySelectorAll:()=>[column,row]};
 updateTrackLimitControls(panel,[{axis:'columns',index:1,limit:'max'},{axis:'rows',index:2,limit:null}]);
 assert.equal(column.classList.active,true);assert.match(column.feedback.textContent,/Maximum reached/);assert.equal(row.classList.active,false);
 updateTrackLimitControls(panel,[{axis:'rows',index:2,limit:'min'}]);
 assert.equal(column.classList.active,false);assert.equal(column.feedback.hidden,true);assert.match(row.feedback.textContent,/Minimum reached/);
 updateTrackLimitControls(panel,[]);assert.equal(row.classList.active,false);assert.equal(row.feedback.textContent,'');assert.equal(row.feedback.hidden,true);
});

test('new limits scroll only the inspector when off screen and do not repeat during a drag',async()=>{
 const {updateTrackLimitControls}=await import('../web/grid-resize-feedback.js');
 const scroller={scrollTop:0,clientTop:0,clientHeight:300,getBoundingClientRect:()=>({top:100})};
 const feedback={hidden:true,textContent:''};
 const card={dataset:{areaTrackControl:'columns-1'},classList:{toggle(){}},querySelector:()=>feedback,getClientRects:()=>[{}],getBoundingClientRect:()=>({top:450-scroller.scrollTop,bottom:550-scroller.scrollTop,height:100})};
 const panel={querySelectorAll:()=>[card],closest:()=>scroller};
 const limits=[{axis:'columns',index:1,limit:'max'}];
 updateTrackLimitControls(panel,limits);assert.equal(scroller.scrollTop,158);
 scroller.scrollTop=0;updateTrackLimitControls(panel,limits);assert.equal(scroller.scrollTop,0);
 updateTrackLimitControls(panel,[]);updateTrackLimitControls(panel,limits);assert.equal(scroller.scrollTop,158);
 updateTrackLimitControls(panel,[]);updateTrackLimitControls(panel,limits);assert.equal(scroller.scrollTop,158);
});
test('oversized track controls reveal their heading without moving focus',async()=>{
 const {revealTrackLimit}=await import('../web/grid-resize-feedback.js');
 const scroller={scrollTop:0,clientTop:0,clientHeight:200,getBoundingClientRect:()=>({top:0})};
 const card={getClientRects:()=>[{}],getBoundingClientRect:()=>({top:250,bottom:650,height:400})};
 assert.equal(revealTrackLimit(card,{closest:()=>scroller}),true);assert.equal(scroller.scrollTop,242);
 assert.equal(revealTrackLimit({...card,getClientRects:()=>[]},{closest:()=>scroller}),false);
});

test('restores the original inspector position only when resize ends, across multiple limits',async()=>{
 const {updateTrackLimitControls}=await import('../web/grid-resize-feedback.js');
 const scroller={scrollTop:45,clientTop:0,clientHeight:300,getBoundingClientRect:()=>({top:0})};
 const card=(key,top)=>({dataset:{areaTrackControl:key},classList:{toggle(){}},feedback:{textContent:''},querySelector(){return this.feedback;},getClientRects:()=>[{}],getBoundingClientRect:()=>({top:top-scroller.scrollTop,bottom:top+100-scroller.scrollTop,height:100})});
 const cards=[card('columns-1',500),card('rows-2',900)],panel={querySelectorAll:()=>cards,closest:()=>scroller};
 updateTrackLimitControls(panel,[{axis:'columns',index:1,limit:'max'}],true);assert.equal(scroller.scrollTop,308);
 updateTrackLimitControls(panel,[],true);assert.equal(scroller.scrollTop,308);
 updateTrackLimitControls(panel,[{axis:'rows',index:2,limit:'min'}],true);assert.equal(scroller.scrollTop,708);
 updateTrackLimitControls(panel,[],false);assert.equal(scroller.scrollTop,45);
 scroller.scrollTop=70;updateTrackLimitControls(panel,[],false);assert.equal(scroller.scrollTop,70);
 updateTrackLimitControls(panel,[{axis:'columns',index:1,limit:'min'}],true);
 updateTrackLimitControls(panel,[],false);assert.equal(scroller.scrollTop,70);
});

test('manual scrolling wins over auto reveal and restoration until the next drag',async()=>{
 const {updateTrackLimitControls}=await import('../web/grid-resize-feedback.js');
 const listeners=new Map();
 const scroller={scrollTop:30,clientTop:0,clientHeight:300,getBoundingClientRect:()=>({top:0}),addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
 const card={dataset:{areaTrackControl:'columns-1'},classList:{toggle(){}},feedback:{textContent:''},querySelector(){return this.feedback;},getClientRects:()=>[{}],getBoundingClientRect:()=>({top:500-scroller.scrollTop,bottom:600-scroller.scrollTop,height:100})};
 const panel={querySelectorAll:()=>[card],closest:()=>scroller},limit=[{axis:'columns',index:1,limit:'max'}];
 updateTrackLimitControls(panel,limit,true);assert.equal(scroller.scrollTop,308);
 listeners.get('wheel')({deltaY:-120,deltaX:0,ctrlKey:false});scroller.scrollTop=188;
 updateTrackLimitControls(panel,[],true);updateTrackLimitControls(panel,limit,true);assert.equal(scroller.scrollTop,188);
 updateTrackLimitControls(panel,[],false);assert.equal(scroller.scrollTop,188);assert.equal(listeners.size,0);
 updateTrackLimitControls(panel,limit,true);assert.equal(scroller.scrollTop,308);
 updateTrackLimitControls(panel,[],false);assert.equal(scroller.scrollTop,188);
 // Manual intent before the first limit also suppresses auto scrolling.
 updateTrackLimitControls(panel,[],true);listeners.get('touchmove')();scroller.scrollTop=90;
 updateTrackLimitControls(panel,limit,true);updateTrackLimitControls(panel,[],false);assert.equal(scroller.scrollTop,90);
});

test('pause notice appears on manual scroll and disappears on drag end and next drag',async()=>{
 const {updateTrackLimitControls}=await import('../web/grid-resize-feedback.js');
 const listeners=new Map(),status={textContent:''},notice={hidden:true,querySelector:()=>status};
 const scroller={querySelector:()=>notice,addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
 const panel={querySelectorAll:()=>[],closest:()=>scroller};
 updateTrackLimitControls(panel,[],true);
 assert.equal(notice.hidden,true);
 listeners.get('wheel')({deltaY:5,ctrlKey:true});assert.equal(notice.hidden,true);
 listeners.get('wheel')({deltaY:5,ctrlKey:false});assert.equal(notice.hidden,false);assert.match(status.textContent,/paused for this drag/);
 updateTrackLimitControls(panel,[],true);assert.equal(notice.hidden,false);
 updateTrackLimitControls(panel,[],false);assert.equal(notice.hidden,true);assert.equal(status.textContent,'');
 updateTrackLimitControls(panel,[],true);assert.equal(notice.hidden,true);
 listeners.get('touchmove')();assert.equal(notice.hidden,false);
 updateTrackLimitControls(panel,[],false);assert.equal(notice.hidden,true);
});

test('resume reveals the current limit in the same drag and preserves the manual position as its new origin',async()=>{
 const {updateTrackLimitControls,resumeTrackScroll}=await import('../web/grid-resize-feedback.js');
 const listeners=new Map(),status={textContent:''},notice={hidden:true,querySelector:()=>status};
 const scroller={scrollTop:30,clientTop:0,clientHeight:300,getBoundingClientRect:()=>({top:0}),querySelector:key=>key==='#track-scroll-paused'?notice:null,addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
 const card={dataset:{areaTrackControl:'columns-1'},classList:{toggle(){}},feedback:{textContent:''},querySelector(){return this.feedback;},getClientRects:()=>[{}],getBoundingClientRect:()=>({top:500-scroller.scrollTop,bottom:600-scroller.scrollTop,height:100})};
 const panel={querySelectorAll:()=>[card],closest:()=>scroller},limit=[{axis:'columns',index:1,limit:'max'}];
 updateTrackLimitControls(panel,limit,true);
 listeners.get('wheel')({deltaY:-100});scroller.scrollTop=120;assert.equal(notice.hidden,false);
 resumeTrackScroll(panel);assert.equal(notice.hidden,true);assert.equal(scroller.scrollTop,308);
 updateTrackLimitControls(panel,[],false);assert.equal(scroller.scrollTop,120);
 resumeTrackScroll(panel);assert.equal(scroller.scrollTop,120);
});

test('resume shortcut supports Option R and ignores typing, repeats, and other modifiers',async()=>{
 const {isResumeScrollShortcut}=await import('../web/grid-resize-feedback.js');
 const event={altKey:true,code:'KeyR',key:'®'};
 assert.equal(isResumeScrollShortcut(event),true);
 assert.equal(isResumeScrollShortcut({altKey:true,key:'r'}),true);
 for(const patch of [{altKey:false},{ctrlKey:true},{metaKey:true},{shiftKey:true},{repeat:true},{isComposing:true},{code:'KeyT'},{target:{closest:()=>({})}}])assert.equal(isResumeScrollShortcut({...event,...patch}),false);
});
test('shortcut resumes only a paused drag and removes its listener at drag end',async()=>{
 const {updateTrackLimitControls}=await import('../web/grid-resize-feedback.js');
 const handlers=new Map(),keys=new Map();
 const view={navigator:{platform:'MacIntel'},addEventListener:(key,fn)=>keys.set(key,fn),removeEventListener:key=>keys.delete(key)};
 const hint={textContent:''},notice={hidden:true,querySelector:()=>({textContent:''})};
 const scroller={querySelector:key=>key==='#resume-track-scroll-shortcut'?hint:key==='#track-scroll-paused'?notice:null,addEventListener:(key,fn)=>handlers.set(key,fn),removeEventListener:key=>handlers.delete(key)};
 const panel={ownerDocument:{defaultView:view},closest:()=>scroller,querySelectorAll:()=>[]};
 let prevented=0;const event={altKey:true,code:'KeyR',preventDefault:()=>prevented++,stopImmediatePropagation(){}};
 updateTrackLimitControls(panel,[],true);assert.equal(hint.textContent,'⌥ R');
 keys.get('keydown')(event);assert.equal(prevented,0);
 handlers.get('wheel')({deltaY:10});assert.equal(notice.hidden,false);
 keys.get('keydown')(event);assert.equal(prevented,1);assert.equal(notice.hidden,true);
 updateTrackLimitControls(panel,[],false);assert.equal(keys.size,0);
});

test('resume confirmation expires and clears immediately on a new pause or drag end',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const {updateTrackLimitControls,resumeTrackScroll}=await import('../web/grid-resize-feedback.js');
 const handlers=new Map(),status={textContent:''},confirmation={hidden:true,querySelector:()=>status};
 const scroller={querySelector:key=>key==='#track-scroll-resumed'?confirmation:null,addEventListener:(key,fn)=>handlers.set(key,fn),removeEventListener:key=>handlers.delete(key)};
 const panel={querySelectorAll:()=>[],closest:()=>scroller};
 const pause=()=>handlers.get('wheel')({deltaY:10});
 updateTrackLimitControls(panel,[],true);pause();resumeTrackScroll(panel);
 assert.equal(confirmation.hidden,false);assert.equal(status.textContent,'Automatic scrolling resumed.');
 t.mock.timers.tick(1799);assert.equal(confirmation.hidden,false);
 t.mock.timers.tick(1);assert.equal(confirmation.hidden,true);
 pause();resumeTrackScroll(panel);pause();assert.equal(confirmation.hidden,true);
 resumeTrackScroll(panel);assert.equal(confirmation.hidden,false);
 updateTrackLimitControls(panel,[],false);assert.equal(confirmation.hidden,true);assert.equal(status.textContent,'');
 t.mock.timers.tick(2000);assert.equal(confirmation.hidden,true);
});

test('resume confirmation fades out with motion tokens and skips animation for reduced motion',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const {updateTrackLimitControls,resumeTrackScroll}=await import('../web/grid-resize-feedback.js');
 const handlers=new Map(),classes=new Set(),status={textContent:''};let reduced=false;
 const notice={hidden:true,querySelector:()=>status,classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)}};
 const scroller={ownerDocument:{defaultView:{matchMedia:()=>({matches:reduced}),getComputedStyle:()=>({animationDuration:'0.12s'})}},querySelector:key=>key==='#track-scroll-resumed'?notice:null,addEventListener:(key,fn)=>handlers.set(key,fn),removeEventListener:key=>handlers.delete(key)};
 const panel={querySelectorAll:()=>[],closest:()=>scroller};
 updateTrackLimitControls(panel,[],true);handlers.get('wheel')({deltaY:10});resumeTrackScroll(panel);
 t.mock.timers.tick(1800);assert.equal(notice.hidden,false);assert.equal(classes.has('is-leaving'),true);
 t.mock.timers.tick(120);assert.equal(notice.hidden,true);assert.equal(classes.size,0);
 reduced=true;handlers.get('wheel')({deltaY:10});resumeTrackScroll(panel);
 t.mock.timers.tick(1800);assert.equal(notice.hidden,true);assert.equal(classes.size,0);
 reduced=false;handlers.get('wheel')({deltaY:10});resumeTrackScroll(panel);t.mock.timers.tick(1800);
 updateTrackLimitControls(panel,[],false);assert.equal(notice.hidden,true);assert.equal(classes.size,0);
 t.mock.timers.tick(120);assert.equal(status.textContent,'');
});

test('rapid pause/resume reuses one notice, skips repeated entry fades and cancels stale exits',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const {updateTrackLimitControls,resumeTrackScroll}=await import('../web/grid-resize-feedback.js');
 const handlers=new Map(),classes=new Set(),status={textContent:''};
 const notice={hidden:true,querySelector:()=>status,classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)}};
 const scroller={ownerDocument:{defaultView:{matchMedia:()=>({matches:false}),getComputedStyle:()=>({animationDuration:'0.12s'})}},querySelector:key=>key==='#track-scroll-resumed'?notice:null,addEventListener:(key,fn)=>handlers.set(key,fn),removeEventListener:key=>handlers.delete(key)};
 const panel={querySelectorAll:()=>[],closest:()=>scroller},cycle=()=>{handlers.get('wheel')({deltaY:10});resumeTrackScroll(panel);};
 updateTrackLimitControls(panel,[],true);cycle();assert.equal(classes.has('is-repeat'),false);
 t.mock.timers.tick(1800);assert.equal(classes.has('is-leaving'),true);
 for(let i=0;i<5;i++){cycle();t.mock.timers.tick(50);assert.equal(notice.hidden,false);assert.equal(classes.has('is-repeat'),true);assert.equal(classes.has('is-leaving'),false);}
 t.mock.timers.tick(1749);assert.equal(classes.has('is-leaving'),false);
 t.mock.timers.tick(1);assert.equal(classes.has('is-leaving'),true);
 t.mock.timers.tick(120);assert.equal(notice.hidden,true);
 updateTrackLimitControls(panel,[],false);updateTrackLimitControls(panel,[],true);cycle();assert.equal(classes.has('is-repeat'),false);
 updateTrackLimitControls(panel,[],false);t.mock.timers.tick(3000);assert.equal(notice.hidden,true);
});

test('reserved notices stay in the panel while only the inner inspector scrolls',async()=>{
 const {updateTrackLimitControls,resumeTrackScroll}=await import('../web/grid-resize-feedback.js');
 const listeners=new Map(),status={textContent:''},notice={hidden:true,querySelector:()=>status};
 const outer={scrollTop:0,querySelector:key=>key==='#track-scroll-paused'?notice:null};
 const content={scrollTop:40,clientTop:0,clientHeight:200,getBoundingClientRect:()=>({top:120}),addEventListener:(key,fn)=>listeners.set(key,fn),removeEventListener:key=>listeners.delete(key)};
 const card={dataset:{areaTrackControl:'columns-1'},classList:{toggle(){}},querySelector:()=>null,getClientRects:()=>[{}],getBoundingClientRect:()=>({top:500-content.scrollTop,bottom:600-content.scrollTop,height:100})};
 const panel={closest:selector=>selector==='.inspector-content'?content:outer,querySelectorAll:()=>[card]};
 const limits=[{axis:'columns',index:1,limit:'max'}];
 updateTrackLimitControls(panel,limits,true);
 assert.equal(content.scrollTop,288);assert.equal(outer.scrollTop,0);
 listeners.get('wheel')({deltaY:-20});content.scrollTop=200;
 assert.equal(notice.hidden,false);
 resumeTrackScroll(panel);assert.equal(notice.hidden,true);assert.equal(content.scrollTop,288);
 updateTrackLimitControls(panel,[],false);
 assert.equal(content.scrollTop,200);assert.equal(outer.scrollTop,0);assert.equal(listeners.size,0);
});
