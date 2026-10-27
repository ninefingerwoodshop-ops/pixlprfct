import {iconKeywords} from './icon-keywords.js';
import {icon,iconPaths,iconWeights} from './icons.js';
import {workspaceWindow} from './workspace-window.js';
export function iconSvg(name,weight='regular'){
 if(!Object.hasOwn(iconPaths,name))throw Error('Unknown icon');
 return icon(name,weight).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" ').replaceAll('="currentColor"','="#222222"');
}
export function installIconLibrary({insert,notify}){
 const make=(tag,text)=>{const e=document.createElement(tag);if(text)e.textContent=text;return e;};
 const content=make('section');content.className='icon-library';
 const intro=make('p','The PixlPrfct system icons, available as a free icon font in three weights. Insert editable vectors or copy an SVG.');
 const toolbar=make('div');toolbar.className='icon-library-toolbar';
 const search=make('input');search.type='search';search.placeholder='Search icons';search.setAttribute('aria-label','Search icon library');
 const weight=make('select');weight.setAttribute('aria-label','Icon weight');for(const name of Object.keys(iconWeights)){const o=make('option',name[0].toUpperCase()+name.slice(1));o.value=name;weight.append(o);}weight.value='regular';
 const count=make('span');count.setAttribute('aria-live','polite');toolbar.append(search,weight,count);
 const grid=make('div');grid.className='icon-library-grid';grid.setAttribute('role','group');grid.setAttribute('aria-label','Icons');
 const detail=make('footer');detail.className='icon-library-detail';
 const preview=make('span'),nameLabel=make('strong'),usage=make('code'),insertButton=make('button','Insert icon'),copyButton=make('button','Copy SVG'),downloadButton=make('button','Download SVG');
 preview.className='icon-library-preview';detail.append(preview,nameLabel,usage,insertButton,copyButton,downloadButton);
 content.append(intro,toolbar,grid,detail);const window=workspaceWindow('PixlPrfct Icon Library',content);let selected='asterisk';
 const paintDetail=()=>{preview.innerHTML=`<span class="pxi pxi-${selected} pxi-${weight.value}" aria-hidden="true"></span>`;nameLabel.textContent=selected;usage.textContent=`pxi pxi-${selected} pxi-${weight.value}`;};
 const render=()=>{grid.replaceChildren();const names=Object.keys(iconPaths).filter(name=>(name+' '+(iconKeywords[name]??[]).join(' ')).includes(search.value.trim().toLowerCase().replaceAll(' ','-'))).sort();count.textContent=names.length+' icons';
  for(const name of names){const b=make('button');b.type='button';b.className='icon-library-card';b.setAttribute('aria-label',name);b.setAttribute('aria-pressed',String(name===selected));const glyph=make('span');glyph.className=`pxi pxi-${name} pxi-${weight.value}`;glyph.setAttribute('aria-hidden','true');b.append(glyph,make('span',name));b.onclick=()=>{selected=name;render();};grid.append(b);}
  if(!names.length)grid.append(make('p','No matching icons.'));paintDetail();
 };
 search.oninput=render;weight.onchange=render;
 insertButton.onclick=()=>{insert(iconSvg(selected,weight.value),selected+' '+weight.value);window.close();};
 copyButton.onclick=async()=>{try{await navigator.clipboard.writeText(iconSvg(selected,weight.value));notify('SVG copied');}catch{notify('Clipboard unavailable. Use Download SVG.');}};
 downloadButton.onclick=()=>{const blob=new Blob([iconSvg(selected,weight.value)],{type:'image/svg+xml'}),url=URL.createObjectURL(blob),a=make('a');a.href=url;a.download=selected+'-'+weight.value+'.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 return ()=>{render();window.open();search.focus();};
}
