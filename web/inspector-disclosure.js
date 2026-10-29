// Accordions reveal controls; switches enable or disable optional properties.
export function setDisclosureExpanded(button, expanded) {
 if(button.getAttribute('role')==='switch')button.setAttribute('aria-checked', String(expanded));
 button.setAttribute('aria-expanded', String(expanded));
}

export function disclosureSwitch(title, change, expanded=false) {
 const button=document.createElement('button'),label=document.createElement('span'),track=document.createElement('span');
 button.type='button';button.className='inspector-disclosure-switch';button.setAttribute('role','switch');
 button.setAttribute('aria-label',title);
 label.className='inspector-disclosure-label';label.textContent=title;
 track.className='inspector-switch-track';track.setAttribute('aria-hidden','true');button.append(label,track);
 setDisclosureExpanded(button,expanded);
 button.onclick=()=>{const next=button.getAttribute('aria-expanded')!=='true';setDisclosureExpanded(button,next);change(next);};
 return button;
}

// A compact property switch has no disclosure state: its neighboring label
// controls visibility, while this button changes the document property.
export function propertySwitch(title,change,enabled=false) {
 const button=document.createElement('button'),track=document.createElement('span');
 button.type='button';button.className='inspector-property-switch';button.setAttribute('role','switch');
 button.setAttribute('aria-label',title);button.setAttribute('aria-checked',String(enabled));
 track.className='inspector-switch-track';track.setAttribute('aria-hidden','true');button.append(track);
 button.onclick=()=>change(button.getAttribute('aria-checked')!=='true');
 return button;
}

export function disclosureButton(title, change, expanded=false) {
 const button=disclosureSwitch(title,change,expanded);
 button.classList.replace('inspector-disclosure-switch','inspector-accordion-toggle');
 button.removeAttribute('role');button.removeAttribute('aria-checked');
 button.querySelector('.inspector-switch-track').remove();
 return button;
}

// Save only this property's values and bindings, so re-enabling it cannot undo
// unrelated edits. Defaults remove its effect; undo uses ordinary document history.
export function optionalProperty(defaults,bindingPaths=Object.keys(defaults)) {
 const paths=Object.keys(defaults),saved=new Map();let selection,enabled=false,used=false;
 const key=shape=>`${shape?.page_id}:${shape?.id}`;
 const read=(shape,path)=>path.split('.').reduce((value,part)=>value?.[part],shape);
 const matches=path=>bindingPaths.some(prefix=>path===prefix||path.startsWith(prefix+'.'));
 const bindings=shape=>Object.fromEntries(Object.entries(shape.variable_bindings??{}).filter(([path])=>matches(path)));
 const active=shape=>!!shape&&(paths.some(path=>JSON.stringify(read(shape,path)??defaults[path])!==JSON.stringify(defaults[path]))||Object.keys(bindings(shape)).length>0);
 const write=(shape,values)=>{const next=structuredClone(shape);for(const [path,value] of Object.entries(values)){const parts=path.split('.'),last=parts.pop();let target=next;for(const part of parts)target=(target[part]??={});target[last]=structuredClone(value);}return next;};
 return {
  sync(shape){const now=active(shape);if(key(shape)!==selection||now!==used)enabled=now;selection=key(shape);used=now;return enabled;},
  set(shape,value){
   this.sync(shape);enabled=value;let next=shape;
   if(!value){saved.set(key(shape),{values:Object.fromEntries(paths.map(path=>[path,read(shape,path)??defaults[path]])),bindings:bindings(shape)});next=write(shape,defaults);next.variable_bindings=Object.fromEntries(Object.entries(shape.variable_bindings??{}).filter(([path])=>!matches(path)));}
   else if(saved.has(key(shape))){const restore=saved.get(key(shape));next=write(shape,restore.values);next.variable_bindings={...next.variable_bindings,...restore.bindings};}
   used=active(next);return next;
  }
 };
}

// A newly selected layer reveals configured values. Explicitly hiding a group
// stays respected on rerenders, until a previously unused setting becomes used.
export function disclosureState() {
 let selection,used=false,expanded=false;
 return {
  sync(key,active,initial=false){if(key!==selection||active&&!used)expanded=!!active||initial;selection=key;used=!!active;return expanded;},
  set(value){expanded=!!value;}
 };
}

