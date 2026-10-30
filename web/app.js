import {loadingMessage,finishLoading,failLoading} from './loading-screen.js';
import {installDesktop} from './desktop-integration.js';
import {readDesignFile} from './design-import.js';
import {installFigmaInspector} from './figma-inspector.js';
let updateFigmaInspector=()=>{};
import {installMotion} from './motion.js';
import {installToolInspector} from './tool-inspector.js';
import {editorRole,editorShape,drawEditorMarks,textOnPath,pathGlyphs} from './canvas-tools.js';
import {readPaintMedia} from './paint-textures.js';
let motionTools=null,renderToolInspector=()=>{};
import {previewPaints} from './paint-shaders.js';
import {resolvePatternPaints} from './paint-textures.js';
import {reconcilePaints,commitPaintEdit} from './paints.js';
import {editingPaint} from './paint-stack-inspector.js';
import {effectBlur} from './effect-values.js';
import {textEditSession,mountTextEditor,drawnText} from './text-editing.js';
import {areaResizeConstraints,drawResizeLimits,updateTrackLimitControls} from './grid-resize-feedback.js';
import {updateAreaTrackValues} from './grid-area-track-values.js';
import {gridAreaEditingOverridden} from './layout-css.js';
import {installLayerCssInspector} from './layer-css-inspector.js';
import {createLayerCssEditor} from './layer-css-editor.js';
import {installAgentConnection} from './agent-connection.js';
import {createLayoutCssEditor} from './layout-css-editor.js';
import {installDeviceChrome,orientFrame,chromeBreakpoints,deviceChromeStatus} from './device-chrome.js';
import {gridStackDrop,drawGridStackDrop} from './grid-stack-drop.js';
import {areaSelectionStatus,areaVisiblePan,historyAreaSelection,areaBox,areaFromDrag,moveArea,pageArea,cycleArea,nudgeArea,resizeArea,validArea,nextAreaName,areaHit,drawAreaEditing} from './grid-areas.js';
import {gridCreationPlacement,isNamedAreaLayer,gridArrowMove,historyGridItemSelection,drawGridCells,gridSpanResize,drawGridDestination,gridCellAt} from './grid-canvas.js';
import {hasHugControlHeight} from './control-sizing.js';
import {layoutArrowOrder} from './layout-keyboard.js';
import {ensureBaseTextDocument} from './base-text.js';
import {normalizeSnapping,snapMovement} from './snapping.js';
import {installIconLibrary} from './icon-library.js';
import {ensureInputBase} from './input-base.js';
import {controlTypes,newControl,supportsReadonly} from './controls.js';
import {fontInput,loadGoogleFont,usedFonts} from './google-fonts.js';
import {createPageTypeahead,pageMatchRanges,cyclePageMatch} from './page-typeahead.js';
import {installDevelopment} from './development.js';
let development=null;
import {installControlInspector} from './control-inspector.js';
let renderControlInspector=()=>{};
import {installPageDrop} from './page-drop.js';
import {clampZoom,zoomTarget} from './zoom-inertia.js';
import {installNativePinch} from './native-pinch.js';
import {installTooltips} from './tooltips.js';
import {installCollapsibleInspector} from './collapsible-inspector.js';
import {worldPoint,localPoint,rotateFromDrag,rotateToAngle,worldShape,sceneToWorld,shapeToLocal} from './rotation.js';
import {projectFile} from './project-file.js';
import { fixedResize, resizeHandles, resizeHandleAt, resizeBox, rotationHandleAt, resizeWorldBox, resizeCursor, rotateCursor } from './resizing.js';
import {codeExportFiles,showCodeExport} from './code-export.js';
import {installInspectorDropdowns} from './inspector-dropdown.js';
let syncInspectorDropdowns=()=>{};
import {installFramePresets,installFrameLabels,migrateChromeDocument} from './frame-tools.js';
import {workspaceWindow} from './workspace-window.js';
import {installLayerDrop,layerDropAllowed,layerDropReason,projectLayerDrop,layerDropDestination,layerDropParent} from './layer-drop.js';
import {installRectangleInspector} from './rectangle-inspector.js';
import {installPaintPopovers} from './paint-popover.js';
let updateRectangleInspector=()=>{},updatePaintPopovers=()=>{};
import {mountCssCanvas} from './css-renderer.js';
import {installContextualActions,ratioSize} from './contextual-actions.js';
let updateContextualActions=()=>{};
import {installCompactInspector} from './compact-inspector.js';
let updateCompactInspector=()=>{};
import {closeVariables} from './variable-manager.js';
import {ASSET_MIME,assetDragPayload,readAssetDrag,centeredPlacement} from './asset-drag.js';
import {instanceContext} from './instance-context.js';
import {installInspectorLayout} from './inspector-layout.js';
let updateInspectorLayout=()=>{};
import {installToolbelt} from './toolbelt.js';
let updateToolbelt=()=>{};
import {installLayoutSizing} from './layout-sizing.js';
import {installAutoLayoutInspector} from './auto-layout-inspector.js';
import {installVariables} from './variables.js';
let updateVariables=()=>{};
let updateAutoLayoutInspector=()=>{};let updateLayoutSizing=()=>{};
import {componentAssets,renderAssets,assetAppearance} from './assets.js';
import {createLibraryManager} from './library-manager.js';
import {libraryForMaster,libraryForShape} from './library-model.js';
import {showContextMenu} from './context-menu.js';
import {installActionPanel} from './action-panel.js';
import {renderGridControls,renderGridCell,defaultGrid} from './grid-controls.js';
import {drawAlignedStroke} from './stroke-alignment.js';
import {spacingHandles,spacingHit,changeSpacing,drawSpacing} from './layout-spacing.js';
import {drawVectorStroke} from './stroke-render.js';
import {cloudFiles} from './cloud-files.js';
import {staticHost} from './static-host.js';
import {LocalDrafts} from './local-drafts.js';
import {projectRoute,projectUrl} from './project-navigation.js';
import {renderShadowControls} from './shadow-controls.js';
import {parseSvg} from './svg-import.js';
import {snapGuides,drawSnapGuides} from './guide-snap.js';
import {inspectorRenderer} from './inspector-focus.js';
import {exportJobs,zipFiles} from './batch-export.js';
import {rasterSettings} from './export.js';
import {smoothPencil} from './pencil.js';
import {connectionHit,connectionAt,connectionTarget,connectedShape,drawConnections} from './prototype-connections.js';
import {prototypeFrames,renderPrototypeControls,presentPrototype} from './prototype.js';
import {interactions,withInteractions} from './prototype-interactions.js';
import {drawLayoutGuides,renderGuideControls} from './layout-guides.js';
import init, { Editor } from './pkg/pixlprfct_core.js';
import {componentSet,componentSetFrame,canCombineVariants,renderVariantProperties,renderVariantAuthoring} from './variants.js';
import {renderComponentProperties as renderExposedProperties,editComponentProperty} from './component-properties.js';
import {canvasFill} from './gradients.js';
import {gradientHandles,gradientHit,gradientPosition,moveGradientHandle,addGradientStopAt,drawGradientHandles} from './gradient-edit.js';
import {renderGradientControls} from './gradient-controls.js';
import { fontBaseline, textBaseline, textStyle, fontCss, layoutText, textSvg, textSize, resizeText } from './typography.js';
import { bounds, marqueeSelection, layerRange, selectionRoots, selectionTarget, childSelection, parentSelection, siblingSelection, descendants, visibleInTree, lockedInTree, canvasSelection } from './selection.js';
import {clippingFrames,paintBounds,frameAt,clipDefinitions,clipSvg,dropParent} from './scene.js';
import {imageLayout,imageSvg,readImage} from './images.js';
import {nearestSegment,insertAnchor,deleteAnchor,convertAnchor} from './vector-edit.js';
import {exportSize,svgDocument} from './export.js';
import {LAYER_MIME,layerPayload,createPasteContext} from './clipboard.js';
import {appearance,radii,roundedContains,paintAttributes,drawScene,sceneSvg,withPaintOpacity} from './appearance.js';
import {createViewportRenderer} from './viewport-renderer.js';
const viewportRenderer=createViewportRenderer(drawScene);
import { scaleShapes } from './scaling.js';
import { vectorTools, fromPoints, drawnShape, vectorPath, vectorSvg, anchors, reshape } from './vectors.js';
import { icon, installIcons, componentLabelType } from './icons.js';

const $ = id => document.getElementById(id);
const canvas = $('canvas'), ctx = canvas.getContext('2d');
const renderDeviceChrome=installDeviceChrome(canvas);
const showFramePresets=installFramePresets(document.querySelector('.right-panel'),preset=>safe(()=>{
 const x=Math.round((canvas.clientWidth/2-pan.x)/zoom-preset.width/2),y=Math.round((canvas.clientHeight/2-pan.y)/zoom-preset.height/2);
 const id=editor.insert(JSON.stringify({id:0,kind:'frame',...preset,x,y,parent_id:0,fill:'#ffffff',text:'',clip_content:true,hidden:false}));
 setSelection([id]);setTool('select');refresh();fit(true);
}));
const renderFrameLabels=installFrameLabels(canvas,{beginDrag:(id,start,event)=>safe(()=>{
  const shape=pageShapes().find(s=>s.id===id);if(!shape||lockedInTree(shape,pageShapes()))return;
  setTool('select');if(!selectedIds.has(id))setSelection([id]);
  if(!canvasEditable())return;
  layerAnchor=id;refresh(false);canvas.focus();canvas.setPointerCapture(event.pointerId);
  const originals=transformedSelection().map(s=>({...s}));
  gesture={type:'move',targets:pageShapes().map(s=>({...s,...transformGeometry(s)})),start:point(start),originals,previews:originals.map(s=>({...s}))};
  canvas.onpointermove(event);
}),select:id=>{setSelection([id]);refresh(false);},rename:(id,name)=>{const shape=doc.shapes.find(s=>s.id===id);if(shape)update({...shape,name});}});
const cssCanvas=mountCssCanvas(canvas,()=>scheduleViewportDraw());let cssCanvasEnabled=null,cssGeometry=[];
const needsControlRenderer=()=>pageShapes().some(s=>s.control||s.auto_layout?.direction==='grid'||s.layout_media?.length||s.custom_css);
const cssActive=()=>!!layoutCssPreview||!!layerCssPreview||needsControlRenderer()||(cssCanvasEnabled??pageShapes().some(s=>effectBlur(s.appearance,'backdrop_blur')>0));
const canvasHit=(x,y)=>cssActive()?cssCanvas.hit({x,y}):editor.hit_test(x,y);
const measureCtx = document.createElement('canvas').getContext('2d');
function textLayout(shape) { measureCtx.font = fontCss(textStyle(shape)); return layoutText(shape, value => measureCtx.measureText(value).width, fontBaseline(textStyle(shape),measureCtx)); }
function agentEditor(){const instance=new Editor();instance.set_text_measurer(json=>{const shape=JSON.parse(json);if(shape.control?.kind==='button'){const style=shape.typography??{font_family:'Arial',font_size:16,font_weight:400,line_height:1.2};measureCtx.font=fontCss(style);return JSON.stringify([Math.max(1,Math.ceil(measureCtx.measureText(shape.control.label).width)),Math.max(1,Math.ceil(style.font_size*style.line_height))]);}measureCtx.font=fontCss(textStyle(shape));return JSON.stringify([...textSize(shape,value=>measureCtx.measureText(value).width),textBaseline(shape,measureCtx)]);});return instance;}
const KEY = 'pixlprfct.document.v1';
let textEditing=null;
const inlineText=mountTextEditor(canvas,{input:previewText,finish:finishText,zoom:key=>zoomAt(key==='0'?1/zoom:key==='-'?1/1.2:1.2)});
let gridHoverPointer = null;
let layoutCssPreview=null,layoutCssEditor,renderLayerCssInspector;
let layerCssPreview=null,layerCssEditor;
let gridPickerPreview=null;
let editor, doc, selected = 0, tool = 'select', zoom = 1, pan = { x: 0, y: 0 }, gesture = null, space = false;
// Trackpad pinch emits small wheel deltas; amplify these while anchoring at the pointer.
const TRACKPAD_PAN_SPEED = 1;
let viewportDrawPending = false;
window.addEventListener('paint-texture-ready',()=>{viewportRenderer.invalidate();scheduleViewportDraw();});
function scheduleViewportDraw() {
  if (viewportDrawPending) return;
  viewportDrawPending = true;
  requestAnimationFrame(() => { viewportDrawPending = false; draw(); });
}
function pinchZoom(delta,x=canvas.clientWidth/2,y=canvas.clientHeight/2){
  // Accumulate every input immediately; only painting is batched to the next frame.
  zoomAt(zoomTarget(zoom,delta)/zoom,x,y,true);
}
let guidesVisible=true,prototypeConnections=false,prototypeInteraction=0,prototypeLinkSelected=false;
let snapping=normalizeSnapping();try{snapping=normalizeSnapping(JSON.parse(localStorage.getItem('pixlprfct-snapping')||'{}'));}catch{}
let toastTimer, recoveryBlocked = false, cloud=null,drafts=null,projectLoading=true,leavingProject=false;
const imageCache=new Map();
let imageReplaceId=0,imageLoading=false;
let penPoints = [];
const assetDragToken=crypto.randomUUID();let assetDrag=null;
function clearAssetDrag(){assetDrag=null;draw();}
function startAssetDrag(event,master){if(!event.dataTransfer)return;event.dataTransfer.setData(ASSET_MIME,assetDragPayload(assetDragToken,master));event.dataTransfer.effectAllowed='copy';assetDrag={master,point:null,parent:0};}
let editingPath = 0;
let editingLayout=0,activeSpacing=null;
let editingGridAreas=0,activeGridArea=null,tooltips=null;
let activeNode=-1;
let lastPasted='',pasteCount=0,pasteInPlace=false,pasteReplace=false,pasteFrames=false;
const pasteContext=createPasteContext();
let exportBusy=false;
let selectedIds = new Set(), layerAnchor = 0;
let editingGradient=0,activeGradient=null,gradientChannel='fill';
const gradientField=()=>gradientChannel==='stroke'?'stroke_gradient':'gradient';
const gradientShape=()=>editingPaint(current(),gradientChannel);
document.addEventListener('paint-selection',()=>{editingGradient=0;activeGradient=null;renderProperties();draw();});
function setSelection(ids,{preservePrototypeLink=false}={}) { if(textEditing&&(ids.length!==1||ids[0]!==textEditing.id)&&!finishText({render:false}))return; if(!preservePrototypeLink||ids.length!==1||ids[0]!==selected)prototypeLinkSelected=false; if(ids.length!==1||ids[0]!==selected)prototypeInteraction=0; gridPickerPreview=null; if(ids.length!==1||ids[0]!==editingGridAreas){tooltips?.hideFor($('grid-area-status'));editingGridAreas=0;activeGridArea=null;} if(ids.length!==1||ids[0]!==editingLayout){editingLayout=0;activeSpacing=null;} selectedIds = new Set([...selectionRoots(pageShapes(),ids),...ids.filter(id=>!pageShapes().some(s=>s.id===id))]); pasteContext.select([...selectedIds]); selected = [...selectedIds].at(-1) || 0; if(ids.length!==1 || ids[0]!==editingPath){editingPath=0;activeNode=-1;} if(ids.length!==1||ids[0]!==editingGradient){editingGradient=0;activeGradient=null;} }
function previewText(value){
  if(!textEditing)return;
  try{textEditing.preview(value);inlineText.invalid(false);$('text').value=value;draw();}
  catch(error){inlineText.invalid(true);toast(String(error));}
}
function finishText({focus=false,render=true}={}){
  if(!textEditing)return true;
  const session=textEditing;
  try{session.preview(inlineText.value());session.commit();}
  catch(error){inlineText.invalid(true);toast(String(error));return false;}
  // Inspector actions may have captured this shape before the caret opened.
  // Keep their text current until the next inspector render replaces them.
  const previous=pageShapes().find(s=>s.id===session.id);if(previous)previous.text=session.text;
  textEditing=null;inlineText.close();
  if(render)refresh();else{snapshot();draw();persist();$('undo').disabled=!editor.can_undo();$('redo').disabled=!editor.can_redo();}
  $('hint').textContent='Double-click text or press Enter to edit · T to create text';
  if(focus)canvas.focus({preventScroll:true});
  return true;
}
function beginText(shape,{point=null,word=false}={}){
  if(shape&&(libraryForShape(doc,shape)||libraries?.locked([shape]))){toast('This text is protected. Edit it in the library source with maintainer access.');return false;}
  if(shape?.editor_meta?.text_path){renderToolInspector.focus();return false;}
  if(!shape||shape.kind!=='text'||lockedInTree(shape,pageShapes())||!visibleInTree(shape,pageShapes()))return false;
  if(!finishText())return false;
  setTool('select');setSelection([shape.id]);refresh(false);
  textEditing=textEditSession(editor,current());inlineText.open(current());
  draw();inlineText.focus(point,word);
  $('hint').textContent='Editing text · Enter for a new line · Escape or ⌘/Ctrl Enter to finish';
  return true;
}
function selectionShapes() { return pageShapes().filter(s => selectedIds.has(s.id)); }
function selectionJson() { return JSON.stringify([...selectedIds]); }
const pageViews = new Map();
let layerDragDestination=0;
const collapsedFrames=new Set();
function insertAt(shape,start){
 const scene=pageShapes().map(s=>({...s,...transformGeometry(s)})),parent_id=editorRole(shape)?0:frameAt(scene,start),parent=scene.find(s=>s.id===parent_id);
 const placed=gridCreationPlacement({...shape,parent_id,clip_content:shape.kind==='frame'&&editorRole(shape)!=='section'},parent,parent?.auto_layout?.direction==='grid'?gridPlan(parent):null,start);
 return editor.insert(JSON.stringify(placed));
}
function transformedSelection(){return descendants(pageShapes(),[...selectedIds]);}
function inheritedLock(s){return !!s.parent_id&&lockedInTree(pageShapes().find(p=>p.id===s.parent_id),pageShapes());}
function canvasEditable(){return selectionShapes().every(s=>!lockedInTree(s,pageShapes()));}
function toggleSelectionLock(){const targets=selectionShapes().filter(s=>!inheritedLock(s));if(!targets.length){toast('Unlock the parent frame first');return;}const locked=targets.some(s=>!s.locked);gesture=null;updateMany(targets.map(s=>({...s,locked})));}
function layerLockButton(shape){const b=document.createElement('button'),inherited=inheritedLock(shape),locked=lockedInTree(shape,pageShapes());b.className='layer-lock'+(locked?' locked':'');b.disabled=inherited;b.setAttribute('aria-label',inherited?'Locked by parent: '+shape.name:(shape.locked?'Unlock ':'Lock ')+shape.name);b.title=b.getAttribute('aria-label');b.innerHTML=`<svg class="app-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="3.5" y="7" width="9" height="7" rx="1.4"/><path d="${locked?'M5 7V4a3 3 0 0 1 6 0v3':'M5 7V4a3 3 0 0 1 6 0'}"/></svg>`;b.onclick=()=>{gesture=null;update({...shape,locked:!shape.locked});};return b;}
function groupSelection() { safe(()=>{const id=editor.group_many(selectionJson());snapshot();setSelection([id]);refresh();});}
function ungroupSelection() {safe(()=>{const ids=JSON.parse(editor.ungroup_many(selectionJson()));snapshot();setSelection(ids);refresh();});}
function pageShapes() { return doc?.shapes.filter(s => s.page_id === doc.active_page) || []; }
function activePage() { return doc?.pages.find(p => p.id === doc.active_page); }

