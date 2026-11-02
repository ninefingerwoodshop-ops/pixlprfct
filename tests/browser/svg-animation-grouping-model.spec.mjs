import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.route(/https?:\/\//,r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());await page.goto('/editor/project-home.html');});

test('grouping preserves nested source geometry, paints, references, origins and animated poses at every sampled time',async({page})=>{
 const result=await page.evaluate(async()=>{
  const {newSvgAnimation}=await import('/editor/svg-animation-model.js'),{sanitizeSvg,animationScene,animatedSvg,normalizeSvgAnimation}=await import('/editor/svg-animation-svg.js'),{groupSvgElements}=await import('/editor/svg-animation-group.js'),{morphPath}=await import('/editor/svg-animation-morph.js');
  const doc=newSvgAnimation('Nested grouping');doc.svg_animation.svg=sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs id="pxv1"><linearGradient id="pxv2"><stop id="pxv3" stop-color="#0d99ff"/><stop id="pxv4" offset="1" stop-color="#9b7bff"/></linearGradient></defs><g id="pxv5" transform="translate(40 60) rotate(12)" fill="url(#pxv2)" opacity=".7"><path id="pxv6" data-pixl-mirroring="n,n" d="M10 20C30 0 50 0 70 20"/><rect id="pxv7" x="120" y="60" width="50" height="40"/><use id="pxv8" href="#pxv6" x="60" y="80"/></g></svg>').svg;
  const a=doc.svg_animation,add=(element,property,from,to)=>a.tracks.push({element,property,keys:[{time:0,value:from,easing:'ease-in-out'},{time:3000,value:to,easing:'linear'}]});
  add('pxv5','rotation',0,30);add('pxv6','morph',morphPath('M10 20C30 0 50 0 70 20'),morphPath('M10 25C30 10 50 10 70 25'));add('pxv6','opacity',1,.5);add('pxv7','x',0,30);add('pxv7','motionProgress',0,100);a.tracks.at(-1).motion={d:'M100 100C150 50 200 50 220 100',name:'Route',rotate:'auto'};a.origins={pxv5:[100,100],pxv6:[40,20],pxv7:[145,80]};
  const before=JSON.stringify(doc),next=groupSvgElements(doc,['pxv7','pxv6']),root=sanitizeSvg(next.document.svg_animation.svg).root,group=root.querySelector('#'+next.selected[0]),original=sanitizeSvg(a.svg).root;
  const first=animationScene(a),second=animationScene(next.document.svg_animation);document.body.append(first.root,second.root);first.root.style.position=second.root.style.position='absolute';first.root.style.top=second.root.style.top='0';first.root.style.left=second.root.style.left='0';
  const poses=[];for(const time of [0,1250,3000]){first.seek(time);second.seek(time);for(const id of ['pxv5','pxv6','pxv7','pxv8']){const read=scene=>{const n=scene.root.querySelector('#'+id),m=n.getScreenCTM();return {matrix:[m.a,m.b,m.c,m.d,m.e,m.f],d:n.getAttribute('d'),opacity:getComputedStyle(n).opacity,fill:getComputedStyle(n).fill};};poses.push(JSON.stringify(read(first))===JSON.stringify(read(second)));}}
  const back=groupSvgElements(next.document,next.selected,{ungroup:true});
  return {originalUntouched:before===JSON.stringify(doc),childSources:['pxv6','pxv7'].every(id=>root.querySelector('#'+id).outerHTML===original.querySelector('#'+id).outerHTML),parent:group.parentElement.id,children:[...group.children].map(n=>n.id),tracks:next.document.svg_animation.tracks,origins:next.document.svg_animation.origins,originalTracks:a.tracks,originalOrigins:a.origins,poses,roundtrip:JSON.stringify(back.document)===before,selected:back.selected,reopens:JSON.stringify(normalizeSvgAnimation(next.document).document)===JSON.stringify(next.document),beforeSvg:animatedSvg(doc,{animated:false,time:1250}),afterSvg:animatedSvg(next.document,{animated:false,time:1250})};
 });
 expect(result.originalUntouched&&result.childSources&&result.roundtrip&&result.reopens).toBe(true);expect(result.parent).toBe('pxv5');expect(result.children).toEqual(['pxv6','pxv7']);expect(result.selected).toEqual(['pxv6','pxv7']);expect(result.tracks).toEqual(result.originalTracks);expect(result.origins).toEqual(result.originalOrigins);expect(result.poses.every(Boolean)).toBe(true);
 await page.setContent(result.beforeSvg);const before=await page.locator('svg').screenshot();await page.setContent(result.afterSvg);expect((await page.locator('svg').screenshot()).equals(before)).toBe(true);
});

test('nonconsecutive siblings retain their order at the frontmost selected position; single elements and nested groups work',async({page})=>{
 const result=await page.evaluate(async()=>{
  const {newSvgAnimation}=await import('/editor/svg-animation-model.js'),{sanitizeSvg}=await import('/editor/svg-animation-svg.js'),{groupSvgElements}=await import('/editor/svg-animation-group.js');
  const doc=newSvgAnimation('Order');doc.svg_animation.svg=sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg"><rect id="pxv1" width="20" height="20"/><rect id="pxv2" width="20" height="20"/><g id="pxv3" data-layer-name="Group 1"><circle id="pxv4" r="20"/></g><rect id="pxv5" width="20" height="20"/></svg>').svg;
  const next=groupSvgElements(doc,['pxv3','pxv4','pxv1','pxv1']),root=sanitizeSvg(next.document.svg_animation.svg).root,group=root.querySelector('#'+next.selected[0]),outer=groupSvgElements(next.document,next.selected),again=sanitizeSvg(outer.document.svg_animation.svg).root,wrapper=again.querySelector('#'+outer.selected[0]);
  return {id:group.id,order:[...root.children].map(n=>n.id),children:[...group.children].map(n=>n.id),name:group.getAttribute('data-layer-name'),outerName:wrapper.getAttribute('data-layer-name'),outerChildren:[...wrapper.children].map(n=>n.id),unique:new Set([...again.querySelectorAll('[id]')].map(n=>n.id)).size===again.querySelectorAll('[id]').length};
 });
 expect(result.order).toEqual(['pxv2',result.id,'pxv5']);expect(result.children).toEqual(['pxv1','pxv3']);expect(result.name).toBe('Group 2');expect(result.outerName).toBe('Group 3');expect(result.outerChildren).toEqual([result.id]);expect(result.unique).toBe(true);
});

test('ungrouping multiple neutral wrappers preserves definitions, descendants, child animation and references while cleaning only removed origins',async({page})=>{
 const result=await page.evaluate(async()=>{
  const {newSvgAnimation}=await import('/editor/svg-animation-model.js'),{sanitizeSvg}=await import('/editor/svg-animation-svg.js'),{groupSvgElements}=await import('/editor/svg-animation-group.js');
  const doc=newSvgAnimation('Ungroup');doc.svg_animation.svg=sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg"><g id="pxv1"><defs id="pxv2"><linearGradient id="pxv3"><stop id="pxv4" stop-color="#0d99ff"/></linearGradient></defs><path id="pxv5" d="M0 0L20 20" fill="url(#pxv3)"/><svg id="pxv6" width="100" height="100"><rect id="pxv7" width="10" height="10"/></svg></g><g id="pxv8" transform="scale(2)"><g id="pxv9"><circle id="pxv10" r="10"/></g></g><use id="pxv11" href="#pxv5"/></svg>').svg;doc.svg_animation.origins={pxv1:[10,10],pxv5:[10,10],pxv9:[10,10],pxv10:[0,0]};doc.svg_animation.tracks=[{element:'pxv5',property:'x',keys:[{time:0,value:10,easing:'linear'}]}];
  const next=groupSvgElements(doc,['pxv1','pxv9'],{ungroup:true}),root=sanitizeSvg(next.document.svg_animation.svg).root;
  return {selected:next.selected,removed:!root.querySelector('#pxv1,#pxv9'),nestedParent:root.querySelector('#pxv10').parentElement.id,gradient:root.querySelector('#pxv5').getAttribute('fill'),definition:!!root.querySelector('#pxv3'),use:root.querySelector('#pxv11').getAttribute('href'),origins:next.document.svg_animation.origins,tracks:next.document.svg_animation.tracks};
 });
 expect(result.selected).toEqual(['pxv5','pxv7','pxv10']);expect(result.removed&&result.definition).toBe(true);expect(result.nestedParent).toBe('pxv8');expect(result.gradient).toBe('url(#pxv3)');expect(result.use).toBe('#pxv5');expect(result.origins).toEqual({pxv5:[10,10],pxv10:[0,0]});expect(result.tracks[0].element).toBe('pxv5');
});

test('unsafe ungrouping and cross-parent grouping reject atomically and explain the unavailable action',async({page})=>{
 const result=await page.evaluate(async()=>{
  const {newSvgAnimation}=await import('/editor/svg-animation-model.js'),{sanitizeSvg}=await import('/editor/svg-animation-svg.js'),{groupSvgElements,svgGroupingAvailability}=await import('/editor/svg-animation-group.js');
  const make=extra=>{const doc=newSvgAnimation('Guard');doc.svg_animation.svg=sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg"><g id="pxv1"><rect id="pxv2" width="20" height="20"/></g><g id="pxv3" '+extra+'><rect id="pxv4" width="20" height="20"/></g></svg>').svg;return doc;};
  const failures=[];let untouched=true;
  for(const mode of ['parents','stale','nongroup','transform','paint','animation','href','url']){const doc=make(mode==='transform'?'transform="translate(10 20)"':mode==='paint'?'fill="red"':'');if(mode==='animation')doc.svg_animation.tracks=[{element:'pxv3',property:'x',keys:[{time:0,value:0,easing:'linear'}]}];if(mode==='href'||mode==='url')doc.svg_animation.svg=doc.svg_animation.svg.replace('</svg>',(mode==='href'?'<use href="#pxv3"/>':'<rect style="clip-path:url(#pxv3)" width="10" height="10"/>')+'</svg>');
   const ids=mode==='parents'?['pxv2','pxv4']:mode==='stale'?['missing']:mode==='nongroup'?['pxv2']:['pxv1','pxv3'],before=JSON.stringify(doc),root=sanitizeSvg(doc.svg_animation.svg).root,options=svgGroupingAvailability(root,ids,doc.svg_animation);let error;try{groupSvgElements(doc,ids,{ungroup:mode!=='parents'});}catch(e){error=e.message;}failures.push({mode,error,reason:options[mode==='parents'?'group':'ungroup']});untouched&&=before===JSON.stringify(doc);
  }
  return {failures,untouched};
 });
 expect(result.untouched).toBe(true);expect(result.failures).toHaveLength(8);for(const value of result.failures){expect(value.error).toBeTruthy();expect(value.reason).toBe(value.error);}
});

test('empty selections do nothing and grouping enforces element and source-size budgets without changes',async({page})=>{
 const result=await page.evaluate(async()=>{
  const {newSvgAnimation}=await import('/editor/svg-animation-model.js'),{sanitizeSvg}=await import('/editor/svg-animation-svg.js'),{groupSvgElements}=await import('/editor/svg-animation-group.js');
  const huge=newSvgAnimation('Budget');huge.svg_animation.svg='<svg xmlns="http://www.w3.org/2000/svg">'+Array.from({length:5000},(_,i)=>`<rect id="pxv${i+1}" width="1" height="1"/>`).join('')+'</svg>';
  const size=newSvgAnimation('Size');size.svg_animation.svg=sanitizeSvg('<svg xmlns="http://www.w3.org/2000/svg"><text id="pxv1">A</text></svg>').svg;size.svg_animation.svg=size.svg_animation.svg.replace('>A</text>','>'+'A'.repeat(1_999_970-size.svg_animation.svg.length+1)+'</text>');
  const failures=[];let untouched=true;for(const doc of [huge,size]){const before=JSON.stringify(doc);try{groupSvgElements(doc,['pxv1']);}catch(error){failures.push(error.message);}untouched&&=JSON.stringify(doc)===before;}
  return {failures,untouched,noop:groupSvgElements(size,[]).document===size};
 });
 expect(result.failures).toEqual(['SVGs can contain up to 5,000 elements.','Invalid SVG animation project.']);expect(result.untouched&&result.noop).toBe(true);
});
