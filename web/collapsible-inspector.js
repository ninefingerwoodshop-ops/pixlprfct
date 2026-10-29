import {disclosureButton,setDisclosureExpanded,installOptionalInspector} from './inspector-disclosure.js';
// Keep existing sections and control nodes intact: inspector renderers own them.
export function installCollapsibleInspector(current,change){
 const syncOptional=installOptionalInspector(current,change);
 const panel=document.querySelector('.right-panel'),storageKey='pixlprfct.inspector.collapsed';
 let saved={};try{saved=JSON.parse(localStorage.getItem(storageKey)??'{}')??{};}catch{}
 const persist=()=>{try{localStorage.setItem(storageKey,JSON.stringify(saved));}catch{}};
 const isCollapsed=key=>saved[key]??saved['*']??false;
 const sync=()=>{
  for(const section of panel.querySelectorAll('.property-section')){
   const heading=[...section.querySelectorAll('h3')].find(h=>h.closest('.property-section')===section);
   // Embedded layout settings share the visible parent section's disclosure.
   // Their legacy heading is hidden, so a separate collapsed state is unreachable.
   if(!heading||heading.hidden||heading.classList.contains('layout-legacy')||section.classList.contains('layout-legacy')){
    section.classList.remove('inspector-collapsible','inspector-collapsed');
    continue;
   }
   const title=heading.textContent.trim();
   const key=section.dataset.collapseKey??(section.id||title);
   section.dataset.collapseKey=key;
   let header=heading;while(header.parentElement!==section)header=header.parentElement;
   for(const child of section.children)child.classList.toggle('inspector-collapse-header',child===header);
   section.classList.add('inspector-collapsible');
   section.classList.toggle('inspector-collapsed',isCollapsed(key)===true);
   let toggle=heading.querySelector('.inspector-section-toggle');
   if(!toggle){
    toggle=disclosureButton(title,expanded=>{
     section.classList.toggle('inspector-collapsed',!expanded);saved[key]=!expanded;
     persist();
    });toggle.classList.add('inspector-section-toggle');heading.replaceChildren(toggle);
   }
   setDisclosureExpanded(toggle,isCollapsed(key)!==true);
  }
  syncOptional();
 };
 panel.addEventListener('click',event=>{
  const action=event.target.closest('.section-add,.effect-choices button,.paint-add,.setting-section-heading > .setting-action');
  const section=action?.closest('.inspector-collapsible');
  if(section?.classList.contains('inspector-collapsed')){saved[section.dataset.collapseKey]=false;persist();sync();}
 },true);
 const toolbar=document.createElement('div');toolbar.className='inspector-section-actions';toolbar.setAttribute('role','group');toolbar.setAttribute('aria-label','Drawer sections');
 for(const [label,collapsed] of [['Expand all',false],['Collapse all',true]]){
  const button=document.createElement('button');button.type='button';button.textContent=label;button.setAttribute('aria-label',label+' sections');
  button.onclick=()=>{
   for(const key of Object.keys(saved))saved[key]=collapsed;
   saved['*']=collapsed;
   for(const section of panel.querySelectorAll('[data-collapse-key]'))saved[section.dataset.collapseKey]=collapsed;
   persist();sync();
   // Expand/collapse only accordions. Optional properties keep their enabled state.
   for(const toggle of panel.querySelectorAll('.inspector-accordion-toggle:not(.inspector-section-toggle)'))if(toggle.isConnected&&toggle.getAttribute('aria-expanded')===String(collapsed))toggle.click();
  };
  toolbar.append(button);
 }
 document.getElementById('inspector-layer-actions').append(toolbar);
 // Sections such as effects, variables and prototype interactions are rebuilt.
 const observer=new MutationObserver(sync);observer.observe(panel,{childList:true,subtree:true});sync();
}
