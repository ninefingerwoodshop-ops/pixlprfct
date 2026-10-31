import {initializeEngine,createHeadlessEditor} from '../../mcp/projects.mjs';
import {appearance} from '../../web/appearance.js';

// Public, deterministic workload: five pages, 727 layers, linked components,
// variants, a slot, text/effect/color styles, and mode-dependent color variables.
// No customer document or network font is needed to reproduce the checks.
export async function complexFixture(){
 await initializeEngine();const e=createHeadlessEditor(),doc=()=>JSON.parse(e.snapshot()),shape=id=>doc().shapes.find(s=>s.id===id),edit=(id,patch)=>e.update(JSON.stringify({...shape(id),...patch}));
 try{
 e.save_variables(JSON.stringify({collections:[{id:1,name:'Theme',modes:[{id:1,name:'Light'},{id:2,name:'Dark'}],default_mode:1}],values:[{id:1,collection_id:1,name:'Brand/Primary',kind:'color',values:{1:'#345678',2:'#82b4e6'}}]}));
 const main=e.add('frame',40,40);edit(main,{name:'Card main',width:280,height:180});const label=e.add('text',56,56);edit(label,{name:'Card title',text:'A reusable card',width:248,height:32,typography:{...shape(label).typography,font_family:'Arial',font_size:20,line_height:1.2,sizing:'height'}});e.reparent_many(JSON.stringify([label]),main);
 const color=e.save_color_style(JSON.stringify({id:0,name:'Brand / Primary',paints:[{id:1,color:'#345678',opacity:1,visible:true}],color_variables:{1:1}}),main,false),text=e.save_text_style(JSON.stringify({id:0,name:'Type / Title',typography:shape(label).typography}),label),effect=e.save_effect_style(JSON.stringify({id:0,name:'Elevation / Card',effects:{shadows:[{x:0,y:4,blur:8,spread:0,color:'#000000',opacity:.2,visible:true,kind:'drop'}]}}),main);
 e.create_component(main);const slot=e.wrap_in_slot(JSON.stringify([label]),'Body');const alternate=JSON.parse(e.duplicate_many(JSON.stringify([main])))[0];edit(alternate,{name:'Card alternate',x:360});e.save_component_set(JSON.stringify({id:0,name:'Card',properties:['State'],variants:[{component_id:main,values:['Default']},{component_id:alternate,values:['Alternate']}]}));
 const instance=e.create_instance(main,40,260);edit(instance,{name:'Card instance'});
 for(let i=0;i<4;i++)e.add_page();e.select_page(1);const data=doc();data.name='Daily workflow acceptance';let id=Math.max(...data.shapes.map(s=>s.id))+1;
 const editable=id++;data.shapes.push({id:editable,page_id:1,kind:'text',name:'Editable benchmark label',x:40,y:490,width:280,height:32,fill:'#ffffff',text:'Edit this label',typography:{font_family:'Arial',font_size:16,line_height:1.5,sizing:'fixed'},appearance:appearance({})});
 let card=0;while(data.shapes.length<727){const page=1+card%5,index=Math.floor(card/5),x=index%4*320,y=600+Math.floor(index/4)*260,parent=id++;
 data.shapes.push({id:parent,page_id:page,kind:'frame',name:'Content card '+card,x,y,width:280,height:220,fill:'#2c2c2c'});
 for(let row=0;row<11&&data.shapes.length<727;row++)data.shapes.push({id:id++,page_id:page,parent_id:parent,kind:'text',name:'Card '+card+' row '+row,x:x+12,y:y+12+row*18,width:256,height:18,fill:'#dddddd',text:'Deterministic content row '+row,typography:{font_family:'Arial',font_size:12,line_height:1.5,sizing:'fixed'}});card++;
 }
 for(const s of data.shapes){s.hidden??=false;s.text??='';}
 e.load(JSON.stringify(data));
 return {body:e.snapshot(),main,label,slot,alternate,instance,editable,color,text,effect};
 }finally{e.free();}
}
