import {spacingHandles,spacingHit,changeSpacing,drawSpacing} from './layout-spacing.js';
import {drawVectorStroke} from './stroke-render.js';
import {cloudFiles} from './cloud-files.js';
import {renderShadowControls} from './shadow-controls.js';
import {parseSvg} from './svg-import.js';
import {snapGuides,drawSnapGuides} from './guide-snap.js';
import {inspectorRenderer} from './inspector-focus.js';
import {exportJobs,zipFiles} from './batch-export.js';
import {rasterSettings} from './export.js';
import {smoothPencil} from './pencil.js';
import {connectionHit,connectionTarget,connectedShape,drawConnections} from './prototype-connections.js';
import {prototypeFrames,renderPrototypeControls,presentPrototype} from './prototype.js';
import {drawLayoutGuides,renderGuideControls} from './layout-guides.js';
import init, { Editor } from './pkg/pixlprfct_core.js';
import {componentSet,renderVariantProperties,editVariantSet} from './variants.js';
import {renderComponentProperties as renderExposedProperties,editComponentProperty} from './component-properties.js';
import {canvasFill} from './gradients.js';
import {gradientHandles,gradientHit,gradientPosition,moveGradientHandle,addGradientStopAt,drawGradientHandles} from './gradient-edit.js';
import {renderGradientControls} from './gradient-controls.js';
import { textStyle, fontCss, layoutText, textSvg, textSize, resizeText } from './typography.js';
import { bounds, marqueeSelection, layerRange, expandGroups, selectedGroup, descendants, visibleInTree, lockedInTree, canvasSelection } from './selection.js';
import {clippingFrames,paintBounds,frameAt,clipDefinitions,clipSvg,dropParent} from './scene.js';
import {imageLayout,imageSvg,readImage} from './images.js';
import {nearestSegment,insertAnchor,deleteAnchor,convertAnchor} from './vector-edit.js';
import {exportShapes,exportBounds,exportSize,svgDocument} from './export.js';
import {LAYER_MIME,layerPayload,pasteOffset} from './clipboard.js';
import {appearance,radii,roundedContains,paintAttributes,drawScene,sceneSvg,withPaintOpacity} from './appearance.js';
import { scaleShapes } from './scaling.js';
import { vectorTools, fromPoints, drawnShape, vectorPath, vectorSvg, anchors, reshape } from './vectors.js';
import { icon, installIcons } from './icons.js';

