import {test,expect} from '@playwright/test';
const NS='http://www.w3.org/2000/svg';
test.beforeEach(async({page})=>{await page.route(/https?:\/\//,r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());});

test('SVG addition isolates IDs and local references and preserves original artwork',async({page})=>{
 await page.goto('/editor/project-home.html');
 const result=await page.evaluate(async NS=>{
  const {sanitizeSvg}=await import('/editor/svg-animation-svg.js'),{addSvgArtwork}=await import('/editor/svg-animation-import.js');
  const svg=`<svg xmlns="${NS}" viewBox="10 20 400 300"><defs><linearGradient id="paint"><stop stop-color="#ff0000"/></linearGradient><clipPath id="clip"><circle cx="30" cy="30" r="20"/></clipPath><mask id="mask"><rect width="80" height="80" fill="white"/></mask><path id="shape" d="M10 10L50 10L30 50Z"/></defs><use id="art" href="#shape" style="fill:url(#paint)" clip-path="url(#clip)" mask="url(#mask)"/></svg>`;
  const old=sanitizeSvg(svg),next=addSvgArtwork(old.svg,old.svg,'Another copy'),again=sanitizeSvg(next.svg),all=[next.root,...next.root.querySelectorAll('*')],group=next.root.querySelector('#'+next.selected),incoming=group.querySelector('svg');
  const references=[...group.querySelectorAll('*')].flatMap(n=>[...n.attributes].flatMap(a=>a.name==='href'?[a.value.slice(1)]:[...a.value.matchAll(/url\(#([^)]*)\)/g)].map(m=>m[1])));
  return {unique:new Set(all.map(n=>n.id)).size===all.length,idsPreserved:[old.root,...old.root.querySelectorAll('*')].every(n=>next.root.querySelector('#'+n.id)?.outerHTML===n.outerHTML||n===old.root),references:references.every(id=>!!group.querySelector('#'+id)),count:references.length,viewport:next.root.getAttribute('viewBox'),imported:incoming.getAttribute('viewBox'),x:incoming.getAttribute('x'),y:incoming.getAttribute('y'),canonical:again.svg===next.svg,selected:group.getAttribute('data-layer-name')};
 },NS);
 expect(result).toEqual({unique:true,idsPreserved:true,references:true,count:4,viewport:'10 20 400 300',imported:'10 20 400 300',x:'10',y:'20',canonical:true,selected:'Another copy'});
});

test('SVG addition keeps its viewport, root paint defaults, and source dimensions',async({page})=>{
 await page.goto('/editor/project-home.html');
 const result=await page.evaluate(async NS=>{
  const {addSvgArtwork}=await import('/editor/svg-animation-import.js');
  const a=`<svg xmlns="${NS}" viewBox="0 0 400 300" fill="red" stroke="blue" stroke-width="8"><rect width="50" height="50"/></svg>`,b=`<svg xmlns="${NS}" viewBox="20 30 100 80"><rect x="20" y="30" width="100" height="80"/><circle cx="70" cy="70" r="5" fill="green"/></svg>`;
  const next=addSvgArtwork(a,b,'Small');document.body.replaceChildren(next.root);const group=next.root.querySelector('#'+next.selected),svg=group.querySelector('svg'),rect=svg.querySelector('rect'),style=getComputedStyle(rect),m=next.root.getScreenCTM().inverse().multiply(rect.getScreenCTM()),p=new DOMPoint(20,30).matrixTransform(m);
  return {width:next.width,height:next.height,x:p.x,y:p.y,fill:style.fill,stroke:style.stroke,strokeWidth:style.strokeWidth,circle:getComputedStyle(svg.querySelector('circle')).fill};
 },NS);
 expect(result).toEqual({width:400,height:300,x:150,y:110,fill:'rgb(0, 0, 0)',stroke:'none',strokeWidth:'1px',circle:'rgb(0, 128, 0)'});
});

test('SVG addition sanitizes active content and rejects invalid or over-budget combined documents',async({page})=>{
 await page.goto('/editor/project-home.html');
 const result=await page.evaluate(async NS=>{
  const {addSvgArtwork}=await import('/editor/svg-animation-import.js'),base=`<svg xmlns="${NS}"><rect width="10" height="10"/></svg>`;
  const safe=addSvgArtwork(base,`<svg xmlns="${NS}" onload="window.bad=true"><script>window.bad=true</script><image href="https://bad.invalid/a.png"/><rect width="10" height="10" onclick="window.bad=true"/></svg>`);
  const failures=[];for(const incoming of ['not svg',`<!DOCTYPE svg><svg xmlns="${NS}"/>`,`<svg xmlns="${NS}">${'<rect/>'.repeat(4998)}</svg>`])try{addSvgArtwork(base,incoming);}catch(e){failures.push(e.message);}
  return {svg:safe.svg,failures};
 },NS);
 expect(result.svg).not.toMatch(/onload|onclick|script|https:\/\/bad/);expect(result.failures).toEqual(['Choose a valid SVG file.','SVG document types and entities are not supported.','SVGs can contain up to 5,000 elements.']);
});

test('prepared imports are atomic, preserve animation settings, and keep existing tracks bound through export',async({page,context})=>{
 await page.goto('/editor/project-home.html');
 const result=await page.evaluate(async NS=>{
  const {newSvgAnimation,putKey}=await import('/editor/svg-animation-model.js'),{sanitizeSvg,animationScene,animatedSvg,normalizeSvgAnimation}=await import('/editor/svg-animation-svg.js'),{prepareSvgImport}=await import('/editor/svg-animation-import.js');
  const source=`<svg xmlns="${NS}" viewBox="0 0 400 300"><rect id="Tile" x="20" y="40" width="50" height="30" fill="red"/></svg>`,incoming=`<svg xmlns="${NS}" viewBox="10 20 80 60"><circle id="Tile" cx="50" cy="50" r="20" fill="blue"/></svg>`;
  const doc=newSvgAnimation('Atomic import'),base=sanitizeSvg(source),id=base.root.querySelector('rect').id;let animation={...doc.svg_animation,svg:base.svg,origins:{[id]:[45,55]},loop:false};animation=putKey(animation,id,'rotation',0,0,'ease-in');animation=putKey(animation,id,'rotation',1000,90,'ease-out');animation=putKey(animation,id,'x',0,25);
  const before=JSON.stringify(animation),added=prepareSvgImport(animation,incoming,{mode:'add',name:'Added art'}),replaced=prepareSvgImport(animation,incoming,{mode:'replace'}),scene=animationScene(added.animation);scene.seek(1000);document.body.replaceChildren(scene.root);const matrix=scene.root.getScreenCTM().inverse().multiply(scene.root.querySelector('#'+id).getScreenCTM());
  const saved={...doc,svg_animation:added.animation},reopened=normalizeSvgAnimation(JSON.parse(JSON.stringify(saved))).document;
  let invalidMode;try{prepareSvgImport(animation,incoming);}catch(e){invalidMode=e.message;}
  return {unchanged:before===JSON.stringify(animation),tracks:added.animation.tracks,originalTracks:animation.tracks,origins:added.animation.origins,originalOrigins:animation.origins,settingsPreserved:added.animation.duration===animation.duration&&!added.animation.loop&&!replaced.animation.loop,replacedTracks:replaced.animation.tracks,replacedOrigins:replaced.animation.origins,replacedSelected:replaced.selected,reopened:JSON.stringify(reopened)===JSON.stringify(saved),matrix:[matrix.a,matrix.b,matrix.c,matrix.d,matrix.e,matrix.f],exported:animatedSvg(saved),id,invalidMode};
 },NS);
 expect(result.unchanged).toBe(true);expect(result.tracks).toEqual(result.originalTracks);expect(result.origins).toEqual(result.originalOrigins);expect(result.settingsPreserved).toBe(true);expect(result.replacedTracks).toEqual([]);expect(result.replacedOrigins).toEqual({});expect(result.replacedSelected).toBeNull();expect(result.reopened).toBe(true);expect(result.invalidMode).toContain('Choose Add or Replace');
 const exported=await context.newPage();await exported.setContent(result.exported);await exported.evaluate(()=>{const svg=document.querySelector('svg');svg.pauseAnimations();svg.setCurrentTime(1);});
 const matrix=await exported.evaluate(id=>{const svg=document.querySelector('svg'),m=svg.getScreenCTM().inverse().multiply(svg.querySelector('#'+id).getScreenCTM());return [m.a,m.b,m.c,m.d,m.e,m.f];},result.id);for(let i=0;i<6;i++)expect(matrix[i]).toBeCloseTo(result.matrix[i],4);await exported.close();
});
