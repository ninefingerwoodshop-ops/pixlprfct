// Shared by the editor and exported projects. Measure at each assigned column width.
export function mountMasonry(root,onLayout=()=>{}){
 let active=true,pending=0;const observed=new Set();
 const set=(node,key,value)=>{if(node.style[key]!==value)node.style[key]=value;};
 const layout=()=>{
  for(const grid of [...(root.querySelectorAll?.('[data-masonry]')??[])].reverse()){
   const css=getComputedStyle(grid);
   // A media query can switch a masonry grid to Flex without replacing its DOM.
   if(css.display==='flex'){for(const item of grid.children)if(item.matches('[data-masonry-item]')){set(item,'top','0px');set(item,'gridColumn','');}if(grid.dataset.masonryHug==='true')set(grid,'height','');continue;}
   const columns=(css.gridTemplateColumns.match(/[\d.]+px/g)??[]).length||1;
   const raw=css.getPropertyValue('--px-masonry-gap').trim(),gap=raw.endsWith('%')?(parseFloat(raw)||0)*grid.clientHeight/100:raw.endsWith('em')?(parseFloat(raw)||0)*(parseFloat(css.fontSize)||16):parseFloat(raw)||0;
   const heights=Array(columns).fill(0),counts=Array(columns).fill(0);
   const items=[...grid.children].filter(n=>n.matches('[data-masonry-item]')&&getComputedStyle(n).display!=='none');
   for(const item of items){
    const pinned=Number(item.dataset?.masonryColumn);
    const column=pinned>0?Math.min(columns-1,Math.trunc(pinned)-1):heights.indexOf(Math.min(...heights));
    set(item,'gridColumn',String(column+1));set(item,'top',heights[column]+'px');
    const c=getComputedStyle(item);heights[column]+=item.offsetHeight+(parseFloat(c.marginTop)||0)+(parseFloat(c.marginBottom)||0)+gap;counts[column]++;
   }
   const height=Math.max(0,...heights.map((h,i)=>counts[i]?h-gap:0));
   if(grid.dataset.masonryHug==='true')set(grid,'height',(height+(parseFloat(css.paddingTop)||0)+(parseFloat(css.paddingBottom)||0))+'px');
   for(const node of [grid,...items])if(!observed.has(node)){observer?.observe(node);observed.add(node);}
  }
  for(const node of observed)if(!root.contains(node)){observer?.unobserve(node);observed.delete(node);}
 };
 const schedule=()=>{if(active&&!pending)pending=requestAnimationFrame(()=>{pending=0;if(!active)return;layout();onLayout();});};
 const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(schedule);
 const changes=typeof MutationObserver==='undefined'?null:new MutationObserver(schedule);
 changes?.observe(root,{childList:true,subtree:true,characterData:true});
 root.addEventListener?.('load',schedule,true);root.addEventListener?.('input',schedule,true);
 const fonts=root.ownerDocument?.fonts;fonts?.addEventListener('loadingdone',schedule);
 const cleanup=()=>{active=false;if(typeof cancelAnimationFrame!=='undefined')cancelAnimationFrame(pending);observer?.disconnect();changes?.disconnect();root.removeEventListener?.('load',schedule,true);root.removeEventListener?.('input',schedule,true);fonts?.removeEventListener('loadingdone',schedule);};
 cleanup.layout=layout;layout();return cleanup;
}
