// The "Write condition" field of a Conditional action. Layout and behaviour
// follow Figma's expression popover (inspected 2026-11-11): the committed test
// shows as a variable chip, a pink operator and a value; focusing it opens a
// popover where a variable is picked from a filtered list, then a comparison,
// then the value is typed. One variable is compared with one literal.
import {operatorsFor,comparisonNames,conditionLiteral} from './prototype-variables.js';

const ORDER=['==','!=','>','>=','<','<='];
// "> 3", "== true", '!= "draft"' for a variable of the given kind; null when it is not a complete test.
export function parseConditionText(text,kind){
 const m=/^\s*(==|!=|>=|<=|>|<)\s*([\s\S]*?)\s*$/.exec(text??'');if(!m||!operatorsFor(kind).includes(m[1]))return null;
 const raw=m[2];let value;
 if(kind==='number'){if(raw===''||!Number.isFinite(Number(raw))||Math.abs(Number(raw))>1e9)return null;value=Number(raw);}
 else if(kind==='boolean'){if(!/^(true|false)$/i.test(raw))return null;value=raw.toLowerCase()==='true';}
 else if(kind==='color'){const hex=raw.replace(/^"(.*)"$/,'$1');if(!/^#[0-9a-f]{6}$/i.test(hex))return null;value=hex.toLowerCase();}
 else{const quoted=/^"([\s\S]*)"$/.exec(raw);if(!quoted&&raw==='')return null;value=quoted?quoted[1]:raw;if(value.length>1000)return null;}
 return {operator:m[1],value};
}
export const conditionEntryText=condition=>condition?`${condition.operator} ${conditionLiteral(condition.value)}`:'';
// What the popover lists for the text typed so far.
export function conditionChoices(variables,picked,text){
 const typed=(text??'').trim(),lower=typed.toLowerCase();
 if(!picked)return variables.filter(v=>v.name.toLowerCase().includes(lower)).map(v=>({type:'variable',variable:v}));
 const m=/^(==|!=|>=|<=|>|<)\s*([\s\S]*)$/.exec(typed),allowed=ORDER.filter(op=>operatorsFor(picked.kind).includes(op));
 // Still naming the comparison: by symbol ("<" lists < and <=) or by name ("gre").
 if(!m||(m[2]===''&&!/\s$/.test(text)))return allowed.filter(op=>!typed||op.startsWith(typed)||comparisonNames[op].toLowerCase().includes(lower)).map(operator=>({type:'operator',operator}));
 if(picked.kind==='boolean')return [true,false].filter(value=>String(value).startsWith(m[2].toLowerCase())).map(value=>({type:'value',operator:m[1],value}));
 return [];
}
// A variable's value in its collection's default mode, as the list shows it.
export function variableValueText(doc,id){
 const v=(doc.variables?.values??[]).find(v=>v.id===id),mode=(doc.variables?.collections??[]).find(c=>c.id===v?.collection_id)?.default_mode,value=v?.values?.[mode];
 return typeof value==='boolean'?(value?'True':'False'):['number','string'].includes(typeof value)?String(value):'';
}

export function conditionField({document,doc,variables,condition,commit}){
 const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!=null)node.textContent=text;return node;};
 const field=el('button','prototype-condition');field.type='button';field.setAttribute('aria-label','Condition');field.setAttribute('aria-haspopup','dialog');
 const current=variables.find(v=>v.id===condition?.variable);
 if(!condition)field.append(el('span','prototype-condition-placeholder','Write condition'));
 else field.append(el('span','prototype-modal-variable',current?.name??'Missing variable'),el('span','prototype-modal-operator',condition.operator),el('span','prototype-modal-literal',conditionLiteral(condition.value)));
 field.onclick=()=>{
  const host=field.closest('dialog')??document.body;if(host.querySelector('.prototype-condition-popover'))return;
  let picked=current??null,active=0,choices=[],open=true;
  const pop=el('div','prototype-condition-popover'),entry=el('div','prototype-condition-entry'),chips=el('span','prototype-condition-chips'),input=el('input'),list=el('div','prototype-condition-list');
  pop.setAttribute('role','dialog');pop.setAttribute('aria-label','Write condition');list.setAttribute('role','listbox');list.setAttribute('aria-label','Suggestions');
  input.type='text';input.autocomplete='off';input.spellcheck=false;input.setAttribute('aria-label','Write condition');input.value=picked?conditionEntryText(condition):'';
  entry.append(el('span','prototype-modal-keyword','if'),chips,input);pop.append(entry,list);
  const close=()=>{if(!open)return;open=false;document.removeEventListener('pointerdown',outside,true);pop.remove();};
  // Leaving the popover keeps a complete test and drops an unfinished one.
  const finish=()=>{const parsed=picked&&parseConditionText(input.value,picked.kind);close();if(!parsed)return;const next={variable:picked.id,...parsed};if(JSON.stringify(next)!==JSON.stringify(condition))commit(next);else field.focus();};
  const outside=event=>{if(!pop.isConnected){close();return;}if(!pop.contains(event.target))finish();};
  const choose=choice=>{
   if(choice.type==='variable'){picked=choice.variable;input.value='';}
   else if(choice.type==='operator')input.value=choice.operator+' ';
   else{input.value=`${choice.operator} ${choice.value}`;finish();return;}
   active=0;render();input.focus();
  };
  const render=()=>{
   chips.replaceChildren(...(picked?[el('span','prototype-modal-variable',picked.name)]:[]));input.placeholder=picked?'':'Write condition';
   choices=conditionChoices(variables,picked,input.value);active=Math.min(active,Math.max(0,choices.length-1));list.replaceChildren();list.hidden=!choices.length;
   let group=null;
   choices.forEach((choice,i)=>{
    if(choice.type==='variable'&&choice.variable.collection!==group){group=choice.variable.collection;list.append(el('div','prototype-condition-group',group));}
    const row=el('div','prototype-condition-option');row.setAttribute('role','option');row.setAttribute('aria-selected',String(i===active));row.classList.toggle('active',i===active);
    const [label,hint]=choice.type==='variable'?[choice.variable.name,variableValueText(doc,choice.variable.id)]:choice.type==='operator'?[comparisonNames[choice.operator],choice.operator]:[choice.value?'True':'False',''];
    row.append(el('span',null,label),el('span','prototype-condition-hint',hint));
    // Pointer down, so the input keeps focus.
    row.onpointerdown=event=>{event.preventDefault();event.stopPropagation();choose(choice);};list.append(row);
   });
  };
  input.oninput=()=>{active=0;render();};
  input.onkeydown=event=>{
   const key=event.key;
   if(key==='Escape'){event.preventDefault();event.stopPropagation();close();field.focus();return;}
   if(key==='ArrowDown'||key==='ArrowUp'){event.preventDefault();if(choices.length){active=(active+(key==='ArrowDown'?1:choices.length-1))%choices.length;render();}return;}
   if(key==='Enter'){event.preventDefault();event.stopPropagation();if(choices.length)choose(choices[active]);else finish();return;}
   if(key==='Tab'){finish();return;}
   if(key==='Backspace'&&picked&&input.value===''){event.preventDefault();picked=null;active=0;render();}
   event.stopPropagation();
  };
  host.append(pop);const at=field.getBoundingClientRect(),base=host.getBoundingClientRect();
  pop.style.left=Math.round(at.left-base.left-8)+'px';pop.style.top=Math.round(at.top-base.top-8)+'px';
  document.addEventListener('pointerdown',outside,true);render();input.focus();input.setSelectionRange(input.value.length,input.value.length);
 };
 return field;
}
