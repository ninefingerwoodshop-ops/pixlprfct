let fieldSequence=0;
export function el(tag,text,className){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;}
export function button(label,action,className){const node=el('button',label,className);node.type='button';node.onclick=action;return node;}
export function link(label,url){const node=el('a',label);node.href=url;return node;}
export function field(label,name,{type='text',value='',required=true,autocomplete,options,minLength,maxLength=256}={}){
 const wrapper=el('label',undefined,'account-field');wrapper.append(el('span',label));
 const input=el(options?'select':'input');input.name=name;input.id='field-'+name+'-'+(++fieldSequence);input.setAttribute('aria-label',label);
 if(options){for(const option of options){const node=el('option',option.label);node.value=option.value;input.append(node);}}
 else{input.type=type;if(autocomplete)input.autocomplete=autocomplete;if(minLength)input.minLength=minLength;input.maxLength=maxLength;}
 input.value=value;input.required=required;wrapper.append(input);return wrapper;
}
export function form(label,fields,submit,onSubmit){
 const node=el('form',undefined,'account-form');node.setAttribute('aria-label',label);const error=el('p',undefined,'account-message');error.setAttribute('role','alert');error.hidden=true;
 const send=el('button',submit,'primary');send.type='submit';node.append(...fields,error,send);
 node.onsubmit=async event=>{event.preventDefault();error.hidden=true;const data=Object.fromEntries(new FormData(node));send.disabled=true;try{await onSubmit(data,node);}catch(e){error.textContent=e.message;error.hidden=false;if(!node.isConnected)document.getElementById('account-content')?.append(error);}finally{send.disabled=false;}};return node;
}
export async function api(path,body){
 const response=await fetch(path,{method:body===undefined?'GET':'POST',credentials:'same-origin',headers:body===undefined?{}:{'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(20000)});
 const data=await response.json().catch(()=>null);if(!response.ok)throw Object.assign(new Error(data?.message||data?.error||'Unable to complete the request. Try again.'),{status:response.status});return data;
}
export const auth=(path,body)=>api('/api/auth/'+path,body);
export function shell(root,active){
 root.innerHTML='<aside class="account-sidebar"><a class="account-brand" href="/"><img src="/editor/favicon.svg?v=mono" alt="" width="34" height="34"><strong>PixlPrfct<small>Your design workspace</small></strong></a><nav aria-label="Account navigation"><a href="/">All projects</a><a href="/editor/account.html" data-nav="account">Account & teams</a><a href="/editor/setup.html" data-nav="setup">Host your workspace</a></nav><p>Free to use.<br>Yours to host.</p></aside><main class="account-main"><div id="account-content"></div></main>';
 const admin=link('Admin','/editor/admin.html');root.querySelector('nav').insertBefore(admin,root.querySelector('[data-nav="setup"]'));
 if(document.documentElement.dataset.host==='static')root.querySelector('[data-nav="account"]')?.remove();
 root.querySelector('[data-nav="'+active+'"]')?.setAttribute('aria-current','page');return root.querySelector('#account-content');
}
