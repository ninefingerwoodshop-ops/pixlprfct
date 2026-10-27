import {icon} from './icons.js';
import {showContextMenu} from './context-menu.js';
import {compileCssScene} from './css-renderer.js';
import {exportShapes,exportBounds} from './export.js';
export function componentAssets(doc, query = '', page = '') {
  const masters = new Map(doc.shapes.filter(s => s.component?.type === 'master').map(s => [s.id,s]));
  const grouped = new Set();
  const assets = [];
  const pageName = id => doc.pages.find(p => p.id === id)?.name ?? 'Page';
  for (const set of doc.component_sets ?? []) {
    const variants = set.variants.filter(v => masters.has(v.component_id)).map(v => {
      const shape = masters.get(v.component_id); grouped.add(shape.id);
      return {id:shape.id, page:shape.page_id, label:set.properties.map((p,i)=>`${p}: ${v.values[i]}`).join(', ')};
    });
    if (variants.length) assets.push({name:set.name, variants, pages:[...new Set(variants.map(v=>v.page))]});
  }
  for (const shape of masters.values()) if (!grouped.has(shape.id)) assets.push({name:shape.name,variants:[{id:shape.id,page:shape.page_id,label:shape.name}],pages:[shape.page_id]});
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return assets.filter(a => (!page || a.pages.includes(Number(page))) && words.every(w => `${a.name} ${a.pages.map(pageName).join(' ')} ${a.variants.map(v=>v.label).join(' ')}`.toLocaleLowerCase().includes(w))).map(a=>({...a,pageNames:a.pages.map(pageName)})).sort((a,b)=>a.name.localeCompare(b.name));
}

export function assetAppearance(doc,id,textLayout){
 const shapes=exportShapes(doc.shapes,[id],'selection'),box=exportBounds(shapes),main=doc.shapes.find(s=>s.id===id);
 const modes={...(doc.pages.find(p=>p.id===main?.page_id)?.variable_modes??{})};const chain=[];let node=main;const seen=new Set();while(node&&!seen.has(node.id)){seen.add(node.id);chain.unshift(node);node=doc.shapes.find(s=>s.id===node.parent_id);}for(const s of chain)Object.assign(modes,s.variable_modes);
 const normalized=shapes.map(s=>({...s,x:s.x-box.x,y:s.y-box.y}));
 return {...compileCssScene(normalized,{variables:doc.variables,pageModes:modes,textLayout,interactive:true}),width:Math.max(1,box.width),height:Math.max(1,box.height)};
}

export function renderAssets(container, assets, {insert, goMain, preview, page, dragStart, dragEnd}, limit = 40) {
  container.disposeAssetPreviews?.();const observers=[];container.disposeAssetPreviews=()=>observers.forEach(o=>o.disconnect());
  const rows = assets.slice(0,limit).map(asset => {
    const card = document.createElement('article');card.className='asset-card';
    const name = document.createElement('strong');name.textContent=asset.name;name.title=asset.name;
    const location = document.createElement('small');location.textContent=asset.pageNames.join(' · ');
    const thumb = document.createElement('span');thumb.className='asset-live-preview';thumb.setAttribute('aria-hidden','true');thumb.inert=true;const shadow=thumb.attachShadow({mode:'open'}),style=document.createElement('style'),scene=document.createElement('div');scene.className='px-scene';shadow.append(style,scene);let dimensions={width:1,height:1};
    const fit=()=>{const scale=Math.min(1,thumb.clientWidth/dimensions.width,thumb.clientHeight/dimensions.height);scene.style.transform=`translate(${(thumb.clientWidth-dimensions.width*scale)/2}px,${(thumb.clientHeight-dimensions.height*scale)/2}px) scale(${scale})`;};const observer=new ResizeObserver(fit);observer.observe(thumb);observers.push(observer);
    const imageButton = document.createElement('button');imageButton.className='asset-preview';imageButton.setAttribute('aria-label','Insert instance of '+asset.name);imageButton.append(thumb);
    let selected = asset.variants.find(v=>String(v.page)===page)?.id ?? asset.variants[0].id;
    imageButton.draggable=!!dragStart;imageButton.title='Click to insert, or drag onto the canvas';
    imageButton.ondragstart=event=>dragStart?.(event,selected);
    imageButton.ondragend=()=>dragEnd?.();
    const updatePreview = () => {try {const result=preview(selected);dimensions=result;style.textContent=result.css+'\n:host{all:initial;display:block;position:relative;width:100%;height:100%;pointer-events:none;overflow:hidden}.px-scene{transform-origin:0 0;pointer-events:none}';scene.innerHTML=result.html;scene.style.width=result.width+'px';scene.style.height=result.height+'px';thumb.hidden=false;fit();} catch {thumb.hidden=true;}};
    updatePreview();imageButton.onclick=()=>insert(selected);
    const caption=document.createElement('div');caption.className='asset-caption';caption.append(name);card.append(imageButton,caption);location.className='asset-location';
    if (asset.variants.length>1) {
      const variants=document.createElement('select');variants.setAttribute('aria-label','Variant of '+asset.name);
      for(const variant of asset.variants){const option=document.createElement('option');option.value=variant.id;option.textContent=variant.label;variants.append(option);}
      variants.value=selected;variants.onchange=()=>{selected=Number(variants.value);updatePreview();};card.append(variants);
    }
    const options=document.createElement('button');options.type='button';options.className='asset-options-button';
    options.innerHTML=icon('more-horizontal');options.title='Options for '+asset.name;
    options.setAttribute('aria-label','Options for '+asset.name);options.setAttribute('aria-haspopup','menu');options.setAttribute('aria-expanded','false');
    options.onclick=event=>{const rect=options.getBoundingClientRect();options.setAttribute('aria-expanded','true');
      showContextMenu({preventDefault:()=>event.preventDefault(),clientX:rect.left,clientY:rect.bottom+4},[
        {label:'Insert instance',run:()=>insert(selected)},
        {label:'Go to main component',run:()=>goMain(selected)}
      ],options,{label:'Options for '+asset.name,heading:asset.name,container:container.closest('dialog')??document.body,onClose:()=>options.setAttribute('aria-expanded','false')});
    };
    caption.append(options);return card;
  });
  if(!rows.length){const message=document.createElement('div');message.className='empty-assets';const title=document.createElement('strong');title.textContent='No components to show';const hint=document.createElement('p');hint.textContent='Create a component from selected layers with Ctrl/⌘ + Alt + K, or adjust your search and page filter.';message.append(title,hint);rows.push(message);}
  if(assets.length>limit){const more=document.createElement('button');more.textContent=`Show more (${assets.length-limit} remaining)`;more.onclick=()=>renderAssets(container,assets,{insert,goMain,preview,page,dragStart,dragEnd},limit+40);rows.push(more);}
  container.replaceChildren(...rows);
}