const $ = id => document.getElementById(id);
const canvas = $('canvas'), ctx = canvas.getContext('2d');
const measureCtx = document.createElement('canvas').getContext('2d');
function textLayout(shape) { measureCtx.font = fontCss(textStyle(shape)); return layoutText(shape, value => measureCtx.measureText(value).width); }
const KEY = 'pixlprfct.document.v1';
let editor, doc, selected = 0, tool = 'select', zoom = 1, pan = { x: 0, y: 0 }, gesture = null, space = false;
let guidesVisible=true,prototypeConnections=false;
let toastTimer, savingTimer, recoveryBlocked = false, cloud=null;
const imageCache=new Map();
let imageReplaceId=0,imageLoading=false;
let penPoints = [];
let editingPath = 0;
let editingLayout=0,activeSpacing=null;
let activeNode=-1;
let lastPasted='',pasteCount=0,pasteInPlace=false,pasteReplace=false,pasteFrames=false;
let exportBusy=false;
let selectedIds = new Set(), layerAnchor = 0;
let editingGradient=0,activeGradient=null,gradientChannel='fill';
const gradientField=()=>gradientChannel==='stroke'?'stroke_gradient':'gradient';
function setSelection(ids) { if(ids.length!==1||ids[0]!==editingLayout){editingLayout=0;activeSpacing=null;} selectedIds = new Set(ids); selected = ids.at(-1) || 0; if(ids.length!==1 || ids[0]!==editingPath){editingPath=0;activeNode=-1;} if(ids.length!==1||ids[0]!==editingGradient){editingGradient=0;activeGradient=null;} }
function selectionShapes() { return pageShapes().filter(s => selectedIds.has(s.id)); }
function selectionJson() { return JSON.stringify([...selectedIds]); }
const pageViews = new Map();
const collapsedGroups=new Set();
const collapsedFrames=new Set();
function insertAt(shape,start){return editor.insert(JSON.stringify({...shape,parent_id:frameAt(pageShapes(),start),clip_content:shape.kind==='frame'}));}
function transformedSelection(){return descendants(pageShapes(),[...selectedIds]);}
function inheritedLock(s){return !!s.parent_id&&lockedInTree(pageShapes().find(p=>p.id===s.parent_id),pageShapes());}
function canvasEditable(){return selectionShapes().every(s=>!lockedInTree(s,pageShapes()));}
function toggleSelectionLock(){const targets=selectionShapes().filter(s=>!inheritedLock(s));if(!targets.length){toast('Unlock the parent frame first');return;}const locked=targets.some(s=>!s.locked);gesture=null;updateMany(targets.map(s=>({...s,locked})));}
function layerLockButton(shape){const b=document.createElement('button'),inherited=inheritedLock(shape),locked=lockedInTree(shape,pageShapes());b.className='layer-lock'+(locked?' locked':'');b.disabled=inherited;b.setAttribute('aria-label',inherited?'Locked by parent: '+shape.name:(shape.locked?'Unlock ':'Lock ')+shape.name);b.title=b.getAttribute('aria-label');b.innerHTML=`<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="3.5" y="7" width="9" height="7" rx="1.4"/><path d="${locked?'M5 7V4a3 3 0 0 1 6 0v3':'M5 7V4a3 3 0 0 1 6 0'}"/></svg>`;b.onclick=()=>{gesture=null;update({...shape,locked:!shape.locked});};return b;}
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
  cloud?.changed();
  clearTimeout(savingTimer);
  savingTimer = setTimeout(() => {
    try { if(!cloud?.session.active)localStorage.setItem(KEY, editor.snapshot()); if(!cloud?.session.active)$('save-status').textContent = 'Saved on this device'; }
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
  renderPages(); renderLayers(); renderComponents(); renderProperties();
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
    if(shape.component){glyph.textContent=shape.component.type==='master'?'◆':'◇';glyph.classList.add('component-glyph');}
    const name = document.createElement('span'); name.className = 'layer-name'; name.textContent = shape.name;
    button.append(glyph, name);
    if (shape.hidden) { const mark = document.createElement('span'); mark.className = 'hidden-mark'; mark.textContent = 'Hidden'; button.append(mark); }
    button.onclick = event => {
      if (event.shiftKey) setSelection(layerRange(listed, layerAnchor, shape.id));
      else if (event.ctrlKey || event.metaKey) { const ids = new Set(selectedIds); ids.has(shape.id) ? ids.delete(shape.id) : ids.add(shape.id); setSelection([...ids]); layerAnchor = shape.id; }
      else { setSelection([shape.id]); layerAnchor = shape.id; }
      refresh(false);
    };
    const row=document.createElement('div');row.className='layer-entry';row.append(button,layerLockButton(shape));return row;
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
function insertInstance(masterId){safe(()=>{const master=doc.shapes.find(s=>s.id===masterId);if(!master)return;const same=master.page_id===doc.active_page;const x=same?master.x+master.width+40:(canvas.clientWidth/2-pan.x)/zoom;const y=same?master.y:(canvas.clientHeight/2-pan.y)/zoom;const id=editor.create_instance(masterId,x,y);setSelection([id]);refresh();fit();toast('Linked instance inserted');});}
function renderComponents(){
  const grouped=new Set((doc.component_sets??[]).flatMap(s=>s.variants.map(v=>v.component_id)));
  const masters=doc.shapes.filter(s=>s.component?.type==='master'&&!grouped.has(s.id));
  const assets=[...(doc.component_sets??[]).map(s=>({id:s.variants[0].component_id,name:s.name,count:s.variants.length})),...masters];$('component-count').textContent=assets.length;
  const rows=assets.map(s=>{const b=document.createElement('button');b.className='component-asset';b.textContent=(s.count?'▦ ':'◆ ')+s.name+(s.count?` · ${s.count} variants`:'');b.title='Insert instance of '+s.name;b.setAttribute('aria-label',b.title);b.onclick=()=>insertInstance(s.id);return b;});
  if(!rows.length){const hint=document.createElement('p');hint.textContent='Select a frame and choose Create component.';rows.push(hint);}
  $('components-list').replaceChildren(...rows);
}
function renderComponentProperties(shape){
  const c=shape?.component,linked=c?.type==='instance',master=c?.type==='master';
  $('add-component-property').hidden=!master;
  renderExposedProperties($('exposed-properties'),doc,shape,{
    change:(property,value)=>safe(()=>{editor.set_component_property(selected,property,JSON.stringify(value));refresh();}),
    reset:property=>safe(()=>{editor.reset_component_property(selected,property);refresh();}),
    edit:property=>editComponentProperty(doc,shape.id,property,p=>{editor.save_component_property(JSON.stringify(p));refresh();}),
    remove:property=>safe(()=>{editor.remove_component_property(property);refresh();})
  });
  $('component-panel').hidden=!shape||(!c&&shape.kind!=='frame');
  $('component-heading').textContent=master?'◆ Main component':linked?'◇ Instance':'Component';
  $('create-component').hidden=!!c;$('insert-instance').hidden=!master;
  const variantSet=componentSet(doc,master?shape.id:c?.master);
  $('manage-variants').hidden=!master;$('manage-variants').textContent=variantSet?'Edit variant set':'Create variant set';$('add-variant').hidden=!master||!variantSet;
  renderVariantProperties($('variant-properties'),doc,linked?c.master:0,(property,value)=>safe(()=>{setSelection([editor.set_variant_property(selected,property,value)]);refresh();}));
  for(const id of ['go-main','reset-instance','detach-instance'])$(id).hidden=!linked;
  $('instance-controls').hidden=!linked;
  const displayedOverrides=s=>[...new Set((s.component?.overrides??[]).map(p=>p==='additional_interactions'?'prototype':p))];
  if(linked){
    $('swap-component').replaceChildren(...doc.shapes.filter(s=>s.component?.type==='master').sort((a,b)=>a.name.localeCompare(b.name)).map(s=>{const o=document.createElement('option');o.value=s.id;o.textContent=`${s.name} · ${doc.pages.find(p=>p.id===s.page_id)?.name}`;return o;}));
    $('swap-component').value=c.master;
    const paths=displayedOverrides(shape).filter(p=>c.master!==c.source||(p!=='x'&&p!=='y'));
    $('override-count').textContent=paths.length;
    const labels={stroke_start:'Start tip',stroke_end:'End tip',stroke_gradient:'Stroke gradient',layer_blur:'Layer blur',shadows:'Shadows',prototype:'Prototype interactions',typography:'Text',appearance:'Appearance',constraints:'Constraints',layout_item:'Layout sizing',auto_layout:'Auto layout',font_size:'Font size',font_family:'Font family',font_weight:'Font weight',align:'Alignment',line_height:'Line spacing',corner_radius:'Corner radius',corner_radii:'Independent corners',stroke_color:'Stroke color',stroke_dash:'Dash pattern',stroke_dash_offset:'Dash offset',stroke_cap:'Line cap',stroke_join:'Line join',stroke_miter_limit:'Miter limit',fill_opacity:'Fill opacity',stroke_opacity:'Stroke opacity',fill_enabled:'Fill enabled',stroke_enabled:'Stroke enabled',fill_width:'Fill width',fill_height:'Fill height',absolute:'Ignore auto layout'};
    const rows=paths.map(path=>{const row=document.createElement('div');row.className='override-row';const label=document.createElement('span');label.textContent=path.split('.').map(p=>labels[p]??p.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase())).join(' · ');const b=document.createElement('button');b.textContent='Reset';b.setAttribute('aria-label','Reset '+label.textContent+' override');b.onclick=()=>safe(()=>{editor.reset_override(shape.id,path);refresh();});row.append(label,b);return row;});
    if(!rows.length){const p=document.createElement('p');p.textContent='This layer inherits its component properties.';rows.push(p);}
    $('override-list').replaceChildren(...rows);
  }
  let root=shape;
  while(root?.component?.type==='instance'&&root.component.master!==root.component.source)root=doc.shapes.find(s=>s.id===root.parent_id);
  const count=linked?descendants(doc.shapes,[root.id]).reduce((n,s)=>n+(displayedOverrides(s).filter(f=>s.id!==root.id||(f!=='x'&&f!=='y')).length),0):0;
  $('reset-instance').disabled=!count;
  $('component-status').textContent=master?'Edits update linked instances across all pages.':linked?`${doc.shapes.find(s=>s.id===c.master)?.name??'Component'} · ${count} overrides. Detach to add, remove, or reorder layers.`:'Reuse this frame and its layers as linked instances.';
  if(master&&variantSet){const v=variantSet.variants.find(v=>v.component_id===shape.id);$('component-status').textContent=variantSet.name+' · '+variantSet.properties.map((p,i)=>p+': '+v.values[i]).join(', ')+'. Edits update linked instances.';}
}
const renderProperties=inspectorRenderer(()=>renderPropertiesNow(),()=>document.querySelector('.right-panel'),()=>[...selectedIds].join(','));
function renderPropertiesNow() {
  const shapes = selectionShapes(), shape = current();
  renderComponentProperties(shape);
  const lockTargets=shapes.filter(s=>!inheritedLock(s));$('lock-panel').hidden=!shapes.length;$('toggle-lock').disabled=!lockTargets.length;$('toggle-lock').textContent=lockTargets.length?(lockTargets.every(s=>s.locked)?'Unlock selection':'Lock selection'):'Locked by parent';$('lock-status').textContent=shapes.some(s=>lockedInTree(s,pageShapes()))?'Locked layers cannot be edited on the canvas. Use the inspector or unlock their parent.':'Ctrl/Cmd Shift L';
  if(!canvasEditable()){editingGradient=0;activeGradient=null;editingPath=0;activeNode=-1;}
  if(!shape?.appearance?.[gradientField()]||!visibleInTree(shape,pageShapes())){editingGradient=0;activeGradient=null;}
  if(activeGradient?.part==='stop'&&activeGradient.index>=shape?.appearance?.[gradientField()]?.stops.length)activeGradient=null;
  $('node-actions').hidden=!editingPath||!shape?.points?.length;
  if(activeNode>=(shape?.points?.length??0))activeNode=-1;
  $('split-node').textContent=shape?.closed?'Open path at anchor':'Split path at anchor';$('split-node').disabled=activeNode<0||(!shape?.closed&&(activeNode===0||activeNode===(shape?.points?.length??0)-1));
  $('node-caption').textContent=activeNode<0?'Select an anchor':`Anchor ${activeNode+1} of ${shape.points.length}`;
  for(const id of ['delete-node','smooth-node','corner-node'])$(id).disabled=activeNode<0;
  $('auto-layout-panel').hidden=shape?.kind!=='frame';
  const excluded=new Set(transformedSelection().map(s=>s.id));
  $('parent-panel').hidden=!shapes.length||(!shapes.some(s=>s.parent_id)&&!pageShapes().some(s=>s.kind==='frame'&&!excluded.has(s.id)));
  $('parent-frame').replaceChildren(...[{id:0,name:'Page (no parent)'},...pageShapes().filter(s=>s.kind==='frame'&&!excluded.has(s.id))].map(s=>{const option=document.createElement('option');option.value=s.id;option.textContent=s.name;return option;}));
  $('parent-frame').value=shapes[0]?.parent_id??0;
  $('move-to-frame').disabled=shapes.some(s=>s.component?.type==='instance'&&s.component.master!==s.component.source);
  const layoutParent=shape&&pageShapes().find(s=>s.id===shape.parent_id)?.auto_layout;
  $('layout-child-panel').hidden=!layoutParent||!shape;
  if(shape){for(const key of ['fill_width','fill_height','absolute'])$('layout-item-'+key).checked=!!shape.layout_item?.[key];}
  $('add-auto-layout').hidden=!shapes.length||!!shape?.auto_layout;
  $('constraints-panel').hidden=!shapes.length||shapes.some(s=>!s.parent_id||pageShapes().find(p=>p.id===s.parent_id)?.auto_layout&&!s.layout_item?.absolute);
  for(const axis of ['horizontal','vertical']){const value=shapes[0]?.constraints?.[axis]??'min';$('constraint-'+axis).value=shapes.some(s=>(s.constraints?.[axis]??'min')!==value)?'':value;}
  const groupId=selectedGroup(pageShapes(),[...selectedIds]);
  $('group-actions').hidden=shapes.length<2&&!shapes.some(s=>s.group_id); $('group-layers').disabled=shapes.length<2||!!groupId; $('ungroup-layers').disabled=!shapes.some(s=>s.group_id);
  $('group-name-row').hidden=!groupId;if(groupId)$('group-name').value=shapes[0].group_name;
  document.querySelectorAll('[data-align]').forEach(button=>button.disabled=shapes.some(s=>s.group_id));
  $('scale-panel').hidden=tool!=='scale'||!shapes.length;
  $('join-paths').hidden=shapes.length!==2||shapes.some(s=>s.closed||!s.points?.length)||shapes[0].parent_id!==shapes[1].parent_id;
  $('empty-selection').hidden = shapes.length > 0; $('properties').hidden = !shape; $('multi-properties').hidden = shapes.length < 2;
  $('selection-caption').textContent = shapes.length > 1 ? `${shapes.length} layers` : shape ? shape.kind : 'Page';
  if (shapes.length > 1) {
    const box = bounds(shapes); $('multi-title').textContent = groupId ? `${shapes[0].group_name} · ${shapes.length} layers` : `${shapes.length} layers selected`;
    $('multi-size').textContent = `${Math.round(box.width)} × ${Math.round(box.height)}`;
    const mixed = shapes.some(s => s.fill !== shapes[0].fill || appearance(s).gradient);
    $('multi-fill').value = shapes[0].fill; $('multi-fill-value').textContent = mixed ? 'Mixed' : shapes[0].fill.toUpperCase();
    document.querySelectorAll('[data-distribute]').forEach(b => b.disabled = shapes.length < 3 || shapes.some(s=>s.group_id));
  }
  renderShadowControls($('shadow-section'),shape,update);
  renderPrototypeControls($('prototype-panel'),shape,doc,update,playPrototype);
  renderGuideControls($('layout-guides-panel'),shape,update,guidesVisible,()=>{guidesVisible=!guidesVisible;renderProperties();draw();},{
    styles:doc.guide_styles??[],
    save:(style,frame)=>safe(()=>{editor.save_guide_style(JSON.stringify(style),frame);refresh();}),
    apply:id=>safe(()=>{editor.apply_guide_style(JSON.stringify([...selectedIds]),id);refresh();}),
    remove:id=>safe(()=>{editor.remove_guide_style(id);refresh();})
  });
  if (!shape) return;
  if(editingLayout&&!shape.auto_layout){editingLayout=0;activeSpacing=null;}
  $('edit-layout-spacing').textContent=editingLayout===shape.id?'Finish spacing edits':'Edit spacing on canvas';$('edit-layout-spacing').disabled=!canvasEditable();$('edit-layout-spacing').setAttribute('aria-pressed',String(editingLayout===shape.id));
  $('auto-layout-panel').hidden=shape.kind!=='frame';$('layout-direction').value=shape.auto_layout?.direction??'none';$('layout-settings').hidden=!shape.auto_layout;
  if(shape.auto_layout)for(const key of ['gap','cross_gap','padding_top','padding_right','padding_bottom','padding_left','align','justify','align_content','hug_width','hug_height','wrap']){const el=$('layout-'+key);if((key.startsWith('hug')||key==='wrap'))el.checked=shape.auto_layout[key];else el.value=shape.auto_layout[key]??'';}
  for(const key of ['min_width','max_width','min_height','max_height'])$('limit-'+key).value=shape.layout_item?.[key]??'';
  $('image-section').hidden=shape.kind!=='image';
  const paint=appearance(shape);$('opacity').value=Math.round(paint.opacity*100);$('fill-opacity').value=(paint.fill_opacity??1)*100;$('fill-opacity-value').textContent=Number(((paint.fill_opacity??1)*100).toFixed(1))+'%';$('stroke-opacity').value=(paint.stroke_opacity??1)*100;$('image-opacity').value=(paint.fill_opacity??1)*100;$('corner-radius').value=paint.corner_radius;$('radius-row').hidden=!['rectangle','frame','image'].includes(shape.kind);$('fill-enabled').checked=paint.fill_enabled;$('stroke-enabled').checked=paint.stroke_enabled;$('stroke-color').value=paint.stroke_color;
  const rounded=['rectangle','frame','image'].includes(shape.kind);$('independent-corners').parentElement.hidden=!rounded;$('independent-corners').checked=!!paint.corner_radii;$('corner-values').hidden=!rounded||!paint.corner_radii;$('corner-radius').disabled=!!paint.corner_radii;for(let i=0;i<4;i++)$('corner-'+i).value=paint.corner_radii?.[i]??paint.corner_radius;
  $('paint-label').parentElement.hidden=shape.kind==='image';
  if(shape.image){$('image-mode').value=shape.image.mode;$('image-zoom').value=shape.image.zoom;$('image-x').value=Math.round(shape.image.offset_x*100);$('image-y').value=Math.round(shape.image.offset_y*100);$('image-crop-fields').hidden=shape.image.mode==='fit';}
  $('frame-section').hidden=shape.kind!=='frame';$('clip-content').checked=!!shape.clip_content;
  $('stroke-endpoints').hidden=!shape.points?.length||shape.closed;for(const end of ['start','end'])$('stroke-'+end).value=paint['stroke_'+end]??'default';
  $('stroke-dash').value=paint.stroke_dash?.join(', ')??'';$('stroke-dash-offset').value=paint.stroke_dash_offset??0;$('stroke-cap').value=paint.stroke_cap??'round';$('stroke-join').value=paint.stroke_join??'round';$('stroke-miter-limit').value=paint.stroke_miter_limit??10;$('miter-limit-row').hidden=(paint.stroke_join??'round')!=='miter';
  $('stroke-section').hidden = false; $('stroke-width').value = shape.stroke_width ?? 2;$('vector-edit-controls').hidden=!vectorTools.includes(shape.kind);
  $('paint-label').textContent = 'Fill';
  for(const channel of ['fill','stroke'])renderGradientControls($(channel==='fill'?'gradient-controls':'stroke-gradient-controls'),shape,s=>{activeGradient=null;update(s);},{channel,editing:editingGradient===shape.id&&gradientChannel===channel,active:gradientChannel===channel?activeGradient:null,toggle:()=>{if(!canvasEditable()){toast('Unlock the layer or its parent to edit on canvas');return;}const was=editingGradient===shape.id&&gradientChannel===channel;setTool('select');gradientChannel=channel;editingGradient=was?0:shape.id;activeGradient=null;renderProperties();draw();}});
  $('solid-fill-controls').hidden=!!paint.gradient;
  $('shape-name').value = shape.name; $('shape-kind').textContent = shape.kind;
  for (const key of ['x', 'y', 'width', 'height']) $(key).value = Math.round(shape[key] * 100) / 100;
  $('fill').value = shape.fill; $('fill-value').textContent = shape.fill.toUpperCase();
  $('text-section').hidden = shape.kind !== 'text'; $('text').value = shape.text; $('visible').checked = !shape.hidden;
  if (shape.kind === 'text') {
    const style = textStyle(shape);
    $('font-family').value = style.font_family; $('font-size').value = Math.round(style.font_size * 100) / 100;
    $('font-weight').value = style.font_weight; $('line-height').value = style.line_height;
    $('text-align').value = style.align; $('text-wrap').checked = style.wrap;
    $('text-sizing').value=style.sizing; $('text-wrap').disabled=style.sizing!=='fixed';
    $('text-overflow').hidden = !textLayout(shape).overflow;
  }
}
function rasterEntry(data){
 let entry=imageCache.get(data);if(entry)return entry;const bitmap=new Image();entry={bitmap,ready:false};imageCache.set(data,entry);
 entry.promise=new Promise(resolve=>{bitmap.onload=()=>{entry.ready=true;resolve(bitmap);draw();};bitmap.onerror=()=>{entry.failed=true;resolve(null);toast('An embedded image could not be decoded. Replace it in the inspector.');};bitmap.src=data;});return entry;
}
function playPrototype(){safe(()=>{const frames=prototypeFrames(doc);if(!frames.length){toast('Add a frame to present a prototype');return;}let chosen=current();while(chosen&&chosen.kind!=='frame')chosen=doc.shapes.find(s=>s.id===chosen.parent_id);const start=frames.find(s=>s.id===chosen?.id)??frames.find(s=>s.flow_name&&s.page_id===doc.active_page)??frames.find(s=>s.flow_name)??frames.find(s=>s.page_id===doc.active_page)??frames[0];presentPrototype(doc,start.id,editor,drawShape,async shapes=>{await Promise.all(shapes.filter(s=>s.image).map(s=>rasterEntry(s.image.data_url).promise));});});}
function drawShape(shape, target=ctx) {
  const ctx=target,a=appearance(shape),fill=fn=>withPaintOpacity(ctx,a,'fill',fn),stroke=fn=>withPaintOpacity(ctx,a,'stroke',fn);
  if (shape.hidden) return;
  ctx.save();
  ctx.fillStyle = a.fill_enabled&&shape.kind!=='image'?canvasFill(ctx,shape):shape.fill;ctx.strokeStyle=a.stroke_enabled?canvasFill(ctx,shape,'stroke'):a.stroke_color;ctx.lineWidth=shape.stroke_width??2;ctx.lineCap=a.stroke_cap??'round';ctx.lineJoin=a.stroke_join??'round';ctx.miterLimit=a.stroke_miter_limit??10;ctx.setLineDash(a.stroke_dash??[]);ctx.lineDashOffset=a.stroke_dash_offset??0;
  const outline=new Path2D();if(shape.kind==='ellipse')outline.ellipse(shape.x+shape.width/2,shape.y+shape.height/2,shape.width/2,shape.height/2,0,0,Math.PI*2);else outline.roundRect(shape.x,shape.y,shape.width,shape.height,radii(shape));
  ctx.save();if(shape.kind==='image')ctx.clip(outline);
  if(shape.kind==='image'&&shape.image){const entry=rasterEntry(shape.image.data_url);if(entry.ready){const p=imageLayout(shape);fill(()=>ctx.drawImage(entry.bitmap,p.sx,p.sy,p.sw,p.sh,p.dx,p.dy,p.dw,p.dh));}else{ctx.fillStyle='#e5e7eb';fill(()=>ctx.fillRect(shape.x,shape.y,shape.width,shape.height));}}
  else if (shape.points?.length) { const path = new Path2D(vectorPath(shape)); if(a.fill_enabled)fill(()=>ctx.fill(path));if(a.stroke_enabled)stroke(()=>drawVectorStroke(ctx,shape,path)); }
  else if (shape.kind === 'text') {
    ctx.save(); ctx.beginPath(); ctx.rect(shape.x, shape.y, shape.width, shape.height); ctx.clip();
    const layout = textLayout(shape);
    ctx.font = fontCss(layout.style); ctx.textBaseline = 'top'; ctx.textAlign = layout.style.align;
    layout.lines.forEach(line => {if(a.fill_enabled)fill(()=>ctx.fillText(line.text,line.x,line.y));if(a.stroke_enabled)stroke(()=>ctx.strokeText(line.text,line.x,line.y));}); ctx.restore();
  } else {
    if(a.fill_enabled)fill(()=>ctx.fill(outline));
  }
  ctx.restore();if(a.stroke_enabled&&!shape.points?.length&&shape.kind!=='text')stroke(()=>ctx.stroke(outline));
  ctx.restore();
}
function draw() {
  if (!doc) return;
  const w = canvas.clientWidth, h = canvas.clientHeight, dpr = devicePixelRatio || 1;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  ctx.translate(pan.x, pan.y); ctx.scale(zoom, zoom);
  const previews = gesture?.previews || (gesture?.preview ? [gesture.preview] : []);
  let scene=pageShapes().map(shape=>previews.find(s=>s.id===shape.id)||shape);
  if(gesture?.type==='resize'&&['frame','text'].includes(gesture.original.kind)){try{scene=JSON.parse(editor.preview_update_many(JSON.stringify(previews))).shapes.filter(s=>s.page_id===doc.active_page);}catch{scene=pageShapes();}}
  if(gesture?.type==='layout-spacing'&&gesture.scene)scene=gesture.scene;
  drawScene(scene,ctx,drawShape);
  if(guidesVisible)drawLayoutGuides(ctx,scene,zoom);
  if (gesture?.type==='create') {ctx.save();const preview={...gesture.preview,parent_id:frameAt(pageShapes(),gesture.start)};for(const frame of clippingFrames(preview,scene)){ctx.beginPath();ctx.roundRect(frame.x,frame.y,frame.width,frame.height,radii(frame));ctx.clip();}drawShape(preview);ctx.restore();}
  if (penPoints.length) { const preview=fromPoints('pen',penPoints); drawShape(preview); drawAnchors(penPoints); }
  if(editingPath && current()?.points?.length) drawAnchors(anchors(gesture?.preview??current()));
  const visibleSelection = selectionShapes().filter(s => visibleInTree(s,pageShapes())).map(s => scene.find(p => p.id === s.id) || s);
  const shape = bounds(visibleSelection);
  if (shape && !editingPath && !editingGradient) {
    ctx.strokeStyle = '#0d99ff'; ctx.lineWidth = 1 / zoom;
    for (const item of visibleSelection) ctx.strokeRect(item.x, item.y, item.width, item.height);
    ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
    const size = 6 / zoom;
    if (visibleSelection.length === 1 && canvasEditable()) for (const [x, y] of [[shape.x, shape.y], [shape.x + shape.width, shape.y], [shape.x, shape.y + shape.height], [shape.x + shape.width, shape.y + shape.height]]) { ctx.fillStyle = '#fff'; ctx.fillRect(x - size / 2, y - size / 2, size, size); ctx.strokeRect(x - size / 2, y - size / 2, size, size); }
    ctx.fillStyle = '#0d99ff'; ctx.font = `${10 / zoom}px Inter,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(`${Math.round(shape.width)} × ${Math.round(shape.height)}`, shape.x + shape.width / 2, shape.y + shape.height + 10 / zoom); ctx.textAlign = 'left';
  }
  if (gesture?.type === 'marquee') {
    const box = bounds([{x:gesture.start.x,y:gesture.start.y,width:0,height:0},{x:gesture.end.x,y:gesture.end.y,width:0,height:0}]);
    ctx.fillStyle = '#0d99ff18'; ctx.strokeStyle = '#0d99ff'; ctx.lineWidth = 1 / zoom; ctx.fillRect(box.x,box.y,box.width,box.height); ctx.strokeRect(box.x,box.y,box.width,box.height);
  }
  if(editingGradient&&current()?.appearance?.[gradientField()])drawGradientHandles(ctx,gesture?.type==='gradient'?gesture.preview:current(),zoom,activeGradient,gradientField());
  if(prototypeConnections&&!editingPath&&!editingGradient)drawConnections(ctx,scene,current(),zoom,gesture,tool==='select'&&canvasEditable());
  if(editingLayout===current()?.id&&tool==='select'&&canvasEditable()){const frame=scene.find(s=>s.id===editingLayout);if(frame&&visibleInTree(frame,scene)){ctx.save();for(const clip of clippingFrames(frame,scene)){ctx.beginPath();ctx.roundRect(clip.x,clip.y,clip.width,clip.height,radii(clip));ctx.clip();}drawSpacing(ctx,frame,scene,zoom,activeSpacing);ctx.restore();}}
  if(guidesVisible)drawSnapGuides(ctx,gesture?.snapLines,zoom);
  $('zoom-fit').textContent = `${Math.round(zoom * 100)}%`;
}
function drawAnchors(points) {
  ctx.strokeStyle='#0d99ff'; ctx.lineWidth=1/zoom; ctx.fillStyle='#fff';
  for(const [index,p] of points.entries()) {
    ctx.fillStyle='#fff';
    for(const h of [p.in,p.out].filter(Boolean)) {
      ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(h.x,h.y);ctx.stroke();
      ctx.beginPath();ctx.arc(h.x,h.y,3/zoom,0,Math.PI*2);ctx.fill();ctx.stroke();
    }
    ctx.fillStyle=editingPath&&index===activeNode?'#0d99ff':'#fff';ctx.fillRect(p.x-4/zoom,p.y-4/zoom,8/zoom,8/zoom);ctx.strokeRect(p.x-4/zoom,p.y-4/zoom,8/zoom,8/zoom);
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
  penPoints=[]; gesture=null; editingLayout=0;activeSpacing=null;editingPath=0;editingGradient=0;activeGradient=null;
  document.querySelectorAll('.tool-group').forEach(el=>el.open=false);
  $('pencil-options').hidden=value!=='pencil';
  tool = value; document.querySelectorAll('[data-tool]').forEach(button => { const active = button.dataset.tool === tool; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  renderProperties();
  draw();
  canvas.style.cursor = tool === 'hand' ? 'grab' : tool === 'select' ? 'default' : 'crosshair';
  $('hint').textContent = tool === 'select' ? 'Drag to snap to visible layout guides · Alt bypasses snapping · Shift locks an axis' : tool === 'hand' ? 'Drag to pan the canvas' : tool === 'scale' ? 'Drag from the lower-right of your selection to scale · Shift snaps to 10% steps' : tool === 'pen' ? 'Click for corners · Drag for curves · Click first point to close · Enter to finish' : tool === 'pencil' ? 'Drag to draw freehand · Smoothing preserves sharp corners · Escape to cancel' : 'Drag to draw · Shift to constrain · Alt to draw from center';
}
function download(name, body, type) { const url = URL.createObjectURL(new Blob([body], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function pasteLayerText(text,overSelection=false,replace=false,frames=false){
  const payload=layerPayload(text);if(!payload)return false;
  if(replace){setSelection(JSON.parse(editor.paste_replace(text,selectionJson())));refresh();toast('Selection replaced');return true;}
  if(frames||(!overSelection&&selectedIds.size>1&&selectionShapes().every(s=>s.kind==='frame'))){const count=selectedIds.size;setSelection(JSON.parse(editor.paste_into_frames(text,selectionJson())));refresh();toast('Pasted into '+count+' frames');return true;}
  const count=text===lastPasted?pasteCount+1:1,target=overSelection?current():current()?.kind==='frame'?current():null,offset=pasteOffset(payload,target,overSelection,count);
  setSelection(JSON.parse(editor.paste_layers(text,offset.x,offset.y,overSelection?(target?.parent_id??0):(target?.id??0))));lastPasted=text;pasteCount=count;refresh();toast('Layers pasted');return true;
}
function exportOptions(){return{format:$('export-format').value,scope:$('export-scope').value,scale:Number($('export-scale').value),quality:Number($('export-quality').value),background:$('export-format').value!=='jpeg'&&$('export-transparent').checked?null:$('export-background').value};}
function exportSummary(){
 const jpeg=$('export-format').value==='jpeg';$('export-transparent').disabled=jpeg;$('export-transparent').closest('label').hidden=jpeg;$('export-quality-row').hidden=!jpeg;
 try{const o=exportOptions();if(o.format!=='svg')rasterSettings(o.format,o.background,o.quality);const jobs=exportJobs(pageShapes(),[...selectedIds],o,activePage().name),batch=['frames','layers'].includes(o.scope);$('export-summary').textContent=batch?jobs.length+' separate '+o.format.toUpperCase()+' files in a ZIP':jobs[0].size.width+' × '+jobs[0].size.height+' px · '+jobs[0].shapes.length+' layers';$('export-download').disabled=false;}catch(error){$('export-summary').textContent=String(error);$('export-download').disabled=true;}
 $('export-background').disabled=$('export-format').value!=='jpeg'&&$('export-transparent').checked;
}
async function exportArtwork(){
 if(exportBusy)return;
 const options=exportOptions(),name=doc.name+' - '+(options.scope==='selection'?(current()?.name??'selection'):activePage().name),jobs=structuredClone(exportJobs(pageShapes(),[...selectedIds],options,name)),batch=['frames','layers'].includes(options.scope),files=[];let bytes=0;
 exportBusy=true;for(const id of ['export-format','export-scope','export-scale','export-quality','export-transparent','export-background'])$(id).disabled=true;$('export-download').disabled=true;$('export-cancel').disabled=true;
 try{await document.fonts.ready;
  for(const [index,job] of jobs.entries()){
   $('export-summary').textContent='Exporting '+(index+1)+' of '+jobs.length+'…';const {shapes,box,size}=job;let blob,extension;
   if(options.format==='svg'){extension='svg';blob=new Blob([svgDocument(shapes,box,options.scale,options.background,textLayout)],{type:'image/svg+xml'});}
   else{const raster=rasterSettings(options.format,options.background,options.quality),entries=shapes.filter(s=>s.image).map(s=>rasterEntry(s.image.data_url));await Promise.all(entries.map(e=>e.promise));if(entries.some(e=>!e.ready))throw new Error('An embedded image could not be decoded');
    const surface=new OffscreenCanvas(size.width,size.height),output=surface.getContext('2d');if(raster.background){output.fillStyle=raster.background;output.fillRect(0,0,size.width,size.height);}output.setTransform(options.scale,0,0,options.scale,-box.x*options.scale,-box.y*options.scale);drawScene(shapes,output,drawShape);blob=await surface.convertToBlob({type:raster.type,quality:raster.quality});surface.width=1;surface.height=1;if(blob.type!==raster.type)throw new Error('This browser cannot encode '+options.format.toUpperCase());extension=raster.extension;
   }
   if(batch){bytes+=blob.size;if(bytes>134217728)throw new Error('Batch export exceeds 128 MB. Export fewer layers or reduce scale.');files.push({name:job.name+'.'+extension,data:new Uint8Array(await blob.arrayBuffer())});}else download(job.name+'.'+extension,blob,blob.type);
   await new Promise(resolve=>requestAnimationFrame(resolve));
  }
  if(batch)download(name+'.zip',zipFiles(files),'application/zip');$('export-dialog').close();toast(batch?jobs.length+' files exported as ZIP':options.format.toUpperCase()+' exported');
 }finally{exportBusy=false;for(const id of ['export-format','export-scope','export-scale','export-quality','export-transparent','export-background'])$(id).disabled=false;$('export-download').disabled=false;$('export-cancel').disabled=false;exportSummary();}
}
function finishPen(closed) {
  if(penPoints.length<2) return;
  safe(()=>{ const id=insertAt(fromPoints('pen',penPoints,closed),penPoints[0]); penPoints=[]; setSelection([id]); setTool('select'); refresh(); });
}
async function placeImage(file,location=null,replaceId=0) {
  if(imageLoading){toast('An image is already loading');return;}imageLoading=true;const page=doc.active_page;
  try {
    if(file.type==='image/svg+xml'||/\.svg$/i.test(file.name)){
      if(replaceId)throw new Error('Import SVG as new editable layers instead of replacing a raster image');
      if(file.size>2_000_000)throw new Error('SVG must be smaller than 2 MB');
      const payload=parseSvg(await file.text(),file.name.replace(/\.svg$/i,''));
      if(doc.active_page!==page)throw new Error('Page changed during import. Import the SVG again.');
      placeSvg(payload,location);return;
    }
    const raster=await readImage(file);if(doc.active_page!==page)throw new Error('Page changed during import. Place the image again.');
    if(replaceId){const target=pageShapes().find(s=>s.id===replaceId&&s.kind==='image');if(!target)throw new Error('The target image no longer exists');editor.update(JSON.stringify({...target,image:raster}));setSelection([replaceId]);}
    else {const scale=Math.min(1,480/raster.width,360/raster.height),width=raster.width*scale,height=raster.height*scale;const start=location??{x:(canvas.clientWidth/2-pan.x)/zoom-width/2,y:(canvas.clientHeight/2-pan.y)/zoom-height/2};setSelection([insertAt({id:0,kind:'image',name:file.name.slice(0,80)||'Image',x:start.x,y:start.y,width,height,fill:'#ffffff',text:'',hidden:false,image:raster},start)]);}
    setTool('select');refresh();toast('Image placed');
  } catch(error){toast(String(error));}finally{imageLoading=false;}
}
function placeSvg(payload,location=null){
  const root=payload.shapes[0],start=location??{x:(canvas.clientWidth/2-pan.x)/zoom-root.width/2,y:(canvas.clientHeight/2-pan.y)/zoom-root.height/2};
  const ids=JSON.parse(editor.paste_layers(JSON.stringify(payload),start.x,start.y,frameAt(pageShapes(),start)));
  setSelection(ids);setTool('select');refresh();toast('SVG imported as editable layers');
}
function bind() {
  $('toggle-lock').onclick=toggleSelectionLock;
  $('create-component').onclick=()=>safe(()=>{editor.create_component(selected);refresh();toast('Main component created');});
  $('insert-instance').onclick=()=>insertInstance(selected);
  $('manage-variants').onclick=()=>editVariantSet(doc,selected,set=>{editor.save_component_set(JSON.stringify(set));refresh();},id=>{editor.remove_component_set(id);refresh();});
  $('add-variant').onclick=()=>safe(()=>{setSelection([editor.duplicate_variant(selected)]);refresh();fit();toast('Variant added. Edit its properties in Edit variant set.');});
  $('add-component-property').onclick=()=>editComponentProperty(doc,selected,null,p=>{editor.save_component_property(JSON.stringify(p));refresh();});
  $('detach-instance').onclick=()=>safe(()=>{editor.detach_instance(selected);refresh();toast('Instance detached');});
  $('reset-instance').onclick=()=>safe(()=>{editor.reset_instance(selected);refresh();toast('Instance overrides reset');});
  $('swap-component').onchange=()=>safe(()=>{const root=editor.swap_instance(selected,Number($('swap-component').value));setSelection([root]);refresh();toast('Component swapped');});
  $('go-main').onclick=()=>safe(()=>{const master=doc.shapes.find(s=>s.id===current()?.component?.master);if(!master)return;editor.select_page(master.page_id);refresh();setSelection([master.id]);refresh(false);fit();});
  installIcons();
  $('export-dialog').addEventListener('cancel',event=>{if(exportBusy)event.preventDefault();});
  $('paste-frames').onclick=async()=>{if(!selectedIds.size||selectionShapes().some(s=>s.kind!=='frame')){toast('Select destination frames first');return;}let text;try{text=await navigator.clipboard.readText();}catch{pasteFrames=true;toast('Press Ctrl/Cmd V to paste into the selected frames');return;}safe(()=>{if(!pasteLayerText(text,false,false,true))toast('Copy PixlPrfct layers first');});};
  $('paste-replace').onclick=async()=>{if(!selectedIds.size){toast('Select layers to replace');return;}let text;try{text=await navigator.clipboard.readText();}catch{pasteReplace=true;toast('Press Ctrl/Cmd V to replace the selection');return;}safe(()=>{if(!pasteLayerText(text,false,true))toast('Copy PixlPrfct layers first');});};
  $('paste-over').onclick=async()=>{let text;try{text=await navigator.clipboard.readText();}catch{pasteInPlace=true;toast('Press Ctrl/Cmd V to paste over the selection');return;}safe(()=>{if(!pasteLayerText(text,true))toast('Copy PixlPrfct layers first');});};
  for(const kind of ['copy','cut'])window.addEventListener(kind,event=>{
    if(event.target.closest('input,textarea,select,[contenteditable]')||!selectedIds.size||!event.clipboardData)return;
    safe(()=>{const payload=editor.copy_layers(selectionJson());event.clipboardData.setData(LAYER_MIME,payload);event.clipboardData.setData('text/plain',payload);event.preventDefault();if(kind==='cut')deleteSelection();toast(kind==='cut'?'Layers cut':'Layers copied');});
  });
  $('join-paths').onclick=()=>safe(()=>{setSelection([editor.join_paths(selectionJson())]);refresh();toast('Paths joined');});
  $('split-node').onclick=()=>safe(()=>{if(!editingPath||activeNode<0)return;const ids=JSON.parse(editor.split_path(selected,activeNode));editingPath=0;activeNode=-1;setSelection(ids);refresh();toast(ids.length===1?'Path opened':'Path split');});
  $('delete-node').onclick=()=>safe(()=>{if(editingPath&&current()&&activeNode>=0){const changed=deleteAnchor(current(),activeNode);activeNode=-1;update(changed);}});
  for(const [id,smooth] of [['smooth-node',true],['corner-node',false]])$(id).onclick=()=>safe(()=>{if(editingPath&&current()&&activeNode>=0)update(convertAnchor(current(),activeNode,smooth));});
  const layoutDefaults={direction:'horizontal',gap:16,padding_top:16,padding_right:16,padding_bottom:16,padding_left:16,align:'start',justify:'start',hug_width:false,hug_height:false};
  $('present-prototype').onclick=playPrototype;
  $('prototype-connections').onclick=()=>{prototypeConnections=!prototypeConnections;$('prototype-connections').setAttribute('aria-pressed',String(prototypeConnections));if(prototypeConnections){setTool('select');toast('Drag the blue connection handle to a frame');}draw();};
  $('add-auto-layout').onclick=()=>safe(()=>{setSelection([editor.auto_layout_selection(selectionJson())]);refresh();});
  for(const key of ['min_width','max_width','min_height','max_height'])$('limit-'+key).onchange=()=>{const s=current();if(s){const value=$('limit-'+key).value;update({...s,layout_item:{...s.layout_item,[key]:value===''?null:Number(value)}});renderProperties();}};
  $('edit-layout-spacing').onclick=()=>{const s=current();if(!s?.auto_layout||!canvasEditable())return;const was=editingLayout===s.id;setTool('select');editingLayout=was?0:s.id;activeSpacing=was?null:'padding_left';renderProperties();draw();canvas.focus();if(!was)toast('Drag spacing handles · Tab to choose · Arrow keys to adjust · Alt links opposite padding · Escape cancels');};
  $('layout-direction').onchange=()=>{const s=current();if(s)update({...s,auto_layout:$('layout-direction').value==='none'?null:{...layoutDefaults,...s.auto_layout,direction:$('layout-direction').value}});};
  for(const key of ['gap','cross_gap','padding_top','padding_right','padding_bottom','padding_left','align','justify','align_content','hug_width','hug_height','wrap'])$('layout-'+key).onchange=()=>{const s=current();if(s?.auto_layout){const el=$('layout-'+key),value=(key.startsWith('hug')||key==='wrap')?el.checked:['align','justify','align_content'].includes(key)?el.value:key==='cross_gap'&&el.value===''?null:Number(el.value);update({...s,auto_layout:{...s.auto_layout,[key]:value}});renderProperties();}};
  for(const key of ['fill_width','fill_height','absolute'])$('layout-item-'+key).onchange=()=>{const s=current();if(s)update({...s,layout_item:{fill_width:false,fill_height:false,absolute:false,...s.layout_item,[key]:$('layout-item-'+key).checked}});};
  $('independent-corners').onchange=()=>{const s=current();if(!s)return;const a=appearance(s);update({...s,appearance:{...a,corner_radius:a.corner_radii?.[0]??a.corner_radius,corner_radii:$('independent-corners').checked?Array(4).fill(a.corner_radius):null}});renderProperties();};
  for(let i=0;i<4;i++)$('corner-'+i).onchange=()=>{const s=current();if(!s)return;const a=appearance(s),values=[...(a.corner_radii??Array(4).fill(a.corner_radius))];values[i]=Number($('corner-'+i).value);update({...s,appearance:{...a,corner_radii:values}});renderProperties();};
  for(const end of ['start','end'])$('stroke-'+end).onchange=()=>{const s=current();if(!s)return;const value=$('stroke-'+end).value;update({...s,appearance:{...appearance(s),['stroke_'+end]:value==='default'?null:value}});};
  for(const [id,key] of [['stroke-dash','stroke_dash'],['stroke-dash-offset','stroke_dash_offset'],['stroke-cap','stroke_cap'],['stroke-join','stroke_join'],['stroke-miter-limit','stroke_miter_limit']])$(id).onchange=()=>{const s=current();if(!s)return;const raw=$(id).value.trim(),value=key==='stroke_dash'?(raw?raw.split(/[\s,]+/).map(Number):[]):['stroke_dash_offset','stroke_miter_limit'].includes(key)?Number(raw):raw;update({...s,appearance:{...appearance(s),[key]:value}});renderProperties();};
  for(const [id,key] of [['opacity','opacity'],['fill-opacity','fill_opacity'],['stroke-opacity','stroke_opacity'],['image-opacity','fill_opacity'],['corner-radius','corner_radius'],['fill-enabled','fill_enabled'],['stroke-enabled','stroke_enabled'],['stroke-color','stroke_color']])$(id).onchange=()=>{const s=current();if(!s)return;const value=id.endsWith('enabled')?$(id).checked:id==='stroke-color'?$(id).value:Number($(id).value)/(id.endsWith('opacity')?100:1);update({...s,appearance:{...appearance(s),[key]:value}});renderProperties();};
  $('place-image').onclick=()=>{imageReplaceId=0;$('image-file').click();};
  $('replace-image').onclick=()=>{imageReplaceId=current()?.id??0;$('image-file').click();};
  $('image-file').onchange=()=>{const file=$('image-file').files[0],replace=imageReplaceId;$('image-file').value='';if(file)placeImage(file,null,replace);};
  for(const [id,key] of [['image-mode','mode'],['image-zoom','zoom'],['image-x','offset_x'],['image-y','offset_y']])$(id).onchange=()=>{const shape=current();if(!shape?.image)return;const value=key==='mode'?$(id).value:Number($(id).value)/(key.startsWith('offset')?100:1);update({...shape,image:{...shape.image,[key]:value}});renderProperties();};
  $('reset-crop').onclick=()=>{const s=current();if(s?.image)update({...s,image:{...s.image,zoom:1,offset_x:.5,offset_y:.5}});};
  canvas.ondragover=event=>{event.preventDefault();event.dataTransfer.dropEffect='copy';};
  canvas.ondrop=event=>{event.preventDefault();const file=event.dataTransfer.files[0];if(file)placeImage(file,point(event));};
  window.addEventListener('paste',event=>{
    if(event.target.closest('input,textarea,select,[contenteditable]')||!event.clipboardData)return;
    const text=event.clipboardData.getData(LAYER_MIME)||event.clipboardData.getData('text/plain'),payload=layerPayload(text),inPlace=pasteInPlace,replace=pasteReplace,frames=pasteFrames;pasteInPlace=false;pasteReplace=false;pasteFrames=false;
    if(payload){event.preventDefault();safe(()=>pasteLayerText(text,inPlace,replace,frames));return;}
    if(replace||frames){event.preventDefault();toast('Copy PixlPrfct layers first');return;}
    const svgText=event.clipboardData.getData('image/svg+xml')||(/^\s*(?:<\?xml[^>]*>\s*)?<svg[\s>]/i.test(text)?text:'');
    if(svgText){event.preventDefault();safe(()=>placeSvg(parseSvg(svgText,'Pasted SVG')));return;}
    const item=[...event.clipboardData.items].find(i=>i.kind==='file'&&i.type.startsWith('image/'));if(item){event.preventDefault();const file=item.getAsFile();if(file)placeImage(file);return;}
    if(text){event.preventDefault();safe(()=>{if(new TextEncoder().encode(text).length>10000)throw new Error('Text layers are limited to 10 KB');const start={x:(canvas.clientWidth/2-pan.x)/zoom-200,y:(canvas.clientHeight/2-pan.y)/zoom-20};const shape={id:0,kind:'text',name:text.split('\n')[0].slice(0,80)||'Pasted text',...start,width:400,height:24,fill:'#1e1e1e',text,hidden:false,typography:{sizing:'height',font_family:'Manrope',font_size:16,font_weight:400,line_height:1.4,align:'left',wrap:true}};shape.height=Math.max(1,Math.ceil(textLayout(shape).height));setSelection([insertAt(shape,start)]);refresh();toast('Text pasted');});}
  });
  $('clip-content').onchange=()=>{if(current()?.kind==='frame')update({...current(),clip_content:$('clip-content').checked});};
  $('move-to-frame').onclick=()=>safe(()=>{editor.reparent_many(selectionJson(),Number($('parent-frame').value));refresh();});
  for(const axis of ['horizontal','vertical'])$('constraint-'+axis).onchange=()=>{const value=$('constraint-'+axis).value;if(value)updateMany(selectionShapes().map(s=>({...s,constraints:{horizontal:'min',vertical:'min',...s.constraints,[axis]:value}})));};
  $('group-layers').onclick=groupSelection; $('ungroup-layers').onclick=ungroupSelection;
  $('group-name').onchange=()=>safe(()=>{const id=selectedGroup(pageShapes(),[...selectedIds]);if(id){editor.rename_group(id,$('group-name').value);refresh();}});
  $('apply-scale').onclick=()=>safe(()=>{const shapes=transformedSelection(),box=bounds(selectionShapes());if(box) updateMany(scaleShapes(shapes,box,Number($('scale-percent').value)/100));});
  $('stroke-width').onchange=()=>{if(current()) update({...current(),stroke_width:Number($('stroke-width').value)}); renderProperties();};
  $('edit-path').onclick=()=>{if(!canvasEditable()){toast('Unlock the layer or its parent to edit on canvas');return;}if(current()?.points?.length){if(tool!=='select')setTool('select');editingGradient=0;activeGradient=null;editingPath=editingPath?0:current().id;activeNode=-1;renderProperties(); $('hint').textContent=editingPath?'Drag anchors or handles · Alt-drag an anchor to create handles · Enter to finish':'Double-click a vector to edit points'; draw();}};
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
  $('multi-fill').onchange = () => updateMany(selectionShapes().map(s => ({...s,fill:$('multi-fill').value,appearance:{...appearance(s),gradient:null}})));
  $('multi-duplicate').onclick = duplicateSelection; $('multi-delete').onclick = deleteSelection;
  const styleFields = { 'font-family': 'font_family', 'font-size': 'font_size', 'font-weight': 'font_weight', 'line-height': 'line_height', 'text-align': 'align', 'text-wrap': 'wrap' };
  $('text-sizing').onchange=()=>{const s=current();if(s?.kind!=='text')return;const sizing=$('text-sizing').value;update({...s,typography:{...textStyle(s),sizing},layout_item:{...s.layout_item,fill_width:sizing==='width'?false:s.layout_item.fill_width,fill_height:sizing!=='fixed'?false:s.layout_item.fill_height}});};
  for (const [id, key] of Object.entries(styleFields)) $(id).onchange = () => {
    const shape = current(); if (shape?.kind !== 'text') return;
    const value = id === 'text-wrap' ? $(id).checked : ['font-size', 'font-weight', 'line-height'].includes(id) ? Number($(id).value) : $(id).value;
    update({ ...shape, typography: { ...textStyle(shape), [key]: value } }); renderProperties();
  };
  $('fit-text').onclick = () => { if (current()?.kind === 'text') update({ ...current(), height: Math.ceil(textLayout(current()).height) }); };
  canvas.ondblclick = event => {
    if(tool!=='select') return;
    if(editingGradient&&current()?.appearance?.[gradientField()]){const hit=gradientPosition(current(),point(event),gradientField());if(hit.distance<10/zoom){const result=addGradientStopAt(current(),hit.t,gradientField());if(result){activeGradient=result.active;update(result.shape);}else toast('Gradients support up to 16 color stops');}return;}
    if(editingPath&&current()?.points?.length){const p=point(event),shape=current();if(anchors(shape).some(a=>Math.hypot(a.x-p.x,a.y-p.y)<8/zoom))return;const hit=nearestSegment(shape,p);if(hit&&hit.distance<10/zoom)safe(()=>{const changed=insertAnchor(shape,hit.segment,hit.t);activeNode=hit.segment+1;update(changed);});return;}
    const p = point(event), hit = editor.hit_test(p.x, p.y); setSelection(hit ? [hit] : []); refresh(false);
    if (current()?.kind === 'text') { $('text').focus(); $('text').select(); $('text').scrollIntoView({ block: 'nearest' }); }
    else if(current()?.points?.length) $('edit-path').click();
  };
  document.fonts.addEventListener('loadingdone', () => safe(()=>{editor.refresh_text_layout();refresh();}));
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
  $('undo').onclick = () => { gesture = null; activeNode=-1; editor.undo(); refresh(); }; $('redo').onclick = () => { gesture = null; activeNode=-1; editor.redo(); refresh(); };
  $('zoom-fit').onclick = fit; $('zoom-in').onclick = () => zoomAt(1.2); $('zoom-out').onclick = () => zoomAt(1 / 1.2);
  $('document-name').onchange = () => safe(() => { editor.load(JSON.stringify({ ...doc, name: $('document-name').value.trim() || 'Untitled design' })); refresh(); });
  for (const key of ['x', 'y', 'width', 'height', 'fill', 'text']) $(key).onchange = () => {
    if (!current()) return; const value = ['x', 'y', 'width', 'height'].includes(key) ? Number($(key).value) : $(key).value;
    update(resizeText({ ...current(), [key]: value },key==='width',key==='height')); renderProperties();
  };
  $('shape-name').onchange = () => current() && update({ ...current(), name: $('shape-name').value });
  $('visible').onchange = () => current() && update({ ...current(), hidden: !$('visible').checked });
  $('duplicate').onclick = duplicateSelection;
  $('delete').onclick = deleteSelection;
  $('forward').onclick = () => safe(() => { if (current()) { editor.reorder(selected, 1); refresh(); } });
  $('backward').onclick = () => safe(() => { if (current()) { editor.reorder(selected, -1); refresh(); } });
  $('save').onclick = () => { download(`${doc.name || 'design'}.pixl`, editor.snapshot(), 'application/json'); toast('Design file downloaded'); };
  $('export').onclick=()=>{$('export-selection-option').disabled=!selectedIds.size;$('export-scope').value=selectedIds.size?'selection':'page';exportSummary();$('export-dialog').showModal();};
  for(const id of ['export-format','export-scope','export-scale','export-quality','export-transparent','export-background']){$(id).onchange=exportSummary;$(id).oninput=exportSummary;}
  $('export-cancel').onclick=()=>$('export-dialog').close();$('export-download').onclick=()=>exportArtwork().catch(error=>{$('export-summary').textContent=String(error);}); $('open').onclick = () => $('file').click();
  $('file').onchange = async () => {
    const file = $('file').files[0]; if (!file) return;
    try { if (file.size > 5_000_000) throw new Error('Files must be smaller than 5 MB.'); const text = await file.text(); await cloud?.beforeLocalOpen(); editor.load(text); cloud?.localOpened(); setSelection([]); gesture = null; recoveryBlocked = false; pageViews.clear(); doc = null; refresh(); fit(); toast('Design opened'); }
    catch (error) { toast(`Could not open design: ${error}`); } finally { $('file').value = ''; }
  };
  canvas.onpointerdown = event => safe(() => {
    if (!editor || (event.button !== 0 && event.button !== 1)) return;
    canvas.focus(); canvas.setPointerCapture(event.pointerId);
    const p = point(event);
    if (tool === 'hand' || space || event.button === 1) { gesture = { type: 'pan', x: event.clientX, y: event.clientY, pan: { ...pan } }; return; }
    if (tool === 'text') { setSelection([insertAt({id:0,kind:'text',name:'Text',x:p.x,y:p.y,width:240,height:56,fill:'#000000',text:'Your next big idea',hidden:false,typography:{sizing:'width',font_size:32,font_family:'Manrope',font_weight:600,align:'left',line_height:1.2,wrap:true}},p)]); setTool('select'); refresh(); return; }
    if (tool === 'pen') {
      if(penPoints.length>=2 && Math.hypot(p.x-penPoints[0].x,p.y-penPoints[0].y)<10/zoom) { finishPen(true); return; }
      if(penPoints.length<4096) { penPoints.push(p); gesture={type:'pen-handle',index:penPoints.length-1}; } draw(); return;
    }
    if(tool==='scale') {
      if(!canvasEditable()){toast('Unlock the selection before scaling on canvas');return;}
      if(!selectedIds.size) {const hit=editor.hit_test(p.x,p.y);if(hit)setSelection(canvasSelection(pageShapes(),[hit]));}
      const originals=transformedSelection(),box=bounds(selectionShapes()); if(!box) {toast('Select layers to scale first');return;}
      gesture={type:'scale',start:p,origin:{x:box.x,y:box.y},originals,previews:originals}; renderLayers();renderProperties();return;
    }
    if (tool !== 'select') { setSelection([]); gesture={type:'create',kind:tool,start:p,points:[p],preview:tool==='pencil'?fromPoints(tool,[p,p]):drawnShape(tool,p,p)}; renderProperties(); draw(); return; }
    const shape = current();
    if(prototypeConnections&&!editingPath&&!editingGradient&&shape&&visibleInTree(shape,pageShapes())&&canvasEditable()&&connectionHit(shape,p,zoom)){gesture={type:'prototype-link',source:shape,end:p,target:0};draw();return;}
    if(editingGradient&&shape?.appearance?.[gradientField()]){const hit=gradientHit(shape,p,zoom,gradientField());if(hit){activeGradient=hit;gesture={type:'gradient',handle:hit,original:shape,preview:shape};renderProperties();draw();return;}if(gradientPosition(shape,p,gradientField()).distance<10/zoom){activeGradient=null;draw();return;}editingGradient=0;activeGradient=null;renderProperties();}
    if(editingPath && shape?.points?.length) {
      const nodes=anchors(shape);
      for(let i=0;i<nodes.length;i++) {
        const a=nodes[i];
        for(const part of ['anchor','in','out']) {
          const h=part==='anchor'?a:a[part];
          if(Math.hypot(p.x-h.x,p.y-h.y)<8/zoom) {activeNode=i;gesture={type:'node',index:i,part:event.altKey&&part==='anchor'?'smooth':part,start:p,original:shape,nodes,preview:shape};renderProperties();draw();return;}
        }
      }
      const segment=nearestSegment(shape,p);if(segment&&segment.distance<10/zoom){activeNode=-1;renderProperties();draw();return;}
      editingPath=0;activeNode=-1;
    }
    if(editingLayout===shape?.id&&canvasEditable()&&visibleInTree(shape,pageShapes())&&clippingFrames(shape,pageShapes()).every(f=>roundedContains(f,p))){const handle=spacingHit(shape,pageShapes(),p,zoom);if(handle){activeSpacing=handle.key;gesture={type:'layout-spacing',original:shape,preview:shape,start:p,handle};draw();return;}}
    if (shape && !shape.hidden && canvasEditable()) {
      for (const [cx, cy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
        if (Math.abs(p.x - shape.x - cx * shape.width) < 9 / zoom && Math.abs(p.y - shape.y - cy * shape.height) < 9 / zoom) { gesture = { type: 'resize', start: p, original: { ...shape }, preview: { ...shape }, cx, cy }; return; }
      }
    }
    const hit = editor.hit_test(p.x, p.y);
    if (event.shiftKey && hit) {
      const ids = new Set(selectedIds), hits=event.ctrlKey||event.metaKey?[hit]:canvasSelection(pageShapes(),[hit]),remove=hits.every(id=>ids.has(id)); hits.forEach(id=>remove?ids.delete(id):ids.add(id)); setSelection([...ids]); refresh(false); return;
    }
    if (!hit) {
      const base = event.shiftKey ? [...selectedIds] : [];
      setSelection(base); refresh(false); gesture = {type:'marquee',start:p,end:p,base}; return;
    }
    if (event.ctrlKey||event.metaKey) setSelection([hit]);
    else if (!selectedIds.has(hit)) setSelection(canvasSelection(pageShapes(),[hit]));
    layerAnchor = hit; refresh(false);
    if(!canvasEditable()){toast('Unlock the selection before moving it on canvas');return;}
    gesture = {type:'move',start:p,originals:transformedSelection().map(s=>({...s})),previews:transformedSelection().map(s=>({...s}))};
  });
  canvas.onpointermove = event => {
    if (!gesture) return;
    if (gesture.type === 'pan') { pan.x = gesture.pan.x + event.clientX - gesture.x; pan.y = gesture.pan.y + event.clientY - gesture.y; draw(); return; }
    const p = point(event), original = gesture.original, snap = Math.round;
    if(gesture.type==='layout-spacing'){const next=changeSpacing(original,gesture.handle,p[gesture.handle.axis]-gesture.start[gesture.handle.axis],event);try{const scene=JSON.parse(editor.preview_update_many(JSON.stringify([next]))).shapes.filter(s=>s.page_id===doc.active_page);gesture.preview=next;gesture.scene=scene;}catch(error){toast(String(error));}draw();return;}
    if(gesture.type==='prototype-link'){gesture.end=p;gesture.target=connectionTarget(pageShapes(),gesture.source.id,p);draw();return;}
    if(gesture.type==='gradient'){const result=moveGradientHandle(original,gesture.handle,p,event.shiftKey,gradientField());gesture.preview=result.shape;activeGradient=result.active;draw();return;}
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
      setSelection([...new Set([...gesture.base,...canvasSelection(pageShapes(),marqueeSelection(pageShapes().map(s=>paintBounds(s,pageShapes())).filter(Boolean),gesture.start,p))])]);
      renderLayers(); renderProperties(); draw(); return;
    }
    if (gesture.type === 'move') {
      let dx = snap(p.x - gesture.start.x), dy = snap(p.y - gesture.start.y);
      if (event.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      gesture.snapLines=[];
      if(guidesVisible&&!event.altKey){const roots=gesture.originals.filter(s=>selectedIds.has(s.id)),box=bounds(roots),excluded=new Set(gesture.originals.map(s=>s.id));if(box){const axes=event.shiftKey?(Math.abs(dx)>Math.abs(dy)?{x:true,y:false}:{x:false,y:true}):{x:true,y:true};const result=snapGuides(pageShapes(),{...box,x:box.x+dx,y:box.y+dy},excluded,zoom,axes);dx+=result.dx;dy+=result.dy;gesture.snapLines=result.lines;}}
      gesture.previews = gesture.originals.map(s => ({...s,x:s.x+dx,y:s.y+dy}));
    }
    else {
      let resizePoint={x:snap(p.x),y:snap(p.y)};gesture.snapLines=[];
      if(guidesVisible&&!event.altKey){const result=snapGuides(pageShapes(),{...resizePoint,width:0,height:0},new Set(transformedSelection().map(s=>s.id)),zoom);resizePoint={x:resizePoint.x+result.dx,y:resizePoint.y+result.dy};gesture.snapLines=result.lines;}
      const right = original.x + original.width, bottom = original.y + original.height;
      const x = gesture.cx ? original.x : Math.min(right - 1, resizePoint.x);
      const y = gesture.cy ? original.y : Math.min(bottom - 1, resizePoint.y);
      gesture.preview = { ...original, x, y, width: gesture.cx ? Math.max(1, resizePoint.x - x) : right - x, height: gesture.cy ? Math.max(1, resizePoint.y - y) : bottom - y };
      gesture.preview=resizeText(gesture.preview,!!gesture.cx,!!gesture.cy);
    }
    draw();
  };
  canvas.onpointerup = () => {
    if(gesture?.type==='prototype-link'){const {source,target}=gesture;gesture=null;if(target)update(connectedShape(source,target));else draw();return;}
    if(gesture?.type==='pen-handle') {gesture=null;draw();return;}
    if(gesture?.type==='create') {
      let shape=gesture.preview;
      if(gesture.kind==='pencil')shape=fromPoints('pencil',smoothPencil(gesture.points,Number($('pencil-smoothing').value),zoom));
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
  const cancelGesture = () => { if (gesture?.type === 'marquee') setSelection(gesture.base);if(gesture?.type==='gradient')activeGradient=null; gesture = null; renderLayers(); renderProperties(); draw(); };
  canvas.onpointercancel = cancelGesture;
  canvas.onlostpointercapture = () => { if (gesture) cancelGesture(); };
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) { const rect = canvas.getBoundingClientRect(); zoomAt(Math.exp(-event.deltaY * .001), event.clientX - rect.left, event.clientY - rect.top); }
    else { pan.x -= event.shiftKey ? event.deltaY : event.deltaX; pan.y -= event.shiftKey ? 0 : event.deltaY; draw(); }
  }, { passive: false });
  window.addEventListener('keydown', event => {
    if (document.querySelector('dialog[open]')) return;
    if (event.target.closest('input,textarea,select,[contenteditable]')) return;
    const key = event.key.toLowerCase(), mod = event.ctrlKey || event.metaKey;
    if(mod&&event.shiftKey&&key==='l'){event.preventDefault();toggleSelectionLock();return;}
    if(editingLayout&&!mod){
      if(key==='escape'||key==='enter'){event.preventDefault();const preview=gesture?.type==='layout-spacing'?gesture.preview:null;gesture=null;if(key==='enter'&&preview)update(preview);if(key==='enter'||!preview){editingLayout=0;activeSpacing=null;}renderProperties();draw();return;}
      if(key==='tab'&&event.target===canvas){event.preventDefault();const handles=spacingHandles(current(),pageShapes()).filter((h,i,a)=>a.findIndex(v=>v.key===h.key)===i),index=handles.findIndex(h=>h.key===activeSpacing);activeSpacing=handles[(index+(event.shiftKey?-1:1)+handles.length)%handles.length]?.key;draw();return;}
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();if(!canvasEditable()||gesture)return;const h=spacingHandles(current(),pageShapes()).find(h=>h.key===activeSpacing);if(h){const delta=(event.key==='ArrowLeft'||event.key==='ArrowUp'?-1:1)*(event.shiftKey?10:1);update(changeSpacing(current(),h,delta,{altKey:event.altKey}));}return;}
    }
    if(editingGradient&&!mod){
      if(key==='tab'&&event.target===canvas){event.preventDefault();const handles=gradientHandles(current(),zoom,gradientField()),index=handles.findIndex(h=>h.part===activeGradient?.part&&(h.part!=='stop'||h.index===activeGradient.index));activeGradient=handles[(index+(event.shiftKey?-1:1)+handles.length)%handles.length];renderProperties();draw();return;}
      if(key==='enter'||key==='escape'){event.preventDefault();const preview=gesture?.type==='gradient'?gesture.preview:null;if(key==='escape'&&preview){gesture=null;activeGradient=null;}else{gesture=null;editingGradient=0;activeGradient=null;if(key==='enter'&&preview)update(preview);}renderProperties();draw();return;}
      if(['delete','backspace'].includes(key)){event.preventDefault();const s=current(),g=s?.appearance?.[gradientField()];if(activeGradient?.part==='stop'&&g.stops.length>2){const index=activeGradient.index;activeGradient=null;update({...s,appearance:{...s.appearance,[gradientField()]:{...g,stops:g.stops.filter((_,i)=>i!==index)}}});}else toast('Select a color stop to remove; keep at least two stops');return;}
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();const s=current();if(activeGradient){const h=gradientHandles(s,zoom,gradientField()).find(h=>h.part===activeGradient.part&&(h.part!=='stop'||h.index===activeGradient.index)),step=event.shiftKey?10:1;let p={x:h.x,y:h.y};if(h.part==='stop'){const g=s.appearance[gradientField()],t=Math.max(0,Math.min(1,g.stops[h.index].position+(['ArrowLeft','ArrowDown'].includes(event.key)?-step:step)/100));p={x:s.x+(g.start[0]+(g.end[0]-g.start[0])*t)*s.width,y:s.y+(g.start[1]+(g.end[1]-g.start[1])*t)*s.height};}else{p.x+=event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0;p.y+=event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0;}const result=moveGradientHandle(s,h,p,false,gradientField());activeGradient=result.active;update(result.shape);}return;}
    }
    if(mod&&event.shiftKey&&key==='r'){event.preventDefault();$('paste-replace').click();return;}
    if(mod&&key==='v'){pasteInPlace=event.shiftKey||pasteInPlace;return;}
    if(editingPath&&!mod&&['delete','backspace'].includes(key)){event.preventDefault();if(activeNode>=0)$('delete-node').click();else toast('Select an anchor to delete, or press Enter to finish editing');return;}
    if(editingPath&&activeNode>=0&&!mod&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();const s=current(),nodes=anchors(s),a=nodes[activeNode],amount=event.shiftKey?10:1,dx=event.key==='ArrowLeft'?-amount:event.key==='ArrowRight'?amount:0,dy=event.key==='ArrowUp'?-amount:event.key==='ArrowDown'?amount:0;a.x+=dx;a.y+=dy;a.in.x+=dx;a.in.y+=dy;a.out.x+=dx;a.out.y+=dy;update(reshape(s,nodes));return;}
    if(!mod&&event.shiftKey&&key==='g'){event.preventDefault();guidesVisible=!guidesVisible;renderProperties();draw();toast(guidesVisible?'Layout guides shown':'Layout guides hidden');return;}
    if(!mod&&event.shiftKey&&key==='a'&&selectedIds.size){event.preventDefault();$('add-auto-layout').click();return;}
    if(mod && event.shiftKey && key==='k'){event.preventDefault();$('place-image').click();return;}
    if(mod && key==='g') {event.preventDefault(); if(selectedIds.size)(event.shiftKey?ungroupSelection:groupSelection)();return;}
    if (mod && key === 'a') { event.preventDefault(); setSelection(pageShapes().filter(s=>visibleInTree(s,pageShapes())&&!lockedInTree(s,pageShapes())).map(s=>s.id)); refresh(false); return; }
    if (event.altKey && !mod && selectedIds.size > 1 && ['a','d','w','s'].includes(key)) { event.preventDefault(); if(!selectionShapes().some(s=>s.group_id)) safe(() => { editor.align_many(selectionJson(),{a:'left',d:'right',w:'top',s:'bottom'}[key]); refresh(); }); return; }
    if (mod && ['z', 'y', 's', 'd'].includes(key)) { event.preventDefault(); if (key === 'z') (event.shiftKey ? $('redo') : $('undo')).click(); if (key === 'y') $('redo').click(); if (key === 's') $('save').click(); if (key === 'd') $('duplicate').click(); return; }
    if (event.code === 'Space' && !event.target.closest('button,summary')) { event.preventDefault(); space = true; return; }
    if(key==='enter' && tool==='pen') {event.preventDefault(); finishPen(false); return;}
    if(key==='enter' && current()?.points?.length) {event.preventDefault(); $('edit-path').click(); return;}
    if (key === 'escape') { penPoints=[]; gesture = null; setSelection([]); setTool('select'); refresh(false); return; }
    if (['delete', 'backspace'].includes(key)) { event.preventDefault(); $('delete').click(); return; }
    if (selectedIds.size && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) && event.target !== divider) { event.preventDefault();if(!canvasEditable()){toast('Unlock the selection before nudging');return;} const step = event.shiftKey ? 10 : 1; updateMany(selectionShapes().map(s=>({ ...s, x: s.x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0), y: s.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0) }))); return; }
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
  editor.set_text_measurer(json=>{const s=JSON.parse(json);measureCtx.font=fontCss(textStyle(s));return JSON.stringify(textSize(s,value=>measureCtx.measureText(value).width));});
  let stored;
  try { stored = localStorage.getItem(KEY); } catch {}
  if (stored) { try { editor.load(stored); editor.clear_history(); } catch { recoveryBlocked = true; seed(); toast('Saved data could not be loaded. It has been preserved; use Open to recover a file.'); } }
  else seed();
  bind(); refresh(false); fit(); $('engine-status').textContent = 'Rust engine connected';
  cloud=cloudFiles({snapshot:()=>editor.snapshot(),load:body=>{editor.load(body);editor.clear_history();setSelection([]);gesture=null;recoveryBlocked=false;pageViews.clear();doc=null;refresh(false);fit();},status:text=>{$('save-status').textContent=text;document.querySelector('.file-location span').textContent=cloud?.session.active?'Cloud file':'Local file';},toast});cloud.restore();
  await document.fonts.ready; editor.refresh_text_layout(); refresh(false);
} catch (error) { $('engine-status').textContent = 'Engine could not start'; $('save-status').textContent = 'Editor unavailable'; toast(`Could not start editor: ${error}`); console.error(error); }
