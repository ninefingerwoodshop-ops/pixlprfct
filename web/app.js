import init, { Editor } from './pkg/pixlprfct_core.js';
import { textStyle, fontCss, layoutText, textSvg } from './typography.js';
import { bounds, marqueeSelection, layerRange, expandGroups, selectedGroup, descendants, visibleInTree } from './selection.js';
import {clippingFrames,paintBounds,frameAt,clipDefinitions,clipSvg,dropParent} from './scene.js';
import {imageLayout,imageSvg,readImage} from './images.js';
import { scaleShapes } from './scaling.js';
import { vectorTools, fromPoints, drawnShape, vectorPath, vectorSvg, anchors, reshape } from './vectors.js';
import { icon, installIcons } from './icons.js';

const $ = id => document.getElementById(id);
const canvas = $('canvas'), ctx = canvas.getContext('2d');
const measureCtx = document.createElement('canvas').getContext('2d');
function textLayout(shape) { measureCtx.font = fontCss(textStyle(shape)); return layoutText(shape, value => measureCtx.measureText(value).width); }
const KEY = 'pixlprfct.document.v1';
let editor, doc, selected = 0, tool = 'select', zoom = 1, pan = { x: 0, y: 0 }, gesture = null, space = false;
let toastTimer, savingTimer, recoveryBlocked = false;
const imageCache=new Map();
let imageReplaceId=0,imageLoading=false;
let penPoints = [];
let editingPath = 0;
let selectedIds = new Set(), layerAnchor = 0;
function setSelection(ids) { selectedIds = new Set(ids); selected = ids.at(-1) || 0; if(ids.length!==1 || ids[0]!==editingPath) editingPath=0; }
function selectionShapes() { return pageShapes().filter(s => selectedIds.has(s.id)); }
function selectionJson() { return JSON.stringify([...selectedIds]); }
const pageViews = new Map();
const collapsedGroups=new Set();
const collapsedFrames=new Set();
function insertAt(shape,start){return editor.insert(JSON.stringify({...shape,parent_id:frameAt(pageShapes(),start),clip_content:shape.kind==='frame'}));}
function transformedSelection(){return descendants(pageShapes(),[...selectedIds]);}
function groupSelection() { safe(()=>{const ids=expandGroups(pageShapes(),[...selectedIds]); editor.group_many(JSON.stringify(ids));setSelection(ids);refresh();});}
function ungroupSelection() {safe(()=>{editor.ungroup_many(selectionJson());refresh();});}
function pageShapes() { return doc?.shapes.filter(s => s.page_id === doc.active_page) || []; }
function activePage() { return doc?.pages.find(p => p.id === doc.active_page); }

