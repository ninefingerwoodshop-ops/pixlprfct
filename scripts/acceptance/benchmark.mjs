import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {initializeEngine,createHeadlessEditor,headlessOptions} from '../../mcp/projects.mjs';
import {createAgentRuntime} from '../../web/agent-runtime.js';
await initializeEngine();
function synthetic(){
 const shapes=[];let id=1;
 for(let page=1;page<=5;page++)for(let frame=0;frame<12;frame++){
  const parent=id++,x=frame%4*340,y=Math.floor(frame/4)*400;
  shapes.push({id:parent,page_id:page,kind:'frame',name:`Card ${parent}`,x,y,width:300,height:350,fill:'#ffffff',text:'',hidden:false});
  for(let row=0;row<11;row++)shapes.push({id:id++,page_id:page,parent_id:parent,kind:'text',name:`Label ${row}`,x:x+16,y:y+16+row*28,width:268,height:24,fill:'#222222',text:`Browser performance label ${row}`,hidden:false,typography:{font_family:'Arial',font_size:16,line_height:1.5,sizing:'fixed'}});
 }
 for(let n=0;n<7;n++)shapes.push({id:id++,page_id:1,kind:'rectangle',name:`Accent ${n}`,x:n*40,y:1300,width:24,height:24,fill:'#777777',text:'',hidden:false});
 return JSON.stringify({version:2,name:'727-layer synthetic benchmark',pages:Array.from({length:5},(_,n)=>({id:n+1,name:`Page ${n+1}`})),active_page:1,shapes});
}
const raw=process.argv[2]?await readFile(process.argv[2],'utf8'):synthetic(),e=createHeadlessEditor(),results={fixture:process.argv[2]?'supplied document':'synthetic 727-layer document',textMetrics:'approximate headless metrics',node:process.version};
const measure=(name,n,fn)=>{const times=[];for(let i=0;i<n;i++){const start=performance.now();fn(i);times.push(performance.now()-start);}times.sort((a,b)=>a-b);results[name]={medianMs:+times[Math.floor(n/2)].toFixed(2),p95Ms:+times[Math.floor((n-1)*.95)].toFixed(2),samples:n};};
try{
 measure('load',3,()=>e.load(raw));e.clear_history();const doc=JSON.parse(e.snapshot()),page=doc.pages.find(p=>doc.shapes.some(s=>s.page_id===p.id&&s.kind==='text'&&!s.component));e.select_page(page.id);results.layers=doc.shapes.length;
 const label=doc.shapes.find(s=>s.page_id===page.id&&s.kind==='text'&&!s.component);
 if(!label)throw new Error('Benchmark requires an editable text layer.');
 measure('snapshot',20,()=>e.snapshot());measure('textContentEdit',20,i=>e.update(JSON.stringify({...label,text:label.text+' '+i})));
 measure('textResizePreview',20,i=>e.preview_update_many(JSON.stringify([{...label,width:label.width+1+i}])));
 measure('pageSwitch',20,i=>e.select_page(doc.pages[i%doc.pages.length].id));e.select_page(page.id);
 const runtime=createAgentRuntime({editor:e,createEditor:createHeadlessEditor,options:headlessOptions}),labels=JSON.parse(e.snapshot()).shapes.filter(s=>s.page_id===page.id&&s.kind==='text'&&!s.component).slice(0,20),start=performance.now();
 await runtime.request('build',{revision:runtime.state().revision,operations:labels.map(s=>({op:'update',id:s.id,properties:{text:s.text+' batch'}}))});results.batchEdits=labels.length;results.batchMs=+(performance.now()-start).toFixed(2);results.documentDigest=createHash('sha256').update(e.snapshot()).digest('hex');console.log(JSON.stringify(results,null,2));
}finally{e.free();}
