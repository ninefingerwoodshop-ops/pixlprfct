import {icon} from './icons.js';
export function calendarConfig(c){const v=c.calendar??{};return {preview_open:!!v.preview_open,week_start:v.week_start===1?1:0,width:Math.max(240,Math.min(600,Number(v.width)||300)),today:v.today!==false,clear:v.clear!==false};}
export function calendarDays(year,month,value='',min='',max='',weekStart=0,step=''){
 const iso=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
 const first=new Date(year,month,1,12),start=new Date(year,month,1-(first.getDay()-weekStart+7)%7,12),days=[];
 const base=Date.parse(min||'1970-01-01'),stride=Number(step)>0?Number(step):1;
 for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);const date=iso(d);days.push({date,day:d.getDate(),outside:d.getMonth()!==month,selected:date===value,disabled:!!((min&&date<min)||(max&&date>max)||(step!=='any'&&(Date.parse(date)-base)/86400000%stride!==0))});}
 return days;
}
export function calendarMarkup(c,id){
 const cfg=calendarConfig(c),esc=v=>String(v).replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
 const d=/^\d{4}-\d{2}-\d{2}$/.test(c.value)?new Date(c.value+'T12:00:00'):new Date(),y=d.getFullYear(),m=d.getMonth();
 const days=calendarDays(y,m,c.value,c.min,c.max,cfg.week_start,c.step),focus=days.find(d=>d.selected&&!d.disabled)||days.find(d=>!d.outside&&!d.disabled);
 return `<button type="button" class="px-calendar-toggle" aria-label="Choose date" aria-haspopup="dialog" aria-expanded="false" aria-controls="px-calendar-${id}" data-calendar="${esc(JSON.stringify(cfg))}"${c.disabled||c.readonly?' disabled':''}>${icon('calendar')}</button><div id="px-calendar-${id}" class="px-calendar" role="dialog" aria-label="Choose date" hidden><div class="px-calendar-header"><button type="button" data-month="-1" aria-label="Previous month">${icon('chevron-left')}</button><span class="px-calendar-title" aria-live="polite">${d.toLocaleDateString('en-US',{month:'long',year:'numeric'})}</span><button type="button" data-month="1" aria-label="Next month">${icon('chevron-right')}</button></div><div class="px-calendar-weekdays" aria-hidden="true">${Array.from({length:7},(_,i)=>'<span>'+['Su','Mo','Tu','We','Th','Fr','Sa'][(i+cfg.week_start)%7]+'</span>').join('')}</div><div class="px-calendar-days">${days.map(d=>`<button type="button" data-date="${d.date}" aria-label="${d.date}" aria-pressed="${d.selected}" tabindex="${d===focus?0:-1}"${d.disabled?' disabled':''}${d.outside?' data-outside="true"':''}>${d.day}</button>`).join('')}</div><div class="px-calendar-footer">${cfg.today?'<button type="button" data-today>Today</button>':''}${cfg.clear?'<button type="button" data-clear>Clear</button>':''}<button type="button" data-close>Close</button></div></div>`;
}
export function calendarCss(c,id,interactive){
 const r='.px-node-'+id,cfg=calendarConfig(c),row=c.label?2:1;
 return `${r}{display:grid!important;grid-template-columns:minmax(0,1fr);row-gap:6px}${r}>.px-control-label{grid-row:1;grid-column:1}${r}>.px-control{grid-row:${row};grid-column:1;padding-right:40px}${r}>.px-control::-webkit-calendar-picker-indicator{display:none}${r}>.px-control-messages{grid-row:${row+1};grid-column:1}${r}>.px-calendar-toggle{grid-row:${row};grid-column:1;justify-self:end;align-self:center;position:relative;z-index:3;width:32px;height:32px;margin-right:4px;display:grid;place-items:center;border:0;background:transparent;color:inherit;border-radius:4px}${r}>.px-calendar-toggle svg{width:16px;height:16px}${r}>.px-calendar{position:fixed;inset:auto;z-index:20;box-sizing:border-box;width:${cfg.width}px;max-width:calc(100vw - 16px);max-height:calc(100vh - 16px);overflow:auto;padding:12px;background:#fff;color:#222;border:1px solid #cbd5e1;border-radius:8px;box-shadow:0 8px 24px #10182826;font:14px Manrope,sans-serif}${r} .px-calendar[hidden]{display:none}${r} .px-calendar-header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}${r} .px-calendar button{font:inherit;color:inherit;background:transparent;border:0;border-radius:4px;min-height:32px;cursor:pointer}${r} .px-calendar-header button{width:32px;display:grid;place-items:center}${r} .px-calendar-header svg{width:16px;height:16px}${r} .px-calendar-weekdays,${r} .px-calendar-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px;text-align:center}${r} .px-calendar-weekdays{font-size:12px;margin-bottom:4px}${r} .px-calendar-days button[data-outside]{color:#64748b}${r} .px-calendar button:hover:not(:disabled){background:#eff6ff}${r} .px-calendar-days button[aria-pressed="true"]{background:#2563eb;color:#fff}${r} .px-calendar button:disabled{opacity:.4;cursor:not-allowed}${r} .px-calendar button:focus-visible,${r}>.px-calendar-toggle:focus-visible{outline:2px solid #2563eb;outline-offset:1px}${r} .px-calendar-footer{display:flex;gap:8px;margin-top:8px}${!interactive?`${r}>.px-calendar-toggle{pointer-events:none}`:''}${!interactive&&cfg.preview_open?`${r}>.px-calendar[hidden]{display:block;position:absolute;grid-column:1/2;grid-row:${row}/${row+1};top:calc(100% + 4px);left:0;pointer-events:none}`:''}`;
}
// Self-contained, exported to every framework alongside calendarDays.
export function mountCalendars(root){
 const cleanups=[];
 for(const toggle of root.querySelectorAll('[data-calendar]')){
  const host=toggle.parentElement,input=host.querySelector('input[type="date"]'),panel=host.querySelector('.px-calendar');if(!input||!panel)continue;
  const cfg=JSON.parse(toggle.dataset.calendar),grid=panel.querySelector('.px-calendar-days'),title=panel.querySelector('.px-calendar-title');let view=new Date(),open=false;
  const on=(el,event,fn,opts)=>{el.addEventListener(event,fn,opts);cleanups.push(()=>el.removeEventListener(event,fn,opts));};
  const iso=d=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
  const allowed=date=>calendarDays(Number(date.slice(0,4)),Number(date.slice(5,7))-1,input.value,input.min,input.max,cfg.week_start,input.step).find(d=>d.date===date&&!d.disabled);
  const position=()=>{if(!open)return;const r=input.getBoundingClientRect(),p=panel.getBoundingClientRect();panel.style.left=Math.max(8,Math.min(r.left,innerWidth-p.width-8))+'px';panel.style.top=Math.max(8,Math.min(r.bottom+p.height+4<=innerHeight?r.bottom+4:r.top-p.height-4,innerHeight-p.height-8))+'px';};
  const draw=(focusDate,focus=false)=>{
   const days=calendarDays(view.getFullYear(),view.getMonth(),input.value,input.min,input.max,cfg.week_start,input.step),target=days.find(d=>d.date===focusDate&&!d.disabled)||days.find(d=>d.selected&&!d.disabled)||days.find(d=>!d.outside&&!d.disabled);
   title.textContent=view.toLocaleDateString('en-US',{month:'long',year:'numeric'});grid.replaceChildren();
   for(const d of days){const b=document.createElement('button');b.type='button';b.textContent=d.day;b.dataset.date=d.date;b.setAttribute('aria-label',d.date);b.setAttribute('aria-pressed',String(d.selected));b.tabIndex=d===target?0:-1;b.disabled=d.disabled;if(d.outside)b.dataset.outside='true';grid.append(b);}
   const today=panel.querySelector('[data-today]');if(today)today.disabled=!allowed(iso(new Date()));position();if(focus)(grid.querySelector('[tabindex="0"]')||panel.querySelector('[data-close]')).focus();
  };
  const close=restore=>{open=false;panel.hidden=true;toggle.setAttribute('aria-expanded','false');if(restore)toggle.focus();};
  const show=()=>{if(input.disabled||input.readOnly)return;view=new Date((input.value||iso(new Date()))+'T12:00:00');if(input.min&&iso(view)<input.min)view=new Date(input.min+'T12:00:00');if(input.max&&iso(view)>input.max)view=new Date(input.max+'T12:00:00');open=true;panel.hidden=false;toggle.setAttribute('aria-expanded','true');draw(input.value,true);};
  const choose=date=>{if(date&&!allowed(date))return;input.value=date;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));input.dispatchEvent(new Event('blur'));close(true);};
  on(toggle,'click',()=>open?close(true):show());
  on(input,'keydown',e=>{if(e.altKey&&e.key==='ArrowDown'){e.preventDefault();show();}});
  on(panel,'click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;if(b.dataset.date)choose(b.dataset.date);else if(b.dataset.month){view=new Date(view.getFullYear(),view.getMonth()+Number(b.dataset.month),1,12);draw();}else if(b.hasAttribute('data-today'))choose(iso(new Date()));else if(b.hasAttribute('data-clear'))choose('');else if(b.hasAttribute('data-close'))close(true);});
  on(panel,'keydown',e=>{
   if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);return;}
   if(e.key==='Tab'){const items=[...panel.querySelectorAll('button:not(:disabled)')].filter(b=>b.tabIndex>=0);if(e.shiftKey&&e.target===items[0]){e.preventDefault();items.at(-1)?.focus();}else if(!e.shiftKey&&e.target===items.at(-1)){e.preventDefault();items[0]?.focus();}return;}
   const date=e.target.dataset.date;if(!date)return;const d=new Date(date+'T12:00:00'),shifts={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7};
   if(e.key in shifts)d.setDate(d.getDate()+shifts[e.key]);else if(e.key==='Home')d.setDate(d.getDate()-(d.getDay()-cfg.week_start+7)%7);else if(e.key==='End')d.setDate(d.getDate()+6-(d.getDay()-cfg.week_start+7)%7);else if(['PageUp','PageDown'].includes(e.key)){const day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+(e.key==='PageUp'?-1:1));d.setDate(Math.min(day,new Date(d.getFullYear(),d.getMonth()+1,0).getDate()));}else return;
   e.preventDefault();if(!allowed(iso(d)))return;view=d;draw(iso(d),true);
  });
  on(document,'pointerdown',e=>{if(open&&!e.composedPath().includes(host))close(false);});on(window,'resize',position);on(window,'scroll',position,true);
  on(input,'change',()=>{if(open)draw();});cleanups.push(()=>close(false));
 }
 return ()=>cleanups.reverse().forEach(fn=>fn());
}