function toast(message) { $('toast').textContent = message; $('toast').style.display = 'block'; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').style.display = 'none', 4000); }
function safe(action) { try { action(); } catch (error) { toast(String(error)); } }
function current() { return selectedIds.size === 1 ? pageShapes().find(s => selectedIds.has(s.id)) : null; }
function snapshot() { doc = JSON.parse(editor.snapshot()); setSelection([...selectedIds].filter(id => pageShapes().some(s => s.id === id))); }
function persist() {
  if (recoveryBlocked) { $('save-status').textContent = 'Recovery needed — save to a file'; return; }
  clearTimeout(savingTimer);
  savingTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, editor.snapshot()); $('save-status').textContent = 'Saved on this device'; }
    catch { $('save-status').textContent = 'Local storage unavailable — save to a file'; }
  }, 250);
}
function refresh(save = true) {
  const previousPage = doc?.active_page;
  if (previousPage) pageViews.set(previousPage, { zoom, pan: { ...pan } });
  snapshot();
  const usedImages=new Set(doc.shapes.filter(s=>s.image).map(s=>s.image.data_url));for(const key of imageCache.keys())if(!usedImages.has(key))imageCache.delete(key);
  const changedPage = previousPage !== doc.active_page;
  if (changedPage) { setSelection([]); layerAnchor = 0; gesture = null; penPoints = []; }
  renderPages(); renderLayers(); renderProperties();
  if (changedPage) {
    const view = pageViews.get(doc.active_page);
    if (view) { zoom = view.zoom; pan = { ...view.pan }; } else fit();
  }
  draw();
  $('undo').disabled = !editor.can_undo(); $('redo').disabled = !editor.can_redo();
  $('document-name').value = doc.name; $('canvas-label').textContent = `${doc.name} / ${activePage().name}`;
  if (save) persist();
}
function update(shape) { safe(() => { editor.update(JSON.stringify(shape)); refresh(); }); }
function updateMany(shapes) { safe(() => { editor.update_many(JSON.stringify(shapes)); refresh(); }); }
function duplicateSelection() { safe(() => { if (selectedIds.size) { setSelection(JSON.parse(editor.duplicate_many(selectionJson()))); refresh(); } }); }
function deleteSelection() { safe(() => { if (selectedIds.size) { editor.remove_many(selectionJson()); refresh(); } }); }
function switchPage(id) { safe(() => { editor.select_page(id); refresh(); }); }
function renderPages() {
  $('pages').replaceChildren(...doc.pages.map(page => {
    const button = document.createElement('button');
    button.className = 'page-row' + (page.id === doc.active_page ? ' active' : '');
    button.textContent = page.name; button.title = page.name;
    button.setAttribute('aria-pressed', String(page.id === doc.active_page));
    button.onclick = () => switchPage(page.id);
    button.ondblclick = () => $('rename-page').click();
    return button;
  }));
  $('page-picker').replaceChildren(...doc.pages.map(page => {
    const option = document.createElement('option'); option.value = page.id; option.textContent = page.name; return option;
  }));
  $('page-picker').value = doc.active_page;
  for (const id of ['delete-page', 'mobile-delete-page']) $(id).disabled = doc.pages.length <= 1;
  for (const id of ['add-page', 'mobile-add-page']) $(id).disabled = doc.pages.length >= 100;
}
function renderLayers() {
  $('layer-count').textContent = pageShapes().length;
  const query = $('layer-search').value.trim().toLocaleLowerCase();
  const listed = pageShapes().reverse().filter(s => (s.name+' '+(s.group_name||'')).toLocaleLowerCase().includes(query));
  const layerButton = shape => {
    const button = document.createElement('button');
    button.className = 'layer' + (selectedIds.has(shape.id) ? ' active' : '');
    button.setAttribute('aria-pressed', String(selectedIds.has(shape.id)));
    const glyph = document.createElement('span'); glyph.className = 'glyph'; glyph.innerHTML = icon(shape.kind);
    const name = document.createElement('span'); name.className = 'layer-name'; name.textContent = shape.name;
    button.append(glyph, name);
    if (shape.hidden) { const mark = document.createElement('span'); mark.className = 'hidden-mark'; mark.textContent = 'Hidden'; button.append(mark); }
    button.onclick = event => {
      if (event.shiftKey) setSelection(layerRange(listed, layerAnchor, shape.id));
      else if (event.ctrlKey || event.metaKey) { const ids = new Set(selectedIds); ids.has(shape.id) ? ids.delete(shape.id) : ids.add(shape.id); setSelection([...ids]); layerAnchor = shape.id; }
      else { setSelection([shape.id]); layerAnchor = shape.id; }
      refresh(false);
    };
    return button;
  };
  const buildRows=parent=>{
  const rows=[],seen=new Set();
  const frameItem=shape=>{
    if(shape.kind!=='frame'||query)return layerButton(shape);
    const wrap=document.createElement('div'),row=document.createElement('div');row.className='group-row';
    const toggle=document.createElement('button'),open=!collapsedFrames.has(shape.id);toggle.textContent=open?'⌄':'›';toggle.setAttribute('aria-label',(open?'Collapse frame ':'Expand frame ')+shape.name);toggle.setAttribute('aria-expanded',String(open));
    toggle.onclick=()=>{open?collapsedFrames.add(shape.id):collapsedFrames.delete(shape.id);renderLayers();};
    row.append(toggle,layerButton(shape));wrap.append(row);
    if(open){const children=document.createElement('div');children.className='group-children';children.append(...buildRows(shape.id));wrap.append(children);}return wrap;
  };
  for(const shape of listed.filter(s=>query||s.parent_id===parent)) {
    if(!shape.group_id) {rows.push(frameItem(shape));continue;}
    if(seen.has(shape.group_id)) continue;seen.add(shape.group_id);
    const members=pageShapes().filter(s=>s.group_id===shape.group_id), group=document.createElement('div');group.className='layer-group';
    const row=document.createElement('div');row.className='group-row';
    const toggle=document.createElement('button');const open=!!query||!collapsedGroups.has(shape.group_id);
    toggle.textContent=open?'⌄':'›';toggle.setAttribute('aria-label',open?'Collapse '+shape.group_name:'Expand '+shape.group_name);toggle.setAttribute('aria-expanded',String(open));
    toggle.onclick=()=>{collapsedGroups.has(shape.group_id)?collapsedGroups.delete(shape.group_id):collapsedGroups.add(shape.group_id);renderLayers();};
    const select=document.createElement('button');select.className='group-title';select.textContent=shape.group_name;select.setAttribute('aria-pressed',String(members.every(s=>selectedIds.has(s.id))));
    select.onclick=event=>{const ids=new Set(event.shiftKey?[...selectedIds]:[]);const remove=event.shiftKey&&members.every(s=>ids.has(s.id));members.forEach(s=>remove?ids.delete(s.id):ids.add(s.id));setSelection([...ids]);refresh(false);};
    row.append(toggle,select);group.append(row);
    if(open) {const children=document.createElement('div');children.className='group-children';children.append(...listed.filter(s=>s.group_id===shape.group_id).map(frameItem));group.append(children);}
    rows.push(group);
  }
  return rows;};
  $('layers').replaceChildren(...buildRows(0));
  if (!pageShapes().length) { const hint = document.createElement('p'); hint.className = 'empty-layers'; hint.textContent = 'A fresh page. Pick a tool below and click the canvas to start.'; $('layers').append(hint); }
  else if (!listed.length) { const hint = document.createElement('p'); hint.className = 'empty-layers'; hint.textContent = 'No matching layers'; $('layers').append(hint); }
}
function renderProperties() {
  const shapes = selectionShapes(), shape = current();
  const excluded=new Set(transformedSelection().map(s=>s.id));
  $('parent-panel').hidden=!shapes.length||(!shapes.some(s=>s.parent_id)&&!pageShapes().some(s=>s.kind==='frame'&&!excluded.has(s.id)));
  $('parent-frame').replaceChildren(...[{id:0,name:'Page (no parent)'},...pageShapes().filter(s=>s.kind==='frame'&&!excluded.has(s.id))].map(s=>{const option=document.createElement('option');option.value=s.id;option.textContent=s.name;return option;}));
  $('parent-frame').value=shapes[0]?.parent_id??0;
  $('constraints-panel').hidden=!shapes.length||shapes.some(s=>!s.parent_id);
  for(const axis of ['horizontal','vertical']){const value=shapes[0]?.constraints?.[axis]??'min';$('constraint-'+axis).value=shapes.some(s=>(s.constraints?.[axis]??'min')!==value)?'':value;}
  const groupId=selectedGroup(pageShapes(),[...selectedIds]);
  $('group-actions').hidden=shapes.length<2&&!shapes.some(s=>s.group_id); $('group-layers').disabled=shapes.length<2||!!groupId; $('ungroup-layers').disabled=!shapes.some(s=>s.group_id);
  $('group-name-row').hidden=!groupId;if(groupId)$('group-name').value=shapes[0].group_name;
  document.querySelectorAll('[data-align]').forEach(button=>button.disabled=shapes.some(s=>s.group_id));
  $('scale-panel').hidden=tool!=='scale'||!shapes.length;
  $('empty-selection').hidden = shapes.length > 0; $('properties').hidden = !shape; $('multi-properties').hidden = shapes.length < 2;
  $('selection-caption').textContent = shapes.length > 1 ? `${shapes.length} layers` : shape ? shape.kind : 'Page';
  if (shapes.length > 1) {
    const box = bounds(shapes); $('multi-title').textContent = groupId ? `${shapes[0].group_name} · ${shapes.length} layers` : `${shapes.length} layers selected`;
    $('multi-size').textContent = `${Math.round(box.width)} × ${Math.round(box.height)}`;
    const mixed = shapes.some(s => s.fill !== shapes[0].fill);
    $('multi-fill').value = shapes[0].fill; $('multi-fill-value').textContent = mixed ? 'Mixed' : shapes[0].fill.toUpperCase();
    document.querySelectorAll('[data-distribute]').forEach(b => b.disabled = shapes.length < 3 || shapes.some(s=>s.group_id));
  }
  if (!shape) return;
  $('image-section').hidden=shape.kind!=='image';
  $('paint-label').parentElement.hidden=shape.kind==='image';
  if(shape.image){$('image-mode').value=shape.image.mode;$('image-zoom').value=shape.image.zoom;$('image-x').value=Math.round(shape.image.offset_x*100);$('image-y').value=Math.round(shape.image.offset_y*100);$('image-crop-fields').hidden=shape.image.mode==='fit';}
  $('frame-section').hidden=shape.kind!=='frame';$('clip-content').checked=!!shape.clip_content;
  $('stroke-section').hidden = !vectorTools.includes(shape.kind); $('stroke-width').value = shape.stroke_width ?? 2;
  $('paint-label').textContent = shape.points?.length && !shape.closed ? 'Stroke color' : 'Fill';
  $('shape-name').value = shape.name; $('shape-kind').textContent = shape.kind;
  for (const key of ['x', 'y', 'width', 'height']) $(key).value = Math.round(shape[key] * 100) / 100;
  $('fill').value = shape.fill; $('fill-value').textContent = shape.fill.toUpperCase();
  $('text-section').hidden = shape.kind !== 'text'; $('text').value = shape.text; $('visible').checked = !shape.hidden;
  if (shape.kind === 'text') {
    const style = textStyle(shape);
    $('font-family').value = style.font_family; $('font-size').value = Math.round(style.font_size * 100) / 100;
    $('font-weight').value = style.font_weight; $('line-height').value = style.line_height;
    $('text-align').value = style.align; $('text-wrap').checked = style.wrap;
    $('text-overflow').hidden = !textLayout(shape).overflow;
  }
}
function drawShape(shape) {
  if (shape.hidden) return;
  ctx.fillStyle = shape.fill;
  if(shape.kind==='image'&&shape.image){const data=shape.image.data_url;let entry=imageCache.get(data);if(!entry){const bitmap=new Image();entry={bitmap,ready:false};imageCache.set(data,entry);bitmap.onload=()=>{entry.ready=true;draw();};bitmap.onerror=()=>{entry.failed=true;toast('An embedded image could not be decoded. Replace it in the inspector.');};bitmap.src=data;}if(entry.ready){const p=imageLayout(shape);ctx.drawImage(entry.bitmap,p.sx,p.sy,p.sw,p.sh,p.dx,p.dy,p.dw,p.dh);}else{ctx.fillStyle='#e5e7eb';ctx.fillRect(shape.x,shape.y,shape.width,shape.height);}}
  else if (shape.points?.length) { const path = new Path2D(vectorPath(shape)); ctx.strokeStyle=shape.fill; ctx.lineWidth=shape.stroke_width??2; ctx.lineCap='round'; ctx.lineJoin='round'; if(shape.closed) ctx.fill(path); ctx.stroke(path); }
  else if (shape.kind === 'ellipse') { ctx.beginPath(); ctx.ellipse(shape.x + shape.width / 2, shape.y + shape.height / 2, shape.width / 2, shape.height / 2, 0, 0, Math.PI * 2); ctx.fill(); }
  else if (shape.kind === 'text') {
    ctx.save(); ctx.beginPath(); ctx.rect(shape.x, shape.y, shape.width, shape.height); ctx.clip();
    const layout = textLayout(shape);
    ctx.font = fontCss(layout.style); ctx.textBaseline = 'top'; ctx.textAlign = layout.style.align;
    layout.lines.forEach(line => ctx.fillText(line.text, line.x, line.y)); ctx.restore();
  } else {
    if (shape.kind === 'frame') { ctx.save(); ctx.shadowColor = '#0003'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8; ctx.fillRect(shape.x, shape.y, shape.width, shape.height); ctx.restore(); }
    else ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
  }
}
function draw() {
  if (!doc) return;
  const w = canvas.clientWidth, h = canvas.clientHeight, dpr = devicePixelRatio || 1;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  ctx.translate(pan.x, pan.y); ctx.scale(zoom, zoom);
  const previews = gesture?.previews || (gesture?.preview ? [gesture.preview] : []);
  let scene=pageShapes().map(shape=>previews.find(s=>s.id===shape.id)||shape);
  if(gesture?.type==='resize'&&gesture.original.kind==='frame'){try{scene=JSON.parse(editor.preview_update_many(JSON.stringify(previews))).shapes.filter(s=>s.page_id===doc.active_page);}catch{scene=pageShapes();}}
  for(const shape of scene) if(visibleInTree(shape,scene)){ctx.save();for(const frame of clippingFrames(shape,scene)){ctx.beginPath();ctx.rect(frame.x,frame.y,frame.width,frame.height);ctx.clip();}drawShape(shape);ctx.restore();}
  if (gesture?.type==='create') {ctx.save();const preview={...gesture.preview,parent_id:frameAt(pageShapes(),gesture.start)};for(const frame of clippingFrames(preview,scene)){ctx.beginPath();ctx.rect(frame.x,frame.y,frame.width,frame.height);ctx.clip();}drawShape(preview);ctx.restore();}
  if (penPoints.length) { const preview=fromPoints('pen',penPoints); drawShape(preview); drawAnchors(penPoints); }
  if(editingPath && current()?.points?.length) drawAnchors(anchors(gesture?.preview??current()));
  const visibleSelection = selectionShapes().filter(s => visibleInTree(s,pageShapes())).map(s => previews.find(p => p.id === s.id) || s);
  const shape = bounds(visibleSelection);
  if (shape && !editingPath) {
    ctx.strokeStyle = '#0d99ff'; ctx.lineWidth = 1 / zoom;
    for (const item of visibleSelection) ctx.strokeRect(item.x, item.y, item.width, item.height);
    ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
    const size = 6 / zoom;
    if (visibleSelection.length === 1) for (const [x, y] of [[shape.x, shape.y], [shape.x + shape.width, shape.y], [shape.x, shape.y + shape.height], [shape.x + shape.width, shape.y + shape.height]]) { ctx.fillStyle = '#fff'; ctx.fillRect(x - size / 2, y - size / 2, size, size); ctx.strokeRect(x - size / 2, y - size / 2, size, size); }
    ctx.fillStyle = '#0d99ff'; ctx.font = `${10 / zoom}px Inter,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(`${Math.round(shape.width)} × ${Math.round(shape.height)}`, shape.x + shape.width / 2, shape.y + shape.height + 10 / zoom); ctx.textAlign = 'left';
  }
  if (gesture?.type === 'marquee') {
    const box = bounds([{x:gesture.start.x,y:gesture.start.y,width:0,height:0},{x:gesture.end.x,y:gesture.end.y,width:0,height:0}]);
    ctx.fillStyle = '#0d99ff18'; ctx.strokeStyle = '#0d99ff'; ctx.lineWidth = 1 / zoom; ctx.fillRect(box.x,box.y,box.width,box.height); ctx.strokeRect(box.x,box.y,box.width,box.height);
  }
  $('zoom-fit').textContent = `${Math.round(zoom * 100)}%`;
}
function drawAnchors(points) {
  ctx.strokeStyle='#0d99ff'; ctx.lineWidth=1/zoom; ctx.fillStyle='#fff';
  for(const p of points) {
    for(const h of [p.in,p.out].filter(Boolean)) {
      ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(h.x,h.y);ctx.stroke();
      ctx.beginPath();ctx.arc(h.x,h.y,3/zoom,0,Math.PI*2);ctx.fill();ctx.stroke();
    }
    ctx.fillRect(p.x-4/zoom,p.y-4/zoom,8/zoom,8/zoom);ctx.strokeRect(p.x-4/zoom,p.y-4/zoom,8/zoom,8/zoom);
  }
}
function fit(onlySelection = false) {
  const shapes = (onlySelection === true ? selectionShapes() : pageShapes()).map(s=>paintBounds(s,pageShapes())).filter(Boolean);
  if (!shapes.length) { zoom = 1; pan = { x: 80, y: 100 }; draw(); return; }
  const minX = Math.min(...shapes.map(s => s.x)), minY = Math.min(...shapes.map(s => s.y));
  const width = Math.max(...shapes.map(s => s.x + s.width)) - minX;
  const height = Math.max(...shapes.map(s => s.y + s.height)) - minY;
  zoom = Math.max(.1, Math.min(1.1, (canvas.clientWidth - 100) / width, (canvas.clientHeight - 220) / height));
  pan = { x: (canvas.clientWidth - width * zoom) / 2 - minX * zoom, y: (canvas.clientHeight - height * zoom) / 2 - minY * zoom - 15 }; draw();
}
function zoomAt(factor, x = canvas.clientWidth / 2, y = canvas.clientHeight / 2) {
  const before = zoom; zoom = Math.max(.1, Math.min(4, zoom * factor));
  pan.x = x - (x - pan.x) * zoom / before; pan.y = y - (y - pan.y) * zoom / before; draw();
}
function point(event) { const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left - pan.x) / zoom, y: (event.clientY - rect.top - pan.y) / zoom }; }
function setTool(value) {
  penPoints=[]; gesture=null; editingPath=0;
  document.querySelectorAll('.tool-group').forEach(el=>el.open=false);
  tool = value; document.querySelectorAll('[data-tool]').forEach(button => { const active = button.dataset.tool === tool; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  renderProperties();
  draw();
  canvas.style.cursor = tool === 'hand' ? 'grab' : tool === 'select' ? 'default' : 'crosshair';
  $('hint').textContent = tool === 'select' ? 'Shift-click to multi-select · Drag empty canvas to select an area' : tool === 'hand' ? 'Drag to pan the canvas' : tool === 'scale' ? 'Drag from the lower-right of your selection to scale · Shift snaps to 10% steps' : tool === 'pen' ? 'Click for corners · Drag for curves · Click first point to close · Enter to finish' : tool === 'pencil' ? 'Drag to draw freehand · Escape to cancel' : 'Drag to draw · Shift to constrain · Alt to draw from center';
}
function download(name, body, type) { const url = URL.createObjectURL(new Blob([body], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
async function exportSvg() {
  await document.fonts.ready;
  const shapes = pageShapes().filter(s => visibleInTree(s,pageShapes())); if (!shapes.length) { toast('Add something to the canvas first.'); return; }
  const box=bounds(shapes.map(s=>paintBounds(s,pageShapes())).filter(Boolean));if(!box){toast('Nothing visible to export');return;}const {x,y,width:w,height:h}=box;
  const renderSvg=s=>{
    if(s.kind==='image')return imageSvg(s);
    if (s.points?.length) return vectorSvg(s);
    if (s.kind === 'ellipse') return `<ellipse cx="${s.x + s.width / 2}" cy="${s.y + s.height / 2}" rx="${s.width / 2}" ry="${s.height / 2}" fill="${s.fill}"/>`;
    if (s.kind === 'text') return textSvg(s, textLayout(s));
    return `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" fill="${s.fill}"/>`;
  };
  const body=clipDefinitions(shapes)+shapes.map(s=>clipSvg(s,pageShapes(),renderSvg(s))).join('');
  download(`${doc.name || 'design'} - ${activePage().name}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}">${body}</svg>`, 'image/svg+xml'); toast('Current page exported as SVG');
}
function finishPen(closed) {
  if(penPoints.length<2) return;
  safe(()=>{ const id=insertAt(fromPoints('pen',penPoints,closed),penPoints[0]); penPoints=[]; setSelection([id]); setTool('select'); refresh(); });
}
async function placeImage(file,location=null,replaceId=0) {
  if(imageLoading){toast('An image is already loading');return;}imageLoading=true;const page=doc.active_page;
  try {
    const raster=await readImage(file);if(doc.active_page!==page)throw new Error('Page changed during import. Place the image again.');
    if(replaceId){const target=pageShapes().find(s=>s.id===replaceId&&s.kind==='image');if(!target)throw new Error('The target image no longer exists');editor.update(JSON.stringify({...target,image:raster}));setSelection([replaceId]);}
    else {const scale=Math.min(1,480/raster.width,360/raster.height),width=raster.width*scale,height=raster.height*scale;const start=location??{x:(canvas.clientWidth/2-pan.x)/zoom-width/2,y:(canvas.clientHeight/2-pan.y)/zoom-height/2};setSelection([insertAt({id:0,kind:'image',name:file.name.slice(0,80)||'Image',x:start.x,y:start.y,width,height,fill:'#ffffff',text:'',hidden:false,image:raster},start)]);}
    setTool('select');refresh();toast('Image placed');
  } catch(error){toast(String(error));}finally{imageLoading=false;}
}
function bind() {
  installIcons();
  $('place-image').onclick=()=>{imageReplaceId=0;$('image-file').click();};
  $('replace-image').onclick=()=>{imageReplaceId=current()?.id??0;$('image-file').click();};
  $('image-file').onchange=()=>{const file=$('image-file').files[0],replace=imageReplaceId;$('image-file').value='';if(file)placeImage(file,null,replace);};
  for(const [id,key] of [['image-mode','mode'],['image-zoom','zoom'],['image-x','offset_x'],['image-y','offset_y']])$(id).onchange=()=>{const shape=current();if(!shape?.image)return;const value=key==='mode'?$(id).value:Number($(id).value)/(key.startsWith('offset')?100:1);update({...shape,image:{...shape.image,[key]:value}});renderProperties();};
  $('reset-crop').onclick=()=>{const s=current();if(s?.image)update({...s,image:{...s.image,zoom:1,offset_x:.5,offset_y:.5}});};
  canvas.ondragover=event=>{event.preventDefault();event.dataTransfer.dropEffect='copy';};
  canvas.ondrop=event=>{event.preventDefault();const file=event.dataTransfer.files[0];if(file)placeImage(file,point(event));};
  window.addEventListener('paste',event=>{if(event.target.closest('input,textarea,select,[contenteditable]'))return;const item=[...event.clipboardData.items].find(i=>i.kind==='file'&&i.type.startsWith('image/'));if(item){event.preventDefault();const file=item.getAsFile();if(file)placeImage(file);}});
  $('clip-content').onchange=()=>{if(current()?.kind==='frame')update({...current(),clip_content:$('clip-content').checked});};
  $('move-to-frame').onclick=()=>safe(()=>{editor.reparent_many(selectionJson(),Number($('parent-frame').value));refresh();});
  for(const axis of ['horizontal','vertical'])$('constraint-'+axis).onchange=()=>{const value=$('constraint-'+axis).value;if(value)updateMany(selectionShapes().map(s=>({...s,constraints:{horizontal:'min',vertical:'min',...s.constraints,[axis]:value}})));};
  $('group-layers').onclick=groupSelection; $('ungroup-layers').onclick=ungroupSelection;
  $('group-name').onchange=()=>safe(()=>{const id=selectedGroup(pageShapes(),[...selectedIds]);if(id){editor.rename_group(id,$('group-name').value);refresh();}});
  $('apply-scale').onclick=()=>safe(()=>{const shapes=transformedSelection(),box=bounds(selectionShapes());if(box) updateMany(scaleShapes(shapes,box,Number($('scale-percent').value)/100));});
  $('stroke-width').onchange=()=>{if(current()) update({...current(),stroke_width:Number($('stroke-width').value)}); renderProperties();};
  $('edit-path').onclick=()=>{if(current()?.points?.length){if(tool!=='select')setTool('select');editingPath=editingPath?0:current().id; $('hint').textContent=editingPath?'Drag anchors or handles · Alt-drag an anchor to create handles · Enter to finish':'Double-click a vector to edit points'; draw();}};
  document.addEventListener('pointerdown',event=>{ if(!event.target.closest('.tool-group')) document.querySelectorAll('.tool-group').forEach(el=>el.open=false); });
  const showShortcuts = () => { document.querySelector('.file-menu').open = false; $('shortcuts-dialog').showModal(); };
  for (const id of ['shortcuts','nav-tools','nav-help']) $(id).onclick = showShortcuts;
  $('close-shortcuts').onclick = () => $('shortcuts-dialog').close();
  const showSearch = () => { $('search-panel').hidden = !$('search-panel').hidden; if (!$('search-panel').hidden) { document.querySelector('.left-panel').classList.add('mobile-open'); $('layer-search').focus(); } else { $('layer-search').value = ''; renderLayers(); } };
  $('search-toggle').onclick = showSearch; $('nav-search').onclick = showSearch;
  $('nav-file').onclick = () => { document.querySelector('.left-panel').classList.toggle('mobile-open'); $('search-panel').hidden = true; $('layer-search').value = ''; renderLayers(); };
  $('layer-search').oninput = renderLayers;
  document.querySelectorAll('.menu-panel button').forEach(button => button.addEventListener('click', () => document.querySelector('.file-menu').open = false));
  document.addEventListener('pointerdown', event => { if (!event.target.closest('.file-menu')) document.querySelector('.file-menu').open = false; });
  const divider = $('sidebar-resize');
  const setPanelWidth = width => { width = Math.max(200,Math.min(400,width)); document.documentElement.style.setProperty('--left-width', `${width}px`); divider.setAttribute('aria-valuenow', width); };
  divider.onpointerdown = event => { divider.setPointerCapture(event.pointerId); };
  divider.onpointermove = event => { if (divider.hasPointerCapture(event.pointerId)) setPanelWidth(event.clientX - document.querySelector('.navigation-rail').clientWidth); };
  divider.onkeydown = event => { if (['ArrowLeft','ArrowRight'].includes(event.key)) { event.preventDefault(); setPanelWidth(document.querySelector('.left-panel').clientWidth + (event.key === 'ArrowRight' ? 10 : -10)); } };
  document.querySelectorAll('[data-align]').forEach(button => button.onclick = () => safe(() => { editor.align_many(selectionJson(),button.dataset.align); refresh(); }));
  document.querySelectorAll('[data-distribute]').forEach(button => button.onclick = () => safe(() => { editor.distribute_many(selectionJson(),button.dataset.distribute); refresh(); }));
  $('multi-fill').onchange = () => updateMany(selectionShapes().map(s => ({...s,fill:$('multi-fill').value})));
  $('multi-duplicate').onclick = duplicateSelection; $('multi-delete').onclick = deleteSelection;
  const styleFields = { 'font-family': 'font_family', 'font-size': 'font_size', 'font-weight': 'font_weight', 'line-height': 'line_height', 'text-align': 'align', 'text-wrap': 'wrap' };
  for (const [id, key] of Object.entries(styleFields)) $(id).onchange = () => {
    const shape = current(); if (shape?.kind !== 'text') return;
    const value = id === 'text-wrap' ? $(id).checked : ['font-size', 'font-weight', 'line-height'].includes(id) ? Number($(id).value) : $(id).value;
    update({ ...shape, typography: { ...textStyle(shape), [key]: value } }); renderProperties();
  };
  $('fit-text').onclick = () => { if (current()?.kind === 'text') update({ ...current(), height: Math.ceil(textLayout(current()).height) }); };
  canvas.ondblclick = event => {
    if(tool!=='select') return;
    const p = point(event), hit = editor.hit_test(p.x, p.y); setSelection(hit ? [hit] : []); refresh(false);
    if (current()?.kind === 'text') { $('text').focus(); $('text').select(); $('text').scrollIntoView({ block: 'nearest' }); }
    else if(current()?.points?.length) $('edit-path').click();
  };
  document.fonts.addEventListener('loadingdone', () => { draw(); if (current()?.kind === 'text') $('text-overflow').hidden = !textLayout(current()).overflow; });
  $('add-page').onclick = () => safe(() => { editor.add_page(); refresh(); setTool('select'); toast('New page added — pick a tool to start designing'); });
  $('delete-page').onclick = () => safe(() => { editor.delete_page(doc.active_page); refresh(); toast('Page deleted. Use Undo to restore it.'); });
  $('rename-page').onclick = () => { $('page-name').value = activePage().name; $('page-dialog').showModal(); $('page-name').focus(); $('page-name').select(); };
  $('cancel-page-name').onclick = () => $('page-dialog').close();
  $('page-form').onsubmit = event => { event.preventDefault(); safe(() => { editor.rename_page(doc.active_page, $('page-name').value); $('page-dialog').close(); refresh(); }); };
  $('page-picker').onchange = () => switchPage(Number($('page-picker').value));
  $('mobile-add-page').onclick = () => $('add-page').click();
  $('mobile-rename-page').onclick = () => $('rename-page').click();
  $('mobile-delete-page').onclick = () => $('delete-page').click();
  document.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => setTool(b.dataset.tool));
  $('undo').onclick = () => { gesture = null; editor.undo(); refresh(); }; $('redo').onclick = () => { gesture = null; editor.redo(); refresh(); };
  $('zoom-fit').onclick = fit; $('zoom-in').onclick = () => zoomAt(1.2); $('zoom-out').onclick = () => zoomAt(1 / 1.2);
  $('document-name').onchange = () => safe(() => { editor.load(JSON.stringify({ ...doc, name: $('document-name').value.trim() || 'Untitled design' })); refresh(); });
  for (const key of ['x', 'y', 'width', 'height', 'fill', 'text']) $(key).onchange = () => {
    if (!current()) return; const value = ['x', 'y', 'width', 'height'].includes(key) ? Number($(key).value) : $(key).value;
    update({ ...current(), [key]: value }); renderProperties();
  };
  $('shape-name').onchange = () => current() && update({ ...current(), name: $('shape-name').value });
  $('visible').onchange = () => current() && update({ ...current(), hidden: !$('visible').checked });
  $('duplicate').onclick = duplicateSelection;
  $('delete').onclick = deleteSelection;
  $('forward').onclick = () => safe(() => { if (current()) { editor.reorder(selected, 1); refresh(); } });
  $('backward').onclick = () => safe(() => { if (current()) { editor.reorder(selected, -1); refresh(); } });
  $('save').onclick = () => { download(`${doc.name || 'design'}.pixl`, editor.snapshot(), 'application/json'); toast('Design file downloaded'); };
  $('export').onclick = () => exportSvg().catch(error => toast(`Could not export: ${error}`)); $('open').onclick = () => $('file').click();
  $('file').onchange = async () => {
    const file = $('file').files[0]; if (!file) return;
    try { if (file.size > 5_000_000) throw new Error('Files must be smaller than 5 MB.'); const text = await file.text(); editor.load(text); setSelection([]); gesture = null; recoveryBlocked = false; pageViews.clear(); doc = null; refresh(); fit(); toast('Design opened'); }
    catch (error) { toast(`Could not open design: ${error}`); } finally { $('file').value = ''; }
  };
  canvas.onpointerdown = event => safe(() => {
    if (!editor || (event.button !== 0 && event.button !== 1)) return;
    canvas.focus(); canvas.setPointerCapture(event.pointerId);
    const p = point(event);
    if (tool === 'hand' || space || event.button === 1) { gesture = { type: 'pan', x: event.clientX, y: event.clientY, pan: { ...pan } }; return; }
    if (tool === 'text') { setSelection([insertAt({id:0,kind:'text',name:'Text',x:p.x,y:p.y,width:240,height:56,fill:'#000000',text:'Your next big idea',hidden:false,typography:{font_size:32,font_family:'Manrope',font_weight:600,align:'left',line_height:1.2,wrap:true}},p)]); setTool('select'); refresh(); return; }
    if (tool === 'pen') {
      if(penPoints.length>=2 && Math.hypot(p.x-penPoints[0].x,p.y-penPoints[0].y)<10/zoom) { finishPen(true); return; }
      if(penPoints.length<4096) { penPoints.push(p); gesture={type:'pen-handle',index:penPoints.length-1}; } draw(); return;
    }
    if(tool==='scale') {
      if(!selectedIds.size) {const hit=editor.hit_test(p.x,p.y);if(hit)setSelection(expandGroups(pageShapes(),[hit]));}
      const originals=transformedSelection(),box=bounds(selectionShapes()); if(!box) {toast('Select layers to scale first');return;}
      gesture={type:'scale',start:p,origin:{x:box.x,y:box.y},originals,previews:originals}; renderLayers();renderProperties();return;
    }
    if (tool !== 'select') { setSelection([]); gesture={type:'create',kind:tool,start:p,points:[p],preview:tool==='pencil'?fromPoints(tool,[p,p]):drawnShape(tool,p,p)}; renderProperties(); draw(); return; }
    const shape = current();
    if(editingPath && shape?.points?.length) {
      const nodes=anchors(shape);
      for(let i=0;i<nodes.length;i++) {
        const a=nodes[i];
        for(const part of ['anchor','in','out']) {
          const h=part==='anchor'?a:a[part];
          if(Math.hypot(p.x-h.x,p.y-h.y)<8/zoom) {gesture={type:'node',index:i,part:event.altKey&&part==='anchor'?'smooth':part,start:p,original:shape,nodes,preview:shape};return;}
        }
      }
      editingPath=0;
    }
    if (shape && !shape.hidden) {
      for (const [cx, cy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        if (Math.abs(p.x - shape.x - cx * shape.width) < 9 / zoom && Math.abs(p.y - shape.y - cy * shape.height) < 9 / zoom) { gesture = { type: 'resize', start: p, original: { ...shape }, preview: { ...shape }, cx, cy }; return; }
      }
    }
    const hit = editor.hit_test(p.x, p.y);
    if (event.shiftKey && hit) {
      const ids = new Set(selectedIds), hits=event.ctrlKey||event.metaKey?[hit]:expandGroups(pageShapes(),[hit]),remove=hits.every(id=>ids.has(id)); hits.forEach(id=>remove?ids.delete(id):ids.add(id)); setSelection([...ids]); refresh(false); return;
    }
    if (!hit) {
      const base = event.shiftKey ? [...selectedIds] : [];
      setSelection(base); refresh(false); gesture = {type:'marquee',start:p,end:p,base}; return;
    }
    if (event.ctrlKey||event.metaKey) setSelection([hit]);
    else if (!selectedIds.has(hit)) setSelection(expandGroups(pageShapes(),[hit]));
    layerAnchor = hit; refresh(false);
    gesture = {type:'move',start:p,originals:transformedSelection().map(s=>({...s})),previews:transformedSelection().map(s=>({...s}))};
  });
  canvas.onpointermove = event => {
    if (!gesture) return;
    if (gesture.type === 'pan') { pan.x = gesture.pan.x + event.clientX - gesture.x; pan.y = gesture.pan.y + event.clientY - gesture.y; draw(); return; }
    const p = point(event), original = gesture.original, snap = Math.round;
    if(gesture.type==='scale') {
      const dx=gesture.start.x-gesture.origin.x,dy=gesture.start.y-gesture.origin.y;
      let factor=Math.max(.01,((p.x-gesture.origin.x)*dx+(p.y-gesture.origin.y)*dy)/Math.max(1,dx*dx+dy*dy));
      if(event.shiftKey) factor=Math.max(.1,Math.round(factor*10)/10);
      gesture.previews=scaleShapes(gesture.originals,gesture.origin,factor); draw(); return;
    }
    if(gesture.type==='pen-handle') { const a=penPoints[gesture.index]; a.out={...p}; a.in={x:2*a.x-p.x,y:2*a.y-p.y}; draw(); return; }
    if(gesture.type==='node') {
      const nodes=structuredClone(gesture.nodes),a=nodes[gesture.index],part=gesture.part;
      if(part==='anchor') { const dx=p.x-gesture.start.x,dy=p.y-gesture.start.y; a.x+=dx;a.y+=dy; for(const h of [a.in,a.out]) {h.x+=dx;h.y+=dy;} }
      else if(part==='smooth') {a.out={...p};a.in={x:2*a.x-p.x,y:2*a.y-p.y};}
      else a[part]={...p};
      gesture.preview=reshape(original,nodes);draw();return;
    }
    if (gesture.type === 'create') {
      if(gesture.kind==='pencil') { if(gesture.points.length<4096 && Math.hypot(p.x-gesture.points.at(-1).x,p.y-gesture.points.at(-1).y)>1/zoom) gesture.points.push(p); gesture.preview=fromPoints('pencil',gesture.points); }
      else gesture.preview=drawnShape(gesture.kind,gesture.start,p,event);
      draw(); return;
    }
    if (gesture.type === 'marquee') {
      gesture.end = p;
      setSelection([...new Set([...gesture.base,...expandGroups(pageShapes(),marqueeSelection(pageShapes().map(s=>paintBounds(s,pageShapes())).filter(Boolean),gesture.start,p))])]);
      renderLayers(); renderProperties(); draw(); return;
    }
    if (gesture.type === 'move') {
      let dx = snap(p.x - gesture.start.x), dy = snap(p.y - gesture.start.y);
      if (event.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      gesture.previews = gesture.originals.map(s => ({...s,x:s.x+dx,y:s.y+dy}));
    }
    else {
      const right = original.x + original.width, bottom = original.y + original.height;
      const x = gesture.cx ? original.x : Math.min(right - 1, snap(p.x));
      const y = gesture.cy ? original.y : Math.min(bottom - 1, snap(p.y));
      gesture.preview = { ...original, x, y, width: gesture.cx ? Math.max(1, snap(p.x) - x) : right - x, height: gesture.cy ? Math.max(1, snap(p.y) - y) : bottom - y };
    }
    draw();
  };
  canvas.onpointerup = () => {
    if(gesture?.type==='pen-handle') {gesture=null;draw();return;}
    if(gesture?.type==='create') {
      let shape=gesture.preview;
      if(gesture.kind==='pencil' && shape.points.length<2) { gesture=null; draw(); return; }
      if(gesture.kind!=='pencil' && shape.width<3 && shape.height<3) shape=drawnShape(gesture.kind,gesture.start,{x:gesture.start.x+160,y:gesture.start.y+(gesture.kind==='line'||gesture.kind==='arrow'?0:120)});
      const start=gesture.start;gesture=null; safe(()=>{setSelection([insertAt(shape,start)]); setTool('select'); refresh();}); return;
    }
    const preview = gesture?.preview, previews = gesture?.previews,type=gesture?.type;
    const parent=type==='move'&&previews?dropParent(pageShapes(),previews,[...selectedIds]):null;
    const moved=type==='move'&&previews?.some(s=>{const old=pageShapes().find(o=>o.id===s.id);return old&&(old.x!==s.x||old.y!==s.y);});
    gesture = null;
    if(moved&&parent!==null) safe(()=>{editor.move_into(JSON.stringify(previews),parent);refresh();});
    else if (previews) updateMany(previews); else if (preview) update(preview); else draw(); };
  const cancelGesture = () => { if (gesture?.type === 'marquee') setSelection(gesture.base); gesture = null; renderLayers(); renderProperties(); draw(); };
  canvas.onpointercancel = cancelGesture;
  canvas.onlostpointercapture = () => { if (gesture) cancelGesture(); };
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) { const rect = canvas.getBoundingClientRect(); zoomAt(Math.exp(-event.deltaY * .001), event.clientX - rect.left, event.clientY - rect.top); }
    else { pan.x -= event.shiftKey ? event.deltaY : event.deltaX; pan.y -= event.shiftKey ? 0 : event.deltaY; draw(); }
  }, { passive: false });
  window.addEventListener('keydown', event => {
    if ($('page-dialog').open || $('shortcuts-dialog').open) return;
    if (event.target.closest('input,textarea,select,[contenteditable]')) return;
    const key = event.key.toLowerCase(), mod = event.ctrlKey || event.metaKey;
    if(mod && event.shiftKey && key==='k'){event.preventDefault();$('place-image').click();return;}
    if(mod && key==='g') {event.preventDefault(); if(selectedIds.size)(event.shiftKey?ungroupSelection:groupSelection)();return;}
    if (mod && key === 'a') { event.preventDefault(); setSelection(pageShapes().filter(s=>visibleInTree(s,pageShapes())).map(s=>s.id)); refresh(false); return; }
    if (event.altKey && !mod && selectedIds.size > 1 && ['a','d','w','s'].includes(key)) { event.preventDefault(); if(!selectionShapes().some(s=>s.group_id)) safe(() => { editor.align_many(selectionJson(),{a:'left',d:'right',w:'top',s:'bottom'}[key]); refresh(); }); return; }
    if (mod && ['z', 'y', 's', 'd'].includes(key)) { event.preventDefault(); if (key === 'z') (event.shiftKey ? $('redo') : $('undo')).click(); if (key === 'y') $('redo').click(); if (key === 's') $('save').click(); if (key === 'd') $('duplicate').click(); return; }
    if (event.code === 'Space' && !event.target.closest('button,summary')) { event.preventDefault(); space = true; return; }
    if(key==='enter' && tool==='pen') {event.preventDefault(); finishPen(false); return;}
    if(key==='enter' && current()?.points?.length) {event.preventDefault(); $('edit-path').click(); return;}
    if (key === 'escape') { penPoints=[]; gesture = null; setSelection([]); setTool('select'); refresh(false); return; }
    if (['delete', 'backspace'].includes(key)) { event.preventDefault(); $('delete').click(); return; }
    if (selectedIds.size && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) && event.target !== divider) { event.preventDefault(); const step = event.shiftKey ? 10 : 1; updateMany(selectionShapes().map(s=>({ ...s, x: s.x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0), y: s.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0) }))); return; }
    const tools = { k:'scale', v: 'select', h: 'hand', f: 'frame', r: 'rectangle', o: 'ellipse', t: 'text', l:event.shiftKey?'arrow':'line', p:event.shiftKey?'pencil':'pen' }; if (!mod && !event.altKey && tools[key]) setTool(tools[key]);
    if (event.code === 'Digit1' && !mod) { event.preventDefault(); fit(); }
    if (event.code === 'Digit2' && event.shiftKey && !mod) { event.preventDefault(); fit(true); }
    if (key === '?') showShortcuts();
  });
  window.addEventListener('keyup', event => { if (event.code === 'Space') space = false; });
  window.addEventListener('blur', () => { space = false; cancelGesture(); });
  window.addEventListener('pagehide', () => { if (!recoveryBlocked) { try { localStorage.setItem(KEY, editor.snapshot()); } catch {} } });
  new ResizeObserver(draw).observe(canvas);
}
function seed() {
  const shapes = [];
  const add = (kind, name, x, y, width, height, fill, text = '') => shapes.push({ id: shapes.length + 1, kind, name, x, y, width, height, fill, text, hidden: false });
  add('frame', 'Canvas / Launch concept', 0, 0, 680, 460, '#f1f0e9');
  add('text', 'Studio wordmark', 38, 32, 400, 22, '#283d2d', 'FORM & FIELD');
  add('text', 'Edition', 532, 35, 120, 15, '#627465', 'EST. 2026  ↗');
  add('rectangle', 'Divider', 38, 78, 604, 1, '#c9cec1');
  add('text', 'Eyebrow', 38, 120, 300, 16, '#68795e', 'A NEW PERSPECTIVE');
  add('text', 'Headline / first line', 34, 158, 460, 79, '#253b2d', 'Room to');
  add('text', 'Headline / second line', 34, 227, 470, 79, '#253b2d', 'think bigger.');
  add('text', 'Supporting copy', 38, 329, 410, 21, '#687367', 'Good things start with a little space.');
  add('rectangle', 'Call to action', 38, 385, 156, 40, '#2c4533');
  add('text', 'Button label', 56, 398, 135, 17, '#f1f0e9', 'Explore the studio  ↗');
  add('ellipse', 'Circle / forest', 478, 133, 156, 156, '#36583b');
  add('ellipse', 'Circle / lime', 478, 258, 156, 156, '#b8da76');
  add('ellipse', 'Circle / cutout', 517, 235, 78, 78, '#f1f0e9');
  editor.load(JSON.stringify({ version: 1, name: 'Launch concept', shapes })); editor.clear_history();
}
try {
  await init(); editor = new Editor();
  let stored;
  try { stored = localStorage.getItem(KEY); } catch {}
  if (stored) { try { editor.load(stored); editor.clear_history(); } catch { recoveryBlocked = true; seed(); toast('Saved data could not be loaded. It has been preserved; use Open to recover a file.'); } }
  else seed();
  bind(); refresh(false); fit(); $('engine-status').textContent = 'Rust engine connected';
  await document.fonts.ready; draw();
} catch (error) { $('engine-status').textContent = 'Engine could not start'; $('save-status').textContent = 'Editor unavailable'; toast(`Could not start editor: ${error}`); console.error(error); }
