export const defaultTrack=()=>({mode:'fr',value:1,min:null,max:null});
export const defaultGrid=()=>({columns:[defaultTrack(),defaultTrack()],rows:[],auto_rows:defaultTrack()});
function el(tag,text){const e=document.createElement(tag);if(text)e.textContent=text;return e;}
function field(parent,label,id,value,change,{min=0,max=1000000,placeholder=''}={}){const wrap=el('label',label),input=el('input');input.id=id;input.type='number';input.min=min;input.max=max;input.step='any';input.placeholder=placeholder;input.value=value??'';input.onchange=()=>change(input.value===''?null:Number(input.value));wrap.append(input);parent.append(wrap);return input;}
function select(parent,label,id,value,options,change){const wrap=el('label',label),input=el('select');input.id=id;for(const [v,name] of options){const option=el('option',name);option.value=v;input.append(option);}input.value=value;input.onchange=()=>change(input.value);wrap.append(input);parent.append(wrap);}
function trackControls(parent,title,id,t,change,reorder){
 const section=el('details'),heading=el('summary',`${title} · ${t.mode==='hug'?'Hug':t.value+(t.mode==='fr'?'fr':' px')}`);section.id=id;section.append(heading);parent.append(section);
 select(section,'Sizing',`${id}-mode`,t.mode,[['fixed','Fixed'],['hug','Hug contents'],['fr','Fill (fr)']],mode=>change({...t,mode,value:mode==='fr'?1:mode==='fixed'?100:t.value}));
 if(t.mode!=='hug')field(section,t.mode==='fr'?'Fraction':'Pixels',`${id}-value`,t.value,value=>change({...t,value:value??1}),{min:t.mode==='fr'?.001:0});
 const limits=el('div');limits.className='property-grid';section.append(limits);for(const key of ['min','max'])field(limits,key==='min'?'Minimum':'Maximum',`${id}-${key}`,t[key],value=>change({...t,[key]:value}),{placeholder:'None'});
 if(reorder){const actions=el('div');actions.className='property-grid';for(const [delta,text] of [[-1,'Move earlier'],[1,'Move later']]){const button=el('button',text);button.type='button';button.onclick=()=>reorder(delta);actions.append(button);}section.append(actions);}
}
export function renderGridControls(panel,shape,update,reorder,plan){
 const expanded=new Set([...panel.querySelectorAll('details[open]')].map(e=>e.id));panel.replaceChildren();panel.hidden=shape?.auto_layout?.direction!=='grid';if(panel.hidden)return;
 const l=shape.auto_layout,g=l.grid??defaultGrid(),commit=grid=>update({...shape,auto_layout:{...l,grid}});
 const counts=el('div');counts.className='property-grid';panel.append(counts);
 for(const key of ['columns','rows'])field(counts,key==='columns'?'Columns':'Rows (0 = auto)',`grid-${key}-count`,g[key].length,value=>{const n=Math.max(key==='columns'?1:0,Math.min(128,Math.trunc(value??0)));commit({...g,[key]:Array.from({length:n},(_,i)=>g[key][i]??defaultTrack())});},{min:key==='columns'?1:0,max:128});
 panel.append(el('p','Expand a track to set fixed pixels, hug contents, fractional sizing, or limits. Additional rows use the automatic row settings.'));
 for(const key of ['columns','rows']){const tracks=key==='rows'?Array.from({length:Math.min(128,Math.max(g.rows.length,plan?.rows.length??0))},(_,i)=>g.rows[i]??g.auto_rows??defaultTrack()):g.columns;tracks.forEach((t,i)=>trackControls(panel,`${key==='columns'?'Column':'Row'} ${i+1}`,`grid-${key}-${i}`,t,value=>commit({...g,[key]:tracks.map((old,j)=>i===j?value:old)}),reorder?delta=>reorder(key,i,delta):null));}
 if(reorder)panel.append(el('p','Moving a track also moves connected spans. Canvas: select a track edge, then Alt + arrow to reorder.'));
 trackControls(panel,'Automatic rows','grid-auto-rows',g.auto_rows??defaultTrack(),value=>commit({...g,auto_rows:value}));
 for(const section of panel.querySelectorAll('details'))section.open=expanded.has(section.id);
}
export function renderGridCell(panel,shape,parent,update,plan){
 panel.replaceChildren();panel.hidden=!shape||parent?.auto_layout?.direction!=='grid'||shape.layout_item?.absolute;if(panel.hidden)return;
 const c={column:null,row:null,column_span:1,row_span:1,align_x:'start',align_y:'start',...shape.layout_item?.grid_cell},placed=plan?.placements.find(p=>p.id===shape.id);
 panel.append(el('h3','Grid cell'));if(placed)panel.append(el('p',`Column ${placed.column}, row ${placed.row} · ${placed.column_span} × ${placed.row_span} cells`));
 const commit=(key,value)=>update({...shape,layout_item:{...shape.layout_item,grid_cell:{...c,[key]:value},...(key==='column_span'&&value>1?{fill_width:true}:{}),...(key==='row_span'&&value>1?{fill_height:true}:{})}});
 const positions=el('div');positions.className='property-grid';panel.append(positions);
 for(const [key,label,max] of [['column','Column',128],['row','Row',10000],['column_span','Column span',128],['row_span','Row span',128]])field(positions,label,`grid-cell-${key}`,c[key],value=>commit(key,value===null?(key.endsWith('span')?1:null):Math.trunc(value)),{min:1,max,placeholder:'Auto'});
 for(const [key,label] of [['align_x','Horizontal alignment'],['align_y','Vertical alignment']])select(panel,label,`grid-cell-${key}`,c[key],[['start','Start'],['center','Center'],['end','End']],value=>commit(key,value));
 const reset=el('button','Automatic placement');reset.className='wide-button';reset.onclick=()=>update({...shape,layout_item:{...shape.layout_item,grid_cell:{...c,column:null,row:null}}});panel.append(reset);
}
