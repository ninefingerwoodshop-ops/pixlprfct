import {cssExport} from './css-renderer.js';
import {exportShapes} from './export.js';
import {workspaceWindow} from './workspace-window.js';
import {frameworkFiles} from './framework-export.js';
import {behaviorSource} from './behaviors.js';

export function codeExportFiles(doc,{scope='project',pageId=doc.active_page,ids=[],textLayout,target='html'}={}){
 if(!['project','page','selection'].includes(scope))throw new Error('Choose a valid export scope');
 const pages=scope==='project'?doc.pages:doc.pages.filter(p=>p.id===pageId);
 if(!pages.length)throw new Error('Page not found');
 const exportedShapes=[],files=[],warnings=new Set(),manifest={name:doc.name,pages:[]};
 for(const [index,page] of pages.entries()){
  const shapes=exportShapes(doc.shapes.filter(s=>s.page_id===page.id),ids,scope==='selection'?'selection':'page');
  if(scope==='selection'&&!shapes.length)throw new Error('Select layers to export');
  const result=cssExport(shapes,{variables:doc.variables,pageModes:page.variable_modes,sourceShapes:doc.shapes,textLayout,name:doc.name+' — '+page.name});
  exportedShapes.push(...shapes);
  const htmlName=index===0?'index.html':`page-${page.id}.html`,cssName=scope==='project'?`page-${page.id}.css`:'styles.css';
  files.push({name:htmlName,text:result.html.replace('href="styles.css"',`href="${cssName}"`).replace('</head>','<script src="script.js" defer></script></head>')},{name:cssName,text:result.css});
  manifest.pages.push({id:page.id,name:page.name,html:htmlName,css:cssName});result.warnings.forEach(w=>warnings.add(w));
 }
 files.push({name:'behavior-runtime.js',text:behaviorSource(exportedShapes)}, {name:'script.js',text:behaviorSource(exportedShapes,{module:false})+'\nmountBehaviors(document, behaviors);\ndocument.dispatchEvent(new CustomEvent("pixlprfct:ready", {detail: {stage: document.querySelector(".px-scene")}}));\n'},{name:'project.json',text:JSON.stringify(manifest,null,2)},
 {name:'README.txt',text:`${doc.name} — HTML / CSS / JavaScript export

Open index.html in a modern browser. No editor runtime or build step is required.
${scope==='project'?'Each project page has its own HTML and CSS file. Page links are listed below and in project.json.':'This package contains the selected page or layers.'}
${manifest.pages.map(p=>p.name+' → '+p.html).join('\n')}

script.js contains attached JavaScript behaviors, loaded by every page.
Prototype interactions are not converted into JavaScript yet.
Use data-px-id and data-component attributes to attach event handlers.
Flex Layout and Grid Layout use real CSS Flexbox and Grid; glass uses backdrop-filter.
Fonts must be installed or supplied by your application. Vector paint remains inline SVG.
${[...warnings].join('\n')}`});
 if(target==='rust'&&exportedShapes.some(s=>(s.behaviors??[]).some(b=>b.enabled)))throw new Error('JavaScript behaviors support HTML, React, Vue and Angular exports. Choose one of those formats to include behaviors.');
 const encoder=new TextEncoder();return (target==='html'?files:frameworkFiles(files,{target,scope})).map(({name,text})=>({name,data:encoder.encode(text)}));
}