function toast(message) { $('toast').textContent = message; $('toast').style.display = 'block'; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').style.display = 'none', 4000); }
function safe(action) { try { return action(); } catch (error) { toast(String(error)); } }
function transformGeometry(s){const measured=cssActive()?(cssGeometry.find(n=>n.id===s.id)??s):worldShape(s,pageShapes());return measured._rotationHit??measured;}
function current() { return selectedIds.size === 1 ? pageShapes().find(s => selectedIds.has(s.id)) : null; }
function snapshot() { doc = JSON.parse(editor.snapshot()); for(const font of usedFonts(doc.shapes))loadGoogleFont(font.font_family,font.font_weight).catch(()=>{}); setSelection([...selectedIds].filter(id => pageShapes().some(s => s.id === id)),{preservePrototypeLink:true}); }
function persist() {
  if(projectLoading)return;
  if (recoveryBlocked) { $('save-status').textContent = 'Recovery needed — save to a file'; return; }
  cloud?.changed();
  if (cloud?.session.active) return;
  try { saveLocalDraft(); $('save-status').textContent = 'Saved on this device'; }
  catch { $('save-status').textContent = 'Local storage unavailable — save to a file'; }
}
function saveLocalDraft(){
 if(recoveryBlocked)throw new Error('Saved data needs recovery. Download this design before switching files.');
 if(!cloud?.session.active){drafts.save(editor.snapshot());syncProjectAddress();}
}
function syncProjectAddress(){
 const project=cloud?.session.active?{kind:'cloud',id:cloud.session.active.id}:drafts?.activeId?{kind:'local',id:drafts.activeId}:null;
 if(project){const url=projectUrl({...project,workspace:new URLSearchParams(location.search).get('workspace')});if(location.pathname+location.search!==url)history.replaceState(null,'',url);}
}
async function goProjectHome(create=false){
 if(!finishText())return;
 if(leavingProject)return;leavingProject=true;
 try{await cloud?.beforeLocalOpen();saveLocalDraft();const query=new URLSearchParams();if(create)query.set('new','1');const workspace=new URLSearchParams(location.search).get('workspace');if(workspace)query.set('workspace',workspace);location.assign('/'+(query.size?'?'+query:''));}
 catch(error){leavingProject=false;toast(error.message??String(error));}
}
function loadDesign(body){
 closeVariables();if(libraries)libraries.loading(()=>editor.load(body));else editor.load(body);pasteContext.reset();lastPasted='';pasteCount=0;setSelection([]);gesture=null;penPoints=[];space=false;layerAnchor=0;collapsedFrames.clear();
 recoveryBlocked=false;pageViews.clear();doc=null;$('layer-search').value='';setTool('select');refresh(false);editor.clear_history();$('undo').disabled=true;$('redo').disabled=true;fit();
}
async function openLocalDesign(body,id=null){
 const validation=new Editor();let normalized;try{validation.load(JSON.stringify(migrateChromeDocument(JSON.parse(body))));normalized=validation.snapshot();}finally{validation.free();}
 await cloud?.beforeLocalOpen();
 // A corrupt legacy single-file backup stays untouched while a replacement is imported.
 if(recoveryBlocked)drafts.create(editor.snapshot());else saveLocalDraft();
 // Save successfully before replacing the canvas or detaching a cloud session.
 if(id)drafts.activate(id);else drafts.create(normalized);
 cloud?.localOpened();loadDesign(normalized);persist();
}
async function importDesignFile(file){const {body,report}=await readDesignFile(file);await openLocalDesign(body);toast(report?`Imported ${report.pages} Figma pages and ${report.layers} layers into Drafts`:'Editable project imported into Drafts');}
function refresh(save = true) {
  // A committed document change invalidates any snapshot used for live CSS preview.
  layoutCssPreview=null;
  gridPickerPreview=null;
  const previousPage = doc?.active_page;
  if (previousPage) pageViews.set(previousPage, { zoom, pan: { ...pan } });
  snapshot();
  if(doc.shapes.some(s=>s.component?.type!=='instance'&&!s.layout_item?.grid_container&&s.auto_layout?.direction==='grid'&&!s.auto_layout.grid?.cell_containers)){editor.enable_grid_containers();snapshot();}
  const withBaseText=ensureBaseTextDocument(doc);if(withBaseText){editor.load(JSON.stringify(withBaseText));snapshot();}
  const usedImages=new Set(doc.shapes.filter(s=>s.image).map(s=>s.image.data_url));for(const key of imageCache.keys())if(!usedImages.has(key))imageCache.delete(key);
  const changedPage = previousPage !== doc.active_page;
  if (changedPage) { setSelection([]); layerAnchor = 0; gesture = null; penPoints = []; }
  renderPages(); renderLayers(); renderAssetBrowser(); renderProperties();
  if (changedPage) {
    const view = pageViews.get(doc.active_page);
    if (view) { zoom = view.zoom; pan = { ...view.pan }; } else fit();
  }
  draw();
  $('undo').disabled = !editor.can_undo(); $('redo').disabled = !editor.can_redo();
  $('document-name').value = doc.name; $('canvas-label').textContent = `${doc.name} / ${activePage().name}`;
  if (save) persist();
}
function update(shape) { safe(() => { editor.update(JSON.stringify(reconcilePaints(shape,doc.shapes.find(s=>s.id===shape.id)))); refresh(); }); }
function updateMany(shapes) { safe(() => { editor.update_many(JSON.stringify(shapes.map(s=>reconcilePaints(s,doc.shapes.find(old=>old.id===s.id))))); refresh(); }); }
function frameSelection(){safe(()=>{if(!selectedIds.size)return;setSelection([editor.frame_selection(selectionJson())]);refresh();toast('Selection framed');});}
function createComponentSelection(){safe(()=>{if(!selectedIds.size)return;setSelection([editor.create_component_selection(selectionJson())]);refresh();toast('Component created');});}
function combineVariantSelection(){safe(()=>{setSelection([editor.combine_variants(selectionJson())]);refresh();toast('Component set created');});}
function addVariantSelection(){safe(()=>{setSelection([editor.add_variant(selected)]);refresh();fit();toast('Variant added');});}
function arrangeSelection(direction){safe(()=>{if(!selectedIds.size)return;editor.arrange_many(selectionJson(),direction);refresh();});}
function removeAutoLayout(){const shapes=selectionShapes().filter(s=>s.auto_layout);if(shapes.length)updateMany(shapes.map(s=>({...s,auto_layout:null})));}
function toggleSelectionVisibility(){const shapes=selectionShapes();if(!shapes.length)return;const hidden=shapes.some(s=>!s.hidden);gesture=null;updateMany(shapes.map(s=>({...s,hidden})));}
function revealSelectedArea(){
 const frame=current(),area=frame?.auto_layout?.grid?.areas?.find(a=>a.name===activeGridArea);if(!area||frame.id!==editingGridAreas)return;
 const measured=transformGeometry(frame),next=areaVisiblePan(measured,gridPlan(measured),area,pan,zoom,{left:24,right:Math.max(25,canvas.clientWidth-24),top:Math.min(64,canvas.clientHeight/4),bottom:Math.max(65,canvas.clientHeight-96)});
 if(next.x!==pan.x||next.y!==pan.y){pan=next;pageViews.set(doc.active_page,{zoom,pan:{...pan}});draw();}
}
function renameCanvasArea(){
  const frame=current(),area=frame?.auto_layout?.grid?.areas?.find(a=>a.name===activeGridArea);
  if(!area||frame.id!==editingGridAreas||gesture||!canvasEditable())return;
  tooltips?.hideFor($('grid-area-status'));
  const measured=transformGeometry(frame),box=areaBox(measured,gridPlan(measured),area);if(!box)return;
  const p=worldPoint(measured,{x:box.x,y:box.y}),rect=canvas.getBoundingClientRect(),input=document.createElement('input');
  input.type='text';input.value=area.name;input.required=true;input.pattern='[A-Za-z][A-Za-z0-9_-]*';input.setAttribute('aria-label','Rename named area');input.title='Enter to save · Escape to cancel';
  const width=Math.min(240,rect.width-16);
  Object.assign(input.style,{position:'fixed',zIndex:'1000',width:width+'px',left:Math.max(rect.left+8,Math.min(rect.right-width-8,rect.left+pan.x+p.x*zoom+8))+'px',top:Math.max(rect.top+8,Math.min(rect.bottom-40,rect.top+pan.y+p.y*zoom+8))+'px'});
  document.body.append(input);let finished=false;
  const close=(focus)=>{if(finished)return;finished=true;input.remove();if(focus)canvas.focus();};
  input.onkeydown=event=>{event.stopPropagation();if(event.isComposing)return;
    if(event.key==='Escape'){event.preventDefault();close(true);}
    if(event.key==='Enter'){event.preventDefault();input.setCustomValidity('');if(!input.reportValidity())return;
      try{editor.rename_grid_area(frame.id,area.name,input.value);activeGridArea=input.value;close(true);refresh();}catch(error){input.setCustomValidity(String(error));input.reportValidity();}
    }
  };
  input.oninput=()=>input.setCustomValidity('');input.onblur=()=>close(false);input.focus();input.select();
}
function renameSelection(){if(!current())return;$('shape-name').focus();$('shape-name').select();$('shape-name').scrollIntoView({block:'nearest'});}
function selectionActions(){
  const shapes=selectionShapes(),shape=current(),context=instanceContext(doc,shape);
  const available={'create-component':!shape?.component||(shape.component.type==='instance'&&shape.component.master===shape.component.source),'add-auto-layout':!shape?.auto_layout,'group-layers':shapes.length>0,'ungroup-layers':shapes.some(s=>['group','frame'].includes(s.kind)&&!s.component),'insert-instance':shape?.component?.type==='master','go-main':shape?.component?.type==='instance','reset-instance':shape?.component?.type==='instance','detach-instance':shape?.component?.type==='instance','forward':!!shape,'backward':!!shape};
  const button=(id,label,shortcut)=>({label,shortcut,enabled:!!available[id],run:()=>$(id).click()});
  return [
    {label:'Edit text',shortcut:'Enter',visible:shape?.kind==='text',enabled:canvasEditable(),run:()=>beginText(current())},
    button('create-component','Create component','Ctrl/⌘ Alt K'),
    {label:'Combine as variants',visible:canCombineVariants(doc,shapes),run:combineVariantSelection},
    {label:'Add variant',visible:shape?.component?.type==='master'||!!componentSetFrame(doc,shape?.id),run:addVariantSelection},
    {label:'Frame selection',shortcut:'Ctrl/⌘ Alt G',run:frameSelection},
    button('add-auto-layout','Add Flex Layout','Shift A'),
    {label:'Remove layout',visible:!!shape?.auto_layout,run:()=>update({...shape,auto_layout:null})},
    button('group-layers','Group selection','Ctrl/⌘ G'),
    {...button('ungroup-layers','Ungroup selection','Ctrl/⌘ Shift G'),visible:shapes.some(s=>['group','frame'].includes(s.kind)&&!s.component)},
    {...button('insert-instance','Insert instance'),visible:shape?.component?.type==='master'},
    ...['go-main','reset-instance','detach-instance'].map((id,i)=>({...button(id,context&&!context.isRoot?['Go to outer main component','Reset outer instance overrides','Detach outer instance'][i]:['Go to main component','Reset instance overrides','Detach instance'][i]),visible:shape?.component?.type==='instance'})),
    {label:'Go to nested main component',visible:!!context?.nestedMain,run:()=>goToMain(context.nestedMain.id)},
    {label:'Select outer instance',visible:!!context&&!context.isRoot,run:()=>{setSelection([context.root.id]);refresh(false);}},
    {label:'Rename layer',shortcut:'Ctrl/⌘ R',enabled:!!shape,run:renameSelection},
    {label:shapes.every(s=>s.hidden)?'Show selection':'Hide selection',shortcut:'Ctrl/⌘ Shift H',run:toggleSelectionVisibility},
    {label:shapes.every(s=>s.locked)?'Unlock selection':'Lock selection',shortcut:'Ctrl/⌘ Shift L',enabled:shapes.some(s=>!inheritedLock(s)),run:toggleSelectionLock},
    {label:'Bring to front',shortcut:']',run:()=>arrangeSelection('front')},{label:'Send to back',shortcut:'[',run:()=>arrangeSelection('back')},{label:'Bring forward',shortcut:'Ctrl/⌘ ]',run:()=>arrangeSelection('forward')},{label:'Send backward',shortcut:'Ctrl/⌘ [',run:()=>arrangeSelection('backward')},
    {label:'Duplicate',shortcut:'Ctrl/⌘ D',run:duplicateSelection},
    {label:'Delete',shortcut:'Delete',run:deleteSelection}
  ];
}
function showSelectionMenu(event,id){event.preventDefault();if(id&&!selectedIds.has(id)){setSelection([id]);refresh(false);}if(!selectedIds.size)return;showContextMenu(event,selectionActions(),canvas);}

function duplicateSelection() { if(selectedIds.size===1&&current()?.component?.type==='master'&&componentSet(doc,selected)){addVariantSelection();return;}safe(() => { if (selectedIds.size) { setSelection(JSON.parse(editor.duplicate_many(selectionJson()))); refresh(); } }); }
function deleteSelection() { safe(() => { if (selectedIds.size) { editor.remove_many(selectionJson()); gesture=null; refresh(); } }); }
function switchPage(id) { safe(() => { editor.select_page(id); refresh(); }); }
function focusPage(id) {
  const item=$('page-switch-options').querySelector('[data-page-id="'+id+'"]');
  if(!item)return;
  item.focus({preventScroll:true});
  const menu=$('page-switch-menu'),bounds=menu.getBoundingClientRect(),row=item.getBoundingClientRect();
  const inset=$('page-search-header').getBoundingClientRect().height;
  const top=bounds.top+menu.clientTop+inset,bottom=bounds.top+menu.clientTop+menu.clientHeight;
  if(row.top<top)menu.scrollTop-=top-row.top;
  else if(row.bottom>bottom)menu.scrollTop+=row.bottom-bottom;
}
function renamePageInline(item, page) {
  const row=document.createElement('div');row.className='page-inline-rename';
  const input=document.createElement('input');input.type='text';input.value=page.name;input.maxLength=256;input.setAttribute('aria-label','Page name');
  row.append(input);item.replaceWith(row);
  let finished=false;
  const finish=(save,focus=false)=>{
    if(finished)return;finished=true;
    const name=input.value.trim();
    if(save&&name&&name!==page.name)safe(()=>{editor.rename_page(page.id,name);refresh();});
    if(row.isConnected)row.replaceWith(item);
    if(focus)focusPage(page.id);
  };
  input.onkeydown=event=>{
    event.stopPropagation();
    if(event.key==='Enter'||event.key==='Escape'){event.preventDefault();finish(event.key==='Enter',true);}
  };
  input.onblur=()=>finish(true);
  input.focus();input.select();
}
function renderPages() {
  $('layers-page-name').textContent=activePage().name;
  $('layers-page').title=activePage().name;
  $('layers-page').setAttribute('aria-label','Current page: '+activePage().name);
  $('page-switch-options').replaceChildren(...doc.pages.filter(page=>!(doc.libraries??[]).some(l=>l.page_id===page.id)).map(page=>{
    const item=document.createElement('button');item.type='button';item.draggable=true;item.dataset.pageId=page.id;item.setAttribute('data-tooltip-overflow','');item.setAttribute('role','menuitemradio');item.setAttribute('aria-checked',String(page.id===doc.active_page));
    const name=document.createElement('span');name.textContent=page.name;const check=document.createElement('span');check.className='page-option-check';check.setAttribute('aria-hidden','true');check.innerHTML=page.id===doc.active_page?'<svg class="app-icon" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="m3 8 3 3 7-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>':'';
    item.append(name,check);
    let clickTimer=null;
    const select=()=>{if(!item.isConnected||!$('layers-page-control').open)return;$('layers-page-control').open=false;switchPage(page.id);$('layers-page').focus();};
    item.onclick=event=>{clearTimeout(clickTimer);if(event.detail===0)select();else if(event.detail===1)clickTimer=setTimeout(select,350);};
    item.ondblclick=event=>{event.preventDefault();clearTimeout(clickTimer);renamePageInline(item,page);};
    item.setAttribute('aria-keyshortcuts','F2 Delete Meta+D Control+D Alt+ArrowUp Alt+ArrowDown Alt+Shift+ArrowUp Alt+Shift+ArrowDown');
    item.onkeydown=event=>{
      if((event.key==='Enter'||event.key===' ')&&!event.isComposing&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey){
        event.preventDefault();event.stopPropagation();clearTimeout(clickTimer);
        if(!event.repeat)select();
        return;
      }
      if(event.altKey&&!event.ctrlKey&&!event.metaKey&&['ArrowUp','ArrowDown'].includes(event.key)){
        event.preventDefault();event.stopPropagation();clearTimeout(clickTimer);
        const down=event.key==='ArrowDown',index=doc.pages.findIndex(p=>p.id===page.id);
        const neighbor=doc.pages[event.shiftKey?(down?doc.pages.length-1:0):index+(down?1:-1)];
        if(neighbor&&neighbor.id!==page.id)safe(()=>{
          editor.reorder_page(page.id,neighbor.id,down);refresh();
          focusPage(page.id);
        });
        return;
      }
      if(event.key.toLowerCase()==='d'&&(event.metaKey||event.ctrlKey)&&!event.altKey&&!event.shiftKey){
        event.preventDefault();event.stopPropagation();clearTimeout(clickTimer);
        if(event.repeat)return;
        if(doc.pages.length>=100){toast('Page limit reached');return;}
        safe(()=>{
          const copy=editor.duplicate_page(page.id);refresh();setTool('select');
          focusPage(copy);
          toast('Page duplicated');
        });
        return;
      }
      if(!['F2','Delete'].includes(event.key)||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey)return;
      event.preventDefault();event.stopPropagation();clearTimeout(clickTimer);
      if(event.repeat)return;
      if(event.key==='F2'){renamePageInline(item,page);return;}
      if(doc.pages.length<=1){toast('Keep at least one page in your document');return;}
      safe(()=>{
        const index=doc.pages.findIndex(p=>p.id===page.id);
        const next=doc.pages[index+1]??doc.pages[index-1];
        editor.delete_page(page.id);refresh();
        focusPage(next.id);
        toast('Page deleted. Use Undo to restore it.');
      });
    };
    item.oncontextmenu=event=>{
      event.stopPropagation();clearTimeout(clickTimer);
      const index=doc.pages.findIndex(p=>p.id===page.id),alt=/Mac|iPhone|iPad/.test(navigator.platform)?'⌥':'Alt';
      const move=(down,toEnd=false)=>safe(()=>{
        const currentIndex=doc.pages.findIndex(p=>p.id===page.id),neighbor=doc.pages[toEnd?(down?doc.pages.length-1:0):currentIndex+(down?1:-1)];
        if(!neighbor)return;
        editor.reorder_page(page.id,neighbor.id,down);refresh();
        focusPage(page.id);
      });
      showContextMenu(event,[
        {label:'Rename',shortcut:'F2',run:()=>renamePageInline(item,page)},
        {label:'Duplicate',shortcut:/Mac|iPhone|iPad/.test(navigator.platform)?'⌘ D':'Ctrl D',enabled:doc.pages.length<100,unavailable:'Page limit reached',run:()=>safe(()=>{editor.duplicate_page(page.id);refresh();setTool('select');toast('Page duplicated');})},
        {label:'Move up',shortcut:alt+' ↑',enabled:index>0,unavailable:'Already the first page',run:()=>move(false)},
        {label:'Move down',shortcut:alt+' ↓',enabled:index<doc.pages.length-1,unavailable:'Already the last page',run:()=>move(true)},
        {label:'Move to top',shortcut:alt+' Shift ↑',enabled:index>0,unavailable:'Already the first page',run:()=>move(false,true)},
        {label:'Move to bottom',shortcut:alt+' Shift ↓',enabled:index<doc.pages.length-1,unavailable:'Already the last page',run:()=>move(true,true)},
        {label:'Delete',shortcut:'Delete',enabled:doc.pages.length>1,unavailable:'Keep at least one page',run:()=>safe(()=>{editor.delete_page(page.id);refresh();$('layers-page').focus();toast('Page deleted. Use Undo to restore it.');})},
      ],item,{label:'Page actions',heading:page.name,container:$('layers-page-control')});
    };
    item.addEventListener('dragstart',()=>clearTimeout(clickTimer));
    return item;
  }));
  $('page-picker').replaceChildren(...doc.pages.map(page => {
    const option = document.createElement('option'); option.value = page.id; option.textContent = page.name; return option;
  }));
  $('page-picker').value = doc.active_page;
  for (const id of ['delete-page', 'mobile-delete-page']) $(id).disabled = doc.pages.length <= 1;
  for (const id of ['add-page', 'mobile-add-page', 'duplicate-page']) $(id).disabled = doc.pages.length >= 100;
  $('page-switch-options').dispatchEvent(new Event('pages-rendered'));
}
function renderLayers() {
  const query = $('layer-search').value.trim().toLocaleLowerCase();
  const listed = pageShapes().reverse().filter(s => s.name.toLocaleLowerCase().includes(query));
  const selectFromRow=(row,button)=>{
    row.onclick=event=>{
      if(event.target.closest('button,input,select,textarea,a,[contenteditable]'))return;
      event.stopPropagation();
      button.onclick(event);
    };
  };
  const layerButton = shape => {
    const button = document.createElement('button');
    button.dataset.layerId=shape.id;
    const componentType=componentLabelType(shape,doc.component_sets);
    if(componentType)button.dataset.componentType=componentType;
    button.className = 'layer' + (selectedIds.has(shape.id) ? ' active' : '');
    button.setAttribute('aria-pressed', String(selectedIds.has(shape.id)));
    const direction=shape.auto_layout?.direction,layoutIcon=['horizontal','vertical','grid'].includes(direction);
    const glyph = document.createElement('span'); glyph.className = 'glyph'; glyph.innerHTML = icon(editorRole(shape)|| (shape.editor_meta?.text_path?'text-path':layoutIcon?'layout-'+direction:shape.kind));
    if(layoutIcon){glyph.title=direction==='grid'?'Grid Layout':direction==='horizontal'?'Flex Layout · Horizontal':'Flex Layout · Vertical';glyph.dataset.layout=direction;}
    if(componentType){glyph.innerHTML=icon(componentType==='set'?'component':'instance');glyph.classList.add('component-glyph');glyph.title=[glyph.title,componentType==='set'?'Component set':componentType==='master'?'Main component':'Component instance'].filter(Boolean).join(' · ');}
    const name = document.createElement('span'); name.className = 'layer-name'; name.textContent = shape.name;
    button.append(glyph, name);
    button.classList.toggle('is-hidden',!!shape.hidden);
    button.onclick = event => {
      if (event.shiftKey) setSelection(layerRange(listed, layerAnchor, shape.id));
      else if (event.ctrlKey || event.metaKey) { const ids = new Set(selectedIds); ids.has(shape.id) ? ids.delete(shape.id) : ids.add(shape.id); setSelection([...ids]); layerAnchor = shape.id; }
      else { setSelection([shape.id]); layerAnchor = shape.id; }
      for(const row of $('layers').querySelectorAll('.layer[data-layer-id]')){const active=selectedIds.has(Number(row.dataset.layerId));row.classList.toggle('active',active);row.setAttribute('aria-pressed',String(active));}
      renderProperties();draw();
    };
    button.ondblclick=()=>{const input=document.createElement('input');input.value=shape.name;input.setAttribute('aria-label','Layer name');button.replaceWith(input);input.focus();input.select();let done=false;const finish=commit=>{if(done)return;done=true;if(commit&&input.value.trim())update({...doc.shapes.find(s=>s.id===shape.id),name:input.value.trim()});else renderLayers();};input.onblur=()=>finish(true);input.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();finish(true);}if(e.key==='Escape'){e.preventDefault();finish(false);}};};
    button.oncontextmenu=event=>showSelectionMenu(event,shape.id);
    const visibility=document.createElement('button');visibility.className='layer-visibility';
    visibility.setAttribute('aria-label',(shape.hidden?'Show ':'Hide ')+shape.name);
    visibility.setAttribute('aria-pressed',String(!shape.hidden));visibility.title=visibility.getAttribute('aria-label');
    visibility.innerHTML=icon(shape.hidden?'eye-off':'eye');
    visibility.onclick=()=>{gesture=null;update({...shape,hidden:!shape.hidden});};
    const actions=document.createElement('div');actions.className='layer-actions';actions.append(layerLockButton(shape),visibility);
    const row=document.createElement('div');row.className='layer-entry';row.append(button,actions);selectFromRow(row,button);return row;
  };
  const draggableRow=(row,shape)=>{row.draggable=true;row.dataset.layerDrop=shape.id;row.dataset.frame=String(['frame','group'].includes(shape.kind));return row;};
  const buildRows=(parent,depth=0)=>listed.filter(s=>query||s.parent_id===parent).map(shape=>{
    if(!['frame','group'].includes(shape.kind)||query||!listed.some(child=>child.parent_id===shape.id)){const row=layerButton(shape);row.style.setProperty('--layer-depth',depth);return draggableRow(row,shape);}
    const wrap=document.createElement('div'),row=document.createElement('div');row.className='group-row';
    draggableRow(row,shape);
    row.style.setProperty('--layer-depth',depth);
    row.addEventListener('layer-drag-expand',()=>{
      if(!collapsedFrames.has(shape.id))return;
      collapsedFrames.delete(shape.id);toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label','Collapse '+shape.name);
      const children=document.createElement('div');children.className='group-children';children.append(...buildRows(shape.id,depth+1));wrap.append(children);
      toggle.onclick=()=>{collapsedFrames.add(shape.id);renderLayers();};
    });
    row.addEventListener('layer-drag-collapse',()=>{
      collapsedFrames.add(shape.id);toggle.setAttribute('aria-expanded','false');toggle.setAttribute('aria-label','Expand '+shape.name);
      wrap.querySelector(':scope > .group-children')?.remove();
      toggle.onclick=()=>{collapsedFrames.delete(shape.id);renderLayers();};
    });
    const toggle=document.createElement('button'),open=!collapsedFrames.has(shape.id);
    toggle.className='layer-disclosure';toggle.type='button';toggle.setAttribute('aria-label',(open?'Collapse ':'Expand ')+shape.name);toggle.setAttribute('aria-expanded',String(open));
    toggle.onclick=()=>{open?collapsedFrames.add(shape.id):collapsedFrames.delete(shape.id);renderLayers();};
    const entry=layerButton(shape);row.append(toggle,entry);selectFromRow(row,entry.querySelector('.layer'));wrap.append(row);
    if(open){const children=document.createElement('div');children.className='group-children';children.append(...buildRows(shape.id,depth+1));wrap.append(children);}return wrap;
  });
  const tree=document.createElement('div');tree.className='layer-tree';tree.append(...buildRows(0));
  $('layers').replaceChildren(tree);
  if (!pageShapes().length) { const hint = document.createElement('p'); hint.className = 'empty-layers'; hint.textContent = 'A fresh page. Pick a tool below and click the canvas to start.'; $('layers').append(hint); }
  else if (!listed.length) { const hint = document.createElement('p'); hint.className = 'empty-layers'; hint.textContent = 'No matching layers'; $('layers').append(hint); }
}
function insertInstance(masterId){safe(()=>{const master=doc.shapes.find(s=>s.id===masterId);if(!master)return;const same=master.page_id===doc.active_page;const x=same?master.x+master.width+40:(canvas.clientWidth/2-pan.x)/zoom;const y=same?master.y:(canvas.clientHeight/2-pan.y)/zoom;const id=editor.create_instance(masterId,x,y);setSelection([id]);refresh();fit();toast('Linked instance inserted');});}
function showLeftPanel(name){
  for(const [key,id] of [['layers','file-panel'],['assets','assets-panel']]){
    $(id).hidden=key!==name;const nav=$('nav-'+key);nav.classList.toggle('active',key===name);nav.setAttribute('aria-pressed',String(key===name));
  }
  document.querySelector('.left-panel').classList.add('mobile-open');
  document.querySelector('.left-panel').classList.toggle('showing-assets',name==='assets');
}
function showFilePanel(){showLeftPanel('layers');}
let assetsWindow,libraries;
function showAssets(){
 $('assets-panel').querySelector('.assets-browser-toolbar').after($('assets-panel').querySelector('.assets-collection-heading'));
 assetsWindow??={close:()=>showFilePanel()};showLeftPanel('assets');renderAssetBrowser();$('asset-search').focus();
}

