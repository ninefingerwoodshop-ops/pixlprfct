// Keep existing sections and control nodes intact: inspector renderers own them.
export function installCollapsibleInspector(){
 const panel=document.querySelector('.right-panel'),storageKey='pixlprfct.inspector.collapsed';
 let saved={};try{saved=JSON.parse(localStorage.getItem(storageKey)??'{}')??{};}catch{}
 const persist=()=>{try{localStorage.setItem(storageKey,JSON.stringify(saved));}catch{}};
 const isCollapsed=key=>saved[key]??saved['*']??false;
 const sync=()=>{
  for(const section of panel.querySelectorAll('.property-section')){
   const heading=[...section.querySelectorAll('h3')].find(h=>h.closest('.property-section')===section);
   // Embedded layout settings share the visible parent section's disclosure.
   // Their legacy heading is hidden, so a separate collapsed state is unreachable.
   if(!heading||heading.classList.contains('layout-legacy')){
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
    toggle=document.createElement('button');toggle.type='button';toggle.className='inspector-section-toggle';
    toggle.textContent=title;heading.replaceChildren(toggle);
    toggle.onclick=()=>{
     const collapsed=section.classList.toggle('inspector-collapsed');saved[key]=collapsed;
     toggle.setAttribute('aria-expanded',String(!collapsed));
     persist();
    };
   }
   toggle.setAttribute('aria-expanded',String(isCollapsed(key)!==true));
  }
 };
 panel.addEventListener('click',event=>{
  const action=event.target.closest('.section-add,.effect-choices button');
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
   // Open disclosure sections too, without opening effect/action menus.
   for(const details of panel.querySelectorAll('details:not(.effect-add-menu)'))details.open=!collapsed;
   persist();sync();
  };
  toolbar.append(button);
 }
 panel.querySelector('.inspector-tabs').after(toolbar);
 // Sections such as effects, variables and prototype interactions are rebuilt.
 const observer=new MutationObserver(sync);observer.observe(panel,{childList:true,subtree:true});sync();
}
