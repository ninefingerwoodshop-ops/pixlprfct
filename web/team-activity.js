import {el,button,field} from './account-ui.js';
import {icon} from './icons.js';
import {installInspectorDropdowns} from './inspector-dropdown.js';

export async function activityRequest(path='',{method='GET',body}={}){
 const r=await fetch('/api/notifications'+path,{method,headers:body?{'content-type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
 const value=await r.json();if(!r.ok)throw Object.assign(new Error(value.error??'Notifications unavailable.'),{status:r.status});return value;
}
export function activityStyles(){if(document.querySelector('link[data-team-activity]'))return;const link=el('link');link.rel='stylesheet';link.href=new URL('./team-activity.css',import.meta.url).href;link.dataset.teamActivity='';document.head.append(link);}
const labels={mention:'mentioned you',reply:'replied to your thread',comment:'left a comment',review_requested:'requested your review',review_approved:'approved the review',review_changes_requested:'requested changes',review_canceled:'canceled the review'};
export function installActivityInbox(host,{report=()=>{},navigate=url=>location.assign(url)}={}){
 activityStyles();let disposed=false,panel=null,unread=false,items=[],next=null,loading=false,dropdowns=null;
 const trigger=button('',()=>open(),'activity-trigger');trigger.innerHTML=icon('bell');trigger.title='Notifications';trigger.setAttribute('aria-label','Notifications');host.append(trigger);
 const run=fn=>async()=>{try{await fn();}catch(error){report(error.message);}};
 async function badge(){try{const data=await activityRequest('?unread=1');if(disposed)return;trigger.dataset.unread=String(data.notifications.length>0);trigger.setAttribute('aria-label',data.notifications.length?'Notifications — unread activity':'Notifications');}catch{trigger.dataset.unread='false';}}
 async function read(more=false){if(loading)return;loading=true;try{const data=await activityRequest('?'+new URLSearchParams({...unread?{unread:'1'}:{},...more&&next?{before:next}:{}}));items=more?[...items,...data.notifications]:data.notifications;next=data.next;draw();await badge();}finally{loading=false;}}
 async function settings(){
  const value=await activityRequest('/preferences');panel.replaceChildren();const h=el('header');h.append(el('strong','Notification settings'),button('Back',run(()=>read())));panel.append(h);
  const form=el('form',undefined,'activity-settings'),mode=field('Notify me about','mode',{value:value.mode,options:[{value:'all',label:'Everything'},{value:'mentions',label:'Just mentions, replies and reviews'},{value:'none',label:'Nothing'}]}),email=el('input');email.type='checkbox';email.checked=value.email;const emailLabel=el('label','Also send email');emailLabel.prepend(email);const save=el('button','Save','primary');save.type='submit';form.append(mode,emailLabel,el('p','These preferences apply across your workspaces.'),save);form.onsubmit=e=>{e.preventDefault();run(async()=>{await activityRequest('/preferences',{method:'PUT',body:{mode:mode.querySelector('select').value,email:email.checked}});await read();})().catch(()=>{});};panel.append(form);if(!document.querySelector('.right-panel')){dropdowns?.destroy();dropdowns=installInspectorDropdowns(panel);}
 }
 function draw(){if(!panel?.open)return;panel.replaceChildren();const h=el('header');h.append(el('strong','All notifications'),button('Settings',run(settings)),button('Close',()=>panel.close()));panel.append(h);const tabs=el('nav');tabs.setAttribute('aria-label','Notification filter');for(const [value,label]of [[false,'All'],[true,'Unread']]){const tab=button(label,run(async()=>{unread=value;await read();}));tab.setAttribute('aria-pressed',String(unread===value));tabs.append(tab);}panel.append(tabs);
  const list=el('div',undefined,'activity-list');if(!items.length)list.append(el('p',"You don't have any notifications.",'activity-empty'));
  for(const item of items){const row=el('article',undefined,'activity-item');row.dataset.unread=String(!item.read);const open=button(`${item.actor} ${labels[item.kind]??'updated the file'} · ${item.name}`,run(async()=>{await activityRequest('',{method:'PATCH',body:{ids:[item.id],read:true}});const url='/editor/index.html?'+new URLSearchParams({cloud:item.documentId,workspace:item.workspace,...item.kind.startsWith('review_')?{review:item.targetId}:{comment:item.targetId}});navigate(url);panel.close();}));row.append(open,el('time',new Date(item.createdAt).toLocaleString()),button(item.read?'Mark unread':'Mark read',run(async()=>{await activityRequest('',{method:'PATCH',body:{ids:[item.id],read:item.read?false:true}});await read();})));list.append(row);}
  panel.append(list);const footer=el('footer');if(items.some(i=>!i.read))footer.append(button('Mark displayed as read',run(async()=>{await activityRequest('',{method:'PATCH',body:{ids:items.filter(i=>!i.read).slice(0,100).map(i=>i.id),read:true}});await read();})));if(next)footer.append(button('Load more',run(()=>read(true))));panel.append(footer);
 }
 async function open(){try{if(panel){panel.close();return;}panel=el('dialog',undefined,'activity-inbox');panel.setAttribute('aria-label','Notifications');document.body.append(panel);panel.addEventListener('keydown',e=>e.stopPropagation());panel.addEventListener('close',()=>{dropdowns?.destroy();dropdowns=null;panel.remove();panel=null;badge();},{once:true});panel.showModal();const rect=trigger.getBoundingClientRect();panel.style.left=Math.min(Math.max(8,rect.left),innerWidth-400)+'px';panel.style.top=Math.min(rect.bottom+8,innerHeight-360)+'px';await read();}catch(error){report(error.message);}}
 const timer=setInterval(badge,20000);window.addEventListener('focus',badge);badge();
 return {open,refresh:badge,destroy(){disposed=true;clearInterval(timer);window.removeEventListener('focus',badge);panel?.close();trigger.remove();}};
}
export function mentionPicker(input,getMembers){
 const choices=el('div',undefined,'mention-picker');choices.hidden=true;input.after(choices);let query='',start=0,version=0;
 input.addEventListener('input',async()=>{const current=++version,prefix=input.value.slice(0,input.selectionStart),match=prefix.match(/(?:^|\s)@([^\n@\[\]]{0,40})$/);if(!match){choices.hidden=true;return;}query=match[1];start=input.selectionStart-query.length-1;let people;try{people=await getMembers();}catch{choices.hidden=true;return;}if(current!==version)return;choices.replaceChildren();for(const member of people.filter(p=>p.name.toLowerCase().includes(query.toLowerCase())).slice(0,8)){const choice=button(member.name,()=>{const end=input.selectionStart;input.setRangeText(`@[${member.name}](${member.id}) `,start,end,'end');choices.hidden=true;input.focus();input.dispatchEvent(new Event('input',{bubbles:true}));});choices.append(choice);}choices.hidden=!choices.childElementCount;});
 input.addEventListener('keydown',event=>{if(!choices.hidden&&event.key==='ArrowDown'){event.preventDefault();choices.querySelector('button')?.focus();}if(event.key==='Escape')choices.hidden=true;});
 return choices;
}
export const displayMentions=text=>text.replace(/@\[([^\]]+)\]\([0-9a-f-]{36}\)/gi,'@$1');
