export function textareaConfig(c){const v=c.textarea??{};return {rows:Math.max(1,Math.min(30,Math.round(Number(v.rows)||4))),resize:['none','vertical','horizontal','both'].includes(v.resize)?v.resize:'vertical',count:!!v.count};}
export function mountTextareas(root){
 const cleanups=[];
 for(const field of root.querySelectorAll('textarea.px-control')){
  const counter=field.parentElement.querySelector('.px-character-count');if(!counter)continue;
  const update=()=>{const max=field.getAttribute('maxlength');counter.textContent=field.value.length+(max===null?' characters':' / '+max+' characters');};
  let disposed=false;const reset=()=>queueMicrotask(()=>{if(!disposed)update();});
  field.addEventListener('input',update);field.addEventListener('change',update);field.form?.addEventListener('reset',reset);update();
  cleanups.push(()=>{disposed=true;field.removeEventListener('input',update);field.removeEventListener('change',update);field.form?.removeEventListener('reset',reset);});
 }
 return ()=>cleanups.forEach(fn=>fn());
}
