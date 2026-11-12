export function interactions(shape){return[...(shape.prototype?[shape.prototype]:[]),...(shape.additional_interactions??[])];}
export function withInteractions(shape,list){return{...shape,prototype:list[0]??null,additional_interactions:list.slice(1)};}
export function interactionFor(shape,trigger){return interactions(shape).find(p=>(p.trigger??'click')===trigger);}
// The actions one trigger runs, in order: the interaction itself, then its follow-ups.
import {conditionLabel,conditionText,setVariableLabel} from './prototype-variables.js';
export const actionSteps=p=>p?[p,...(p.then??[])]:[];
export const MAX_FOLLOW_UPS=7;
// A conditional runs one of two lists of actions; neither may hold another conditional.
export const MAX_BRANCH_ACTIONS=8;
export const BRANCHES=[['if','if_actions'],['else','else_actions']];
export const branchActions=(p,branch)=>p?.[branch==='else'?'else_actions':'if_actions']??[];
// Replace one side of a conditional, leaving no empty list behind.
export function withBranch(p,branch,list){const key=branch==='else'?'else_actions':'if_actions',next={...p};if(list.length)next[key]=list;else delete next[key];return next;}
// "Two", "Go back", "Open overlay: Menu" — one action, named for lists and summaries.
export function actionLabel(p,frameName,variableName=()=>undefined){
 if(p.action==='conditional'){const side=list=>list.length?list.map(step=>actionLabel(step,frameName,variableName)).join(', then '):'nothing';return `If ${conditionText(p.condition,variableName)}: ${side(branchActions(p,'if'))}; else: ${side(branchActions(p,'else'))}`;}
 const when=p.condition?' ('+conditionLabel(p.condition,variableName)+')':'';
 if(p.action==='back')return 'Go back'+when;if(p.action==='close')return 'Close overlay'+when;if(p.action==='set-variable')return setVariableLabel(p,variableName)+when;
 return (p.action==='overlay'?'Open overlay: ':p.action==='swap'?'Swap overlay: ':'')+(frameName(p.target)??'Unavailable')+when;
}
export const sequenceLabel=(p,frameName,variableName)=>actionSteps(p).map(step=>actionLabel(step,frameName,variableName)).join(', then ');
export const triggerLabels={click:'On click',mouseenter:'Mouse enter',mouseleave:'Mouse leave',afterdelay:'After delay',mousedown:'Mouse down',mouseup:'Mouse up',drag:'On drag'};
