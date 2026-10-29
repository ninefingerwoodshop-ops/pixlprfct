import {hexToHsv,hsvToHex} from './color-picker.js';
export function colorChannels(hex,format){
 const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));if(format==='RGB')return rgb;
 const [h,s,v]=hexToHsv(hex);if(format==='HSB')return [Math.round(h),Math.round(s*100),Math.round(v*100)];
 if(format==='HSL'){const l=v*(1-s/2);return [Math.round(h),Math.round((l===0||l===1?0:(v-l)/Math.min(l,1-l))*100),Math.round(l*100)];}
 return [format==='CSS'?hex:hex.slice(1).toUpperCase()];
}
export function channelsColor(values,format){
 if(format==='Hex'){let h=values[0].trim().replace(/^#/,'');if(/^[0-9a-f]{3}$/i.test(h))h=[...h].map(x=>x+x).join('');if(!/^[0-9a-f]{6}$/i.test(h))throw Error('Enter a 3- or 6-digit hex color.');return '#'+h.toLowerCase();}
 if(format==='CSS'){const v=values[0];if(!CSS.supports('color',v)||/var\(|currentcolor/i.test(v))throw Error('Enter a CSS color, such as rgb(12, 90, 180).');const c=document.createElement('canvas').getContext('2d');c.fillStyle=v;c.fillRect(0,0,1,1);return '#'+[...c.getImageData(0,0,1,1).data].slice(0,3).map(x=>x.toString(16).padStart(2,'0')).join('');}
 const n=values.map(Number),max=format==='RGB'?[255,255,255]:[360,100,100];if(n.some((v,i)=>!Number.isFinite(v)||v<0||v>max[i]))throw Error('Color channels are outside their range.');if(format==='RGB')return '#'+n.map(x=>Math.round(x).toString(16).padStart(2,'0')).join('');
 if(format==='HSB')return hsvToHex([n[0],n[1]/100,n[2]/100]);const s=n[1]/100,l=n[2]/100,v=l+s*Math.min(l,1-l);return hsvToHex([n[0],v?2*(1-l/v):0,v]);
}
export function contrastRatio(foreground,background,opacity=1){const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255),back=rgb(background),front=rgb(foreground).map((v,i)=>v*opacity+back[i]*(1-opacity)),l=c=>c.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0),a=l(front),b=l(back);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);}
