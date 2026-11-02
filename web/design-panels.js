import {installDetachablePanels} from './detachable-panels.js';
import {installPanelDocks} from './panel-docks.js';
import {editorDOM} from './editor-dom.js';
import {icon} from './icons.js';

// Only workspace parent panels move. Their sections remain a single live tree.
export function installDesignPanels(options){
 const navigation=editorDOM.querySelector('.design-navigation'),projects=editorDOM.getElementById('browse-drafts');projects.setAttribute('aria-label','All projects');projects.title='All projects';
 for(const [id,label,glyph] of [['open','Import design','upload'],['save','Download project copy','download']]){const action=document.createElement('button');action.type='button';action.className='compact-file-action';action.setAttribute('aria-label',label);action.title=label;action.innerHTML=icon(glyph);action.onclick=()=>editorDOM.getElementById(id).click();navigation.append(action);}
 const mark=(node,key,label,side)=>{if(!node)return;node.dataset.detachablePanel=key;node.dataset.panelLabel=label;node.dataset.panelSide=side;const heading=document.createElement('div');heading.className='panel-parent-heading panel-tear-heading';heading.setAttribute('aria-label',label+' panel heading');const text=document.createElement('strong');text.textContent=label;heading.append(text);node.prepend(heading);};
 mark(editorDOM.getElementById('file-panel'),'layers','Layers','left');
 mark(editorDOM.getElementById('assets-panel'),'assets','Assets','left');
 mark(editorDOM.querySelector('.right-panel'),'inspector','Inspector','right');
 mark(editorDOM.querySelector('.toolbox'),'tools','Drawing tools','bottom');
 mark(editorDOM.getElementById('motion-timeline'),'timeline','Timeline','bottom');
 let docks;const changed=()=>{docks?.sync();options.changed?.();};
 const panels=installDetachablePanels({...options,changed,contexts:true,parentKeys:['layers','assets','inspector','tools','timeline']});
 docks=installPanelDocks({panels,changed:()=>{options.changed?.();}});
 const sync=()=>{panels.sync();docks.sync();};sync();return {...panels,sync};
}
