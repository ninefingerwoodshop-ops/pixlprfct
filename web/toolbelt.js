import {icon} from './icons.js';
export const toolGroups = [
 ['Move tools', [['select','Move','V'],['hand','Hand tool','H'],['scale','Scale','K']]],
 ['Region tools', [['frame','Frame','F'],['section','Section','Shift S'],['slice','Slice','S']]],
 ['Shape tools', [['rectangle','Rectangle','R'],['line','Line','L'],['arrow','Arrow','Shift L'],['ellipse','Ellipse','O'],['polygon','Polygon',''],['star','Star',''],['media','Image/video…','Ctrl/⌘ Shift K']]],
 ['Creation tools', [['pen','Pen','P'],['pencil','Pencil','Shift P']]],
 ['Type tools', [['text','Text','T'],['text-path','Text on path','']]],
 ['Code tools', [['code','Code',''],['spec','Spec','']]],
 ['Comment tools', [['comment','Comment','C'],['annotation','Annotation','Shift C'],['measurement','Measurement','Shift M']]],
];
export function installToolbelt({action=()=>{},modeChanged=()=>{}}={}){
 const bar=document.querySelector('.toolbox'),retained=document.createElement('div');retained.hidden=true;
 for(const id of ['undo','redo','place-image']){const button=document.getElementById(id);if(button)retained.append(button);}
 bar.after(retained);bar.replaceChildren();
 const groups=[];let mode='design';
 const make=(key,label,shortcut='',menu=false)=>{const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',label);button.title=label+(shortcut?' ('+shortcut+')':'');if(menu)button.dataset.label=label;button.innerHTML=icon(key)+(menu?`<span>${label}</span><kbd>${shortcut}</kbd>`:'');if(['code','spec','media'].includes(key)){button.dataset.action=key;button.onclick=()=>{closeMenus();action(key);};}else{button.dataset.tool=key;button.setAttribute('aria-pressed','false');}return button;};
 const closeMenus=()=>bar.querySelectorAll('details').forEach(d=>d.open=false);
 for(const [label,options] of toolGroups){
  const split=document.createElement('span');split.className='tool-split';
  const primary=make(...options[0]),details=document.createElement('details'),summary=document.createElement('summary'),menu=document.createElement('div');
  details.className='tool-group';details.name='drawing-tool-options';summary.className='toolbar-disclosure';summary.setAttribute('aria-label',label);summary.title=label;summary.setAttribute('aria-haspopup','menu');menu.className='tool-options';menu.setAttribute('role','menu');menu.setAttribute('aria-label',label);
  for(const option of options){const button=make(...option,true);button.setAttribute('role','menuitem');menu.append(button);}
  details.append(summary,menu);split.append(primary,details);bar.append(split);groups.push({primary,details,options});
  details.addEventListener('toggle',()=>summary.setAttribute('aria-expanded',String(details.open)));
  details.addEventListener('keydown',event=>{const items=[...menu.children],index=items.indexOf(document.activeElement);if(event.key==='Escape'){event.preventDefault();event.stopPropagation();details.open=false;summary.focus();}else if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();event.stopPropagation();details.open=true;items[event.key==='Home'?0:event.key==='End'?items.length-1:event.key==='ArrowDown'?(index+1)%items.length:(index-1+items.length)%items.length].focus();}});
 }
 const actions=make('tools','Actions','Ctrl/⌘ K');delete actions.dataset.tool;actions.removeAttribute('aria-pressed');actions.id='toolbelt-actions';actions.onclick=()=>{closeMenus();document.getElementById('nav-tools').click();};bar.append(actions);
 const divider=document.createElement('i');divider.setAttribute('aria-hidden','true');bar.append(divider);
 const modes=document.createElement('div');modes.className='toolbelt-modes';modes.setAttribute('role','group');modes.setAttribute('aria-label','Toolbelt mode');
 for(const [key,label,glyph] of [['draw','Draw','mode-draw'],['design','Design','mode-design'],['motion','Motion','mode-motion'],['dev','Dev Mode','mode-dev']]){const button=make(glyph,label);delete button.dataset.tool;button.dataset.editorMode=key;button.onclick=()=>update.mode(key);modes.append(button);}bar.append(modes);
 const update=tool=>{for(const {primary,details,options} of groups){const option=options.find(([key])=>key===tool);if(option&&!['code','spec','media'].includes(tool)){primary.dataset.tool=tool;primary.innerHTML=icon(tool);primary.setAttribute('aria-label',option[1]);primary.title=option[1]+(option[2]?' ('+option[2]+')':'');}for(const button of [primary,...details.querySelectorAll('[data-tool]')]){const active=button.dataset.tool===tool;button.classList.toggle('active',active);if(button.dataset.tool)button.setAttribute('aria-pressed',String(active));}}};
 update.mode=(next,notify=true)=>{mode=next;bar.dataset.mode=mode;document.getElementById('workspace').dataset.editorMode=mode;closeMenus();for(const b of modes.children){const active=b.dataset.editorMode===mode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));}if(notify)modeChanged(mode);};
 update.getMode=()=>mode;update.mode('design',false);update('select');
 document.addEventListener('pointerdown',e=>{if(!bar.contains(e.target))closeMenus();});
 return update;
}
