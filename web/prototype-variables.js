// Variables in prototypes: a Set variable action and a condition on any
// action. Values changed here live for one presentation; the document's
// variables are never edited.
const KINDS=['number','boolean','string','color'];
export function prototypeVariables(doc){
 const collections=new Map((doc.variables?.collections??[]).map(c=>[c.id,c.name]));
 return (doc.variables?.values??[]).filter(v=>KINDS.includes(v.kind)).map(v=>({id:v.id,kind:v.kind,name:v.name,collection:collections.get(v.collection_id)??'',label:`${collections.get(v.collection_id)??''} / ${v.name}`}));
}
export const operatorsFor=kind=>kind==='number'?['==','!=','<','<=','>','>=']:['==','!='];
export const operatorLabels={'==':'is','!=':'is not','<':'is less than','<=':'is at most','>':'is greater than','>=':'is at least'};
// Figma's names for the comparisons in a conditional (inspected 2026-11-11).
export const comparisonNames={'==':'Equal to','!=':'Not equal to','>':'Greater than','>=':'Greater than or equal to','<':'Less than','<=':'Less than or equal to'};
export const operationsFor=kind=>kind==='number'?['set','add']:kind==='boolean'?['set','toggle']:['set'];
export const operationLabels={set:'Set to',add:'Add',toggle:'Toggle'};
export const defaultLiteral=kind=>({number:0,boolean:true,string:'',color:'#000000'})[kind];
const same=(a,b)=>typeof a==='string'&&typeof b==='string'?a.toLowerCase()===b.toLowerCase()&&/^#[0-9a-f]{6}$/i.test(a)||a===b:a===b;
// An unknown value (a variable that cannot be read) satisfies nothing.
export function conditionHolds(condition,current){
 if(!condition)return true;if(current===undefined||current===null)return false;
 const value=condition.value;
 switch(condition.operator){
  case '==':return same(current,value);
  case '!=':return !same(current,value);
  case '<':return typeof current==='number'&&current<value;
  case '<=':return typeof current==='number'&&current<=value;
  case '>':return typeof current==='number'&&current>value;
  case '>=':return typeof current==='number'&&current>=value;
  default:return false;
 }
}
// The value a Set variable action leaves behind. Sums stay inside the range the engine accepts.
export function nextValue(action,current){
 if(action.operation==='toggle')return !current;
 if(action.operation==='add')return Math.max(-1e9,Math.min(1e9,(typeof current==='number'?current:0)+action.value));
 return action.value;
}
const literalText=value=>typeof value==='string'?`“${value}”`:String(value);
export function conditionLabel(condition,variableName){
 return condition?`when ${variableName(condition.variable)??'a missing variable'} ${operatorLabels[condition.operator]??condition.operator} ${literalText(condition.value)}`:'';
}
export const conditionLiteral=value=>typeof value==='string'?`"${value}"`:String(value);
// "Count > 3": a condition as Figma writes it in a conditional's if row.
export function conditionText(condition,variableName){
 return condition?`${variableName(condition.variable)??'a missing variable'} ${condition.operator} ${conditionLiteral(condition.value)}`:'';
}
export function setVariableLabel(action,variableName){
 const name=variableName(action.variable)??'a missing variable';
 return action.operation==='toggle'?`Toggle ${name}`:action.operation==='add'?`Add ${action.value} to ${name}`:`Set ${name} to ${literalText(action.value)}`;
}
// Variable definitions for the presentation: an overridden variable takes its
// new value in every mode, so bound layers show it whatever mode they use.
export function sessionVariables(variables,overrides){
 if(!overrides?.size)return variables;
 return {...variables,values:variables.values.map(v=>overrides.has(v.id)?{...v,values:Object.fromEntries(Object.keys(v.values).map(mode=>[mode,overrides.get(v.id)]))}:v)};
}