export function showCodeExport(doc,ids,onExport,onImport){
 const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text)node.textContent=text;return node;};
 const content=el('div','code-export-content'),main=el('div','code-export-main');let scope='page';
 const intro=el('div','code-export-intro');intro.append(el('h3','','Export your project'),el('p','','Share an editable PixlPrfct file or export code for the web.'));
 const targetLabel=el('label','code-page-choice','Format'),target=el('select');target.setAttribute('aria-label','Export format');for(const [value,label] of [['pixl','PixlPrfct · Editable project (.pixl)'],['html','HTML / CSS / JavaScript'],['react','React'],['vue','Vue'],['angular','Angular'],['rust','Rust · Leptos']]){const o=el('option','',label);o.value=value;target.append(o);}target.value='pixl';scope='project';targetLabel.append(target);target.onchange=()=>{if(target.value==='pixl')scope='project';sync();};
 const scopeGroup=el('div','code-scope-options');scopeGroup.setAttribute('role','group');scopeGroup.setAttribute('aria-label','Export scope');
 const scopeButtons=[];
 for(const [value,label,detail] of [['project','Whole project',doc.pages.length+' pages'],['page','One page','Choose a page'],...(ids.length?[['selection','Selection',ids.length+' selected layers']]:[])]){
   const button=el('button','code-scope-option');button.type='button';button.append(el('strong','',label),el('span','',detail));button.setAttribute('aria-pressed',String(value===scope));button.onclick=()=>{scope=value;sync();};scopeButtons.push([value,button]);scopeGroup.append(button);
 }
 const pageLabel=el('label','code-page-choice','Page'),page=el('select');page.setAttribute('aria-label','Page to export');for(const p of doc.pages){const o=el('option','',p.name);o.value=p.id;page.append(o);}page.value=doc.active_page;pageLabel.append(page);
 const preview=el('div','code-package-preview'),previewTitle=el('div','code-package-heading'),fileList=el('div','code-file-list');previewTitle.append(el('strong','','Your download'),el('span','code-zip-badge','ZIP'));preview.append(previewTitle,fileList);
 const note=el('p','code-export-note','Development behaviors are included with lifecycle cleanup. Prototype actions are not converted yet.');
 const error=el('p','code-export-error');error.setAttribute('role','alert');error.hidden=true;
 const footer=el('div','code-export-footer'),cancel=el('button','code-export-cancel','Cancel'),download=el('button','primary','Download ZIP');footer.append(cancel,download);
 if(onImport){const importButton=el('button','code-import-project','Open a .pixl project…');importButton.type='button';importButton.onclick=()=>{win.close();onImport();};footer.prepend(importButton);}
 main.append(intro,targetLabel,el('h4','','Export scope'),scopeGroup,pageLabel,preview,note,error);content.append(main,footer);
 const win=workspaceWindow('Export project',content,{page:false,width:600,height:570,center:true});win.dialog.classList.add('code-export-window');win.dialog.addEventListener('close',()=>win.dialog.remove(),{once:true});cancel.onclick=()=>win.close();
 function sync(){const native=target.value==='pixl';for(const [value,button] of scopeButtons){button.setAttribute('aria-pressed',String(value===scope));button.disabled=native&&value!=='project';}download.textContent=native?'Download .pixl':'Download ZIP';previewTitle.querySelector('.code-zip-badge').textContent=native?'PIXL':'ZIP';note.textContent=native?'Share this file, then open it in PixlPrfct to keep editing. Includes all pages, components, variables, embedded images and prototype settings. Fonts must be installed separately. Undo history and cloud access are not included.':'Development behaviors are included with lifecycle cleanup. Prototype actions are not converted yet.';pageLabel.hidden=scope!=='page';const rows=native?[[doc.name+'.pixl','Editable PixlPrfct project'],[doc.pages.length+' pages · '+doc.shapes.length+' layers','Original structure and component links'],['Variables, images and prototypes','Continue working in another workspace']]:target.value!=='html'?(scope==='project'?[[target.selectedOptions[0].textContent+' project',doc.pages.length+' page components'],[target.value==='rust'?'Cargo.toml + main.rs':'package.json + app entry','Install, run and build'],['CSS + README','Styles and setup instructions']]:[['Page component','Import into an existing application'],['CSS + template files','Editable design source'],['README','Integration instructions']]):scope==='project'?[['HTML + CSS',doc.pages.length+' pages · separate files'],['script.js','Shared interaction starter'],['project.json + README','Page map and instructions']]:[['index.html + styles.css','Your design and styling'],['script.js','Interaction starter'],['project.json + README','Page map and instructions']];fileList.replaceChildren(...rows.map(([name,description])=>{const row=el('div','code-file-row');row.append(el('span','',name),el('span','',description));return row;}));}
 download.onclick=()=>{try{onExport({scope,target:target.value,pageId:scope==='selection'?doc.active_page:Number(page.value),ids});win.close();}catch(e){error.hidden=false;error.textContent=String(e);}};sync();win.open();
}