function goToMain(id){if(libraries?.source(id))return;safe(()=>{const main=doc.shapes.find(s=>s.id===id);if(!main)return;editor.select_page(main.page_id);refresh();setSelection([id]);refresh(false);showFilePanel();fit(true);});}
function renderAssetBrowser(){
  if($('assets-panel').hidden)return;
  const page=$('asset-page').value;
  $('asset-page').replaceChildren(...[{id:'',name:'All pages'},...doc.pages.filter(page=>!(doc.libraries??[]).some(l=>l.page_id===page.id))].map(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=p.name;return o;}));
  $('asset-page').value=doc.pages.some(p=>String(p.id)===page)?page:'';
  const selectedLibrary=$('asset-library').value;
  const links=(doc.libraries??[]).filter(l=>l.enabled!==false);
  $('asset-library').replaceChildren(...[{id:'',name:'All libraries'},{id:'local',name:'Local components'},...links].map(l=>{const option=document.createElement('option');option.value=l.id;option.textContent=l.name;return option;}));
  $('asset-library').value=selectedLibrary==='local'||links.some(l=>l.id===selectedLibrary)?selectedLibrary:'';
  const library=$('asset-library').value;
  const allowed=doc.shapes.filter(s=>{const link=libraryForMaster(doc,s.id);return library==='local'?!link:library?link?.id===library:!link||link.enabled!==false;});
  const assets=componentAssets({...doc,shapes:allowed},$('asset-search').value,$('asset-page').value);
  $('asset-collection-name').textContent=$('asset-library').selectedOptions[0].textContent;
  let starters=$('control-starters');
  if(!starters){
   starters=document.createElement('details');starters.id='control-starters';starters.className='assets-starters';
   const heading=document.createElement('summary');heading.textContent='Control starters';
   const description=document.createElement('p');description.textContent='Start with an editable main component. Style it here; linked instances update automatically.';
   const type=document.createElement('select');type.setAttribute('aria-label','Starter control type');
   for(const kind of controlTypes){const option=document.createElement('option');option.value=kind;option.textContent=kind==='segmented'?'Segmented control':kind==='password'?'Password field':kind==='number'?'Number input':kind==='file'?'File upload':kind==='date'?'Date picker':kind==='textarea'?'Text area':kind==='select'?'Dropdown':kind==='button'?'Button':kind==='switch'?'Switch':kind==='checkbox'?'Checkbox':kind==='radio'?'Radio':'Input · '+kind;type.append(option);}type.value='text';
   const add=document.createElement('button');add.textContent='Insert starter';add.className='primary';add.onclick=()=>safe(()=>{
    const kind=type.value,label=kind==='button'?'Button':kind==='switch'?'Switch':kind==='checkbox'?'Checkbox':kind==='radio'?'Radio':'Label',field=supportsReadonly(kind)||['select','file'].includes(kind),small=['checkbox','switch','radio'].includes(kind);
    const width=kind==='segmented'?360:['checkbox','switch','radio'].includes(kind)?180:small?24:kind==='button'?120:280,height=small?24:field?112:44;
    const control={...newControl(kind,label),starter:true,placeholder:kind==='select'?'Select an option':field?'Enter text':'',helper_message:field?'Helper message':'',validation_message:field?'Please check this value.':''};
    const base=ensureInputBase(doc.variables,kind);
    if(base)control.base_collection=base.collection.id;
    const starter=JSON.stringify({id:0,variable_bindings:base?.bindings??{},text:'',hidden:false,kind:'frame',name:type.selectedOptions[0].textContent+' starter',x:(canvas.clientWidth/2-pan.x)/zoom-width/2,y:(canvas.clientHeight/2-pan.y)/zoom-height/2,width,height,fill:'#ffffff',control,typography:{font_family:'Manrope',font_size:14,font_weight:400,line_height:1.4,align:'left',vertical_align:'center',wrap:false,sizing:'fixed'}});
    const id=base?editor.insert_control_starter(starter,JSON.stringify(base.variables)):editor.insert(starter);
    assetsWindow?.close();setSelection([id]);refresh();showFilePanel();
   });
   const intro=document.createElement('div');intro.className='assets-starter-intro';intro.append(description);const actions=document.createElement('div');actions.className='assets-starter-actions';actions.append(type,add);starters.append(heading,intro,actions);$('assets-panel').append(starters);
  }
  $('asset-results').textContent=assets.length+' '+(assets.length===1?'component':'components');
  renderAssets($('asset-cards'),assets,{page:$('asset-page').value,insert:id=>{assetsWindow?.close();insertInstance(id);},goMain:id=>{assetsWindow?.close();goToMain(id);},dragStart:startAssetDrag,dragEnd:clearAssetDrag,preview:id=>assetAppearance(doc,id,textLayout),library:id=>libraryForMaster(doc,id)});
}
function renderComponentProperties(shape){
  const c=shape?.component,linked=c?.type==='instance',master=c?.type==='master',context=instanceContext(doc,shape),setFrame=componentSetFrame(doc,shape?.id);
  $('go-nested-main').hidden=!context?.nestedMain;$('select-instance-root').hidden=!linked||context.isRoot;
  $('swap-component').disabled=!!linked&&!context.isRoot;
  $('swap-component-help').textContent=linked&&!context.isRoot?'Select the outer instance to swap the whole component. Independent nested-instance swapping is not available yet.':'Overrides carry over on matching layer names and hierarchy.';
  $('go-main').textContent=context?.nestedMain?'Go to outer main component':'Go to main component';
  $('detach-instance').textContent=linked&&!context.isRoot?'Detach outer instance':'Detach instance';
  $('reset-instance').textContent=linked&&!context.isRoot?'Reset outer instance overrides':'Reset all overrides';
  $('push-style-overrides').hidden=!linked;
  const pushFields=['name','text','fill','appearance','typography','hidden','locked','image','stroke_width','layout_grids','guide_style','effect_style'];
  $('push-style-overrides').disabled=!linked||!descendants(doc.shapes,[context.root.id]).some(s=>(s.component?.overrides??[]).some(p=>pushFields.includes(p.split('.')[0])));
  $('push-style-overrides').textContent=linked&&!context.isRoot?'Push outer text and styles to main':'Push text and styles to main';
  $('add-component-property').hidden=!master;
  renderExposedProperties($('exposed-properties'),doc,shape,{
    change:(property,value)=>safe(()=>{editor.set_component_property(selected,property,JSON.stringify(value));refresh();}),
    reset:property=>safe(()=>{editor.reset_component_property(selected,property);refresh();}),
    edit:property=>editComponentProperty(doc,shape.id,property,p=>{editor.save_component_property(JSON.stringify(p));refresh();}),
    remove:property=>safe(()=>{editor.remove_component_property(property);refresh();})
  });
  $('component-panel').hidden=!selectedIds.size;
  $('instance-actions').hidden=!linked&&!master&&!setFrame;
  $('instance-actions').setAttribute('aria-label',linked?'Instance actions':'Component actions');
  $('instance-actions').title=linked?'Instance actions':'Component actions';
  $('component-heading').textContent=setFrame?.name??componentSet(doc,master?shape.id:c?.master)?.name??(master?shape.name:linked?'Instance':'Component');
  $('component-panel').dataset.componentKind=setFrame?'set':master?'master':linked?'instance':'';
  $('combine-variants').hidden=!canCombineVariants(doc,selectionShapes());
  $('create-component').hidden=!!setFrame||master||(linked&&c.master!==c.source);$('create-component').textContent=linked?'Create component around instance':'Create component';$('insert-instance').hidden=!master&&!setFrame;
  const variantSet=componentSet(doc,master?shape.id:c?.master);
  $('manage-variants').hidden=!variantSet&&!setFrame;$('manage-variants').textContent='Select component set';$('manage-variants').disabled=!(variantSet??setFrame)?.frame_id;$('add-variant').hidden=!master&&!setFrame;
  renderVariantAuthoring($('variant-authoring'),doc,shape,{save:set=>{editor.save_component_set(JSON.stringify(set));refresh();},selectSet:set=>{setSelection([set.frame_id]);refresh(false);}});
  renderVariantProperties($('variant-properties'),doc,linked&&context.isRoot?c.master:0,(property,value)=>safe(()=>{setSelection([editor.set_variant_property(selected,property,value)]);refresh();}));
  for(const id of ['go-main','reset-instance','detach-instance'])$(id).hidden=!linked;
  $('instance-controls').hidden=!linked;
  const displayedOverrides=s=>[...new Set((s.component?.overrides??[]).map(p=>p==='additional_interactions'?'prototype':p))];
  if(linked){
    $('swap-component').replaceChildren(...doc.shapes.filter(s=>s.component?.type==='master').sort((a,b)=>a.name.localeCompare(b.name)).map(s=>{const o=document.createElement('option');o.value=s.id;o.textContent=`${s.name} · ${doc.pages.find(p=>p.id===s.page_id)?.name}`;return o;}));
    $('swap-component').value=c.master;
    const paths=displayedOverrides(shape).filter(p=>c.master!==c.source||(p!=='x'&&p!=='y'));
    $('override-count').textContent=paths.length;
    const labels={stroke_alignment:'Stroke position',stroke_start:'Start tip',stroke_end:'End tip',stroke_gradient:'Stroke gradient',layer_blur:'Layer blur',shadows:'Shadows',prototype:'Prototype interactions',typography:'Text',appearance:'Appearance',constraints:'Constraints',layout_item:'Layout sizing',auto_layout:'Layout',font_size:'Font size',font_family:'Font family',font_weight:'Font weight',align:'Alignment',line_height:'Line spacing',corner_radius:'Corner radius',corner_radii:'Independent corners',stroke_color:'Stroke color',stroke_dash:'Dash pattern',stroke_dash_offset:'Dash offset',stroke_cap:'Line cap',stroke_join:'Line join',stroke_miter_limit:'Miter limit',fill_opacity:'Fill opacity',stroke_opacity:'Stroke opacity',fill_enabled:'Fill enabled',stroke_enabled:'Stroke enabled',fill_width:'Fill width',fill_height:'Fill height',absolute:'Ignore layout'};
    const rows=paths.map(path=>{const row=document.createElement('div');row.className='override-row';const label=document.createElement('span');label.textContent=path.split('.').map(p=>labels[p]??p.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase())).join(' · ');const b=document.createElement('button');b.textContent='Reset';b.setAttribute('aria-label','Reset '+label.textContent+' override');b.onclick=()=>safe(()=>{editor.reset_override(shape.id,path);refresh();});row.append(label,b);return row;});
    if(!rows.length){const p=document.createElement('p');p.textContent='This layer inherits its component properties.';rows.push(p);}
    $('override-list').replaceChildren(...rows);
  }
  let root=shape;
  while(root?.component?.type==='instance'&&root.component.master!==root.component.source)root=doc.shapes.find(s=>s.id===root.parent_id);
  const count=linked?descendants(doc.shapes,[root.id]).reduce((n,s)=>n+(displayedOverrides(s).filter(f=>s.id!==root.id||(f!=='x'&&f!=='y')).length),0):0;
  $('reset-instance').disabled=!count;
  $('component-status').textContent=master?'Edits update linked instances across all pages.':linked?`${doc.shapes.find(s=>s.id===c.master)?.name??'Component'} · Updates automatically${count?' · '+count+' overrides':''}.`:'Create a reusable component from the selected layers. Ctrl/⌘ Alt K.';
  if(setFrame)$('component-status').textContent=setFrame.variants.length+' variants';
  if(master&&variantSet){const v=variantSet.variants.find(v=>v.component_id===shape.id);$('component-status').textContent=variantSet.name+' · '+variantSet.properties.map((p,i)=>p+': '+v.values[i]).join(', ')+'. Edits update linked instances.';}
}
const libraryDisabled=new Map();
function renderLibraryProtection(){
 const shapes=selectionShapes(),link=shapes.map(s=>libraryForShape(doc,s)).find(Boolean);
 const sourceLocked=libraries?.locked(shapes)??false;
 if(link){$('swap-component-help').textContent='This library protects component choices and instance properties. Use the source project to make changes.';$('component-status').textContent=link.name+' · Release '+link.revision+' · Updates are accepted in Manage libraries.';}
 let notice=$('library-selection-notice');if(!notice){notice=document.createElement('div');notice.id='library-selection-notice';notice.className='library-selection-notice';$('design-inspector').prepend(notice);}
 notice.hidden=!link&&!sourceLocked;notice.replaceChildren();
 if(!notice.hidden){notice.append(document.createTextNode(link?link.name+' · Protected library instance. Move or duplicate it; edit its properties in the source project.':'Protected design system · You can edit only components assigned to you.'));if(link){const button=document.createElement('button');button.textContent='Open source';button.onclick=()=>libraries.source(shapes.find(s=>libraryForShape(doc,s)).component?.master??shapes[0].id);notice.append(button);}}
 if(!link&&!sourceLocked)return;
 const movable=shapes.length===1&&shapes[0].component?.master===shapes[0].component?.source;
 for(const field of $('design-inspector').querySelectorAll('input,select,textarea,button')){if(field.closest('#library-selection-notice')||field.matches('.inspector-accordion-toggle,.inspector-section-toggle')||['go-main','select-instance-root','go-nested-main','export-artwork','edit-component-css'].includes(field.id)||field.getAttribute('aria-label')==='Copy CSS class'||(link&&movable&&['x','y','duplicate','delete'].includes(field.id)))continue;libraryDisabled.set(field,field.disabled);field.disabled=true;}
}
const renderProperties=inspectorRenderer(()=>{for(const [field,disabled]of libraryDisabled)field.disabled=disabled;libraryDisabled.clear();renderPropertiesNow();renderLibraryProtection();syncInspectorDropdowns();scheduleViewportDraw();},()=>document.querySelector('.right-panel'),()=>[...selectedIds].join(','));
function renderPropertiesNow() {
  if(!renderLayerCssInspector)renderLayerCssInspector=installLayerCssInspector($('design-inspector'),{current,shapes:()=>doc.shapes,change:shape=>{editor.update(JSON.stringify(shape));refresh();},changeMany:shapes=>{editor.update_across_pages(JSON.stringify(shapes));refresh();}});
  renderLayerCssInspector();
  if(!layerCssEditor){
    layerCssEditor=createLayerCssEditor({current,shapes:()=>doc.shapes,options:()=>({variables:doc.variables,pageModes:activePage()?.variable_modes,textLayout}),editable:shape=>shape.component?.type!=='instance'&&!libraryForShape(doc,shape)&&!libraries?.locked([shape]),apply:update,preview:next=>{if(!next){layerCssPreview=null;draw();return;}const result=JSON.parse(editor.preview_update_many(JSON.stringify([next])));layerCssPreview=result.shapes.filter(s=>s.page_id===doc.active_page);draw();}});
    const button=document.createElement('button');button.id='edit-component-css';button.type='button';button.className='wide-button';button.textContent='Edit CSS…';button.onclick=()=>layerCssEditor.open();$('layer-css-section').append(button);
  }
  const cssShape=current();$('edit-component-css').textContent=cssShape&&(cssShape.component?.type==='instance'||libraryForShape(doc,cssShape)||libraries?.locked([cssShape]))?'View CSS…':'Edit CSS…';
  if(!layoutCssEditor){
    layoutCssEditor=createLayoutCssEditor({current,shapes:()=>doc.shapes,apply:update,preview:next=>{
      if(!next){layoutCssPreview=null;draw();return;}
      const result=JSON.parse(editor.preview_update_many(JSON.stringify([next])));
      layoutCssPreview=result.shapes.filter(s=>s.page_id===doc.active_page);draw();
    }});
    const button=document.createElement('button');button.id='edit-layout-css';button.type='button';button.className='wide-button';button.textContent='Edit Layout CSS…';button.onclick=()=>layoutCssEditor.open();$('dimensions-section').append(button);
  }
  development?.render();renderToolInspector();motionTools?.render();
  renderControlInspector();
  updateVariables();
  const shapes = selectionShapes(), shape = current();
  if($('edit-layout-css'))$('edit-layout-css').hidden=!shape?.auto_layout||shape.component?.type==='instance';
  document.querySelector('.right-panel').classList.toggle('protected-instance',shapes.some(s=>s.component?.type==='instance'));
  document.querySelector('.right-panel').classList.toggle('native-control-editor',!!shape?.control);
  renderComponentProperties(shape);
  const lockTargets=shapes.filter(s=>!inheritedLock(s));$('lock-panel').hidden=!shapes.length;$('toggle-lock').disabled=!lockTargets.length;$('toggle-lock').textContent=lockTargets.length?(lockTargets.every(s=>s.locked)?'Unlock selection':'Lock selection'):'Locked by parent';$('lock-status').textContent=shapes.some(s=>lockedInTree(s,pageShapes()))?'Locked layers cannot be edited on the canvas. Use the inspector or unlock their parent.':'Ctrl/Cmd Shift L';
  if(!canvasEditable()){editingGradient=0;activeGradient=null;editingPath=0;activeNode=-1;}
  if(!editingPaint(shape,gradientChannel)?.appearance?.[gradientField()]||!visibleInTree(shape,pageShapes())){editingGradient=0;activeGradient=null;}
  if(activeGradient?.part==='stop'&&activeGradient.index>=editingPaint(shape,gradientChannel)?.appearance?.[gradientField()]?.stops.length)activeGradient=null;
  $('node-actions').hidden=!editingPath||!shape?.points?.length;
  if(activeNode>=(shape?.points?.length??0))activeNode=-1;
  $('split-node').textContent=shape?.closed?'Open path at anchor':'Split path at anchor';$('split-node').disabled=activeNode<0||(!shape?.closed&&(activeNode===0||activeNode===(shape?.points?.length??0)-1));
  $('node-caption').textContent=activeNode<0?'Select an anchor':`Anchor ${activeNode+1} of ${shape.points.length}`;
  for(const id of ['delete-node','smooth-node','corner-node'])$(id).disabled=activeNode<0;
  $('auto-layout-panel').hidden=shape?.kind!=='frame';
  const excluded=new Set(transformedSelection().map(s=>s.id));
  $('parent-panel').hidden=!shapes.length||(!shapes.some(s=>s.parent_id)&&!pageShapes().some(s=>['frame','group'].includes(s.kind)&&!excluded.has(s.id)));
  $('parent-frame').replaceChildren(...[{id:0,name:'Page (no parent)'},...pageShapes().filter(s=>['frame','group'].includes(s.kind)&&!excluded.has(s.id))].map(s=>{const option=document.createElement('option');option.value=s.id;option.textContent=s.name;return option;}));
  $('parent-frame').value=shapes[0]?.parent_id??0;
  $('move-to-frame').disabled=shapes.some(s=>s.component?.type==='instance'&&s.component.master!==s.component.source);
  const parentShape=shape&&pageShapes().find(s=>s.id===shape.parent_id),layoutParent=parentShape?.auto_layout;
  updateAutoLayoutInspector(shape,parentShape);updateLayoutSizing();
  $('dimensions-section').append($('grid-cell-controls'));
  renderGridCell($('grid-cell-controls'),shape,parentShape,update,layoutParent?.direction==='grid'?JSON.parse(editor.grid_layout(parentShape.id)):null,next=>{
    gridPickerPreview=null;
    if(next&&selectedIds.has(shape.id)&&doc.active_page===shape.page_id){
      try {const result=JSON.parse(editor.preview_layout_update(JSON.stringify([next]),parentShape.id));gridPickerPreview={scene:result.document.shapes.filter(s=>s.page_id===doc.active_page),grid:result.grid,parentId:parentShape.id};}catch(error){toast(String(error));}
    }
    scheduleViewportDraw();
  });
  $('layout-child-panel').hidden=!layoutParent||!shape;
  if(shape){for(const key of ['fill_width','fill_height','absolute'])$('layout-item-'+key).checked=!!shape.layout_item?.[key];}
  $('add-auto-layout').hidden=!shapes.length||!!shape?.auto_layout;
  $('constraints-panel').hidden=!shapes.length||shapes.some(s=>!s.parent_id||pageShapes().find(p=>p.id===s.parent_id)?.auto_layout&&!s.layout_item?.absolute);
  for(const axis of ['horizontal','vertical']){const value=shapes[0]?.constraints?.[axis]??'min';$('constraint-'+axis).value=shapes.some(s=>(s.constraints?.[axis]??'min')!==value)?'':value;}
  $('group-actions').hidden=!shapes.length; $('group-layers').disabled=!shapes.length; $('ungroup-layers').disabled=!shapes.some(s=>['group','frame'].includes(s.kind)&&!s.component);
  document.querySelectorAll('[data-align]').forEach(button=>button.disabled=!shapes.length||(shapes.length===1&&(!parentShape||(layoutParent&&!shape.layout_item?.absolute))));
  $('scale-panel').hidden=tool!=='scale'||!shapes.length;
  $('join-paths').hidden=shapes.length!==2||shapes.some(s=>s.closed||!s.points?.length)||shapes[0].parent_id!==shapes[1].parent_id;
  $('empty-selection').hidden = shapes.length > 0; $('properties').hidden = !shape; $('multi-properties').hidden = shapes.length < 2;
  updateInspectorLayout(shape,shapes.length);
  updateCompactInspector(shape);
  updateContextualActions(shape);updateRectangleInspector(shape);updatePaintPopovers(shape);
  if (shapes.length > 1) {
    const box = bounds(shapes); $('multi-title').textContent = `${shapes.length} layers selected`;
    $('multi-size').textContent = `${Math.round(box.width)} × ${Math.round(box.height)}`;
    const mixed = shapes.some(s => s.fill !== shapes[0].fill || appearance(s).gradient);
    $('multi-fill').value = shapes[0].fill; $('multi-fill-value').textContent = mixed ? 'Mixed' : shapes[0].fill.toUpperCase();
    document.querySelectorAll('[data-distribute]').forEach(b => b.disabled = shapes.length < 3);
  }
  renderShadowControls($('shadow-section'),shape,next=>{if(effectBlur(next.appearance,'backdrop_blur')>0)cssCanvasEnabled=true;update(next);},{
    styles:doc.effect_styles??[],
    save:(style,layer)=>safe(()=>{const id=editor.save_effect_style(JSON.stringify(style),layer);refresh();return id;}),
    apply:id=>safe(()=>{editor.apply_effect_style(JSON.stringify([...selectedIds]),id);refresh();}),
    remove:id=>safe(()=>{editor.remove_effect_style(id);refresh();})
  });
  prototypeInteraction=Math.min(prototypeInteraction,Math.max(0,(shape?interactions(shape).length:0)-1));
  renderPrototypeControls($('prototype-panel'),shape,doc,update,playPrototype,{activeIndex:prototypeInteraction,select:index=>{prototypeInteraction=index;draw();}});
  renderGuideControls($('layout-guides-panel'),shape,update,guidesVisible,()=>{guidesVisible=!guidesVisible;renderProperties();draw();},{
    styles:doc.guide_styles??[],
    save:(style,frame)=>safe(()=>{editor.save_guide_style(JSON.stringify(style),frame);refresh();}),
    apply:id=>safe(()=>{editor.apply_guide_style(JSON.stringify([...selectedIds]),id);refresh();}),
    remove:id=>safe(()=>{editor.remove_guide_style(id);refresh();})
  });
  if (!shape){updateFigmaInspector(shape);return;}
  if(editingLayout&&!shape.auto_layout){editingLayout=0;activeSpacing=null;}
  const areaOverride=gridAreaEditingOverridden(shape,pageShapes());
  if(shape.auto_layout?.direction!=='grid'||shape.auto_layout.grid?.masonry||areaOverride){editingGridAreas=0;activeGridArea=null;}
  const areaButton=$('edit-grid-areas');areaButton.hidden=!!shape.auto_layout?.grid?.masonry;
  const gridCaption=document.querySelector('#grid-layout-section .grid-caption');
  if(gridCaption){gridCaption.hidden=!!shape.auto_layout?.grid?.masonry;gridCaption.textContent=areaOverride?'This breakpoint overrides the grid structure. Edit Layout CSS, or switch to a base-layout width to draw areas.':'Drag into cells. Resize edges to span tracks.';}
  areaButton.textContent=editingGridAreas===shape.id?'Finish editing areas':'Draw areas on canvas';areaButton.setAttribute('aria-pressed',String(editingGridAreas===shape.id));areaButton.disabled=!canvasEditable()||shape.component?.type==='instance'||areaOverride;
  $('edit-layout-spacing').textContent=editingLayout===shape.id?'Finish spacing edits':'Edit spacing on canvas';$('edit-layout-spacing').disabled=!canvasEditable();$('edit-layout-spacing').setAttribute('aria-pressed',String(editingLayout===shape.id));
  $('auto-layout-panel').hidden=shape.kind!=='frame';$('layout-direction').value=shape.auto_layout?.direction??'none';$('layout-settings').hidden=!shape.auto_layout||shape.auto_layout.direction==='grid';$('layout-text_baseline').parentElement.hidden=shape.auto_layout?.direction!=='horizontal';
  renderGridControls($('grid-frame-controls'),shape,update,(axis,index,delta)=>safe(()=>{shiftGridTrack(shape.id,axis,index,delta,true);}),gridPlan(shape),(axis,index)=>safe(()=>{editor.delete_grid_track(shape.id,axis,index);activeSpacing=null;refresh();toast('Grid track deleted · all layers kept');}),(oldName,newName)=>{editor.rename_grid_area(shape.id,oldName,newName);if(activeGridArea===oldName)activeGridArea=newName;refresh();},name=>safe(()=>{editor.delete_grid_area(shape.id,name);if(activeGridArea===name)activeGridArea=null;refresh();toast('Area deleted · items kept in their cells');}),(axis,index,before)=>safe(()=>{const next=editor.move_grid_track(shape.id,axis,index,before);activeSpacing='grid-'+(axis==='columns'?'column':'row')+'-'+next;refresh();focusGridTrack(axis,next);}));const gridFlow=shape.auto_layout?.direction==='grid';for(const id of ['layout-wrap','layout-align_content','layout-align','layout-justify'])$(id).parentElement.hidden=gridFlow;
  $('layout-gap-caption').textContent=gridFlow?'Column gap':'Gap';$('layout-cross-gap-caption').textContent=gridFlow?'Row gap':'Row / column gap';$('layout-gap').min=$('layout-cross_gap').min=gridFlow?'0':'-100000';
  if(shape.auto_layout)for(const key of ['gap','cross_gap','padding_top','padding_right','padding_bottom','padding_left','align','justify','align_content','hug_width','hug_height','wrap','strokes_included','text_baseline','canvas_stacking']){const el=$('layout-'+key);if((key.startsWith('hug')||key==='wrap'||key==='strokes_included'||key==='text_baseline'))el.checked=shape.auto_layout[key];else el.value=shape.auto_layout[key]??'';}
  if(shape.auto_layout)for(const [key,mode] of [['gap','justify'],['cross_gap','align_content']]){const el=$('layout-'+key),auto=shape.auto_layout.direction!=='grid'&&['between','around','evenly'].includes(shape.auto_layout[mode]);el.disabled=auto;el.placeholder=auto?'Auto':key==='cross_gap'?'Use main gap':'';if(auto)el.value='';}
  for(const key of ['min_width','max_width','min_height','max_height'])$('limit-'+key).value=shape.layout_item?.[key]??'';
  $('image-section').hidden=shape.kind!=='image';
  const paint=appearance(shape);$('opacity').value=Math.round(paint.opacity*100);$('fill-opacity').value=(paint.fill_opacity??1)*100;$('fill-opacity-value').textContent=Number(((paint.fill_opacity??1)*100).toFixed(1))+'%';$('stroke-opacity').value=(paint.stroke_opacity??1)*100;$('image-opacity').value=(paint.image_opacity??paint.fill_opacity??1)*100;$('corner-radius').value=paint.corner_radius;$('radius-row').hidden=!['rectangle','frame','image'].includes(shape.kind);$('fill-enabled').checked=paint.fill_enabled;$('stroke-enabled').checked=paint.stroke_enabled;$('stroke-color').value=appearance(editingPaint(shape,'stroke')).stroke_color;
  const rounded=['rectangle','frame','image'].includes(shape.kind);$('independent-corners').parentElement.hidden=!rounded;$('independent-corners').checked=!!paint.corner_radii;$('corner-values').hidden=!rounded||!paint.corner_radii;$('corner-radius').disabled=!!paint.corner_radii;for(let i=0;i<4;i++)$('corner-'+i).value=paint.corner_radii?.[i]??paint.corner_radius;
  $('paint-label').parentElement.hidden=shape.kind==='group';
  if(shape.image){$('image-mode').value=shape.image.mode;$('image-zoom').value=shape.image.zoom;$('image-x').value=Math.round(shape.image.offset_x*100);$('image-y').value=Math.round(shape.image.offset_y*100);$('image-crop-fields').hidden=shape.image.mode==='fit';}
  const chromeLimits=chromeBreakpoints(shape.device_chrome_breakpoints);$('chrome-tablet-width').value=chromeLimits.tablet;$('chrome-desktop-width').value=chromeLimits.desktop;$('device-chrome-breakpoints').hidden=shape.device_chrome_hidden||!['auto','auto-apple'].includes(shape.device_chrome);
  $('device-chrome-section').hidden=shape.kind!=='frame';$('frame-section').hidden=shape.kind!=='frame';$('clip-content').checked=!!shape.clip_content;$('device-chrome').value=shape.device_chrome&&shape.device_chrome!=='none'?shape.device_chrome:'auto';$('show-device-chrome').disabled=!!shape.parent_id;$('show-device-chrome').checked=!!shape.device_chrome&&shape.device_chrome!=='none'&&!shape.device_chrome_hidden;$('device-chrome-style').hidden=!$('show-device-chrome').checked;for(const value of ['portrait','landscape'])$('frame-'+value).setAttribute('aria-pressed',String(value==='portrait'?shape.height>=shape.width:shape.width>shape.height));
  $('stroke-alignment').value=paint.stroke_alignment??'center';$('stroke-alignment-row').hidden=!!shape.points?.length&&!shape.closed;
  $('stroke-endpoints').hidden=!shape.points?.length||shape.closed;for(const end of ['start','end'])$('stroke-'+end).value=paint['stroke_'+end]??'default';
  $('stroke-dash').value=paint.stroke_dash?.join(', ')??'';$('stroke-dash-offset').value=paint.stroke_dash_offset??0;$('stroke-cap').value=paint.stroke_cap??'round';$('stroke-join').value=paint.stroke_join??'round';$('stroke-miter-limit').value=paint.stroke_miter_limit??10;$('miter-limit-row').hidden=(paint.stroke_join??'round')!=='miter';
  $('stroke-section').hidden = shape.kind==='group'; $('stroke-width').value = shape.stroke_width ?? 2;$('vector-edit-controls').hidden=!vectorTools.includes(shape.kind);
  $('paint-label').textContent = 'Fill';
  for(const channel of ['fill','stroke'])renderGradientControls($(channel==='fill'?'gradient-controls':'stroke-gradient-controls'),editingPaint(shape,channel),s=>{activeGradient=null;update(s);},{channel,editing:editingGradient===shape.id&&gradientChannel===channel,active:gradientChannel===channel?activeGradient:null,toggle:()=>{if(!canvasEditable()){toast('Unlock the layer or its parent to edit on canvas');return;}const was=editingGradient===shape.id&&gradientChannel===channel;setTool('select');gradientChannel=channel;editingGradient=was?0:shape.id;activeGradient=null;renderProperties();draw();}});
  $('solid-fill-controls').hidden=!!paint.gradient;
  $('shape-name').value = shape.name; $('shape-kind').textContent = shape.kind;
  $('rotation').value=shape.rotation??0;$('rotation').closest('label').hidden=false;
  for (const key of ['x', 'y', 'width', 'height']) $(key).value = Math.round(shape[key] * 100) / 100;
  $('fill').value = editingPaint(shape,'fill').fill; $('fill-value').textContent = shape.fill.toUpperCase();
  $('text-section').hidden = shape.kind !== 'text'; $('text').value = shape.text; $('visible').checked = !shape.hidden;
  if (shape.kind === 'text') {
    const style = textStyle(shape);
    $('font-family').value = style.font_family; $('font-size').value = Math.round(style.font_size * 100) / 100;
    $('font-weight').value = style.font_weight; $('line-height').value = style.line_height;
    $('text-align').value = style.align; $('text-wrap').checked = style.wrap;
    $('text-sizing').value=style.sizing; $('text-wrap').disabled=style.sizing!=='fixed';
    $('text-overflow').hidden = !textLayout(shape).overflow;
  }
  updateFigmaInspector(shape);
}
function rasterEntry(data){
 let entry=imageCache.get(data);if(entry)return entry;const bitmap=new Image();entry={bitmap,ready:false};imageCache.set(data,entry);
 entry.promise=new Promise(resolve=>{bitmap.onload=()=>{entry.ready=true;resolve(bitmap);viewportRenderer.invalidate();draw();};bitmap.onerror=()=>{entry.failed=true;resolve(null);toast('An embedded image could not be decoded. Replace it in the inspector.');};bitmap.src=data;});return entry;
}
function playPrototype(){safe(()=>{const frames=prototypeFrames(doc);if(!frames.length){toast('Add a frame to present a prototype');return;}let chosen=current();while(chosen&&chosen.kind!=='frame')chosen=doc.shapes.find(s=>s.id===chosen.parent_id);const start=frames.find(s=>s.id===chosen?.id)??frames.find(s=>s.flow_name&&s.page_id===doc.active_page)??frames.find(s=>s.flow_name)??frames.find(s=>s.page_id===doc.active_page)??frames[0];presentPrototype(doc,start.id,editor,drawShape,async shapes=>{await Promise.all(shapes.filter(s=>s.image).map(s=>rasterEntry(s.image.data_url).promise));});});}
function drawShape(shape, target=ctx) {
  const ctx=target,a=appearance(shape),fill=fn=>withPaintOpacity(ctx,shape.kind==='image'?{...a,fill_opacity:a.image_opacity??a.fill_opacity}:a,'fill',fn),stroke=fn=>withPaintOpacity(ctx,a,'stroke',fn);
  if (shape.hidden||shape.kind==='group'||editorRole(shape)) return;
  ctx.save();
  if(shape.rotation){ctx.translate(shape.x,shape.y);ctx.rotate(-shape.rotation*Math.PI/180);ctx.translate(-shape.x,-shape.y);}
  ctx.fillStyle = a.fill_enabled&&shape.kind!=='image'?canvasFill(ctx,shape):shape.fill;ctx.strokeStyle=a.stroke_enabled?canvasFill(ctx,shape,'stroke'):a.stroke_color;ctx.lineWidth=shape.stroke_width??2;ctx.lineCap=a.stroke_cap??'round';ctx.lineJoin=a.stroke_join??'round';ctx.miterLimit=a.stroke_miter_limit??10;ctx.setLineDash(a.stroke_dash??[]);ctx.lineDashOffset=a.stroke_dash_offset??0;
  const outline=new Path2D();if(shape.kind==='ellipse')outline.ellipse(shape.x+shape.width/2,shape.y+shape.height/2,shape.width/2,shape.height/2,0,0,Math.PI*2);else outline.roundRect(shape.x,shape.y,shape.width,shape.height,radii(shape));
  ctx.save();if(shape.kind==='image')ctx.clip(outline);
  if(shape.kind==='image'&&shape.image){const entry=rasterEntry(shape.image.data_url);if(entry.ready){const p=imageLayout(shape);fill(()=>ctx.drawImage(entry.bitmap,p.sx,p.sy,p.sw,p.sh,p.dx,p.dy,p.dw,p.dh));}else{ctx.fillStyle='#e5e7eb';fill(()=>ctx.fillRect(shape.x,shape.y,shape.width,shape.height));}}
  else if (shape.points?.length) { const path = new Path2D(vectorPath(shape)); if(a.fill_enabled)fill(()=>ctx.fill(path));if(a.stroke_enabled)stroke(()=>shape.closed?drawAlignedStroke(ctx,shape,{stroke:c=>c.stroke(path),fill:c=>c.fill(path)}):drawVectorStroke(ctx,shape,path)); }
  else if (shape.kind === 'text') {
    const layout = textLayout(shape),glyphs=(c,kind)=>{if(shape.editor_meta?.text_path){c.save();c.font=fontCss(layout.style);c.textBaseline='alphabetic';c.textAlign='center';for(const glyph of pathGlyphs(shape,text=>c.measureText(text).width)){c.save();c.translate(glyph.x,glyph.y);c.rotate(glyph.angle);c[kind+'Text'](glyph.text,0,0);c.restore();}c.restore();return;}c.save();c.beginPath();c.rect(shape.x,shape.y,shape.width,shape.height);c.clip();c.font=fontCss(layout.style);c.textBaseline='alphabetic';c.textAlign=layout.style.align;for(const line of layout.lines)c[kind+'Text'](line.text,line.x,line.y+layout.baseline);c.restore();};
    if(a.fill_enabled)fill(()=>glyphs(ctx,'fill'));if(a.stroke_enabled)stroke(()=>drawAlignedStroke(ctx,shape,{stroke:c=>glyphs(c,'stroke'),fill:c=>glyphs(c,'fill')}));
  } else {
    if(a.fill_enabled)fill(()=>ctx.fill(outline));
  }
  ctx.restore();if(a.stroke_enabled&&!shape.points?.length&&shape.kind!=='text')stroke(()=>drawAlignedStroke(ctx,shape,{stroke:c=>c.stroke(outline),fill:c=>c.fill(outline)}));
  ctx.restore();
}
function focusGridTrack(axis,index){$('grid-'+axis+'-section')?.querySelectorAll('.grid-track-grip')[index]?.focus({preventScroll:true});}
function shiftGridTrack(id,axis,index,delta,focus=false){const next=editor.shift_grid_track(id,axis,index,delta);activeSpacing='grid-'+(axis==='columns'?'column':'row')+'-'+next;const old=$('grid-'+axis+'-'+index),target=$('grid-'+axis+'-'+next);if(old?.open){old.open=false;if(target)target.open=true;}refresh();if(focus)focusGridTrack(axis,next);}
function gridPlan(frame){if(gesture?.gridParentId===frame?.id&&gesture.grid)return {...gesture.grid,...(frame._gridLayout??{})};if(gridPickerPreview?.parentId===frame?.id)return {...gridPickerPreview.grid,...(frame._gridLayout??{})};return frame?.auto_layout?.direction==='grid'?{...JSON.parse(editor.grid_layout(frame.id)),...(frame._gridLayout??{})}:null;}
function gridSpanParent(shape){
 if(!shape||shape.layout_item?.absolute)return null;
 return pageShapes().find(p=>p.id===shape.parent_id&&p.auto_layout?.direction==='grid'&&!p.auto_layout.grid?.masonry)??null;
}
function draw() {
  if (!doc) return;
  const w = canvas.clientWidth, h = canvas.clientHeight, dpr = devicePixelRatio || 1;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  ctx.translate(pan.x, pan.y); ctx.scale(zoom, zoom);
  const previews = gesture?.previews || (gesture?.preview ? [gesture.preview] : []);
  let scene=pageShapes().map(shape=>commitPaintEdit(previews.find(s=>s.id===shape.id)||shape));
  if(['resize','rotate'].includes(gesture?.type)&&['frame','group','text'].includes(gesture.original.kind)){try{const gridId=isNamedAreaLayer(gesture.original)?gesture.original.parent_id:gesture.original.auto_layout?.direction==='grid'?gesture.original.id:null;const result=gridId?JSON.parse(editor.preview_layout_update(JSON.stringify(previews),gridId)):{document:JSON.parse(editor.preview_update_many(JSON.stringify(previews))),grid:null};scene=result.document.shapes.filter(s=>s.page_id===doc.active_page);gesture.grid=result.grid;gesture.gridParentId=gridId;}catch{scene=pageShapes();}}
  if(['layout-spacing','grid-span','grid-area','move'].includes(gesture?.type)&&gesture.scene)scene=gesture.scene;
  if(textEditing)scene=textEditing.document.shapes.filter(s=>s.page_id===doc.active_page);
  if(gridPickerPreview)scene=gridPickerPreview.scene;
  if(layoutCssPreview&&layoutCssEditor?.isOpen())scene=layoutCssPreview;
  if(layerCssPreview&&layerCssEditor?.isOpen())scene=layerCssPreview;
  scene=motionTools?.preview(scene)??scene;
  scene=resolvePatternPaints(previewPaints(scene),(source,box)=>svgDocument(source,box,1,null,textLayout));
  renderLayerCssInspector?.responsive(scene);
  if(cssActive()){scene=cssCanvas.render(scene,{variables:doc.variables,pageModes:activePage()?.variable_modes,textLayout},pan,zoom);cssGeometry=scene;}else{cssCanvas.hide();viewportRenderer.draw(scene,ctx,drawShape);scene=sceneToWorld(scene);}
  if(textEditing){
    const item=scene.find(s=>s.id===textEditing.id),pose=item?item._rotationHit??item:null;
    if(pose){
      const layout=textLayout(pose);
      inlineText.render(pose,{pan,zoom,layout});
      for(const axis of ['width','height'])$(axis).value=Number(pose[axis].toFixed(2));
    }
  }
  const areaLayer=current();
  if(isNamedAreaLayer(areaLayer)){
    const parent=scene.find(s=>s.id===areaLayer.parent_id),resizing=gesture?.type==='resize'&&gesture.original.id===areaLayer.id;
    const plan=parent?.auto_layout?.direction==='grid'?gridPlan(parent):null;
    const basePlan=resizing?gesture.grid:null;
    // Preview inputs describe the base edit; read-only measurements describe
    // the rendered breakpoint after CSS layout, including when it uses Flex.
    if(basePlan)updateAreaTrackValues($('grid-cell-controls'),areaLayer,basePlan,{preview:true});
    updateAreaTrackValues($('grid-cell-controls'),areaLayer,plan,{parent});
    const live=scene.find(s=>s.id===areaLayer.id);
    if(live)for(const axis of ['width','height'])if(document.activeElement!==$(axis))$(axis).value=Number(live[axis].toFixed(2));
  }
  $('css-canvas').setAttribute('aria-pressed',String(cssActive()));
  $('css-canvas').disabled=needsControlRenderer();$('css-canvas').title=needsControlRenderer()?'CSS canvas is required for controls, CSS Grid, and custom CSS':'Browser layout with live inspector editing';
  renderDeviceChrome(scene,pan,zoom);
  const chromeStatus=deviceChromeStatus(selectedIds.size===1?scene.find(s=>selectedIds.has(s.id)):null,scene);
  if($('device-chrome-active').textContent!==chromeStatus)$('device-chrome-active').textContent=chromeStatus;
  renderFrameLabels(scene.filter(s=>editorRole(s)!=='section'),pan,zoom,selectedIds,tool==='select'&&!space,doc.component_sets);
  for(const set of doc.component_sets??[]){const frame=scene.find(s=>s.id===set.frame_id);if(!frame||!visibleInTree(frame,scene))continue;ctx.save();ctx.strokeStyle='#9747ff';ctx.lineWidth=1/zoom;ctx.setLineDash([6/zoom,4/zoom]);ctx.strokeRect(frame.x,frame.y,frame.width,frame.height);ctx.restore();}
  drawEditorMarks(ctx,scene,zoom);if(gesture?.preview&&editorRole(gesture.preview))drawEditorMarks(ctx,[gesture.preview],zoom);
  if(guidesVisible)drawLayoutGuides(ctx,scene,zoom);
  if(tool==='select')for(const frame of scene.filter(s=>s.auto_layout?.direction==='grid'&&visibleInTree(s,scene)&&(editingGridAreas===s.id||(s.layout_item?.grid_container&&scene.some(child=>child.parent_id===s.id&&selectedIds.has(child.id)&&!child.layout_item?.absolute))||(gridHoverPointer&&(()=>{const pose=s._rotationHit??s,p=localPoint(pose,point(gridHoverPointer));return p.x>=pose.x&&p.x<=pose.x+pose.width&&p.y>=pose.y&&p.y<=pose.y+pose.height;})()))))drawGridCells(ctx,frame,gesture?.type==='grid-span'&&gesture.parent.id===frame.id?gesture.grid:gridPlan(frame),zoom,editingGridAreas===frame.id,!!frame.layout_item?.grid_container&&scene.some(child=>child.parent_id===frame.id&&selectedIds.has(child.id)&&!child.layout_item?.absolute),selectedIds);
  if(gesture?.type==='move'&&gesture.stackDrop)drawGridStackDrop(ctx,gesture.stackDrop,zoom);
  if(gesture?.type==='move'&&gesture.previews&&!gesture.stackDrop){const parent=dropParent(gesture.targets??pageShapes(),gesture.previews,[...selectedIds]),frame=(gesture.targets??scene).find(s=>s.id===parent);if(frame?.auto_layout?.direction==='grid'&&!frame.auto_layout.grid?.masonry){const roots=gesture.previews.filter(s=>selectedIds.has(s.id));for(const item of roots)drawGridDestination(ctx,frame,gridPlan(frame),{x:item.x+item.width/2,y:item.y+item.height/2},zoom);}}
  if(assetDrag?.point){const source=doc.shapes.find(s=>s.id===assetDrag.master),parent=scene.find(s=>s.id===assetDrag.parent);if(source){const p=centeredPlacement(source,assetDrag.point);ctx.save();ctx.strokeStyle='#9747ff';ctx.lineWidth=2/zoom;if(parent)ctx.strokeRect(parent.x,parent.y,parent.width,parent.height);ctx.setLineDash([6/zoom,4/zoom]);ctx.strokeRect(p.x,p.y,source.width,source.height);ctx.restore();}}
  if (gesture?.type==='create') {ctx.save();const preview={...gesture.preview,parent_id:frameAt(pageShapes(),gesture.start)};for(const frame of clippingFrames(preview,scene)){ctx.beginPath();ctx.roundRect(frame.x,frame.y,frame.width,frame.height,radii(frame));ctx.clip();}drawShape(preview);ctx.restore();}
  if(gesture?.type==='text-create'){const box=gesture.preview;ctx.strokeStyle='#0d99ff';ctx.lineWidth=1/zoom;ctx.strokeRect(box.x,box.y,Math.max(box.width,1/zoom),box.height);}
  if (penPoints.length) { const preview=fromPoints('pen',penPoints); drawShape(preview); drawAnchors(penPoints); }
  if(editingPath && current()?.points?.length) drawAnchors(anchors(gesture?.preview??current()));
  const visibleSelection = selectionShapes().filter(s => visibleInTree(s,pageShapes())).map(s => scene.find(p => p.id === s.id) || s);
  const shape = bounds(visibleSelection);
  if (shape && !editingPath && !editingGradient) {
    const componentSelection=visibleSelection.every(s=>s.component||componentSetFrame(doc,s.id));
    ctx.strokeStyle = componentSelection?'#9747ff':'#0d99ff'; ctx.lineWidth = 1 / zoom;
    for (const item of visibleSelection) {
      const oriented=item._rotationHit??item;
      ctx.save();ctx.translate(oriented.x,oriented.y);ctx.rotate(-(oriented.rotation??0)*Math.PI/180);
      if(componentSetFrame(doc,item.id))ctx.setLineDash([6/zoom,4/zoom]);
      ctx.strokeRect(0,0,oriented.width,oriented.height);ctx.setLineDash([]);
      const size=6/zoom;
      if(!textEditing&&visibleSelection.length===1&&(item.component?.type!=='instance'||gridSpanParent(item))&&canvasEditable())for(const [cx,cy] of resizeHandles.filter(([,y])=>gridSpanParent(item)||!hasHugControlHeight(item)||y===.5)){const x=cx*oriented.width,y=cy*oriented.height;ctx.fillStyle='#fff';ctx.fillRect(x-size/2,y-size/2,size,size);ctx.strokeRect(x-size/2,y-size/2,size,size);}
      ctx.restore();
    }
    if(visibleSelection.length>1)ctx.strokeRect(shape.x,shape.y,shape.width,shape.height);
    ctx.fillStyle = componentSelection?'#9747ff':'#0d99ff'; ctx.font = `${10 / zoom}px Inter,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; const selectedSet=visibleSelection.length===1?componentSetFrame(doc,visibleSelection[0].id):null;
    if(selectedSet){const label=selectedSet.variants.length+' Variants',width=ctx.measureText(label).width+8/zoom,x=shape.x+shape.width/2-width/2,y=shape.y+shape.height+8/zoom;ctx.beginPath();ctx.roundRect(x,y,width,18/zoom,3/zoom);ctx.fill();ctx.fillStyle='#fff';ctx.fillText(label,shape.x+shape.width/2,y+3/zoom);}else ctx.fillText(`${Math.round(shape.width)} × ${Math.round(shape.height)}`,shape.x+shape.width/2,shape.y+shape.height+10/zoom);ctx.textAlign='left';
  }
  if (gesture?.type === 'marquee') {
    const box = bounds([{x:gesture.start.x,y:gesture.start.y,width:0,height:0},{x:gesture.end.x,y:gesture.end.y,width:0,height:0}]);
    ctx.fillStyle = '#0d99ff18'; ctx.strokeStyle = '#0d99ff'; ctx.lineWidth = 1 / zoom; ctx.fillRect(box.x,box.y,box.width,box.height); ctx.strokeRect(box.x,box.y,box.width,box.height);
  }
  if(editingGradient&&gradientShape()?.appearance?.[gradientField()])drawGradientHandles(ctx,gesture?.type==='gradient'?gesture.preview:gradientShape(),zoom,activeGradient,gradientField());
  if(prototypeConnections&&!editingPath&&!editingGradient)drawConnections(ctx,scene,selectedIds.size===1?scene.find(s=>s.id===selected):null,zoom,gesture,tool==='select'&&canvasEditable(),prototypeInteraction);
  if(editingLayout===current()?.id&&tool==='select'&&canvasEditable()){const frame=scene.find(s=>s.id===editingLayout);if(frame&&visibleInTree(frame,scene)){ctx.save();for(const clip of clippingFrames(frame,scene)){ctx.beginPath();ctx.roundRect(clip.x,clip.y,clip.width,clip.height,radii(clip));ctx.clip();}drawSpacing(ctx,frame,scene,zoom,activeSpacing,gesture?.grid??gridPlan(frame));ctx.restore();}}
  if(editingGridAreas===current()?.id&&tool==='select'){const frame=transformGeometry(current());drawAreaEditing(ctx,frame,gesture?.type==='grid-area'?gesture.plan:gridPlan(frame),current().auto_layout?.grid?.areas??[],activeGridArea,gesture?.type==='grid-area'?gesture.area:null,gesture?.valid!==false,zoom);}
  const areaStatus=editingGridAreas===current()?.id&&tool==='select'?areaSelectionStatus(current().auto_layout?.grid?.areas??[],activeGridArea):null;
  const resizeConstraints=gesture?.type==='resize'?areaResizeConstraints(gesture.original,gesture.preview,pageShapes().find(s=>s.id===gesture.original.parent_id),gesture.grid):[];
  const resizeFeedback=resizeConstraints.map(c=>c.message).join(' · ');
  updateTrackLimitControls($('grid-cell-controls'),resizeConstraints,gesture?.type==='resize'&&isNamedAreaLayer(gesture.original));
  if(resizeConstraints.length)drawResizeLimits(ctx,scene.find(s=>s.id===gesture.original.parent_id),gesture.grid,resizeConstraints,zoom);
  const resizeHint=$('grid-resize-feedback');resizeHint.hidden=!resizeFeedback;
  if(resizeHint.textContent!==resizeFeedback)resizeHint.textContent=resizeFeedback;
  $('grid-area-status').hidden=!areaStatus;
  if(!areaStatus)tooltips?.hideFor($('grid-area-status'));
  if(areaStatus){for(const [id,value] of [['grid-area-status-name',areaStatus.name],['grid-area-status-count',areaStatus.count]])if($(id).textContent!==value)$(id).textContent=value;}
  drawSnapGuides(ctx,gesture?.snapLines,zoom);
  if(layerDragDestination){
    const destination=scene.find(s=>s.id===layerDragDestination);
    if(destination&&visibleInTree(destination,pageShapes())){
      const pose=destination._rotationHit??destination;
      ctx.save();ctx.translate(pose.x,pose.y);ctx.rotate(-(pose.rotation??0)*Math.PI/180);
      ctx.setLineDash([]);ctx.lineWidth=2/zoom;ctx.strokeStyle='#0d99ff';ctx.fillStyle='#0d99ff12';
      ctx.fillRect(0,0,pose.width,pose.height);ctx.strokeRect(0,0,pose.width,pose.height);ctx.restore();
      const box=visualBounds(pose),left=pan.x+box.x*zoom,top=pan.y+box.y*zoom;
      if(left<w&&top<h&&left+box.width*zoom>0&&top+box.height*zoom>0){
        ctx.save();ctx.setTransform(dpr,0,0,dpr,0,0);
        ctx.font='500 11px Inter,Arial,sans-serif';ctx.textAlign='left';ctx.textBaseline='middle';
        const padding=8,maxWidth=Math.max(32,Math.min(360,w-16));
        const label=layerDropDestination(pageShapes(),destination.id,'inside',activePage()?.name??'Page');
        const wrap=limit=>{
          const lines=[];let line='';
          for(const character of label){
            if(line&&ctx.measureText(line+character).width>limit){lines.push(line);line='';}
            line+=character;
          }
          if(line)lines.push(line);return lines;
        };
        let lines=wrap(maxWidth-padding*2);
        if(lines.length*16+8>h-16)lines=wrap(Math.max(16,w-32));
        const width=Math.max(...lines.map(line=>ctx.measureText(line).width),0)+padding*2,height=lines.length*16+8;
        const x=Math.max(8,Math.min(left,w-width-8)),y=Math.max(8,Math.min(top>=height+14?top-height-6:top+6,h-height-8));
        ctx.fillStyle='#0d99ff';ctx.beginPath();ctx.roundRect(x,y,width,height,4);ctx.fill();
        ctx.fillStyle='#fff';lines.forEach((line,index)=>ctx.fillText(line,x+padding,y+12+index*16));ctx.restore();
      }
    }
  }
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
  tooltips?.hideFor($('grid-area-status'));
  const shapes = (onlySelection === true ? selectionShapes() : pageShapes()).map(s=>paintBounds(s,pageShapes())).filter(Boolean);
  if (!shapes.length) { zoom = 1; pan = { x: 80, y: 100 }; draw(); return; }
  const minX = Math.min(...shapes.map(s => s.x)), minY = Math.min(...shapes.map(s => s.y));
  const width = Math.max(...shapes.map(s => s.x + s.width)) - minX;
  const height = Math.max(...shapes.map(s => s.y + s.height)) - minY;
  zoom = Math.max(.1, Math.min(1.1, (canvas.clientWidth - 100) / width, (canvas.clientHeight - 220) / height));
  pan = { x: (canvas.clientWidth - width * zoom) / 2 - minX * zoom, y: (canvas.clientHeight - height * zoom) / 2 - minY * zoom - 15 }; draw();
}
function zoomAt(factor, x = canvas.clientWidth / 2, y = canvas.clientHeight / 2, pinch = false) {
  tooltips?.hideFor($('grid-area-status'));
  const before = zoom; zoom = clampZoom(zoom * factor);
  pan.x = x - (x - pan.x) * zoom / before; pan.y = y - (y - pan.y) * zoom / before; scheduleViewportDraw();
}
function point(event) { const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left - pan.x) / zoom, y: (event.clientY - rect.top - pan.y) / zoom }; }
function openPrototypeInspector(index=prototypeInteraction){
 prototypeInteraction=index;development?.activate('prototype');renderProperties();
 requestAnimationFrame(()=>{
  const panel=$('prototype-panel');
  if(panel.classList.contains('inspector-collapsed'))panel.querySelector('.inspector-section-toggle')?.click();
  const card=$('prototype-interaction-'+index);
  if(card)card.scrollIntoView({block:'nearest'});
  else $('prototype-inspector').scrollTop=0;
 });
}
function setTool(value) {
  if(!finishText())return;
  prototypeLinkSelected=false;penPoints=[]; gesture=null; editingLayout=0;activeSpacing=null;editingPath=0;editingGradient=0;activeGradient=null;
  document.querySelectorAll('.tool-group').forEach(el=>el.open=false);
  $('pencil-options').hidden=value!=='pencil';
  tool = value;updateToolbelt(tool); document.querySelectorAll('[data-tool]').forEach(button => { const active = button.dataset.tool === tool; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  showFramePresets(tool==='frame');
  renderProperties();
  draw();
  canvas.style.cursor = tool === 'hand' ? 'grab' : tool === 'select' ? 'default' : 'crosshair';
  $('hint').textContent = tool === 'select'&&prototypeConnections ? 'Drag the blue handle to connect frames · Click a connection to edit it · Escape cancels a drag' : tool === 'select' ? 'Drag to snap to objects and grid · Alt or Control bypasses snapping · Shift locks an axis' : tool === 'text-path' ? 'Click a vector or shape to add text along its path' : tool === 'comment' ? 'Click to add a comment' : tool === 'section' ? 'Drag to create a section' : tool === 'slice' ? 'Drag an export region' : tool === 'hand' ? 'Drag to pan the canvas' : tool === 'scale' ? 'Drag from the lower-right of your selection to scale · Shift snaps to 10% steps' : tool === 'pen' ? 'Click for corners · Drag for curves · Click first point to close · Enter to finish' : tool === 'pencil' ? 'Drag to draw freehand · Smoothing preserves sharp corners · Escape to cancel' : 'Drag to draw · Shift to constrain · Alt to draw from center';
}
function download(name, body, type) { const url = URL.createObjectURL(new Blob([body], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function pasteLayerText(text,overSelection=false,replace=false,frames=false){
  const payload=layerPayload(text);if(!payload)return false;
  const complete=(ids,message,frames=null)=>{setSelection(ids);pasteContext.paste(text,ids,frames);refresh();toast(message);return true;};
  if(replace)return complete(JSON.parse(editor.paste_replace(text,selectionJson())),'Selection replaced');
  const count=text===lastPasted?pasteCount+1:1,placement=pasteContext.placement(text,payload,pageShapes(),[...selectedIds],{overSelection,repeat:count});
  if(frames||placement.frames){const targets=frames?[...selectedIds]:placement.frames;return complete(JSON.parse(editor.paste_into_frames(text,JSON.stringify(targets))),'Pasted into '+targets.length+' frames',targets);}
  const ids=JSON.parse(editor.paste_layers(text,placement.offset.x,placement.offset.y,placement.parent));
  lastPasted=text;pasteCount=count;return complete(ids,'Layers pasted');
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
    if(file.type.startsWith('video/')){const media=await readPaintMedia(file,'video');if(doc.active_page!==page)throw new Error('Page changed during import');const scale=Math.min(1,480/media.width,360/media.height),width=media.width*scale,height=media.height*scale,start=location??{x:(canvas.clientWidth/2-pan.x)/zoom-width/2,y:(canvas.clientHeight/2-pan.y)/zoom-height/2};const id=insertAt({id:0,kind:'rectangle',name:file.name.slice(0,80)||'Video',...start,width,height,fill:'#ffffff',text:'',hidden:false,appearance:{opacity:1,corner_radius:0,stroke_color:'#000000',stroke_enabled:false,fill_enabled:true,fills:[{id:1,visible:true,color:'#ffffff',opacity:1,media}]}},start);setSelection([id]);setTool('select');refresh();toast('Video placed');return;}
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
  const snappingDialog=$('snapping-dialog');
  const renderSnapping=()=>{for(const key of ['enabled','objects','grid'])$('snap-'+key).checked=snapping[key];$('snap-increment').value=snapping.increment;$('snap-options').hidden=!snapping.enabled;$('snap-increment-row').hidden=!snapping.grid;};
  const saveSnapping=()=>{try{localStorage.setItem('pixlprfct-snapping',JSON.stringify(snapping));}catch{toast('Snapping changed, but could not save preferences');}renderSnapping();};
  $('global-settings').onclick=()=>{document.querySelector('.file-menu').open=false;renderSnapping();snappingDialog.showModal();};
  for(const key of ['enabled','objects','grid'])$('snap-'+key).onchange=e=>{snapping[key]=e.target.checked;saveSnapping();};
  $('snap-increment').onchange=e=>{const value=Number(e.target.value);if(!Number.isFinite(value)||value<.1||value>1000){e.target.setCustomValidity('Enter a value between 0.1 and 1000 pixels.');e.target.reportValidity();return;}e.target.setCustomValidity('');snapping.increment=value;saveSnapping();};
  $('snap-increment').oninput=e=>{e.target.setCustomValidity('');const value=Number(e.target.value);if(e.target.value&&Number.isFinite(value)&&value>=.1&&value<=1000){snapping.increment=value;try{localStorage.setItem('pixlprfct-snapping',JSON.stringify(snapping));}catch{}}};
  $('close-snapping').onclick=$('dismiss-snapping').onclick=()=>snappingDialog.close();

  development=installDevelopment({getDocument:()=>doc,getSelection:selectionShapes,save:update,textLayout});
  renderToolInspector=installToolInspector({current,change:update,remove:()=>$('delete').click(),exportSlice:()=>$('export-artwork').click()});
  motionTools=installMotion({current,shapes:pageShapes,change:update,select:id=>{setSelection([id]);refresh(false);},draw});development.addPanel('motion','Motion',motionTools.inspector);
  window.addEventListener('inspector-mode-change',e=>{if(['development','inspect'].includes(e.detail)){updateToolbelt.mode('dev',false);motionTools.mode(false);}else if(e.detail==='motion'){updateToolbelt.mode('motion',false);}else if(e.detail==='prototype'||['dev','motion'].includes(updateToolbelt.getMode())){updateToolbelt.mode('design',false);motionTools.mode(false);}});
  renderControlInspector=installControlInspector({resetShared:id=>safe(()=>{editor.reset_starter_overrides(id);refresh();toast('Shared defaults restored');}),current,document:()=>doc,change:update,redraw:()=>refresh(false),preview:()=>development.preview(),selectChild:id=>{setSelection([id]);refresh(false);const shape=current(),section=shape?.kind==='text'?$('text-section'):$('appearance-section');if(section?.classList.contains('inspector-collapsed'))section.querySelector('.inspector-section-toggle')?.click();section?.scrollIntoView({block:'nearest'});}});
  syncInspectorDropdowns=installInspectorDropdowns(document.body);
  const componentHeader=document.createElement('div');componentHeader.className='component-section-header';
  $('component-heading').before(componentHeader);componentHeader.append($('component-heading'));
  const instanceActions=document.createElement('button');instanceActions.id='instance-actions';instanceActions.type='button';instanceActions.className='inspector-icon';instanceActions.setAttribute('aria-label','Instance actions');instanceActions.setAttribute('aria-haspopup','menu');instanceActions.title='Instance actions';instanceActions.innerHTML='<svg class="app-icon" viewBox="0 0 16 16" fill="currentColor"><circle cx="3" cy="8" r="1"/><circle cx="8" cy="8" r="1"/><circle cx="13" cy="8" r="1"/></svg>';componentHeader.append($('add-variant'),instanceActions);
  instanceActions.onclick=event=>{
    const shape=current(),set=componentSetFrame(doc,shape?.id);if(!shape?.component&&!set)return;
    const action=id=>({label:$(id).textContent,visible:!$(id).hidden,enabled:!$(id).disabled,run:()=>$(id).click()});
    const rect=instanceActions.getBoundingClientRect();
    if(shape.component?.type!=='instance'){showContextMenu({preventDefault:()=>event.preventDefault(),clientX:rect.right,clientY:rect.bottom},[action('insert-instance'),action('manage-variants'),action('add-component-property')],instanceActions,{label:'Component actions'});return;}
    showContextMenu({preventDefault:()=>event.preventDefault(),clientX:rect.right,clientY:rect.bottom},[
      action('go-main'),action('go-nested-main'),action('select-instance-root'),
      {label:'Swap component…',enabled:!$('swap-component').disabled,run:()=>{
        if($('component-panel').classList.contains('inspector-collapsed'))$('component-heading').querySelector('button')?.click();
        const details=$('instance-controls').closest('details');if(details&&!details.open){const toggle=details.querySelector('summary button');if(toggle)toggle.click();else details.open=true;}syncInspectorDropdowns();$('swap-component').nextElementSibling?.click();
      }},action('reset-instance'),action('detach-instance')
    ],instanceActions,{label:'Instance actions',heading:doc.shapes.find(s=>s.id===shape.component.master)?.name??'Component'});
  };
  $('toggle-lock').onclick=toggleSelectionLock;
  $('create-component').onclick=createComponentSelection;
  $('nav-assets').onclick=showAssets;$('manage-libraries').onclick=()=>libraries?.open();$('asset-library').onchange=renderAssetBrowser;$('asset-search').oninput=renderAssetBrowser;$('asset-page').onchange=renderAssetBrowser;
  $('insert-instance').onclick=()=>insertInstance(componentSetFrame(doc,selected)?.variants[0].component_id??selected);
  $('combine-variants').onclick=combineVariantSelection;
  $('manage-variants').onclick=()=>{const set=componentSet(doc,selected);if(set?.frame_id){setSelection([set.frame_id]);refresh(false);}};
  $('add-variant').onclick=addVariantSelection;
  $('add-component-property').onclick=()=>editComponentProperty(doc,selected,null,p=>{editor.save_component_property(JSON.stringify(p));refresh();});
  $('go-nested-main').onclick=()=>{const main=instanceContext(doc,current())?.nestedMain;if(main)goToMain(main.id);};
  $('select-instance-root').onclick=()=>{const context=instanceContext(doc,current());if(context){setSelection([context.root.id]);refresh(false);}};
  $('push-style-overrides').onclick=()=>safe(()=>{editor.push_style_overrides(selected);refresh();toast('Text and style overrides applied to main component');});
  $('detach-instance').onclick=()=>safe(()=>{editor.detach_instance(selected);refresh();toast('Instance detached');});
  $('reset-instance').onclick=()=>safe(()=>{editor.reset_instance(selected);refresh();toast('Instance overrides reset');});
  $('swap-component').onchange=()=>safe(()=>{if(!instanceContext(doc,current())?.isRoot)return;const root=editor.swap_instance(selected,Number($('swap-component').value));setSelection([root]);refresh();toast('Component swapped');});
  $('go-main').onclick=()=>safe(()=>{const master=doc.shapes.find(s=>s.id===current()?.component?.master);if(!master)return;editor.select_page(master.page_id);refresh();setSelection([master.id]);refresh(false);fit();});
  installIcons();
  $('export-dialog').addEventListener('cancel',event=>{if(exportBusy)event.preventDefault();});
  $('paste-frames').onclick=async()=>{if(!selectedIds.size||selectionShapes().some(s=>s.kind!=='frame')){toast('Select destination frames first');return;}let text;try{text=await navigator.clipboard.readText();}catch{pasteFrames=true;toast('Press Ctrl/Cmd V to paste into the selected frames');return;}safe(()=>{if(!pasteLayerText(text,false,false,true))toast('Copy PixlPrfct layers first');});};
  $('paste-replace').onclick=async()=>{if(!selectedIds.size){toast('Select layers to replace');return;}let text;try{text=await navigator.clipboard.readText();}catch{pasteReplace=true;toast('Press Ctrl/Cmd V to replace the selection');return;}safe(()=>{if(!pasteLayerText(text,false,true))toast('Copy PixlPrfct layers first');});};
  $('paste-over').onclick=async()=>{let text;try{text=await navigator.clipboard.readText();}catch{pasteInPlace=true;toast('Press Ctrl/Cmd V to paste over the selection');return;}safe(()=>{if(!pasteLayerText(text,true))toast('Copy PixlPrfct layers first');});};
  for(const kind of ['copy','cut'])window.addEventListener(kind,event=>{
    if(event.target.closest('input,textarea,select,[contenteditable]')||!selectedIds.size||!event.clipboardData)return;
    safe(()=>{const payload=editor.copy_layers(selectionJson());event.clipboardData.setData(LAYER_MIME,payload);event.clipboardData.setData('text/plain',payload);event.preventDefault();pasteContext.copy(payload,[...selectedIds]);lastPasted='';pasteCount=0;if(kind==='cut')deleteSelection();toast(kind==='cut'?'Layers cut':'Layers copied');});
  });
  $('join-paths').onclick=()=>safe(()=>{setSelection([editor.join_paths(selectionJson())]);refresh();toast('Paths joined');});
  $('split-node').onclick=()=>safe(()=>{if(!editingPath||activeNode<0)return;const ids=JSON.parse(editor.split_path(selected,activeNode));editingPath=0;activeNode=-1;setSelection(ids);refresh();toast(ids.length===1?'Path opened':'Path split');});
  $('delete-node').onclick=()=>safe(()=>{if(editingPath&&current()&&activeNode>=0){const changed=deleteAnchor(current(),activeNode);activeNode=-1;update(changed);}});
  for(const [id,smooth] of [['smooth-node',true],['corner-node',false]])$(id).onclick=()=>safe(()=>{if(editingPath&&current()&&activeNode>=0)update(convertAnchor(current(),activeNode,smooth));});
  const layoutDefaults={strokes_included:true,direction:'horizontal',gap:16,padding_top:16,padding_right:16,padding_bottom:16,padding_left:16,align:'start',justify:'start',hug_width:false,hug_height:false};
  $('present-prototype').onclick=playPrototype;
  $('prototype-connections').onclick=()=>{
    prototypeConnections=!prototypeConnections;
    $('prototype-connections').setAttribute('aria-pressed',String(prototypeConnections));
    $('prototype-connections-state').textContent=prototypeConnections?'On':'Off';
    $('prototype-help').textContent=prototypeConnections?'Drag the blue handle from a selected layer to a frame. Click a connection to edit its destination, animation, or delete it.':'Prototype links show where interactions go. Turn them on to connect frames on the canvas.';
    $('prototype-connections').title=prototypeConnections?'Hide prototype links on the canvas':'Show connections between layers and frames, and open their interaction settings';
    if(prototypeConnections){editingGridAreas=0;activeGridArea=null;setTool('select');openPrototypeInspector();}
    else setTool(tool);
    draw();
  };
  $('add-auto-layout').onclick=()=>safe(()=>{setSelection([editor.auto_layout_selection(selectionJson())]);refresh();});
  for(const key of ['min_width','max_width','min_height','max_height'])$('limit-'+key).onchange=()=>{const s=current();if(s){const value=$('limit-'+key).value;update({...s,layout_item:{...s.layout_item,[key]:value===''?null:Number(value)}});renderProperties();}};
  $('edit-grid-areas').onclick=()=>{const s=current();if(s?.auto_layout?.direction!=='grid'||!canvasEditable()||s.component?.type==='instance'||gridAreaEditingOverridden(s,pageShapes()))return;const was=editingGridAreas===s.id;setTool('select');editingGridAreas=was?0:s.id;editingLayout=0;activeGridArea=null;renderProperties();draw();canvas.focus();if(!was)toast('Tab selects areas · Enter / F2 renames · Drag empty cells to draw · Drag areas or use arrows to move · Drag edges or Shift + arrows to resize · Escape cancels');};
  $('edit-layout-spacing').onclick=()=>{const s=current();if(!s?.auto_layout||!canvasEditable())return;const was=editingLayout===s.id;editingGridAreas=0;setTool('select');editingLayout=was?0:s.id;activeSpacing=was?null:'padding_left';renderProperties();draw();canvas.focus();if(!was)toast('Drag spacing handles · Tab to choose · Arrow keys to adjust · Alt links opposite padding · Escape cancels');};
  $('layout-direction').onchange=()=>{const s=current();if(s)update({...s,auto_layout:$('layout-direction').value==='none'?null:{...layoutDefaults,...s.auto_layout,direction:$('layout-direction').value,...($('layout-direction').value==='grid'?{grid:s.auto_layout?.grid??defaultGrid(),gap:Math.max(0,s.auto_layout?.gap??16),cross_gap:s.auto_layout?.cross_gap==null?null:Math.max(0,s.auto_layout.cross_gap),wrap:false}: {})}});};
  for(const key of ['gap','cross_gap','padding_top','padding_right','padding_bottom','padding_left','align','justify','align_content','hug_width','hug_height','wrap','strokes_included','text_baseline','canvas_stacking'])$('layout-'+key).onchange=()=>{const s=current();if(s?.auto_layout){const el=$('layout-'+key),value=(key.startsWith('hug')||key==='wrap'||key==='strokes_included'||key==='text_baseline')?el.checked:['align','justify','align_content','canvas_stacking'].includes(key)?el.value:key==='cross_gap'&&el.value===''?null:Number(el.value);update({...s,auto_layout:{...s.auto_layout,[key]:value}});renderProperties();}};
  for(const key of ['fill_width','fill_height','absolute'])$('layout-item-'+key).onchange=()=>{const s=current();if(s)update({...s,layout_item:{fill_width:false,fill_height:false,absolute:false,...s.layout_item,[key]:$('layout-item-'+key).checked}});};
  $('independent-corners').onchange=()=>{const s=current();if(!s)return;const a=appearance(s);update({...s,appearance:{...a,corner_radius:a.corner_radii?.[0]??a.corner_radius,corner_radii:$('independent-corners').checked?Array(4).fill(a.corner_radius):null}});renderProperties();};
  for(let i=0;i<4;i++)$('corner-'+i).onchange=()=>{const s=current();if(!s)return;const a=appearance(s),values=[...(a.corner_radii??Array(4).fill(a.corner_radius))];values[i]=Number($('corner-'+i).value);update({...s,appearance:{...a,corner_radii:values}});renderProperties();};
  for(const end of ['start','end'])$('stroke-'+end).onchange=()=>{const s=current();if(!s)return;const value=$('stroke-'+end).value;update({...s,appearance:{...appearance(s),['stroke_'+end]:value==='default'?null:value}});};
  for(const [id,key] of [['stroke-alignment','stroke_alignment'],['stroke-dash','stroke_dash'],['stroke-dash-offset','stroke_dash_offset'],['stroke-cap','stroke_cap'],['stroke-join','stroke_join'],['stroke-miter-limit','stroke_miter_limit']])$(id).onchange=()=>{const s=current();if(!s)return;const raw=$(id).value.trim(),value=key==='stroke_dash'?(raw?raw.split(/[\s,]+/).map(Number):[]):['stroke_dash_offset','stroke_miter_limit'].includes(key)?Number(raw):raw;update({...s,appearance:{...appearance(s),[key]:value}});renderProperties();};
  for(const [id,key] of [['opacity','opacity'],['fill-opacity','fill_opacity'],['stroke-opacity','stroke_opacity'],['image-opacity','image_opacity'],['corner-radius','corner_radius'],['fill-enabled','fill_enabled'],['stroke-enabled','stroke_enabled'],['stroke-color','stroke_color']])$(id).onchange=()=>{const s=id==='stroke-color'?editingPaint(current(),'stroke'):current();if(!s)return;const value=id.endsWith('enabled')?$(id).checked:id==='stroke-color'?$(id).value:Number($(id).value)/(id.endsWith('opacity')?100:1);update({...s,appearance:{...appearance(s),[key]:value}});renderProperties();};
  $('place-image').onclick=()=>{imageReplaceId=0;$('image-file').click();};
  $('replace-image').onclick=()=>{imageReplaceId=current()?.id??0;$('image-file').click();};
  $('image-file').onchange=()=>{const file=$('image-file').files[0],replace=imageReplaceId;$('image-file').value='';if(file)placeImage(file,null,replace);};
  for(const [id,key] of [['image-mode','mode'],['image-zoom','zoom'],['image-x','offset_x'],['image-y','offset_y']])$(id).onchange=()=>{const shape=current();if(!shape?.image)return;const value=key==='mode'?$(id).value:Number($(id).value)/(key.startsWith('offset')?100:1);update({...shape,image:{...shape.image,[key]:value}});renderProperties();};
  $('reset-crop').onclick=()=>{const s=current();if(s?.image)update({...s,image:{...s.image,zoom:1,offset_x:.5,offset_y:.5}});};
  canvas.ondragover=event=>{event.preventDefault();event.dataTransfer.dropEffect='copy';if(event.dataTransfer.types.includes(ASSET_MIME)){if(!assetDrag){event.dataTransfer.dropEffect='none';return;}assetDrag.point=point(event);assetDrag.parent=frameAt(pageShapes(),assetDrag.point);draw();}};
  canvas.ondragleave=()=>{if(assetDrag){assetDrag.point=null;draw();}};
  canvas.ondrop=event=>{event.preventDefault();if(event.dataTransfer.types.includes(ASSET_MIME)){const master=readAssetDrag(event.dataTransfer.getData(ASSET_MIME),assetDragToken),p=point(event);clearAssetDrag();safe(()=>{const source=doc.shapes.find(s=>s.id===master&&s.component?.type==='master');if(!source)throw new Error('Drag a component from this file’s Assets panel');const placement=centeredPlacement(source,p),parent=frameAt(pageShapes(),p);setSelection([editor.place_instance(master,placement.x,placement.y,parent)]);refresh();toast(parent?'Linked instance placed in frame':'Linked instance placed');});return;}const file=event.dataTransfer.files[0];if(file){if(/\.(fig|pixl|json)$/i.test(file.name))importDesignFile(file).catch(error=>{if(error.name!=='AbortError')toast(error.message);});else placeImage(file,point(event));}};
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
  for(const value of ['portrait','landscape'])$('frame-'+value).onclick=()=>{const s=current();if(s?.kind==='frame')update(orientFrame(s,value));};
  $('show-device-chrome').onchange=()=>{const s=current();if(s?.kind==='frame')update({...s,device_chrome:s.device_chrome&&s.device_chrome!=='none'?s.device_chrome:'auto',device_chrome_hidden:!$('show-device-chrome').checked});};
  $('reset-chrome-widths').onclick=()=>{const s=current();if(!s)return;for(const id of ['chrome-tablet-width','chrome-desktop-width'])$(id).setCustomValidity('');update({...s,device_chrome_breakpoints:{tablet:600,desktop:1024}});};
  for(const id of ['chrome-tablet-width','chrome-desktop-width']){
   $(id).oninput=()=>$(id).setCustomValidity('');
   $(id).onchange=()=>{const s=current();if(!s)return;const tablet=Number($('chrome-tablet-width').value),desktop=Number($('chrome-desktop-width').value);if(!Number.isFinite(tablet)||tablet<1||!Number.isFinite(desktop)||desktop<=tablet){$(id).setCustomValidity('Desktop width must be greater than tablet width, and both must be positive.');$(id).reportValidity();return;}update({...s,device_chrome_breakpoints:{tablet,desktop}});};
  }
  $('device-chrome').onchange=()=>{if(current()?.kind==='frame')update({...current(),device_chrome:$('device-chrome').value,device_chrome_breakpoints:chromeBreakpoints(current().device_chrome_breakpoints)});};
  $('clip-content').onchange=()=>{if(current()?.kind==='frame')update({...current(),clip_content:$('clip-content').checked});};
  $('move-to-frame').onclick=()=>safe(()=>{editor.reparent_many(selectionJson(),Number($('parent-frame').value));refresh();});
  for(const axis of ['horizontal','vertical'])$('constraint-'+axis).onchange=()=>{const value=$('constraint-'+axis).value;if(value)updateMany(selectionShapes().map(s=>({...s,constraints:{horizontal:'min',vertical:'min',...s.constraints,[axis]:value}})));};
  $('group-layers').onclick=groupSelection; $('ungroup-layers').onclick=ungroupSelection;
  $('apply-scale').onclick=()=>safe(()=>{const shapes=transformedSelection(),box=bounds(selectionShapes());if(box) updateMany(scaleShapes(shapes,box,Number($('scale-percent').value)/100));});
  $('stroke-width').onchange=()=>{if(current()) update({...current(),stroke_width:Number($('stroke-width').value)}); renderProperties();};
  $('edit-path').onclick=()=>{if(!canvasEditable()){toast('Unlock the layer or its parent to edit on canvas');return;}if(current()?.points?.length){if(tool!=='select')setTool('select');editingGradient=0;activeGradient=null;editingPath=editingPath?0:current().id;activeNode=-1;renderProperties(); $('hint').textContent=editingPath?'Drag anchors or handles · Alt-drag an anchor to create handles · Enter to finish':'Double-click a vector to edit points'; draw();}};
  document.addEventListener('pointerdown',event=>{ if(!event.target.closest('.tool-group')) document.querySelectorAll('.tool-group').forEach(el=>el.open=false); });
  const showShortcuts = () => { document.querySelector('.file-menu').open = false; $('shortcuts-dialog').showModal(); };
  for (const id of ['shortcuts','nav-help']) $(id).onclick = showShortcuts;
  const toolActions=[['select','Move','V'],['scale','Scale','K'],['hand','Hand / pan','H'],['frame','Frame','F'],['rectangle','Rectangle','R'],['ellipse','Ellipse','O'],['line','Line','L'],['arrow','Arrow','Shift L'],['polygon','Polygon',''],['star','Star',''],['pen','Pen','P'],['pencil','Pencil','Shift P'],['text','Text','T']].map(([tool,label,shortcut])=>({label,shortcut,category:'Drawing',run:()=>{setTool(tool);canvas.focus();}}));
  const commands=[['create-component','Create component','Components','Ctrl/⌘ Alt K','Select ordinary layers'],['combine-variants','Combine as variants','Components','','Select two or more main components'],['add-variant','Add variant','Components','','Select a main component or component set'],['insert-instance','Insert instance','Components','','Select a main component'],['nav-assets','Browse components','Components'],['push-style-overrides','Push text and styles to main','Components','','Select an instance with text or style overrides'],['select-instance-root','Select outer instance','Components','','Select a child of an instance'],['go-nested-main','Go to nested main component','Components','','Select a nested component layer'],['add-auto-layout','Add Flex Layout','Layout','Shift A','Select layers without a layout'],['group-layers','Group selection','Layers','Ctrl/⌘ G','Select sibling layers'],['ungroup-layers','Ungroup selection','Layers','Ctrl/⌘ Shift G','Select a group'],['duplicate','Duplicate selection','Layers','Ctrl/⌘ D','Select layers'],['delete','Delete selection','Layers','Delete','Select layers'],['undo','Undo','History','Ctrl/⌘ Z','No edits to undo'],['redo','Redo','History','Ctrl/⌘ Shift Z','No edits to redo'],['place-image','Place image or SVG','Drawing','Ctrl/⌘ Shift K'],['add-page','New page','Pages'],['rename-page','Rename page','Pages'],['delete-page','Delete page','Pages','','Keep at least one page'],['menu-new-design','New design','Files'],['browse-drafts','All projects','Files'],['cloud-files','Cloud files','Files'],['open','Open design','Files'],['save','Save local copy','Files','Ctrl/⌘ S'],['export-artwork','Export artwork','Files'],['export','Export pages / project','Files'],['present-prototype','Present prototype','Prototype'],['shortcuts','Keyboard shortcuts','Help','?']].filter(([id])=>!staticHost||id!=='cloud-files').map(([id,label,category,shortcut,unavailable])=>({label,category,shortcut,unavailable,enabled:()=>{const b=$(id);return !!b&&!b.disabled&&(['undo','redo','place-image'].includes(id)||![...document.querySelectorAll('[hidden]')].some(el=>!['file-panel','pages-panel','assets-panel'].includes(el.id)&&el.contains(b)));},run:()=>$(id).click()}));
  commands.push({label:'Show / hide selection',category:'Layers',shortcut:'Ctrl/⌘ Shift H',enabled:()=>selectedIds.size>0,run:toggleSelectionVisibility},{label:'Rename layer',category:'Layers',shortcut:'Ctrl/⌘ R',enabled:()=>!!current(),run:renameSelection},{label:'Lock / unlock selection',category:'Layers',shortcut:'Ctrl/⌘ Shift L',enabled:()=>selectionShapes().some(s=>!inheritedLock(s)),run:toggleSelectionLock});
  commands.push({label:'Remove layout',category:'Layout',shortcut:'Alt Shift A',enabled:()=>selectionShapes().some(s=>s.auto_layout),unavailable:'Select a Flex Layout or Grid Layout frame',run:removeAutoLayout});
  commands.push({label:'Frame selection',category:'Layout',shortcut:'Ctrl/⌘ Alt G',enabled:()=>selectedIds.size>0,unavailable:'Select sibling layers',run:frameSelection});
  commands.push(...[['front','Bring to front',']'],['back','Send to back','['],['forward','Bring forward','Ctrl/⌘ ]'],['backward','Send backward','Ctrl/⌘ [']].map(([direction,label,shortcut])=>({label,shortcut,category:'Layers',enabled:()=>selectedIds.size>0,unavailable:'Select layers',run:()=>arrangeSelection(direction)})));
  const showIconLibrary=installIconLibrary({insert:(svg,name)=>safe(()=>placeSvg(parseSvg(svg,name))),notify:toast});
  commands.push({label:'PixlPrfct Icon Library',category:'Libraries',run:showIconLibrary});
  const showAgentConnection=installAgentConnection({editor,documentName:()=>doc?.name??'Untitled',identity:()=>location.search,createEditor:agentEditor,guard:(before,after,history)=>libraries?.guard(before,after,history)??(projectLoading?'Wait for the project to finish loading.':null),options:()=>({textLayout}),finalize:instance=>{let next=JSON.parse(instance.snapshot());if(next.shapes.some(s=>s.component?.type!=='instance'&&!s.layout_item?.grid_container&&s.auto_layout?.direction==='grid'&&!s.auto_layout.grid?.cell_containers))instance.enable_grid_containers();next=ensureBaseTextDocument(JSON.parse(instance.snapshot()));if(next)instance.load(JSON.stringify(next));},changed:()=>{setSelection([...selectedIds].filter(id=>JSON.parse(editor.snapshot()).shapes.some(s=>s.id===id)));refresh();},busy:()=>projectLoading||!!gesture||!!textEditing||!!layoutCssPreview||!!layerCssPreview||!!gridPickerPreview,selection:()=>[...selectedIds],select:(ids,page)=>{editor.select_page(page);refresh(false);setSelection(ids);renderLayers();renderProperties();draw();}});
  commands.push({label:'MCP connection',category:'Development',keywords:'agent AI automation bridge',run:showAgentConnection});
  const showActions=installActionPanel([...toolActions,...commands]);$('nav-tools').onclick=showActions;
  $('close-shortcuts').onclick = () => $('shortcuts-dialog').close();
  const showSearch = () => { showFilePanel(); $('search-panel').hidden = !$('search-panel').hidden; if (!$('search-panel').hidden) { document.querySelector('.left-panel').classList.add('mobile-open'); $('layer-search').focus(); } else { $('layer-search').value = ''; renderLayers(); } };
  $('search-toggle').onclick = showSearch;
  for(const [id,collapse] of [['expand-all-layers',false],['collapse-all-layers',true]]){
    $(id).onclick=()=>{
      for(const shape of pageShapes())if(['frame','group'].includes(shape.kind)){
        if(collapse)collapsedFrames.add(shape.id);else collapsedFrames.delete(shape.id);
      }
      // Search presents a flat list; restore the tree to show the requested state.
      $('layer-search').value='';renderLayers();
    };
  }
  installPageDrop($('page-switch-menu'),(id,target,after,copy)=>safe(()=>{if(copy)editor.duplicate_page_at(id,target,after);else editor.reorder_page(id,target,after);refresh();}),{canCopy:()=>doc.pages.length<100});
  $('nav-layers').onclick=showFilePanel;
  const pageTypeahead=createPageTypeahead();
  let lastSearchPage=null;
  const highlightPageMatches=()=>{
    const query=pageTypeahead.query;
    for(const item of $('page-switch-options').querySelectorAll('[data-page-id]')){
      const label=item.firstElementChild,text=label.textContent,nodes=[];
      const ranges=pageMatchRanges(text,query);
      item.hidden=!!query&&!ranges.length;
      let cursor=0;
      for(const [start,end] of ranges){
        nodes.push(document.createTextNode(text.slice(cursor,start)));
        const mark=document.createElement('mark');mark.className='page-name-match';mark.textContent=text.slice(start,end);
        nodes.push(mark);cursor=end;
      }
      nodes.push(document.createTextNode(text.slice(cursor)));
      label.replaceChildren(...nodes);
    }
  };
  const updatePageSearchStatus=id=>{
    const query=pageTypeahead.query;$('clear-page-search').hidden=!query;if(!query)return;
    const matches=doc.pages.filter(page=>pageMatchRanges(page.name,query).length);
    const index=matches.findIndex(page=>page.id===id),status=$('page-typeahead-status');
    if(index>=0)lastSearchPage=id;
    $('page-typeahead-text').textContent=matches.length?'Jump to: “'+query+'” · '+(index>=0?(index+1)+' of '+matches.length:matches.length+' matching '+(matches.length===1?'page':'pages')):'No matching pages for “'+query+'” · 0 of 0';
    status.dataset.noMatch=String(matches.length===0);status.hidden=false;
  };
  $('page-switch-options').addEventListener('pages-rendered',()=>{if(pageTypeahead.query){highlightPageMatches();updatePageSearchStatus(Number(document.activeElement.dataset.pageId));}});
  $('page-switch-options').addEventListener('focusin',event=>{
    const row=event.target.closest('[data-page-id]');if(row)updatePageSearchStatus(Number(row.dataset.pageId));
  });
  const clearPageSearch=()=>{pageTypeahead.reset();$('page-search-input').value='';$('clear-page-search').hidden=true;highlightPageMatches();$('page-typeahead-status').hidden=true;$('page-typeahead-text').textContent='';};
  $('page-search-input').oninput=()=>{
    pageTypeahead.setQuery($('page-search-input').value,performance.now());
    if(!pageTypeahead.query){clearPageSearch();return;}
    lastSearchPage=null;highlightPageMatches();updatePageSearchStatus(null);
  };
  for(const type of ['copy','cut','paste']){
    // Keep native text editing while isolating it from canvas clipboard actions.
    $('page-search-input').addEventListener(type,event=>event.stopPropagation());
  }
  $('page-search-input').onkeydown=event=>{
    // Let the dropdown handle list navigation from the search field too.
    if(!event.isComposing&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&['PageUp','PageDown','Home','End'].includes(event.key))return;
    event.stopPropagation();if(event.isComposing)return;
    if(event.metaKey&&!event.ctrlKey&&!event.altKey&&!event.shiftKey&&['Backspace','Delete'].includes(event.key)){
      event.preventDefault();
      const input=$('page-search-input');
      if(input.selectionStart===input.selectionEnd){
        const cursor=input.selectionStart;
        input.setSelectionRange(event.key==='Backspace'?0:cursor,event.key==='Backspace'?cursor:input.value.length);
      }
      if(input.selectionStart===input.selectionEnd)return;
      // Use native editing so the deletion remains part of the text undo history.
      document.execCommand('delete');return;
    }
    if(event.metaKey&&!event.ctrlKey&&!event.altKey&&['ArrowLeft','ArrowRight'].includes(event.key)){
      event.preventDefault();
      const input=$('page-search-input'),position=event.key==='ArrowLeft'?0:input.value.length;
      if(event.shiftKey){
        const anchor=input.selectionDirection==='backward'?input.selectionEnd:input.selectionStart;
        input.setSelectionRange(Math.min(anchor,position),Math.max(anchor,position),position<anchor?'backward':'forward');
      }else input.setSelectionRange(position,position);
      return;
    }
    if((event.metaKey||event.ctrlKey)&&!event.altKey&&!event.shiftKey&&event.key.toLowerCase()==='a'){
      event.preventDefault();$('page-search-input').select();return;
    }
    if(event.key==='Tab'&&!event.altKey&&!event.ctrlKey&&!event.metaKey){
      event.preventDefault();
      if(!event.shiftKey&&pageTypeahead.query){$('clear-page-search').focus({preventScroll:true});return;}
      const matches=doc.pages.filter(page=>!pageTypeahead.query||pageMatchRanges(page.name,pageTypeahead.query).length);
      const page=event.shiftKey?matches.at(-1):matches[0];
      if(page)focusPage(page.id);
      return;
    }
    if(event.key==='Escape'){
      event.preventDefault();
      if(pageTypeahead.query)clearPageSearch();
      else {$('layers-page-control').open=false;$('layers-page').focus();}
    }else if(['ArrowDown','ArrowUp','Enter'].includes(event.key)&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey){
      event.preventDefault();
      const matches=doc.pages.filter(page=>!pageTypeahead.query||pageMatchRanges(page.name,pageTypeahead.query).length);
      const page=event.key==='ArrowUp'?matches.at(-1):matches[0];
      if(page){if(event.key==='Enter'){$('layers-page-control').open=false;switchPage(page.id);$('layers-page').focus();}else focusPage(page.id);}
    }
  };
  $('clear-page-search').onclick=event=>{event.stopPropagation();clearPageSearch();$('page-search-input').focus();};
  $('clear-page-search').onkeydown=event=>{
    if(event.key==='Tab'){
      event.preventDefault();event.stopPropagation();
      if(event.shiftKey)$('page-search-input').focus({preventScroll:true});
      else {
        const page=doc.pages.find(page=>!pageTypeahead.query||pageMatchRanges(page.name,pageTypeahead.query).length);
        if(page)focusPage(page.id);
        else $('page-search-input').focus({preventScroll:true});
      }
      return;
    }
    // Let the button activate natively without the dropdown consuming Space or Enter.
    if(event.key==='Enter'||event.key===' ')event.stopPropagation();
  };
  let pageOpenFocus=null;
  $('layers-page').addEventListener('keydown',event=>{
    if(event.isComposing||event.altKey||event.ctrlKey||event.metaKey||event.shiftKey||!['ArrowDown','ArrowUp'].includes(event.key))return;
    event.preventDefault();event.stopPropagation();
    const picker=$('layers-page-control'),page=event.key==='ArrowDown'?doc.pages[0]:doc.pages.at(-1);
    if(picker.open){clearPageSearch();if(page)focusPage(page.id);}
    else {pageOpenFocus=page?.id??null;picker.open=true;}
  });
  $('layers-page-control').addEventListener('toggle',()=>{
    lastSearchPage=null;clearPageSearch();
    if($('layers-page-control').open){
      $('page-switch-menu').scrollTop=0;
      if(pageOpenFocus!==null)focusPage(pageOpenFocus);
      else $('page-search-input').focus({preventScroll:true});
    }
    pageOpenFocus=null;
  });
  $('page-search-shortcut').textContent=/Mac|iPhone|iPad/.test(navigator.platform)?'⌘ F':'Ctrl F';
  $('page-search-input').setAttribute('aria-keyshortcuts','Meta+F Control+F');
  $('layers-page-control').addEventListener('keydown',event=>{
    if(!$('layers-page-control').open||event.isComposing||event.key.toLowerCase()!=='f'||!(event.metaKey||event.ctrlKey)||event.altKey||event.shiftKey)return;
    event.preventDefault();event.stopPropagation();
    const input=$('page-search-input');input.focus();input.select();
  },true);
  $('layers-page-control').addEventListener('keydown',event=>{
    event.stopPropagation();
    const picker=$('layers-page-control'),items=[...$('page-switch-menu').querySelectorAll('button:not(:disabled):not(#clear-page-search)')];
    if(picker.open&&event.key==='Tab'&&!event.altKey&&!event.ctrlKey&&!event.metaKey){
      const matches=doc.pages.filter(page=>!pageTypeahead.query||pageMatchRanges(page.name,pageTypeahead.query).length);
      const index=matches.findIndex(page=>String(page.id)===event.target.closest('[data-page-id]')?.dataset.pageId);
      if(index>=0){
        const next=matches[index+(event.shiftKey?-1:1)];
        if(next){event.preventDefault();focusPage(next.id);}
        else if(event.shiftKey&&pageTypeahead.query){event.preventDefault();$('clear-page-search').focus({preventScroll:true});}
        else {event.preventDefault();$('page-search-input').focus({preventScroll:true});}
      }
      return;
    }
    if(picker.open&&!event.target.closest('input,textarea,[contenteditable],.selection-menu')&&!event.isComposing&&!event.metaKey&&!event.ctrlKey&&!event.altKey&&(event.key.length===1||event.key==='Backspace')){
      const id=pageTypeahead.match(event.key,doc.pages,Number(document.activeElement.dataset.pageId),performance.now());
      if(event.key!==' '||pageTypeahead.query){
        event.preventDefault();
        if(!pageTypeahead.query){clearPageSearch();return;}
        $('page-search-input').value=pageTypeahead.query;
        updatePageSearchStatus(id);
        highlightPageMatches();
        if(id!==null)focusPage(id);
        else $('layers-page').focus({preventScroll:true});
        return;
      }
    }
    if(picker.open&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&['PageDown','PageUp'].includes(event.key)){
      event.preventDefault();
      const menu=$('page-switch-menu'),row=$('page-switch-options').querySelector('button:not([hidden])');
      const available=menu.clientHeight-$('page-search-header').getBoundingClientRect().height;
      const step=Math.max(1,Math.floor(available/(row?.getBoundingClientRect().height||32)));
      const id=cyclePageMatch(doc.pages,pageTypeahead.query,Number(document.activeElement.dataset.pageId),event.key==='PageDown'?step:-step,false);
      updatePageSearchStatus(id);
      if(id!==null)focusPage(id);
      return;
    }
    if(picker.open&&!event.altKey&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
      event.preventDefault();
      const id=cyclePageMatch(doc.pages,pageTypeahead.query,Number(document.activeElement.dataset.pageId),event.key==='Home'?'first':event.key==='End'?'last':event.key==='ArrowDown'?1:-1);
      updatePageSearchStatus(id);
      if(id!==null)focusPage(id);
      return;
    }
    if(event.key==='Escape'&&pageTypeahead.query){event.preventDefault();clearPageSearch();focusPage(lastSearchPage??doc.active_page);return;}
    if(['ArrowDown','ArrowUp','Home','End','Escape','Enter','Tab'].includes(event.key))clearPageSearch();
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();picker.open=false;$('layers-page').focus();return;}
    if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();event.stopPropagation();picker.open=true;const index=items.indexOf(document.activeElement),next=event.key==='Home'?0:event.key==='End'?items.length-1:event.key==='ArrowDown'?(index+1)%items.length:(index<0?items.length-1:(index-1+items.length)%items.length);items[next]?.focus();}
  });
  document.addEventListener('pointerdown',event=>{if(!event.target.closest('#layers-page-control'))$('layers-page-control').open=false;});
  $('layers-page-control').addEventListener('focusout',event=>{if(event.relatedTarget&&!$('layers-page-control').contains(event.relatedTarget))$('layers-page-control').open=false;});
  for(const id of ['add-page','duplicate-page','rename-page','delete-page']) $(id).addEventListener('click',()=>{$('layers-page-control').open=false;});
  $('layer-search').oninput = renderLayers;
  document.querySelectorAll('.menu-panel button').forEach(button => button.addEventListener('click', () => document.querySelector('.file-menu').open = false));
  document.addEventListener('pointerdown', event => { if (!event.target.closest('.file-menu')) document.querySelector('.file-menu').open = false; });
  const divider = $('sidebar-resize');
  for(const [handle,side,variable,direction] of [[divider,'left','--left-width',1],[$('inspector-resize'),'right','--right',-1]]){
    const panel=document.querySelector(`.${side}-panel`),other=document.querySelector(`.${side==='left'?'right':'left'}-panel`);
    let drag=null;
    const maximum=()=>{const mobile=matchMedia('(max-width:760px)').matches,otherWidth=mobile&&side==='right'?0:other.getBoundingClientRect().width;return Math.max(200,Math.min(400,document.querySelector('main').clientWidth-otherWidth-(mobile?210:180)));};
    const sync=()=>{handle.setAttribute('aria-valuenow',Math.round(panel.getBoundingClientRect().width));handle.setAttribute('aria-valuemax',Math.floor(maximum()));};
    const setWidth=width=>{document.documentElement.style.setProperty(variable,`${Math.round(Math.max(200,Math.min(maximum(),width)))}px`);sync();};
    const finish=cancel=>{
      if(!drag)return;const start=drag;drag=null;handle.classList.remove('resizing');
      if(cancel){if(start.custom)document.documentElement.style.setProperty(variable,start.custom);else document.documentElement.style.removeProperty(variable);sync();}
      if(handle.hasPointerCapture(start.id))handle.releasePointerCapture(start.id);
    };
    handle.onpointerdown=event=>{if(event.button!==0)return;event.preventDefault();handle.focus({preventScroll:true});drag={id:event.pointerId,x:event.clientX,width:panel.getBoundingClientRect().width,custom:document.documentElement.style.getPropertyValue(variable)};handle.setPointerCapture(event.pointerId);handle.classList.add('resizing');};
    handle.onpointermove=event=>{if(drag?.id===event.pointerId)setWidth(drag.width+direction*(event.clientX-drag.x));};
    handle.onpointerup=()=>finish(false);
    handle.onpointercancel=handle.onlostpointercapture=()=>finish(true);
    handle.onkeydown=event=>{
      if(event.key==='Escape'&&drag){event.preventDefault();event.stopPropagation();finish(true);return;}
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
      event.preventDefault();event.stopPropagation();
      if(drag||event.altKey||event.ctrlKey||event.metaKey)return;
      if(event.key==='Home')setWidth(200);else if(event.key==='End')setWidth(maximum());
      else if(['ArrowLeft','ArrowRight'].includes(event.key))setWidth(panel.getBoundingClientRect().width+direction*(event.key==='ArrowRight'?10:-10));
    };
    window.addEventListener('blur',()=>finish(true));
    window.addEventListener('resize',()=>{finish(true);const width=document.documentElement.style.getPropertyValue(variable);if(width)setWidth(parseFloat(width));sync();});
    const panelObserver=new ResizeObserver(sync);panelObserver.observe(panel);panelObserver.observe(other);sync();
  }
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
  let fontEditId=0;const originalFont=$('font-family'),familyInput=fontInput(originalFont.value,family=>{const s=current();if(s?.id===fontEditId&&s?.kind==='text')update({...s,typography:{...textStyle(s),font_family:family}});});familyInput.id='font-family';familyInput.addEventListener('focus',()=>{fontEditId=selected;});familyInput.addEventListener('input',()=>{fontEditId=selected;});originalFont.replaceWith(familyInput);
  $('fit-text').onclick = () => { if (current()?.kind === 'text') update({ ...current(), height: Math.ceil(textLayout(current()).height) }); };
  canvas.ondblclick = event => {
    if(textEditing)return;
    if(tool!=='select') return;
    if(editingGradient&&gradientShape()?.appearance?.[gradientField()]){const hit=gradientPosition(gradientShape(),point(event),gradientField());if(hit.distance<10/zoom){const result=addGradientStopAt(gradientShape(),hit.t,gradientField());if(result){activeGradient=result.active;update(result.shape);}else toast('Gradients support up to 16 color stops');}return;}
    if(editingPath&&current()?.points?.length){const p=point(event),shape=current();if(anchors(shape).some(a=>Math.hypot(a.x-p.x,a.y-p.y)<8/zoom))return;const hit=nearestSegment(shape,p);if(hit&&hit.distance<10/zoom)safe(()=>{const changed=insertAnchor(shape,hit.segment,hit.t);activeNode=hit.segment+1;update(changed);});return;}
    const p = point(event), hit = canvasHit(p.x, p.y), target=selectionTarget(pageShapes(),hit,[...selectedIds],{drill:true}); setSelection(target ? [target] : []); refresh(false);
    if(editorRole(current())||current()?.editor_meta?.text_path){development.activate('design');renderToolInspector.focus();}
    else if (current()?.kind === 'text') beginText(current(),{point:event,word:true});
    else if(current()?.component?.type==='master'&&current()?.control){
      const source=descendants(pageShapes(),[current().id]).find(s=>s.kind==='text'&&!s.hidden);
      if(source){beginText(source,{point:event,word:true});return;}
      const section=$('control-inspector');if(section.classList.contains('inspector-collapsed'))section.querySelector('.inspector-section-toggle')?.click();
      const label=section.querySelector('input[aria-label="Accessible label"]');label?.focus();label?.select();label?.scrollIntoView({block:'nearest'});
    }
    else if(current()?.points?.length) $('edit-path').click();
  };
  document.fonts.addEventListener('loadingdone', () => safe(()=>{viewportRenderer.invalidate();editor.refresh_text_layout();refresh();}));
  $('add-page').onclick = () => safe(() => { editor.add_page(); refresh(); setTool('select'); toast('New page added — pick a tool to start designing'); });
  $('duplicate-page').onclick = () => safe(() => { editor.duplicate_page(doc.active_page); refresh(); setTool('select'); toast('Page duplicated'); });
  $('delete-page').onclick = () => safe(() => { editor.delete_page(doc.active_page); refresh(); toast('Page deleted. Use Undo to restore it.'); });
  $('rename-page').onclick = () => { $('page-name').value = activePage().name; $('page-dialog').showModal(); $('page-name').focus(); $('page-name').select(); };
  $('cancel-page-name').onclick = () => $('page-dialog').close();
  $('page-form').onsubmit = event => { event.preventDefault(); safe(() => { editor.rename_page(doc.active_page, $('page-name').value); $('page-dialog').close(); refresh(); }); };
  $('page-picker').onchange = () => switchPage(Number($('page-picker').value));
  $('mobile-add-page').onclick = () => $('add-page').click();
  $('mobile-rename-page').onclick = () => $('rename-page').click();
  $('mobile-delete-page').onclick = () => $('delete-page').click();
  document.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => setTool(b.dataset.tool));
  const applyHistory=direction=>{gesture=null;activeNode=-1;const before=JSON.parse(editor.snapshot()),selection={frame:editingGridAreas,name:activeGridArea};editor[direction]();const after=JSON.parse(editor.snapshot()),gridItems=historyGridItemSelection(before,after,[...selectedIds]),next=historyAreaSelection(before,after,selection);if(next){setSelection([next.frame]);editingGridAreas=next.frame;activeGridArea=next.name;setTool('select');}else {activeGridArea=null;if(gridItems)setSelection(gridItems);}refresh();if(next){revealSelectedArea();canvas.focus();}else if(gridItems)canvas.focus({preventScroll:true});};
  $('undo').onclick=()=>applyHistory('undo');$('redo').onclick=()=>applyHistory('redo');
  $('zoom-fit').onclick = fit; $('zoom-in').onclick = () => zoomAt(1.2); $('zoom-out').onclick = () => zoomAt(1 / 1.2);
  $('document-name').onchange = () => safe(() => { editor.load(JSON.stringify({ ...doc, name: $('document-name').value.trim() || 'Untitled design' })); refresh(); });
  $('document-name').onkeydown = event => {
    if(!['Enter','Escape'].includes(event.key))return;
    event.preventDefault();event.stopPropagation();
    if(event.key==='Escape')$('document-name').value=doc.name;
    $('document-name').blur();$('document-actions').focus();
  };
  const documentActions=$('document-actions');let closeDocumentMenu=null;
  const openDocumentMenu=event=>{
    if(closeDocumentMenu){closeDocumentMenu(true);return;}
    $('layers-page-control').open=false;document.querySelector('.file-menu').open=false;
    closeDocumentMenu=showContextMenu(event,[
      {label:'New design…',run:()=>goProjectHome(true)},
      {label:'All projects',run:()=>goProjectHome()},
      {separator:true},
      {label:'Rename…',run:()=>{$('document-name').focus();$('document-name').select();}},
      {label:'Save a local copy…',shortcut:'Ctrl/⌘ S',run:()=>$('save').click()},
      {separator:true},
      {label:'Export code / project…',run:()=>$('export').click()},
      {label:'Export artwork…',run:()=>$('export-artwork').click()},
      {separator:true},
      {label:'Open project…',run:()=>$('open').click()},
      ...(staticHost?[]:[
       {label:'Cloud files…',run:()=>$('cloud-files').click()},
       {label:'Version history…',enabled:!!cloud?.session.active,unavailable:'Version history is available for cloud files.',run:()=>safe(()=>cloud?.history())},
      ]),
    ],documentActions,{label:'Document actions',heading:doc.name,anchor:$('document-name'),onClose:()=>{closeDocumentMenu=null;documentActions.setAttribute('aria-expanded','false');}});
    documentActions.setAttribute('aria-expanded','true');
  };
  documentActions.onclick=openDocumentMenu;
  for(const id of ['browse-drafts','menu-drafts'])$(id).onclick=()=>goProjectHome();
  $('menu-new-design').onclick=()=>goProjectHome(true);
  documentActions.onkeydown=event=>{
    if(!['ArrowDown','ArrowUp'].includes(event.key))return;
    event.preventDefault();event.stopPropagation();openDocumentMenu(event);
    if(event.key==='ArrowUp')[...document.querySelectorAll('#selection-menu button:not(:disabled)')].at(-1)?.focus();
  };
  for (const key of ['x', 'y', 'width', 'height', 'fill', 'text']) $(key).onchange = () => {
    if (!current()) return; const value = ['x', 'y', 'width', 'height'].includes(key) ? Number($(key).value) : $(key).value;
    const s=key==='fill'?editingPaint(current(),'fill'):current(),locked=!s.control&&s.component?.type!=='instance'&&s.aspect_ratio_locked&&['width','height'].includes(key),size=locked?ratioSize(s,key,value):{[key]:value};
    update(resizeText(fixedResize({...s,...size},locked||key==='width',locked||key==='height'),locked||key==='width',locked||key==='height')); renderProperties();
  };
  $('rotation').onchange=()=>{const s=current();if(s)update(rotateToAngle(s,Number($('rotation').value)));};
  $('shape-name').onchange = () => current() && update({ ...current(), name: $('shape-name').value });
  $('visible').onchange = () => current() && update({ ...current(), hidden: !$('visible').checked });
  $('duplicate').onclick = duplicateSelection;
  $('delete').onclick = deleteSelection;
  $('forward').onclick = () => arrangeSelection('forward');
  $('backward').onclick = () => arrangeSelection('backward');
  $('css-canvas').onclick=()=>{cssCanvasEnabled=!cssActive();gesture=null;draw();};
  const openCodeExport=ids=>showCodeExport(doc,ids,options=>{if(options.target==='pixl'){const file=projectFile(editor.snapshot());download(file.name,file.data,file.type);toast('Editable project exported — share the .pixl file');return;}download('pixlprfct-'+options.target+'.zip',zipFiles(codeExportFiles(doc,{...options,textLayout})),'application/zip');toast(options.target==='html'?'HTML, CSS and JavaScript exported':options.target.toUpperCase()+' '+(options.scope==='project'?'project':'component')+' exported');},()=>$('file').click());
  $('export-css').onclick=()=>openCodeExport([...selectedIds]);
  $('export').onclick=()=>openCodeExport([]);
  $('export-code-option').onclick=()=>{$('export-dialog').close();$('export-css').click();};
  $('save').onclick = () => safe(()=>{const file=projectFile(editor.snapshot());download(file.name,file.data,file.type);toast('Editable project downloaded');});
  $('export-artwork').onclick=()=>{$('export-selection-option').disabled=!selectedIds.size;$('export-scope').value=selectedIds.size?'selection':'page';exportSummary();$('export-dialog').showModal();};
  for(const id of ['export-format','export-scope','export-scale','export-quality','export-transparent','export-background']){$(id).onchange=exportSummary;$(id).oninput=exportSummary;}
  $('export-cancel').onclick=()=>$('export-dialog').close();$('export-download').onclick=()=>exportArtwork().catch(error=>{$('export-summary').textContent=String(error);}); $('open').onclick = () => $('file').click();
  $('file').onchange = async () => {
    const file = $('file').files[0]; if (!file) return;
    try { await importDesignFile(file); }
    catch (error) { if(error.name!=='AbortError')toast(`Could not open design: ${error}`); } finally { $('file').value = ''; }
  };
  canvas.oncontextmenu=event=>{const p=point(event);showSelectionMenu(event,canvasHit(p.x,p.y));};
  canvas.onpointerdown = event => safe(() => {
    if (!editor || (event.button !== 0 && event.button !== 1)) return;
    prototypeLinkSelected=false;canvas.focus(); canvas.setPointerCapture(event.pointerId);
    const p = point(event);
    if (tool === 'hand' || space || event.button === 1) { tooltips?.hideFor($('grid-area-status')); gesture = { type: 'pan', x: event.clientX, y: event.clientY, pan: { ...pan } }; return; }
    if(tool==='select'&&editingGridAreas===current()?.id&&canvasEditable()){
      const original=current(),frame=transformGeometry(original),plan=gridPlan(frame),areas=original.auto_layout.grid?.areas??[];
      if(!roundedContains(frame,localPoint(frame,p))||!clippingFrames(original,pageShapes()).every(f=>roundedContains(f,p)))return;
      const hit=areaHit(frame,plan,areas,p,zoom,activeGridArea);if(hit)activeGridArea=hit.area.name;
      const name=hit?.area.name??nextAreaName(areas);gesture={type:'grid-area',start:p,original,frame,plan,areas,name,initial:hit?.area,cx:hit?.cx,cy:hit?.cy,area:hit?.area??areaFromDrag(frame,plan,p,p,name),valid:true};activeGridArea=name;draw();return;
    }
    if(tool==='text-path'){const hit=pageShapes().find(s=>s.id===canvasHit(p.x,p.y));if(!hit||editorRole(hit)){toast('Click a vector, shape, or ellipse to place text on its path');return;}const shape=textOnPath(hit),id=insertAt(shape,{x:shape.x,y:shape.y});setSelection([id]);setTool('select');development.activate('design');refresh();renderToolInspector.focus();return;}
    if(tool==='comment'){const id=editor.insert(JSON.stringify(editorShape('comment',p,p)));setSelection([id]);setTool('select');development.activate('design');refresh();renderToolInspector.focus();return;}
    if (tool === 'text') {
      const hit=pageShapes().find(s=>s.id===canvasHit(p.x,p.y));
      if(hit?.kind==='text'){canvas.releasePointerCapture(event.pointerId);beginText(hit,{point:event});return;}
      gesture={type:'text-create',start:p,preview:drawnText(p,p,zoom)};draw();return;
    }
    if (tool === 'pen') {
      if(penPoints.length>=2 && Math.hypot(p.x-penPoints[0].x,p.y-penPoints[0].y)<10/zoom) { finishPen(true); return; }
      if(penPoints.length<4096) { penPoints.push(p); gesture={type:'pen-handle',index:penPoints.length-1}; } draw(); return;
    }
    if(tool==='scale') {
      if(!canvasEditable()){toast('Unlock the selection before scaling on canvas');return;}
      if(!selectedIds.size) {const hit=canvasHit(p.x,p.y);if(hit)setSelection(canvasSelection(pageShapes(),[hit],{selected:[...selectedIds]}));}
      const originals=transformedSelection(),box=bounds(selectionShapes()); if(!box) {toast('Select layers to scale first');return;}
      gesture={type:'scale',start:p,origin:{x:box.x,y:box.y},originals,previews:originals}; renderLayers();renderProperties();return;
    }
    if (tool !== 'select') { setSelection([]); gesture={type:'create',kind:tool,start:p,points:[p],preview:tool==='pencil'?fromPoints(tool,[p,p]):drawnShape(tool,p,p)}; renderProperties(); draw(); return; }
    const shape = current();
    if(prototypeConnections&&!editingPath&&!editingGradient){
      if(shape&&visibleInTree(shape,pageShapes())&&canvasEditable()&&connectionHit(transformGeometry(shape),p,zoom)){gesture={type:'prototype-link',source:shape,index:prototypeInteraction,end:p,target:0};openPrototypeInspector(prototypeInteraction);draw();return;}
      const link=connectionAt(pageShapes().map(transformGeometry),p,zoom);
      if(link){setSelection([link.source]);prototypeInteraction=link.index;refresh(false);prototypeLinkSelected=true;openPrototypeInspector(link.index);return;}
    }
    if(editingGradient&&gradientShape()?.appearance?.[gradientField()]){const paint=gradientShape(),hit=gradientHit(paint,p,zoom,gradientField());if(hit){activeGradient=hit;gesture={type:'gradient',handle:hit,original:paint,preview:paint};renderProperties();draw();return;}if(gradientPosition(gradientShape(),p,gradientField()).distance<10/zoom){activeGradient=null;draw();return;}editingGradient=0;activeGradient=null;renderProperties();}
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
    if(editingLayout===shape?.id&&canvasEditable()&&visibleInTree(shape,pageShapes())&&clippingFrames(shape,pageShapes()).every(f=>roundedContains(f,p))){const handle=spacingHit(shape,pageShapes(),p,zoom,gridPlan(shape));if(handle){activeSpacing=handle.key;gesture={type:'layout-spacing',original:shape,preview:shape,start:p,handle};draw();return;}}
    if (shape && (shape.component?.type!=='instance'||gridSpanParent(shape)) && !shape.hidden && canvasEditable()) {
      const measured=transformGeometry(shape);
      const handle=resizeHandleAt(measured,p,zoom,!!gridSpanParent(shape));
      if(handle){const [cx,cy]=handle;const parent=pageShapes().find(s=>s.id===shape.parent_id);if(parent?.auto_layout?.direction==='grid'&&!parent.auto_layout.grid?.masonry&&!shape.layout_item?.absolute&&!isNamedAreaLayer(shape)){gesture={type:'grid-span',start:p,original:shape,preview:shape,parent:transformGeometry(parent),plan:gridPlan(transformGeometry(parent)),cx,cy};return;}gesture={type:'resize',start:p,original:{...measured,auto_layout:shape.auto_layout},preview:{...shape},cx,cy};return;}
      if(shape.component?.type!=='instance'&&rotationHandleAt(measured,p,zoom)){gesture={type:'rotate',start:p,original:{...measured,auto_layout:shape.auto_layout},preview:{...shape}};canvas.style.cursor=rotateCursor;return;}

    }
    const hit = canvasHit(p.x, p.y);
    if (event.shiftKey && hit) {
      const ids = new Set(selectedIds), hits=event.ctrlKey||event.metaKey?[hit]:canvasSelection(pageShapes(),[hit],{selected:[...selectedIds]}),remove=hits.every(id=>ids.has(id)); hits.forEach(id=>remove?ids.delete(id):ids.add(id)); setSelection([...ids]); refresh(false); return;
    }
    if (!hit) {
      const base = event.shiftKey ? [...selectedIds] : [];
      setSelection(base); refresh(false); gesture = {type:'marquee',start:p,end:p,base,deep:event.ctrlKey||event.metaKey}; return;
    }
    if (event.ctrlKey||event.metaKey) setSelection([hit]);
    else if (!selectedIds.has(hit)) setSelection(canvasSelection(pageShapes(),[hit],{selected:[...selectedIds]}));
    layerAnchor = hit; refresh(false);
    if(!canvasEditable()){toast('Unlock the selection before moving it on canvas');return;}
    gesture = {type:'move',targets:pageShapes().map(s=>({...s,...transformGeometry(s)})),start:p,originals:transformedSelection().map(s=>({...s})),previews:transformedSelection().map(s=>({...s}))};
  });
  canvas.onpointerleave = () => { gridHoverPointer=null; draw(); };
  canvas.onpointermove = event => {
    gridHoverPointer={clientX:event.clientX,clientY:event.clientY};
    if(!gesture)scheduleViewportDraw();
    if (!gesture) {
      if(tool==='text'){const p=point(event),hit=pageShapes().find(s=>s.id===canvasHit(p.x,p.y));canvas.style.cursor=hit?.kind==='text'?'text':'crosshair';return;}
      if(tool==='select'&&editingGridAreas===current()?.id){const frame=transformGeometry(current()),hit=areaHit(frame,gridPlan(frame),current().auto_layout.grid?.areas??[],point(event),zoom,activeGridArea);canvas.style.cursor=hit?.cx!=null?resizeCursor(frame,[hit.cx,hit.cy]):hit?'grab':'crosshair';return;}
      if(tool==='select'&&prototypeConnections&&!editingPath&&!editingGradient){const p=point(event),shape=current();if((shape&&canvasEditable()&&connectionHit(transformGeometry(shape),p,zoom))||connectionAt(pageShapes().map(transformGeometry),p,zoom)){canvas.style.cursor='pointer';return;}}
      if(tool==='select'&&!editingPath&&!editingGradient){const s=current(),measured=s&&transformGeometry(s),p=point(event),handle=measured&&(s.component?.type!=='instance'||gridSpanParent(s))&&canvasEditable()?resizeHandleAt(measured,p,zoom,!!gridSpanParent(s)):null;canvas.style.cursor=handle?resizeCursor(measured,handle):measured&&s.component?.type!=='instance'&&canvasEditable()&&rotationHandleAt(measured,p,zoom)?rotateCursor:'default';}
      return;
    }
    if (gesture.type === 'pan') {
      pan.x = gesture.pan.x + event.clientX - gesture.x; pan.y = gesture.pan.y + event.clientY - gesture.y; scheduleViewportDraw(); return; }
    const p = point(event), original = gesture.original, snap = Math.round;
    if(gesture.type==='text-create'){gesture.preview=drawnText(gesture.start,p,zoom);scheduleViewportDraw();return;}
    if(gesture.type==='grid-area'){canvas.style.cursor=gesture.initial&&gesture.cx==null?'grabbing':canvas.style.cursor;gesture.area=gesture.initial?(gesture.cx==null?moveArea(gesture.frame,gesture.plan,gesture.initial,gesture.start,p):resizeArea(gesture.frame,gesture.plan,gesture.initial,p,gesture.cx,gesture.cy)):areaFromDrag(gesture.frame,gesture.plan,gesture.start,p,gesture.name);gesture.valid=validArea(gesture.areas,gesture.area);
      const areaKey=JSON.stringify(gesture.area);
      if(gesture.initial&&gesture.valid){if(gesture.previewKey!==areaKey){const frame={...gesture.original,auto_layout:{...gesture.original.auto_layout,grid:{...gesture.original.auto_layout.grid,areas:gesture.areas.map(a=>a.name===gesture.name?gesture.area:a)}}};try{const result=JSON.parse(editor.preview_layout_update(JSON.stringify([frame]),frame.id));gesture.scene=result.document.shapes.filter(s=>s.page_id===doc.active_page);gesture.previewKey=areaKey;}catch{gesture.scene=null;gesture.previewKey=null;}}}
      else {gesture.scene=null;gesture.previewKey=null;}
      scheduleViewportDraw();return;}
    if(gesture.type==='grid-span'){gesture.preview=gridSpanResize(original,gesture.parent,gesture.plan,p,gesture.cx,gesture.cy);try{const result=JSON.parse(editor.preview_layout_update(JSON.stringify([gesture.preview]),gesture.parent.id));gesture.scene=result.document.shapes.filter(s=>s.page_id===doc.active_page);gesture.grid=result.grid;}catch{gesture.scene=null;}scheduleViewportDraw();return;}
    if(gesture.type==='rotate'){gesture.preview=shapeToLocal(rotateFromDrag(original,gesture.start,p,event.shiftKey),pageShapes());scheduleViewportDraw();return;}
    if(gesture.type==='layout-spacing'){const next=changeSpacing(original,gesture.handle,p[gesture.handle.axis]-gesture.start[gesture.handle.axis],event);try{const result=next.auto_layout?.direction==='grid'?JSON.parse(editor.preview_layout_update(JSON.stringify([next]),next.id)):{document:JSON.parse(editor.preview_update_many(JSON.stringify([next]))),grid:null};gesture.preview=next;gesture.scene=result.document.shapes.filter(s=>s.page_id===doc.active_page);gesture.grid=result.grid;}catch(error){toast(String(error));}scheduleViewportDraw();return;}
    if(gesture.type==='prototype-link'){gesture.end=p;gesture.target=connectionTarget(pageShapes().map(transformGeometry),gesture.source.id,p);scheduleViewportDraw();return;}
    if(gesture.type==='gradient'){const result=moveGradientHandle(original,gesture.handle,p,event.shiftKey,gradientField());gesture.preview=result.shape;activeGradient=result.active;scheduleViewportDraw();return;}
    if(gesture.type==='scale') {
      const dx=gesture.start.x-gesture.origin.x,dy=gesture.start.y-gesture.origin.y;
      let factor=Math.max(.01,((p.x-gesture.origin.x)*dx+(p.y-gesture.origin.y)*dy)/Math.max(1,dx*dx+dy*dy));
      if(event.shiftKey) factor=Math.max(.1,Math.round(factor*10)/10);
      gesture.previews=scaleShapes(gesture.originals,gesture.origin,factor); scheduleViewportDraw(); return;
    }
    if(gesture.type==='pen-handle') { const a=penPoints[gesture.index]; a.out={...p}; a.in={x:2*a.x-p.x,y:2*a.y-p.y}; scheduleViewportDraw(); return; }
    if(gesture.type==='node') {
      const nodes=structuredClone(gesture.nodes),a=nodes[gesture.index],part=gesture.part;
      if(part==='anchor') { const dx=p.x-gesture.start.x,dy=p.y-gesture.start.y; a.x+=dx;a.y+=dy; for(const h of [a.in,a.out]) {h.x+=dx;h.y+=dy;} }
      else if(part==='smooth') {a.out={...p};a.in={x:2*a.x-p.x,y:2*a.y-p.y};}
      else a[part]={...p};
      gesture.preview=reshape(original,nodes);scheduleViewportDraw();return;
    }
    if (gesture.type === 'create') {
      if(gesture.kind==='pencil') { if(gesture.points.length<4096 && Math.hypot(p.x-gesture.points.at(-1).x,p.y-gesture.points.at(-1).y)>1/zoom) gesture.points.push(p); gesture.preview=fromPoints('pencil',gesture.points); }
      else gesture.preview=drawnShape(gesture.kind,gesture.start,p,event);
      scheduleViewportDraw(); return;
    }
    if (gesture.type === 'marquee') {
      gesture.end = p;
      setSelection([...new Set([...gesture.base,...canvasSelection(pageShapes(),marqueeSelection(pageShapes().map(s=>paintBounds(s,pageShapes())).filter(Boolean),gesture.start,p),{deep:gesture.deep})])]);
      renderLayers(); renderProperties(); scheduleViewportDraw(); return;
    }
    if (gesture.type === 'move') {
      let dx = p.x - gesture.start.x, dy = p.y - gesture.start.y;
      if (event.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
      gesture.snapLines=[];
      if(snapping.enabled&&!event.altKey&&!event.ctrlKey){const roots=gesture.originals.filter(s=>selectedIds.has(s.id)),box=bounds(roots),excluded=new Set(gesture.originals.map(s=>s.id));if(box){const axes=event.shiftKey?(Math.abs(dx)>Math.abs(dy)?{x:true,y:false}:{x:false,y:true}):{x:true,y:true};const result=snapMovement(pageShapes(),{...box,x:box.x+dx,y:box.y+dy},excluded,zoom,snapping,axes,guidesVisible);dx+=result.dx;dy+=result.dy;gesture.snapLines=result.lines;}}
      gesture.previews = gesture.originals.map(s => ({...s,x:s.x+dx,y:s.y+dy}));
      gesture.stackDrop=gridStackDrop(gesture.targets??pageShapes(),p,gesture.originals.map(s=>s.id),gridPlan);
      if(gesture.stackDrop){
        const target=gesture.stackDrop,key=JSON.stringify([target.grid,target.parent,target.before,target.cell.column,target.cell.row]);
        if(gesture.stackPreviewKey!==key){
          try{const ids=selectionRoots(gesture.originals,gesture.originals.map(s=>s.id));
            const result=JSON.parse(editor.preview_grid_drop(JSON.stringify(ids),target.grid,target.parent,target.before,target.cell.column,target.cell.row));
            gesture.scene=result.shapes.filter(s=>s.page_id===doc.active_page);gesture.stackPreviewKey=key;
          }catch{gesture.scene=null;gesture.stackPreviewKey=null;}
        }
      }else{gesture.scene=null;gesture.stackPreviewKey=null;}

    }
    else {
      const local=localPoint(original,p);let resizePoint={x:snap(local.x),y:snap(local.y)};gesture.snapLines=[];
      if(snapping.enabled&&guidesVisible&&!event.altKey&&!event.ctrlKey&&!original.rotation){const result=snapGuides(pageShapes(),{...resizePoint,width:0,height:0},new Set(transformedSelection().map(s=>s.id)),zoom,{x:gesture.cx!==.5,y:gesture.cy!==.5});resizePoint={x:resizePoint.x+result.dx,y:resizePoint.y+result.dy};gesture.snapLines=result.lines;}
      const right = original.x + original.width, bottom = original.y + original.height;
      gesture.preview=resizeBox(original,resizePoint,gesture.cx,gesture.cy);
      gesture.preview=fixedResize(gesture.preview,gesture.preview.width!==original.width,gesture.preview.height!==original.height);
      if(!hasHugControlHeight(original)&&(original.aspect_ratio_locked||event.shiftKey)){const candidate=gesture.preview,axis=Math.abs(candidate.width/original.width-1)>=Math.abs(candidate.height/original.height-1)?'width':'height',size=ratioSize(original,axis,candidate[axis]);gesture.preview={...candidate,...size,x:gesture.cx===.5?original.x+(original.width-size.width)/2:gesture.cx?original.x:right-size.width,y:gesture.cy===.5?original.y+(original.height-size.height)/2:gesture.cy?original.y:bottom-size.height,layout_item:{...candidate.layout_item,fill_width:false,fill_height:false},...(candidate.auto_layout?{auto_layout:{...candidate.auto_layout,hug_width:false,hug_height:false}}:{})};}
      gesture.preview=shapeToLocal(resizeWorldBox(original,gesture.preview),pageShapes());
      gesture.preview=resizeText(gesture.preview,gesture.preview.width!==original.width,gesture.preview.height!==original.height);
    }
    scheduleViewportDraw();
  };
  canvas.onpointerup = event => {
    if(gesture?.type==='text-create'){
      const {start}=gesture,shape=drawnText(start,point(event),zoom);gesture=null;
      if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
      safe(()=>{const id=insertAt(shape,start);setSelection([id]);setTool('select');refresh();beginText(current());});return;
    }
    if(gesture?.type==='grid-area'){const g=gesture;gesture=null;if(!validArea(g.areas,g.area)){toast('Named areas cannot overlap. Resize or draw in empty cells.');draw();return;}const areas=g.initial?g.areas.map(a=>a.name===g.name?g.area:a):[...g.areas,g.area];if(JSON.stringify(areas)!==JSON.stringify(g.areas))update({...g.original,auto_layout:{...g.original.auto_layout,grid:{...g.original.auto_layout.grid,areas}}});else draw();if(!g.initial){const section=$('grid-areas');if(section)section.open=true;const input=$('grid-area-'+(areas.length-1)+'-name');input?.focus();input?.select();input?.scrollIntoView({block:'nearest'});}return;}

    if(gesture?.type==='pan'){pan.x=gesture.pan.x+event.clientX-gesture.x;pan.y=gesture.pan.y+event.clientY-gesture.y;gesture=null;scheduleViewportDraw();return;}
    if(gesture?.type==='prototype-link'){const {source,target,index}=gesture;gesture=null;if(target){update(connectedShape(source,target,index));openPrototypeInspector(index);}else draw();return;}
    if(gesture?.type==='pen-handle') {gesture=null;draw();return;}
    if(gesture?.type==='create') {
      let shape=gesture.preview;
      if(gesture.kind==='pencil')shape=fromPoints('pencil',smoothPencil(gesture.points,Number($('pencil-smoothing').value),zoom));
      if(gesture.kind==='pencil' && shape.points.length<2) { gesture=null; draw(); return; }
      if(gesture.kind!=='pencil' && shape.width<3 && shape.height<3) shape=drawnShape(gesture.kind,gesture.start,{x:gesture.start.x+160,y:gesture.start.y+(gesture.kind==='line'||gesture.kind==='arrow'?0:120)});
      const start=gesture.start;gesture=null; safe(()=>{setSelection([insertAt(shape,start)]); setTool('select'); refresh();if(editorRole(shape)){development.activate('design');renderToolInspector.focus();}}); return;
    }
    const preview = gesture?.preview, previews = gesture?.previews,type=gesture?.type,dropTargets=gesture?.targets,stackDrop=gesture?.stackDrop;
    const parent=type==='move'&&previews?dropParent(gesture.targets??pageShapes(),previews,[...selectedIds]):null;
    const moved=type==='move'&&previews?.some(s=>{const old=pageShapes().find(o=>o.id===s.id);return old&&(old.x!==s.x||old.y!==s.y);});
    gesture = null;
    // Translation edits only roots; the engine moves their protected children.
    const moveRoots=type==='move'&&previews?new Set(selectionRoots(previews,previews.map(s=>s.id))):null;
    const moves=moveRoots?previews.filter(s=>moveRoots.has(s.id)):previews;
    if(moved&&stackDrop) safe(()=>{if(stackDrop.parent)editor.move_into_before(JSON.stringify(moves.map(s=>s.id)),stackDrop.parent,stackDrop.before);else editor.move_into_cells(JSON.stringify(moves),stackDrop.grid,JSON.stringify(moves.map(s=>[s.id,stackDrop.cell.column,stackDrop.cell.row])));refresh();});
    else if(moved&&parent!==null) safe(()=>{const frame=pageShapes().find(s=>s.id===parent);if(frame?.auto_layout?.direction==='grid'){const measured=dropTargets?.find(s=>s.id===parent)??transformGeometry(frame),plan=gridPlan(measured),cells=moves.map(s=>{const c=gridCellAt(measured,plan,{x:s.x+s.width/2,y:s.y+s.height/2});return c?[s.id,c.column,c.row]:null;}).filter(Boolean);editor.move_into_cells(JSON.stringify(moves),parent,JSON.stringify(cells));}else editor.move_into(JSON.stringify(moves),parent);refresh();});
    else if (moves) updateMany(moves); else if (preview) update(preview); else draw(); };
  const cancelGesture = () => { if (gesture?.type === 'marquee') setSelection(gesture.base);if(gesture?.type==='gradient')activeGradient=null; gesture = null; renderLayers(); renderProperties(); draw(); };
  // Previews never touch the document: discard them before other Escape handlers
  // can clear the selection or let a later pointerup commit the preview.
  window.addEventListener('keydown',event=>{
    if(event.key!=='Escape'||!['move','grid-span','resize','prototype-link'].includes(gesture?.type))return;
    event.preventDefault();event.stopImmediatePropagation();
    cancelGesture();canvas.style.cursor='default';canvas.focus({preventScroll:true});
  },{capture:true});
  canvas.onpointercancel = cancelGesture;
  canvas.onlostpointercapture = () => { if (gesture) cancelGesture(); };
  // Browser zoom shortcuts belong to the stage, even when a panel has focus.
  const nativePinchActive=installNativePinch(window,{
    start:()=>{},
    scale:(factor,event)=>{
      const rect=canvas.getBoundingClientRect();
      const inside=event.clientX>=rect.left&&event.clientX<=rect.right&&event.clientY>=rect.top&&event.clientY<=rect.bottom;
      if(inside)zoomAt(factor,event.clientX-rect.left,event.clientY-rect.top,true);
      else zoomAt(factor,undefined,undefined,true);
    },
    end:()=>{},
  });
  document.addEventListener('wheel',event=>{
    if(!event.ctrlKey&&!event.metaKey)return;
    if(!event.target.closest('#workspace')||event.target.closest('input,textarea,select,[contenteditable]'))return;
    event.preventDefault();event.stopPropagation();
    if(nativePinchActive())return;
    const rect=canvas.getBoundingClientRect(),overStage=event.clientX>=rect.left&&event.clientX<=rect.right&&event.clientY>=rect.top&&event.clientY<=rect.bottom;
    const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?canvas.clientHeight:1);
    if(overStage)pinchZoom(delta,event.clientX-rect.left,event.clientY-rect.top);else pinchZoom(delta);
  },{capture:true,passive:false});
  document.addEventListener('keydown',event=>{
    if(!(event.ctrlKey||event.metaKey)||event.altKey||!['+','=','-','0'].includes(event.key))return;
    if(event.target!==canvas)return;
    event.preventDefault();event.stopPropagation();
    zoomAt(event.key==='0'?1/zoom:event.key==='-'?1/1.2:1.2);
  },{capture:true});
  canvas.addEventListener('wheel', event => {
    tooltips?.hideFor($('grid-area-status'));
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) { const rect = canvas.getBoundingClientRect(); pinchZoom(event.deltaY, event.clientX - rect.left, event.clientY - rect.top); }
    else {
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? canvas.clientHeight : 1;
      pan.x -= (event.shiftKey ? event.deltaY : event.deltaX) * unit * TRACKPAD_PAN_SPEED;
      pan.y -= (event.shiftKey ? 0 : event.deltaY) * unit * TRACKPAD_PAN_SPEED;
      scheduleViewportDraw();
    }
  }, { passive: false });
  window.addEventListener('keydown', event => {
    // Let Escape dismiss the active inspector popup without clearing the layer.
    if(event.key==='Escape'&&document.querySelector('[popover]:popover-open'))return;
    // Enter/Space activate the focused control; they must not also edit the
    // selected text or navigate into a layer on the canvas.
    if(['Enter',' '].includes(event.key)&&event.target.closest('button,summary,[role=menuitem]'))return;
    if (document.querySelector('dialog[open]:not(.variables-dialog)') || event.target.closest('.variables-dialog')) return;
    if (event.target.closest('input,textarea,select,[contenteditable]')) return;
    const key = event.key.toLowerCase(), mod = event.ctrlKey || event.metaKey;
    if(prototypeConnections&&prototypeLinkSelected&&event.target===canvas&&!mod&&!event.altKey&&['delete','backspace'].includes(key)){
      event.preventDefault();const shape=current(),list=shape?interactions(shape):[];
      if(list[prototypeInteraction]){update(withInteractions(shape,list.filter((_,index)=>index!==prototypeInteraction)));prototypeLinkSelected=true;}
      return;
    }
    if(!event.altKey&&!event.shiftKey&&['[',']'].includes(key)){event.preventDefault();arrangeSelection(key===']'?(mod?'forward':'front'):(mod?'backward':'back'));return;}
    if(mod&&event.shiftKey&&key==='h'){event.preventDefault();toggleSelectionVisibility();return;}
    if(mod&&!event.shiftKey&&!event.altKey&&key==='r'){event.preventDefault();renameSelection();return;}
    if(mod&&event.shiftKey&&key==='l'){event.preventDefault();toggleSelectionLock();return;}
    if(editingGridAreas&&!mod&&!event.altKey&&event.target===canvas&&(key==='enter'||key==='f2')){event.preventDefault();renameCanvasArea();return;}
    if(editingGridAreas&&!mod&&key==='escape'){event.preventDefault();if(gesture?.type==='grid-area')gesture=null;else{editingGridAreas=0;activeGridArea=null;}renderProperties();draw();return;}
    if(editingGridAreas&&(key==='delete'||key==='backspace')){
      event.preventDefault();
      if(mod||event.altKey||gesture||event.repeat||event.target!==canvas||!canvasEditable())return;
      const frame=current(),area=frame?.auto_layout?.grid?.areas?.find(a=>a.name===activeGridArea);
      if(frame?.id!==editingGridAreas||!area)return;
      safe(()=>{editor.delete_grid_area(frame.id,area.name);activeGridArea=null;refresh();canvas.focus();toast('Area deleted · items kept in their cells');});
      return;
    }
    if(editingGridAreas&&!mod&&!event.altKey&&(key==='pageup'||key==='pagedown')&&event.target===canvas){
      event.preventDefault();if(gesture)return;
      const frame=current(),areas=frame?.id===editingGridAreas?frame.auto_layout?.grid?.areas??[]:[];
      activeGridArea=pageArea(areas,activeGridArea,key==='pageup');
      if(activeGridArea){revealSelectedArea();draw();tooltips?.showFor($('grid-area-status'));toast(`Area: ${activeGridArea} · Arrows move · Shift + arrows resize · F6 reads full name`);}
      return;
    }
    if(editingGridAreas&&!mod&&!event.altKey&&(key==='home'||key==='end')&&event.target===canvas){
      event.preventDefault();if(gesture)return;
      const frame=current(),areas=frame?.id===editingGridAreas?frame.auto_layout?.grid?.areas??[]:[];
      activeGridArea=cycleArea(areas,null,key==='end');
      if(activeGridArea){revealSelectedArea();draw();tooltips?.showFor($('grid-area-status'));toast(`Area: ${activeGridArea} · Arrows move · Shift + arrows resize · F6 reads full name`);}
      return;
    }
    if(editingGridAreas&&!mod&&!event.altKey&&key==='tab'&&event.target===canvas){
      const frame=current(),areas=frame?.id===editingGridAreas?frame.auto_layout?.grid?.areas??[]:[];
      if(areas.length){event.preventDefault();if(gesture)return;activeGridArea=cycleArea(areas,activeGridArea,event.shiftKey);revealSelectedArea();draw();tooltips?.showFor($('grid-area-status'));toast(`Area: ${activeGridArea} · Arrows move · Shift + arrows resize · F6 reads full name`);}
      return;
    }
    if(editingGridAreas&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
      event.preventDefault();tooltips?.hideFor($('grid-area-status'));if(mod||event.altKey||gesture||!canvasEditable())return;
      const frame=current();if(frame?.id!==editingGridAreas)return;
      const areas=frame.auto_layout?.grid?.areas??[],area=areas.find(a=>a.name===activeGridArea);if(!area)return;
      const measured=transformGeometry(frame),next=nudgeArea(measured,gridPlan(measured),areas,area,event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:0,event.key==='ArrowUp'?-1:event.key==='ArrowDown'?1:0,event.shiftKey);
      if(next!==area)update({...frame,auto_layout:{...frame.auto_layout,grid:{...frame.auto_layout.grid,areas:areas.map(a=>a.name===area.name?next:a)}}});
      revealSelectedArea();
      return;
    }
    if(editingLayout&&!mod){
      if(key==='escape'||key==='enter'){event.preventDefault();const preview=gesture?.type==='layout-spacing'?gesture.preview:null;gesture=null;if(key==='enter'&&preview)update(preview);if(key==='enter'||!preview){editingLayout=0;activeSpacing=null;}renderProperties();draw();return;}
      if(key==='tab'&&event.target===canvas){event.preventDefault();const handles=spacingHandles(current(),pageShapes(),gridPlan(current())).filter((h,i,a)=>a.findIndex(v=>v.key===h.key)===i),index=handles.findIndex(h=>h.key===activeSpacing);activeSpacing=handles[(index+(event.shiftKey?-1:1)+handles.length)%handles.length]?.key;draw();return;}
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();if(!canvasEditable()||gesture)return;const h=spacingHandles(current(),pageShapes(),gridPlan(current())).find(h=>h.key===activeSpacing);if(h){const direction=event.key==='ArrowLeft'||event.key==='ArrowUp'?-1:1;if(event.altKey&&h.track){safe(()=>{shiftGridTrack(current().id,h.track.axis,h.track.index,direction);});}else update(changeSpacing(current(),h,direction*(event.shiftKey?10:1),{altKey:event.altKey}));}return;}
    }
    if(editingGradient&&!mod){
      if(key==='tab'&&event.target===canvas){event.preventDefault();const handles=gradientHandles(gradientShape(),zoom,gradientField()),index=handles.findIndex(h=>h.part===activeGradient?.part&&(h.part!=='stop'||h.index===activeGradient.index));activeGradient=handles[(index+(event.shiftKey?-1:1)+handles.length)%handles.length];renderProperties();draw();return;}
      if(key==='enter'||key==='escape'){event.preventDefault();const preview=gesture?.type==='gradient'?gesture.preview:null;if(key==='escape'&&preview){gesture=null;activeGradient=null;}else{gesture=null;editingGradient=0;activeGradient=null;if(key==='enter'&&preview)update(preview);}renderProperties();draw();return;}
      if(['delete','backspace'].includes(key)){event.preventDefault();const s=gradientShape(),g=s?.appearance?.[gradientField()];if(activeGradient?.part==='stop'&&g.stops.length>2){const index=activeGradient.index;activeGradient=null;update({...s,appearance:{...s.appearance,[gradientField()]:{...g,stops:g.stops.filter((_,i)=>i!==index)}}});}else toast('Select a color stop to remove; keep at least two stops');return;}
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();const s=gradientShape();if(activeGradient){const h=gradientHandles(s,zoom,gradientField()).find(h=>h.part===activeGradient.part&&(h.part!=='stop'||h.index===activeGradient.index)),step=event.shiftKey?10:1;let p={x:h.x,y:h.y};if(h.part==='stop'){const g=s.appearance[gradientField()],t=Math.max(0,Math.min(1,g.stops[h.index].position+(['ArrowLeft','ArrowDown'].includes(event.key)?-step:step)/100));p={x:s.x+(g.start[0]+(g.end[0]-g.start[0])*t)*s.width,y:s.y+(g.start[1]+(g.end[1]-g.start[1])*t)*s.height};}else{p.x+=event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0;p.y+=event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0;}const result=moveGradientHandle(s,h,p,false,gradientField());activeGradient=result.active;update(result.shape);}return;}
    }
    if(mod&&event.altKey&&key==='g'){event.preventDefault();frameSelection();return;}
    if(mod&&!event.altKey&&!event.shiftKey&&key==='k'){event.preventDefault();showActions();return;}
    if(mod&&event.altKey&&key==='k'){event.preventDefault();createComponentSelection();return;}
    if(mod&&event.shiftKey&&key==='r'){event.preventDefault();$('paste-replace').click();return;}
    if(mod&&key==='v'){pasteInPlace=event.shiftKey||pasteInPlace;return;}
    if(editingPath&&!mod&&['delete','backspace'].includes(key)){event.preventDefault();if(activeNode>=0)$('delete-node').click();else toast('Select an anchor to delete, or press Enter to finish editing');return;}
    if(editingPath&&activeNode>=0&&!mod&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();const s=current(),nodes=anchors(s),a=nodes[activeNode],amount=event.shiftKey?10:1,dx=event.key==='ArrowLeft'?-amount:event.key==='ArrowRight'?amount:0,dy=event.key==='ArrowUp'?-amount:event.key==='ArrowDown'?amount:0;a.x+=dx;a.y+=dy;a.in.x+=dx;a.in.y+=dy;a.out.x+=dx;a.out.y+=dy;update(reshape(s,nodes));return;}
    if(!mod&&event.shiftKey&&key==='g'){event.preventDefault();guidesVisible=!guidesVisible;renderProperties();draw();toast(guidesVisible?'Layout guides shown':'Layout guides hidden');return;}
    if(!mod&&event.altKey&&event.shiftKey&&key==='a'){event.preventDefault();removeAutoLayout();return;}
    if(!mod&&!event.altKey&&event.shiftKey&&key==='a'&&selectedIds.size){event.preventDefault();$('add-auto-layout').click();return;}
    if(mod && event.shiftKey && key==='k'){event.preventDefault();$('place-image').click();return;}
    if(mod && key==='g') {event.preventDefault(); if(selectedIds.size)(event.shiftKey?ungroupSelection:groupSelection)();return;}
    if (mod && key === 'a') { event.preventDefault(); setSelection(pageShapes().filter(s=>s.parent_id===(current()?.parent_id??0)&&visibleInTree(s,pageShapes())&&!lockedInTree(s,pageShapes())).map(s=>s.id)); refresh(false); return; }
    if (event.altKey && !mod && selectedIds.size > 1 && ['a','d','w','s'].includes(key)) { event.preventDefault(); safe(() => { editor.align_many(selectionJson(),{a:'left',d:'right',w:'top',s:'bottom'}[key]); refresh(); }); return; }
    if (mod && ['z', 'y', 's', 'd'].includes(key)) { event.preventDefault(); if (key === 'z') (event.shiftKey ? $('redo') : $('undo')).click(); if (key === 'y') $('redo').click(); if (key === 's') $('save').click(); if (key === 'd') $('duplicate').click(); return; }
    if (event.code === 'Space' && !event.target.closest('button,summary')) { event.preventDefault(); space = true; return; }
    if(key==='enter' && tool==='pen') {event.preventDefault(); finishPen(false); return;}
    if(!mod&&!event.shiftKey&&!event.altKey&&key==='enter'&&current()?.kind==='text'){event.preventDefault();beginText(current());return;}
    if(!mod&&key==='enter'&&!editingPath&&tool!=='pen') {const ids=event.shiftKey?parentSelection(pageShapes(),[...selectedIds]):childSelection(pageShapes(),[...selectedIds]);if(event.shiftKey||ids.some(id=>!selectedIds.has(id))){event.preventDefault();setSelection(ids);refresh(false);return;}}
    if(!mod&&key==='tab'&&selectedIds.size&&event.target===canvas){event.preventDefault();setSelection(siblingSelection(pageShapes(),[...selectedIds],event.shiftKey));refresh(false);return;}
    if(mod&&['backspace','delete'].includes(key)){event.preventDefault();ungroupSelection();return;}
    if(key==='enter' && current()?.points?.length) {event.preventDefault(); $('edit-path').click(); return;}
    if (key === 'escape') { penPoints=[]; gesture = null; setSelection([]); setTool('select'); refresh(false); return; }
    if (['delete', 'backspace'].includes(key)) { event.preventDefault(); $('delete').click(); return; }
    if (selectedIds.size && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) && event.target !== divider) { event.preventDefault();if(!canvasEditable()){toast('Unlock the selection before nudging');return;} if(!mod&&!event.altKey&&!event.shiftKey){
 const items=selectionShapes(),parent=pageShapes().find(s=>s.id===items[0]?.parent_id);
 const gridMoves=gridArrowMove(items,parent,parent?.auto_layout?.direction==='grid'?gridPlan(transformGeometry(parent)):null,event.key);
 if(gridMoves){if(!gesture&&gridMoves.length)updateMany(gridMoves);return;}
 } const order=layoutArrowOrder(selectionShapes(),pageShapes(),event.key);if(order){if(order.ids.length)safe(()=>{editor.arrange_many(JSON.stringify(order.ids),order.direction);refresh();});return;} const step = event.shiftKey ? 10 : 1; updateMany(selectionShapes().map(s=>({ ...s, x: s.x + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0), y: s.y + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0) }))); return; }
    if(!mod&&event.shiftKey&&key==='d'){event.preventDefault();updateToolbelt.mode(updateToolbelt.getMode()==='dev'?'design':'dev');return;}
    const tools = { s:event.shiftKey?'section':'slice',c:event.shiftKey?'annotation':'comment',m:event.shiftKey?'measurement':null,k:'scale', v: 'select', h: 'hand', f: 'frame', r: 'rectangle', o: 'ellipse', t: 'text', l:event.shiftKey?'arrow':'line', p:event.shiftKey?'pencil':'pen' }; if (!mod && !event.altKey && tools[key]) setTool(tools[key]);
    if (event.code === 'Digit1' && !mod) { event.preventDefault(); fit(); }
    if (event.code === 'Digit2' && event.shiftKey && !mod) { event.preventDefault(); fit(true); }
    if (key === '?') showShortcuts();
  });
  window.addEventListener('keyup', event => { if (event.code === 'Space') space = false; });
  window.addEventListener('blur', () => { space = false; cancelGesture(); });
  document.addEventListener('pointerdown',event=>{
    if(!textEditing||inlineText.contains(event.target))return;
    const p=event.target===canvas?point(event):null;
    const next=p&&event.button===0&&!space?pageShapes().find(s=>s.id===canvasHit(p.x,p.y)&&s.kind==='text'):null;
    if(!finishText({render:false})){event.preventDefault();event.stopImmediatePropagation();return;}
    if(next){event.preventDefault();event.stopImmediatePropagation();beginText(next,{point:event});}
  },{capture:true});
  window.addEventListener('beforeunload',()=>finishText({render:false}),{capture:true});
  window.addEventListener('pagehide', ()=>{finishText({render:false});persist();});
  document.addEventListener('visibilitychange', () => { if(document.visibilityState==='hidden'){finishText({render:false});persist();} });
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
  loadingMessage('Starting the design engine…');
  await init(); editor = new Editor();
  loadingMessage('Opening your project…');
  editor.set_text_measurer(json=>{const s=JSON.parse(json);if(s.control?.kind==='button'){const t=s.typography??{font_family:'Arial',font_size:16,font_weight:400,line_height:1.2};measureCtx.font=fontCss(t);return JSON.stringify([Math.max(1,Math.ceil(measureCtx.measureText(s.control.label).width)),Math.max(1,Math.ceil(t.font_size*t.line_height))]);}measureCtx.font=fontCss(textStyle(s));return JSON.stringify([...textSize(s,value=>measureCtx.measureText(value).width),textBaseline(s,measureCtx)]);});
  const requestedProject=projectRoute(location.search);
  let accountRuntime=null,accountIdentity=null;
  if(!staticHost)try{const response=await fetch('/api/installation');if(response.ok)accountRuntime=await response.json();if(accountRuntime?.mode==='self-hosted'){const userResponse=await fetch('/api/workspaces');if(userResponse.ok)accountIdentity=(await userResponse.json()).user.id;else if(requestedProject?.kind==='cloud')throw new Error('Sign in to open this shared project.');}}catch(error){if(accountRuntime?.mode==='self-hosted'&&requestedProject?.kind==='cloud')throw error;}

  let stored;
  let draftStorage,tabStorage;try{draftStorage=localStorage;}catch{}try{tabStorage=sessionStorage;}catch{}
  drafts=new LocalDrafts(draftStorage,tabStorage);
  try { stored=requestedProject?.kind==='local'?drafts.get(requestedProject.id).body:requestedProject?.kind==='cloud'?null:drafts.restore()??(!drafts.read().files.length?draftStorage?.getItem(KEY):null); } catch(error){if(requestedProject)throw error;recoveryBlocked=true;toast(error.message);}
  if (stored) { try { editor.load(JSON.stringify(migrateChromeDocument(JSON.parse(stored)))); editor.clear_history();if(requestedProject?.kind==='local')drafts.activate(requestedProject.id); } catch(error) { if(requestedProject)throw error;recoveryBlocked = true; seed(); toast('Saved data could not be loaded. It has been preserved; use Open to recover a file.'); } }
  else seed();
  updateInspectorLayout=installInspectorLayout();updateToolbelt=installToolbelt({action:key=>{if(key==='code'){setTool('select');development.activate('development');}else if(key==='media')$('place-image').click();else{development.activate('design');setTool('spec');}},modeChanged:mode=>{setTool(mode==='draw'?'pencil':'select');development?.activate(mode==='dev'?'inspect':mode==='motion'?'motion':'design');motionTools?.mode(mode==='motion');}});updateAutoLayoutInspector=installAutoLayoutInspector(current,update,{document:()=>doc,bind:(id,path,variable)=>safe(()=>{editor.bind_variable(id,path,variable);refresh();})});updateLayoutSizing=installLayoutSizing({selection:selectionShapes,all:pageShapes,change:updateMany});updateVariables=installVariables({document:()=>doc,current,change:update,history:action=>{editor[action]();refresh();},save:values=>{editor.save_variables(JSON.stringify(values));refresh();},bind:(id,path,variable)=>safe(()=>{editor.bind_variable(id,path,variable);refresh();}),pageMode:(id,collection,mode)=>safe(()=>{editor.set_page_variable_mode(id,collection,mode);refresh();}),mode:(id,collection,mode)=>safe(()=>{editor.set_variable_mode(id,collection,mode);refresh();})});updateCompactInspector=installCompactInspector(current,update,{document:()=>doc,bind:(id,path,variable)=>safe(()=>{editor.bind_variable(id,path,variable);refresh();})});updateContextualActions=installContextualActions({current,change:update,shapes:pageShapes});updateRectangleInspector=installRectangleInspector({current,change:update});updatePaintPopovers=installPaintPopovers({current,change:update,document:()=>doc,saveVariables:values=>{editor.save_variables(JSON.stringify(values));refresh();},bind:(id,path,variable)=>safe(()=>{editor.bind_variable(id,path,variable);refresh();})});installLayerDrop($('layers'),(id,target,position,ids,copy)=>safe(()=>{if(copy){setSelection(JSON.parse(editor.duplicate_drop_layers(JSON.stringify(ids),target,position)));}else{editor.drop_layers(JSON.stringify(ids),target,position);setSelection(ids);}refresh();}),{onDestinationChange:id=>{layerDragDestination=id;scheduleViewportDraw();},destinationParent:(target,position)=>layerDropParent(pageShapes(),target,position),destinationName:(target,position)=>layerDropDestination(pageShapes(),target,position,activePage()?.name??'Page'),project:(target,position,deltaX,ids)=>projectLayerDrop(pageShapes(),target,position,deltaX,ids),dropReason:(ids,target,position,copy)=>layerDropReason(pageShapes(),ids,target,position,copy),canDrop:(ids,target,position,copy)=>layerDropAllowed(pageShapes(),ids,target,position,copy),selection:()=>[...selectedIds],previewLayers:ids=>pageShapes().reverse().filter(s=>ids.includes(s.id)).map(s=>({name:s.name,icon:icon(componentLabelType(s)?(componentLabelType(s)==='master'?'component':'instance'):s.auto_layout?.direction?'layout-'+s.auto_layout.direction:s.kind)})),collapse:row=>row.dispatchEvent(new Event('layer-drag-collapse')),expand:row=>row.dispatchEvent(new Event('layer-drag-expand'))});bind(); updateFigmaInspector=installFigmaInspector({current,change:update});refresh(false); if(stored&&!recoveryBlocked){const previous=JSON.parse(stored).shapes??[];if(doc.shapes.some(s=>previous.find(p=>p.id===s.id)?.layout_class!==s.layout_class||!previous.find(p=>p.id===s.id)?.device_chrome_breakpoints&&s.device_chrome_breakpoints))persist();} installCollapsibleInspector(current,update); tooltips=installTooltips(); fit(); $('engine-status').textContent = 'Rust engine connected';
  cloud=cloudFiles({recoveryOwner:accountRuntime?.mode==='self-hosted'?(accountIdentity??'signed-out'):null,snapshot:()=>editor.snapshot(),backupLocal:saveLocalDraft,openLocal:openLocalDesign,load:body=>{loadDesign(body);drafts.detach();},status:text=>{libraries?.context();if(cloud?.session.active){drafts.detach();syncProjectAddress();}$('save-status').textContent=text;document.querySelector('.file-location span').textContent=cloud?.session.active?'Cloud file':'Local file';},toast});
  if(requestedProject?.kind==='cloud'){if(accountRuntime?.mode==='self-hosted')await cloud.authorize(requestedProject.id);if(!cloud.restore(requestedProject.id))await cloud.open(requestedProject.id);}
  else if(!requestedProject&&accountRuntime?.mode!=='self-hosted')cloud.restore();
  libraries=createLibraryManager({getDocument:()=>JSON.parse(editor.snapshot()),getSession:()=>cloud.session,applyDocument:next=>{editor.load(JSON.stringify(next));refresh();},saveCloud:()=>cloud.saveCurrent(),refresh:()=>{renderAssetBrowser();renderProperties();},toast,selfHosted:accountRuntime?.mode==='self-hosted'});
  editor.set_write_guard((before,after,history)=>libraries.guard(JSON.parse(before),JSON.parse(after),history)??'');
  loadingMessage('Loading project libraries…');
  await libraries.context();
  projectLoading=false;syncProjectAddress();
  if(!recoveryBlocked&&!cloud.session.active)persist();
  loadingMessage('Preparing your canvas…');
  await document.fonts.ready; editor.refresh_text_layout(); refresh(false);
  installDesktop({importFile:importDesignFile,report:error=>toast(error.message),commands:{save:()=>$('save').click(),undo:()=>$('undo').click(),redo:()=>$('redo').click()}});
  finishLoading();
} catch (error) { failLoading('Your workspace couldn’t open. Try again, or choose another project.'); $('engine-status').textContent = 'Engine could not start'; $('save-status').textContent = 'Editor unavailable'; toast(`Could not start editor: ${error}`); console.error(error); }
