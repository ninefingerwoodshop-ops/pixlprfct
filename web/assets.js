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

export function renderAssets(container, assets, {insert, goMain, preview, page, dragStart, dragEnd}, limit = 40) {
  const rows = assets.slice(0,limit).map(asset => {
    const card = document.createElement('article');card.className='asset-card';
    const name = document.createElement('strong');name.textContent=asset.name;
    const location = document.createElement('small');location.textContent=asset.pageNames.join(' · ');
    const thumb = document.createElement('img');thumb.alt='';thumb.loading='lazy';thumb.draggable=false;
    const imageButton = document.createElement('button');imageButton.className='asset-preview';imageButton.setAttribute('aria-label','Insert instance of '+asset.name);imageButton.append(thumb);
    let selected = asset.variants.find(v=>String(v.page)===page)?.id ?? asset.variants[0].id;
    imageButton.draggable=!!dragStart;imageButton.title='Click to insert, or drag onto the canvas';
    imageButton.ondragstart=event=>dragStart?.(event,selected);
    imageButton.ondragend=()=>dragEnd?.();
    const updatePreview = () => {try {thumb.src=preview(selected);thumb.hidden=false;} catch {thumb.hidden=true;}};
    updatePreview();imageButton.onclick=()=>insert(selected);
    card.append(imageButton,name,location);
    if (asset.variants.length>1) {
      const variants=document.createElement('select');variants.setAttribute('aria-label','Variant of '+asset.name);
      for(const variant of asset.variants){const option=document.createElement('option');option.value=variant.id;option.textContent=variant.label;variants.append(option);}
      variants.value=selected;variants.onchange=()=>{selected=Number(variants.value);updatePreview();};card.append(variants);
    }
    const actions=document.createElement('div');actions.className='asset-card-actions';
    const add=document.createElement('button');add.textContent='Insert';add.setAttribute('aria-label','Insert '+asset.name);add.onclick=()=>insert(selected);
    const main=document.createElement('button');main.textContent='Go to main';main.setAttribute('aria-label','Go to main '+asset.name);main.onclick=()=>goMain(selected);
    actions.append(add,main);card.append(actions);return card;
  });
  if(!rows.length){const message=document.createElement('p');message.className='empty-assets';message.textContent='No matching components. Create a component from selected layers with Ctrl/Command + Alt + K, or clear your filters.';rows.push(message);}
  if(assets.length>limit){const more=document.createElement('button');more.textContent=`Show more (${assets.length-limit} remaining)`;more.onclick=()=>renderAssets(container,assets,{insert,goMain,preview,page,dragStart,dragEnd},limit+40);rows.push(more);}
  container.replaceChildren(...rows);
}