export function installOptionalInspector(current,change) {
 const panel=document.querySelector('.right-panel'),states=new Map(),predicates=new WeakMap(),features=new WeakMap();let serial=0;
 const $=id=>document.getElementById(id),bound=(shape,...paths)=>paths.some(path=>!!shape?.variable_bindings?.[path]);
 const group=(title,nodes,active,defaults,bindingPaths)=>{
  const details=document.createElement('details'),summary=document.createElement('summary');
  details.className='inspector-optional';summary.textContent=title;nodes[0].before(details);details.append(summary,...nodes);predicates.set(details,active);if(defaults)features.set(details,optionalProperty(defaults,bindingPaths));return details;
 };
 const crossGap=group('Row / column gap',[$('layout-cross_gap').closest('label')],s=>s?.auto_layout?.cross_gap!=null||bound(s,'auto_layout.cross_gap'),{'auto_layout.cross_gap':null});
 crossGap.classList.add('inspector-cross-gap');panel.querySelector('.layout-arrangement').after(crossGap);
 const border=$('border-width-values').closest('label');$('stroke-dash').closest('details').append(border);

 const activeDetails=(details,shape)=>{
  if(predicates.has(details))return !!predicates.get(details)(shape);
  const l=shape?.auto_layout,g=l?.grid??{},a=shape?.appearance??{},title=details.querySelector(':scope > summary')?.textContent.trim();
  if(details.matches('.effect-entry,.guide-entry'))return true;
  if(details.classList.contains('guide-settings'))return !!shape?.guide_style;
  if(details.classList.contains('layout-individual-padding'))return l&&(l.padding_left!==l.padding_right||l.padding_top!==l.padding_bottom);
  if(details.classList.contains('layout-gap-variables'))return bound(shape,'auto_layout.gap','auto_layout.cross_gap');
  if(details.classList.contains('layout-advanced'))return !!l&&(l.strokes_included===false||l.text_baseline||l.canvas_stacking==='first'||l.align_content&&l.align_content!=='start');
  if(title==='Advanced stroke')return !!(a.stroke_dash?.length||a.stroke_dash_offset||shape?.border_widths||a.stroke_cap&&a.stroke_cap!=='round'||a.stroke_join&&a.stroke_join!=='round');
  if(title==='Gaps & padding')return !!l&&(!!l.gap||!!l.cross_gap||['top','right','bottom','left'].some(side=>!!l['padding_'+side]));
  if(title==='Spacing variables')return bound(shape,'auto_layout.padding','auto_layout.gap','auto_layout.cross_gap');
  if(title==='Variables')return !!Object.keys(shape?.variable_bindings??{}).length;
  if(details.id==='grid-areas')return !!g.areas?.length;
  if(details.id==='grid-implicit')return !!g.dense||g.auto_flow==='column'||!!g.auto_column_pattern?.length||!!g.auto_row_pattern?.length;
  if(details.id==='grid-alignment')return ['justify_items','align_items','justify_content','align_content'].some(key=>g[key]&&g[key]!=='start');
  return false;
 };
 const sync=()=>{
  const shape=current();
  for(const details of panel.querySelectorAll('details:not(.effect-add-menu)')){
   const summary=details.querySelector(':scope > summary');if(!summary)continue;
   // Menus and popovers are actions, not field disclosure.
   if(summary.hasAttribute('aria-haspopup')||details.closest('dialog'))continue;
   let button=summary.querySelector(':scope > :is(.inspector-disclosure-switch,.inspector-accordion-toggle)');
   if(!button){
    const title=summary.querySelector('.effect-title,.guide-title')?.textContent??summary.textContent.trim();
    const identity=details.id||details.dataset.effect||details.dataset.guide||title;
    const owner=details.parentElement.closest('[id]')?.id??'drawer',key=`${owner}/${identity}`;
    let state=states.get(key);if(!state){state=disclosureState();states.set(key,state);}
    const initial=details.classList.contains('behavior-card');
    const apply=expanded=>{if(details.open!==expanded)details.open=expanded;setDisclosureExpanded(button,expanded);};
    const feature=features.get(details);
    button=(feature?disclosureSwitch:disclosureButton)(title,expanded=>{
     if(feature){const shape=current();if(!shape)return;const next=feature.set(shape,expanded);apply(expanded);if(JSON.stringify(next)!==JSON.stringify(shape))change(next);}
     else{state.set(expanded);apply(expanded);}
    });
    // Keep property switches, delete actions and track measurement text intact.
    const actions=[...summary.querySelectorAll(':scope > button')];
    const labelNodes=[...summary.childNodes].filter(node=>!actions.includes(node));
    button.firstElementChild.replaceChildren(...labelNodes);
    summary.replaceChildren(button,...actions);summary.classList.add('inspector-disclosure-summary');summary.setAttribute('role','group');summary.setAttribute('aria-label',title);summary.tabIndex=-1;
    summary.addEventListener('click',event=>{event.preventDefault();});
    details.classList.add('inspector-switch-details');
    const controls=[...details.children].filter(node=>node!==summary).map(node=>{if(!node.id)node.id=`inspector-disclosure-fields-${++serial}`;return node.id;});
    if(controls.length)button.setAttribute('aria-controls',controls.join(' '));
    details.addEventListener('toggle',()=>{if(details.isConnected){state.set(details.open);setDisclosureExpanded(button,details.open);}});
    details.disclosureSync=()=>apply(feature?feature.sync(current()):state.sync(selectionKey(),activeDetails(details,current()),initial));
    function selectionKey(){const selected=current();return selected?`${selected.page_id}:${selected.id}`:'page';}
   }
   details.disclosureSync();
  }
 };
 return sync;
}
