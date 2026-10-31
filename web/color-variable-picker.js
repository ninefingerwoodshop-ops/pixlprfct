import {element,choose,action} from './inspector-settings.js';
export function variableColor(doc,shape,id){
 const vars=doc.variables??{values:[],collections:[]},modes={...(doc.pages??[]).find(p=>p.id===shape?.page_id)?.variable_modes},chain=[];let node=shape;
 const seen=new Set();while(node&&!seen.has(node.id)){seen.add(node.id);chain.unshift(node);node=doc.shapes?.find(s=>s.id===node.parent_id);}
 for(const s of chain)Object.assign(modes,s.variable_modes??{});
 const visited=new Set();while(id&&!visited.has(id)){visited.add(id);const v=vars.values.find(v=>v.id===id),collection=vars.collections.find(c=>c.id===v?.collection_id),value=v?.values[modes[collection?.id]??collection?.default_mode];if(typeof value==='string')return value;if(value&&typeof value==='object')id=value.alias;else break;}
 return null;
}
export function installColorVariablePicker({picker,head,spectrum,get,change,document:read,shape}){
 const close=head.lastElementChild,tabs=element('div','paint-popover-tabs'),custom=element('button','','Custom'),libraries=element('button','','Libraries');tabs.setAttribute('role','tablist');
 for(const b of [custom,libraries]){b.type='button';b.setAttribute('role','tab');tabs.append(b);}head.classList.add('paint-popover-heading');head.replaceChildren(tabs,close);
 const library=element('div','paint-library'),searchbar=element('div','paint-library-search'),search=element('input');search.type='search';search.placeholder='Search';search.setAttribute('aria-label','Search color variables');searchbar.append(search);
 const toolbar=element('div','paint-library-toolbar'),collection=choose('Variable set',[['all','All libraries']],'all',()=>render()),grid=action('Show as grid','grid',()=>{list.classList.toggle('color-variable-grid');grid.setAttribute('aria-label',list.classList.contains('color-variable-grid')?'Show as list':'Show as grid');}),list=element('div','paint-variable-list');toolbar.append(collection,grid);library.append(searchbar,toolbar,list);picker.append(library);
 function render(){const doc=read(),vars=doc.variables??{values:[],collections:[]},old=collection.value;collection.replaceChildren(...[['all','All libraries'],...vars.collections.map(c=>[String(c.id),c.name])].map(([value,label])=>{const o=element('option','',label);o.value=value;return o;}));collection.value=[...collection.options].some(o=>o.value===old)?old:'all';list.replaceChildren();
  for(const v of vars.values.filter(v=>v.kind==='color'&&(collection.value==='all'||String(v.collection_id)===collection.value)&&v.name.toLowerCase().includes(search.value.toLowerCase()))){const b=element('button','paint-variable-choice'),swatch=element('span','paint-library-swatch');swatch.style.background=variableColor(doc,shape?.(),v.id)??'transparent';b.type='button';b.title=v.name;b.setAttribute('aria-label','Use '+v.name);b.setAttribute('aria-pressed',String(v.id===get().color_variable));b.append(swatch,element('span','',v.name));b.onclick=()=>{change({color_variable:v.id});picker.hidePopover();};list.append(b);}if(!list.children.length)list.append(element('p','paint-empty','No matching color variables.'));
 }
 function activate(useLibrary){spectrum.hidden=useLibrary;library.hidden=!useLibrary;custom.setAttribute('aria-selected',String(!useLibrary));libraries.setAttribute('aria-selected',String(useLibrary));if(useLibrary){render();search.focus();}}
 custom.onclick=()=>activate(false);libraries.onclick=()=>activate(true);search.oninput=render;activate(false);
 return {open:()=>activate(!!get().color_variable),sync:()=>{if(!library.hidden&&picker.matches(':popover-open'))render();},name:()=>read().variables?.values.find(v=>v.id===get().color_variable)?.name};
}
