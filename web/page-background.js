import {element,action,colorField,settingIcon} from './inspector-settings.js';
export const pageBackground=page=>({color:'#1e1e1e',opacity:1,visible:true,...page?.background});
export function installPageBackground({page,change}){
 const host=document.getElementById('page-section'),row=element('div','page-paint-row');let identity=null;
 const get=()=>pageBackground(page()),patch=value=>change(page().id,{...get(),...value});
 const field=colorField(host,'Page background',get,patch),eye=action('Hide page background','eye',()=>patch({visible:!get().visible}));row.append(field,eye);host.append(row);
 return ()=>{const value=get();if(identity!==page()?.id){for(const popover of host.querySelectorAll(':popover-open'))popover.hidePopover();identity=page()?.id;}field.sync();eye.innerHTML=settingIcon(value.visible?'eye':'hidden');eye.setAttribute('aria-label',(value.visible?'Hide':'Show')+' page background');eye.setAttribute('aria-pressed',String(value.visible));const color=value.visible?value.color+Math.round(value.opacity*255).toString(16).padStart(2,'0'):'transparent';document.getElementById('workspace').style.background=`linear-gradient(${color},${color}),repeating-conic-gradient(#252525 0 25%,#303030 0 50%) 0 / 16px 16px`;};
}
