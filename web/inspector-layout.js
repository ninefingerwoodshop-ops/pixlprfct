// Compose existing controls once; retain their nodes and event handlers.
export function installInspectorLayout() {
 const $=id=>document.getElementById(id), make=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls;if(text)e.textContent=text;return e;};
 const panel=document.querySelector('.right-panel'),tabs=document.querySelector('.inspector-tabs');
 const design=make('div','inspector-content'),prototype=make('div','inspector-content');design.id='design-inspector';prototype.id='prototype-inspector';
 for(const child of [...panel.children])if(!child.matches('.inspector-top,.inspector-tabs,#track-scroll-paused,#track-scroll-resumed'))design.append(child);
 panel.append(design,prototype);
 const help=make('p','prototype-help','Prototype links show where interactions go. Turn them on to connect frames on the canvas.');help.id='prototype-help';prototype.append(help,$('prototype-panel'));
 const empty=make('section','property-section');empty.id='prototype-empty';empty.append(make('h3','','Prototype'),make('p','','Select a layer to add interactions, or select a frame to set a flow starting point.'));prototype.append(empty);
 const caption=$('selection-caption');tabs.replaceChildren();tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Inspector mode');
 const buttons=['Design','Prototype'].map((label,i)=>{const b=make('button','inspector-tab',label);b.id=`inspector-tab-${i}`;b.type='button';b.setAttribute('role','tab');b.setAttribute('aria-controls',i?prototype.id:design.id);tabs.append(b);return b;});
 [design,prototype].forEach((host,i)=>{host.setAttribute('role','tabpanel');host.setAttribute('aria-labelledby',buttons[i].id);});
 const activate=i=>{[design,prototype].forEach((host,j)=>{host.hidden=i!==j;buttons[j].setAttribute('aria-selected',String(i===j));buttons[j].tabIndex=i===j?0:-1;});};
 buttons.forEach((b,i)=>{b.onclick=()=>activate(i);b.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?1:1-i;activate(next);buttons[next].focus();}};});activate(0);
 tabs.append(document.querySelector('.zoom-control'));
 const header=make('div','inspector-selection');header.append(caption);design.prepend(header);
 const properties=$('properties'),name=$('shape-name').closest('section'),position=$('x').closest('section'),fill=$('paint-label').closest('section'),limits=$('limit-min_width').closest('section'),arrange=$('duplicate').closest('section');
 name.classList.add('inspector-layer-name');position.classList.add('instance-position');position.querySelector('h3').textContent='Position';
 const alignment=document.querySelector('#multi-properties .align-tools').cloneNode(true);alignment.setAttribute('aria-label','Align to parent frame');position.querySelector('h3').after(alignment);
 $('shape-name').setAttribute('aria-label','Layer name');const visibility=$('visible').closest('label');visibility.classList.add('inspector-visibility');$('appearance-section').querySelector('h3').after(visibility);
 const layout=make('section','property-section');layout.id='dimensions-section';layout.append(make('h3','','Layout'));
 const dimensions=make('div','property-grid');dimensions.append($('width').closest('label'),$('height').closest('label'));layout.append(dimensions);
 const details=(title,...nodes)=>{const d=make('details','inspector-details');d.append(make('summary','',title),...nodes);return d;};
 layout.append(details('Size limits',limits));
 const sizing=$('text-sizing').closest('label');sizing.id='text-sizing-row';layout.append(sizing,$('frame-section'),$('layout-child-panel'),$('auto-layout-panel'),$('add-auto-layout'));
 properties.append(name,position,layout,$('appearance-section'),$('text-section'),fill,$('image-section'),$('stroke-section'),$('shadow-section'),$('layout-guides-panel'));
 const utilities=details('Layer actions',$('lock-panel'),$('parent-panel'),$('group-actions'),arrange);utilities.id='inspector-layer-actions';design.append(utilities);
 const component=$('component-panel');component.classList.add('component-inspector');properties.insertBefore(component,position);
 design.append($('constraints-panel'),$('scale-panel'),$('node-actions'));
 const exports=make('section','property-section');exports.append(make('h3','','Export'));const exportButton=make('button','wide-button','Export artwork…');exportButton.id='export-artwork';exports.append(exportButton);design.append(exports);
 // Put seldom-used stroke settings behind a disclosure, like the advanced panel.
 const strokeAdvanced=details('Advanced stroke');for(const id of ['stroke-dash','stroke-dash-offset','stroke-cap','stroke-join','stroke-miter-limit'])strokeAdvanced.append($(id).closest('label'));strokeAdvanced.append($('stroke-endpoints'));$('stroke-section').append(strokeAdvanced);
 const componentActions=details('Component actions');for(const id of ['create-component','insert-instance','manage-variants','go-nested-main','select-instance-root','push-style-overrides','go-main','reset-instance','detach-instance'])componentActions.append($(id));component.append(componentActions);
 const info=details('Instance details');info.append($('instance-controls'),$('component-status'));component.append(info);
 return (shape,count)=>{
  empty.hidden=!!shape;utilities.hidden=!count;sizing.hidden=shape?.kind!=='text';
  const addLayout=$('add-auto-layout');if(shape){if(addLayout.parentElement!==layout)layout.append(addLayout);}else if(addLayout.parentElement!==design)design.insertBefore(addLayout,utilities);
  caption.textContent=count>1?`${count} layers`:shape?.component?.type==='master'?'Component':shape?.component?.type==='instance'?'Instance':shape?.editor_meta?.role?shape.editor_meta.role[0].toUpperCase()+shape.editor_meta.role.slice(1):shape?.kind?shape.kind[0].toUpperCase()+shape.kind.slice(1):'Page';
  // Ordinary layers expose component creation with other layer actions.
  if(shape?.component||component.dataset.componentKind==='set'||count>1){if(component.parentElement!==design)design.insertBefore(component,properties);}
  else if(component.parentElement!==utilities)utilities.append(component);
 };
}
