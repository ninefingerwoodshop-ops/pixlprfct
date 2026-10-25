import {icon} from './icons.js';
export function installToolbelt(){
 const bar=document.querySelector('.toolbox');
 const move=bar.querySelector('[data-tool=select]');move.setAttribute('aria-label','Move');move.title='Move (V)';
 const group=document.createElement('details');group.className='tool-group move-tools';const summary=document.createElement('summary');summary.setAttribute('aria-label','Move tools');summary.title='Move tools';summary.textContent='⌄';const menu=document.createElement('div');menu.className='tool-options';group.append(summary,menu);move.after(group);
 const moveOption=move.cloneNode(true);moveOption.dataset.label='Move';moveOption.innerHTML='<kbd>V</kbd>';menu.append(moveOption);
 for(const [tool,label,key] of [['scale','Scale','K'],['hand','Hand tool','H']]){const b=bar.querySelector(`[data-tool=${tool}]`);b.dataset.label=label;b.setAttribute('aria-label',label);b.innerHTML=`<kbd>${key}</kbd>`;menu.append(b);}
 const splitGroups=[];
 for(const [name,tool,label] of [['Shape tools','rectangle','Rectangle'],['Pen tools','pen','Pen']]){
  const toggle=bar.querySelector(`summary[aria-label="${name}"]`),details=toggle.parentElement,button=details.querySelector(`[data-tool=${tool}]`).cloneNode(true);
  delete button.dataset.label;button.replaceChildren();button.title=label;button.classList.add('tool-primary');details.before(button);toggle.textContent='⌄';
  if(name==='Pen tools'){toggle.setAttribute('aria-label','Creation tools');toggle.title='Creation tools';}
  splitGroups.push({details,button});
 }
 const action=document.createElement('button');action.id='toolbelt-actions';action.title='Actions (Ctrl/Cmd K)';action.setAttribute('aria-label','Actions');action.innerHTML=icon('tools');action.onclick=()=>document.getElementById('nav-tools').click();bar.append(action);
 return tool=>{for(const {details,button} of splitGroups){const option=details.querySelector(`[data-tool="${tool}"]`);if(option){button.dataset.tool=tool;button.setAttribute('aria-label',option.getAttribute('aria-label'));button.title=option.dataset.label;button.innerHTML=icon(tool);}button.classList.toggle('active',button.dataset.tool===tool);button.setAttribute('aria-pressed',String(button.dataset.tool===tool));}};
}
