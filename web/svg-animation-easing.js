import {numberField,choose} from './inspector-settings.js';
import {easings,easingPoints} from './svg-animation-model.js';

const NS='http://www.w3.org/2000/svg',labels={linear:'Linear',ease:'Ease','ease-in':'Ease in','ease-out':'Ease out','ease-in-out':'Ease in and out'};
export function easingEditor({value='linear',mixed=false,disabled=false,change}){
 const host=document.createElement('div');host.className='svg-easing-editor';
 let points=[...easingPoints(value)];
 const picker=choose('Keyframe easing',[...(mixed?[['mixed','Mixed',true]]:[]),...Object.keys(easings).map(k=>[k,labels[k]]),['custom','Custom']],mixed?'mixed':Array.isArray(value)?'custom':value,v=>change(v==='custom'?[...points]:v));picker.disabled=disabled;host.append(picker);
 if(mixed)return host;
 const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','0 0 200 176');svg.setAttribute('class','svg-easing-curve');svg.setAttribute('role','group');svg.setAttribute('aria-label','Easing curve editor');
 const make=(tag,attributes)=>{const node=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attributes))node.setAttribute(k,v);svg.append(node);return node;};
 make('path',{d:'M20 16V156H180M20 86H180M100 16V156',class:'svg-curve-grid'});
 const lines=make('path',{class:'svg-curve-handles'}),curve=make('path',{class:'svg-curve-line'}),handles=[0,1].map(index=>make('circle',{r:5,tabindex:disabled?-1:0,role:'slider','aria-label':'Easing handle '+(index+1),'aria-disabled':String(disabled),'aria-valuemin':0,'aria-valuemax':1,'data-easing-handle':index,class:'svg-curve-handle'}));
 host.append(svg);const inputs=document.createElement('div');inputs.className='svg-curve-inputs';const fields=[];
 const commit=next=>change(next.map(n=>Number(n.toFixed(4))));
 ['X1','Y1','X2','Y2'].forEach((name,index)=>{const label=document.createElement('label');label.append(name);const field=numberField('Easing '+name,points[index],v=>{const next=[...points];next[index]=v;commit(next);},{min:0,max:1,step:'.01',disabled});fields.push(field.querySelector('input'));label.append(field);inputs.append(label);});host.append(inputs);
 const draw=()=>{const [x1,y1,x2,y2]=points,px=x=>20+x*160,py=y=>156-y*140;curve.setAttribute('d',`M20 156C${px(x1)} ${py(y1)} ${px(x2)} ${py(y2)} 180 16`);lines.setAttribute('d',`M20 156L${px(x1)} ${py(y1)}M180 16L${px(x2)} ${py(y2)}`);handles.forEach((h,i)=>{h.setAttribute('cx',px(points[i*2]));h.setAttribute('cy',py(points[i*2+1]));h.setAttribute('aria-valuenow',points[i*2]);h.setAttribute('aria-valuetext',`X ${points[i*2].toFixed(2)}, Y ${points[i*2+1].toFixed(2)}`);});fields.forEach((f,i)=>{if(document.activeElement!==f)f.value=Number(points[i].toFixed(4));});};
 const focus=index=>document.querySelector(`[data-easing-handle="${index}"]`)?.focus({preventScroll:true});
 handles.forEach((handle,index)=>{
  handle.onkeydown=e=>{if(disabled||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();const axis=['ArrowUp','ArrowDown'].includes(e.key)?1:0,at=index*2+axis,step=e.shiftKey?.1:.01,next=[...points];next[at]=e.key==='Home'?0:e.key==='End'?1:Math.max(0,Math.min(1,next[at]+(['ArrowDown','ArrowLeft'].includes(e.key)?-step:step)));commit(next);focus(index);};
  handle.onpointerdown=e=>{
   if(disabled||e.button!==0)return;e.preventDefault();e.stopPropagation();handle.setPointerCapture(e.pointerId);const before=[...points];
   const move=event=>{const rect=svg.getBoundingClientRect();points[index*2]=Math.max(0,Math.min(1,((event.clientX-rect.left)*200/rect.width-20)/160));points[index*2+1]=Math.max(0,Math.min(1,(156-(event.clientY-rect.top)*176/rect.height)/140));draw();};
   const clear=()=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',done);handle.removeEventListener('pointercancel',cancel);window.removeEventListener('keydown',escape,true);};
   const done=()=>{clear();if(points.some((n,i)=>n!==before[i]))commit(points);focus(index);},cancel=()=>{clear();points=before;draw();},escape=event=>{if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();cancel();}};
   handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',done);handle.addEventListener('pointercancel',cancel);window.addEventListener('keydown',escape,true);
  };
 });draw();return host;
}
