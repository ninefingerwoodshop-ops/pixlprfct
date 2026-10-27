import {visibleInTree} from './selection.js';
const profiles={
 iphone:{insets:[10,10,10,10],radius:52,camera:'island'},
 'iphone-notch':{insets:[11,11,11,11],radius:46,camera:'notch'},
 'iphone-fold':{insets:[10,10,10,10],radius:30,camera:'hole'},
 ipad:{insets:[24,24,24,24],radius:32,camera:'tablet'},
 phone:{insets:[9,9,11,9],radius:34,camera:'hole'},
 tablet:{insets:[20,20,20,20],radius:24,camera:'tablet'},
 surface:{insets:[25,18,25,18],radius:12,camera:'tablet',landscape:true},
 desktop:{insets:[80,2,2,2],radius:12}
};
export function orientedFrameSize(width,height,orientation){
 return orientation==='portrait'?{width:Math.min(width,height),height:Math.max(width,height)}:orientation==='landscape'?{width:Math.max(width,height),height:Math.min(width,height)}:{width,height};
}
export function orientFrame(frame,orientation){
 return {...frame,...orientedFrameSize(frame.width,frame.height,orientation),layout_item:{...frame.layout_item,fill_width:false,fill_height:false},...(frame.auto_layout?{auto_layout:{...frame.auto_layout,hug_width:false,hug_height:false}}:{})};
}
function rotated(type,width,height){const p=profiles[type];return p&&type!=='desktop'&&(p.landscape?height>width:width>height);}
export function chromeBreakpoints(value){
 const tablet=Number(value?.tablet),desktop=Number(value?.desktop);
 return Number.isFinite(tablet)&&tablet>=1&&Number.isFinite(desktop)&&desktop>tablet?{tablet,desktop}:{tablet:600,desktop:1024};
}
export function responsiveChromeType(type,width,breakpoints){
 if(type!=='auto'&&type!=='auto-apple')return type;
 const apple=type==='auto-apple',limits=chromeBreakpoints(breakpoints);
 return width<limits.tablet?(apple?'iphone':'phone'):width<limits.desktop?(apple?'ipad':'tablet'):'desktop';
}
// Resolve against the same rendered pose used by the canvas shell during resize.
export function deviceChromeStatus(frame,scene){
 if(!frame||frame.kind!=='frame')return '';
 if(scene.some(p=>p.id===frame.parent_id))return 'Top-level frames only';
 if(!showsDeviceChrome(frame,scene))return 'Hidden';
 const type=responsiveChromeType(frame.device_chrome,(frame._rotationHit??frame).width,frame.device_chrome_breakpoints);
 return {phone:'Phone · Android',tablet:'Tablet · Android',iphone:'Phone · iPhone',
  'iphone-notch':'Phone · iPhone (Notch)','iphone-fold':'Phone · Foldable',
  ipad:'Tablet · iPad',surface:'Tablet · Surface',desktop:'Desktop · Browser'}[type]??'Hidden';
}
export function chromeInsets(type,width=0,height=1,breakpoints){
 type=responsiveChromeType(type,width,breakpoints);
 const edges=profiles[type]?.insets??[0,0,0,0];
 return rotated(type,width,height)?[edges[3],edges[0],edges[1],edges[2]]:[...edges];
}
export function deviceScreenRadius(type,width,height,breakpoints){type=responsiveChromeType(type,width,breakpoints);const p=profiles[type];if(!p||type==='desktop')return 0;const turn=rotated(type,width,height),[t,r,b,l]=p.insets,w=turn?height:width,h=turn?width:height;return Math.max(4,Math.min(p.radius,(w+l+r)/4,(h+t+b)/4)-l);}
function roundRect(x,y,w,h,r){return `M${x+r} ${y}H${x+w-r}Q${x+w} ${y} ${x+w} ${y+r}V${y+h-r}Q${x+w} ${y+h} ${x+w-r} ${y+h}H${x+r}Q${x} ${y+h} ${x} ${y+h-r}V${y+r}Q${x} ${y} ${x+r} ${y}Z`;}
// Hardware rotates around the viewport; content remains upright at its actual dimensions.
export function deviceChromeSvg(type,width,height,breakpoints){
 type=responsiveChromeType(type,width,breakpoints);
 const profile=profiles[type];if(!profile)return '';
 const w=Math.max(1,Number(width)||1),h=Math.max(1,Number(height)||1),turn=rotated(type,w,h),[top,right,bottom,left]=profile.insets;
 const cw=turn?h:w,ch=turn?w:h,W=cw+left+right,H=ch+top+bottom,r=Math.min(profile.radius,W/4,H/4),cx=W/2;
 const outerW=turn?H:W,outerH=turn?W:H;
 const start=`<svg xmlns="http://www.w3.org/2000/svg" width="${outerW}" height="${outerH}" viewBox="0 0 ${outerW} ${outerH}" style="width:100%;height:100%;display:block" aria-hidden="true"><defs><linearGradient id="metal" x2="1" y2=".3"><stop stop-color="#a6a9ad"/><stop offset=".08" stop-color="#404349"/><stop offset=".48" stop-color="#181b20"/><stop offset=".86" stop-color="#838891"/><stop offset="1" stop-color="#292c31"/></linearGradient><linearGradient id="bar" x2="0" y2="1"><stop stop-color="#f5f6f8"/><stop offset="1" stop-color="#e7e9ed"/></linearGradient></defs><g${turn?` transform="translate(${H} 0) rotate(90)"`:''}>`;
 const end='</g></svg>';
 if(type==='desktop'){
  const address=Math.max(60,cw-220);
  return start+`<path d="${roundRect(0,0,W,H,12)} M${left} ${top}V${top+ch}H${left+cw}V${top}Z" fill="url(#bar)" fill-rule="evenodd" stroke="#aeb4be"/>
  <path d="M0 39H${W}" stroke="#cbd0d8"/><circle cx="18" cy="20" r="5.5" fill="#ff6058"/><circle cx="36" cy="20" r="5.5" fill="#ffbd2e"/><circle cx="54" cy="20" r="5.5" fill="#28c840"/>
  <path d="M78 39V16Q78 8 86 8H${Math.min(cw-12,280)}Q${Math.min(cw,288)} 8 ${Math.min(cw,288)} 16V39" fill="#fff"/><text x="96" y="27" font-family="system-ui,sans-serif" font-size="12" fill="#414854">Preview</text>
  <g stroke="#59616f" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M24 53l-7 7 7 7M17 60h15M46 53l7 7-7 7M39 60h14"/><path d="M77 55a7 7 0 1 0 2 9M77 51v6h-6"/></g>
  <rect x="98" y="46" width="${address}" height="28" rx="14" fill="#fff" stroke="#d9dde4"/><text x="114" y="64" font-family="system-ui,sans-serif" font-size="12" fill="#6b7280">localhost / preview</text>
  <g fill="#59616f"><circle cx="${W-22}" cy="54" r="1.5"/><circle cx="${W-22}" cy="60" r="1.5"/><circle cx="${W-22}" cy="66" r="1.5"/></g>`+end;
 }
 const aperture=roundRect(left,top,cw,ch,Math.max(4,r-left));
 const lens=(x,y,size=4)=>`<circle cx="${x}" cy="${y}" r="${size}" fill="#06080c" stroke="#262c36"/><circle cx="${x}" cy="${y}" r="${size*.48}" fill="#14263b"/><circle cx="${x-1}" cy="${y-1}" r="${size*.17}" fill="#51647b"/>`;
 let camera='';
 if(profile.camera==='island')camera=`<rect x="${cx-60}" y="${top+11}" width="120" height="34" rx="17" fill="#050608"/>${lens(cx+42,top+28,6)}`;
 if(profile.camera==='notch')camera=`<path d="M${cx-86} ${top-1}h172v13q0 20-20 20H${cx-66}q-20 0-20-20Z" fill="#08090c"/><rect x="${cx-25}" y="${top+8}" width="50" height="4" rx="2" fill="#262b32"/>${lens(cx+51,top+15)}`;
 if(profile.camera==='hole')camera=lens(cx,top+17,6);
 if(profile.camera==='tablet')camera=lens(cx,top/2,3.5);
 const buttons=profile.landscape?`<rect x="${W-100}" y="0" width="46" height="3" rx="1.5" fill="#777d86"/>`:`<rect x="0" y="${H*.17}" width="3" height="26" rx="1.5" fill="#727781"/><rect x="0" y="${H*.23}" width="3" height="46" rx="1.5" fill="#727781"/><rect x="0" y="${H*.30}" width="3" height="46" rx="1.5" fill="#727781"/><rect x="${W-3}" y="${H*.25}" width="3" height="68" rx="1.5" fill="#727781"/>`;
 return start+`<path d="${roundRect(1,1,W-2,H-2,r)} ${aperture}" fill="url(#metal)" fill-rule="evenodd" stroke="#858b94" stroke-width="1"/>
 <path d="${roundRect(4,4,W-8,H-8,r-3)} ${aperture}" fill="#080a0d" fill-rule="evenodd" stroke="#343940" stroke-width=".7"/>
 ${buttons}${camera}<path d="M3 ${H*.12}h4M3 ${H*.84}h4M${W-7} ${H*.12}h4M${W-7} ${H*.84}h4" stroke="#b0b3b9" stroke-width="2" opacity=".5"/>`+end;
}
export function showsDeviceChrome(frame,scene){return frame.kind==='frame'&&!scene.some(p=>p.id===frame.parent_id)&&!frame.device_chrome_hidden&&!!frame.device_chrome&&frame.device_chrome!=='none'&&visibleInTree(frame,scene);}
export function installDeviceChrome(canvas){
 const layer=document.createElement('div');layer.className='device-chrome-overlay';layer.setAttribute('aria-hidden','true');layer.style.cssText='position:absolute;inset:0;overflow:hidden;pointer-events:none';canvas.after(layer);
 const entries=new Map();
 return (scene,pan,zoom)=>{
  const box=canvas.getBoundingClientRect(),host=canvas.parentElement.getBoundingClientRect();
  layer.style.left=box.left-host.left+'px';layer.style.top=box.top-host.top+'px';layer.style.width=box.width+'px';layer.style.height=box.height+'px';
  const frames=scene.filter(s=>showsDeviceChrome(s,scene)),live=new Set(frames.map(s=>s.id));
  for(const [id,node] of entries)if(!live.has(id)){node.remove();entries.delete(id);}
  for(const frame of frames){
   let node=entries.get(frame.id);if(!node){node=document.createElement('div');node.style.cssText='position:absolute;pointer-events:none;transform-origin:0 0;box-shadow:0 12px 24px #0003';layer.append(node);entries.set(frame.id,node);}
   const pose=frame._rotationHit??frame,[top,right,bottom,left]=chromeInsets(frame.device_chrome,pose.width,pose.height,frame.device_chrome_breakpoints),key=[frame.device_chrome,pose.width,pose.height,JSON.stringify(frame.device_chrome_breakpoints)].join(':');
   if(node.dataset.key!==key){node.innerHTML=deviceChromeSvg(frame.device_chrome,pose.width,pose.height,frame.device_chrome_breakpoints);node.dataset.key=key;}
   node.style.borderRadius=(profiles[responsiveChromeType(frame.device_chrome,pose.width,frame.device_chrome_breakpoints)]?.radius??0)+'px';
   node.style.width=pose.width+left+right+'px';node.style.height=pose.height+top+bottom+'px';
   node.style.left=pan.x+pose.x*zoom+'px';node.style.top=pan.y+pose.y*zoom+'px';
   node.style.transform=`scale(${zoom}) rotate(${-(pose.rotation??0)}deg) translate(${-left}px,${-top}px)`;
  }
 };
}
