export function validGradientStops(stops){
 return Array.isArray(stops)&&stops.length>=1&&stops.length<=128&&stops.every((s,i)=>s&&Number.isFinite(s.offset)&&s.offset>=0&&s.offset<=1&&(!i||s.offset>=stops[i-1].offset)&&/^#[\da-f]{6}$/i.test(s.color)&&Number.isFinite(s.opacity)&&s.opacity>=0&&s.opacity<=1);
}
export function mixGradientStops(a,b,t){
 return a.map((s,i)=>({offset:s.offset+(b[i].offset-s.offset)*t,opacity:s.opacity+(b[i].opacity-s.opacity)*t,color:'#'+[1,3,5].map(n=>Math.round(parseInt(s.color.slice(n,n+2),16)*(1-t)+parseInt(b[i].color.slice(n,n+2),16)*t).toString(16).padStart(2,'0')).join('')}));
}
