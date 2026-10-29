export function hexToHsv(hex){
 const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
 const h=!delta?0:max===r?60*((g-b)/delta%6):max===g?60*((b-r)/delta+2):60*((r-g)/delta+4);
 return [(h+360)%360,max?delta/max:0,max];
}
export function hsvToHex([h,s,v]){
 h=((h%360)+360)%360;s=Math.max(0,Math.min(1,s));v=Math.max(0,Math.min(1,v));
 const c=v*s,x=c*(1-Math.abs(h/60%2-1)),m=v-c,rgb=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
 return '#'+rgb.map(n=>Math.round((n+m)*255).toString(16).padStart(2,'0')).join('');
}
export function installColorPicker(host,label,commit){
 let hsv=[0,0,1],dragging=null;
 const area=document.createElement('div');area.className='color-saturation';area.tabIndex=0;area.setAttribute('role','slider');area.setAttribute('aria-label',label+' saturation and brightness');area.setAttribute('aria-valuemin','0');area.setAttribute('aria-valuemax','100');
 const cursor=document.createElement('span');cursor.className='color-reticle';area.append(cursor);
 const hue=document.createElement('input');hue.type='range';hue.min='0';hue.max='360';hue.step='1';hue.className='color-hue';hue.setAttribute('aria-label',label+' hue');host.append(area,hue);
 const render=()=>{area.style.backgroundColor=hsvToHex([hsv[0],1,1]);cursor.style.setProperty('--reticle-color',hsvToHex(hsv));hue.style.setProperty('--thumb-color',hsvToHex([hsv[0],1,1]));cursor.style.left=hsv[1]*100+'%';cursor.style.top=(1-hsv[2])*100+'%';area.setAttribute('aria-valuenow',String(Math.round(hsv[1]*100)));area.setAttribute('aria-valuetext',`Saturation ${Math.round(hsv[1]*100)}%, brightness ${Math.round(hsv[2]*100)}%`);hue.value=hsv[0];};
 const move=e=>{const r=area.getBoundingClientRect();hsv[1]=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));hsv[2]=1-Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));render();};
 area.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();dragging={id:e.pointerId,start:[...hsv]};area.setPointerCapture(e.pointerId);area.focus();move(e);};area.onpointermove=e=>{if(dragging)move(e);};const finish=cancel=>{if(!dragging)return;const previous=dragging;dragging=null;if(cancel){hsv=previous.start;render();}if(area.hasPointerCapture(previous.id))area.releasePointerCapture(previous.id);if(!cancel)commit(hsvToHex(hsv));};area.onpointerup=e=>{if(!dragging)return;move(e);finish(false);};area.onpointercancel=()=>finish(true);area.onlostpointercapture=()=>finish(true);
 area.onkeydown=e=>{if(e.key==='Escape'&&dragging){e.preventDefault();e.stopPropagation();finish(true);return;}const step=e.shiftKey?.1:.01;if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();e.stopPropagation();hsv[e.key==='ArrowLeft'||e.key==='ArrowRight'?1:2]=Math.max(0,Math.min(1,hsv[e.key==='ArrowLeft'||e.key==='ArrowRight'?1:2]+(['ArrowLeft','ArrowDown'].includes(e.key)?-step:step)));render();commit(hsvToHex(hsv));};
 hue.oninput=()=>{hsv[0]=Number(hue.value);render();};hue.onchange=()=>commit(hsvToHex(hsv));
 return color=>{const next=hexToHsv(color);if(!next[1]||!next[2])next[0]=hsv[0];hsv=next;render();};
}
