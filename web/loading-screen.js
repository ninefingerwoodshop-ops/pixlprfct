// Kept independent of the editor, icon library and WASM so startup can paint first.
const mark='M11 3.5Q11 3 11.6 3.2L18.7 5.3C21.4 6.1 22.3 8.3 20.8 10.1C20.2 9.5 19.5 9.2 18.5 8.9L11 6.7ZM3 19V13.5C3 11 4.6 10.1 6.8 10.8L13.4 12.7C16.2 13.5 19.5 12.3 21 10.8V14C20 16.3 16.3 18.1 13.5 17.3L7.1 15.4Q5.5 14.9 5.5 16.2V21C4 20.8 3 20 3 19Z';
// Points follow the two ribbons of the mark, then gather into a small orbit.
const points=[[11.5,4.2],[14.4,5],[17.4,5.9],[19.8,7.5],[11.5,6],[14.4,6.9],[17.4,7.8],[20,9.4],[4.2,12],[7,12],[10,13],[13,14],[16,14.6],[19,13.8],[20.3,12],[4.2,15],[4.2,18],[4.8,20],[7,14.3],[10,15.2],[13,16.1],[16,16.2],[19,15.2]];
export const loadingMarkMarkup=`<svg class="loading-mark" viewBox="-5 -5 34 34" aria-hidden="true" focusable="false"><path class="loading-mark-solid" d="${mark}"/><path class="loading-mark-trace" d="${mark}" pathLength="100"/>${points.map(([x,y],i)=>{const angle=i/points.length*Math.PI*2;return `<circle class="loading-mark-dot" cx="${x}" cy="${y}" r=".6" style="--dot-x:${(12+12*Math.cos(angle)-x).toFixed(2)}px;--dot-y:${(12+12*Math.sin(angle)-y).toFixed(2)}px;--dot-delay:${i*11}ms"/>`;}).join('')}</svg>`;

export function loadingScreenMarkup(message='Opening your workspace…'){
 const safe=message.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 return `<div class="loading-screen" data-loading-screen aria-label="Loading PixlPrfct"><div class="loading-content">${loadingMarkMarkup}<div class="loading-brand">PixlPrfct</div><p class="loading-message" role="status" aria-live="polite" aria-atomic="true">${safe}</p><p class="loading-help" hidden>This is taking longer than usual. You can keep waiting or try again.</p><div class="loading-actions" hidden><a href="" class="loading-retry">Try again</a><a href="/">All projects</a></div><noscript>Enable JavaScript to open PixlPrfct.</noscript></div></div>`;
}

let active;
export function startLoading(message){
 active?.dispose();active=undefined;
 const screen=document.querySelector('[data-loading-screen]');
 if(!screen)return;
 screen.hidden=false;screen.removeAttribute('data-failed');
 const label=screen.querySelector('.loading-message'),help=screen.querySelector('.loading-help'),actions=screen.querySelector('.loading-actions');
 if(message)label.textContent=message;
 help.hidden=actions.hidden=true;
 const locked=[...new Set([...document.body.children,document.getElementById('project-home')])].filter(node=>node&&node!==screen&&!node.contains(screen)&&!node.inert);
 for(const node of locked)node.inert=true;
 const timer=setTimeout(()=>{help.hidden=actions.hidden=false;},15000);
 const release=()=>{clearTimeout(timer);for(const node of locked)node.inert=false;};
 active={screen,label,help,actions,stopTimer:()=>clearTimeout(timer),dispose:release};
}
export function loadingMessage(message){if(active)active.label.textContent=message;}
export function finishLoading(){
 if(!active)return;
 active.screen.hidden=true;active.dispose();active=undefined;
}
export function failLoading(message='PixlPrfct couldn’t open. Try again, or return to your projects.'){
 if(!active)startLoading();
 if(!active)return;
 active.screen.setAttribute('data-failed','');active.label.textContent=message;
 active.help.hidden=true;active.actions.hidden=false;
 // Keep the unfinished workspace inert, but stop the slow-load timer.
 active.stopTimer();
}
