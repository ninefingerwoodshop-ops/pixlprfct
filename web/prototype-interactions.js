export function interactions(shape){return[...(shape.prototype?[shape.prototype]:[]),...(shape.additional_interactions??[])];}
export function withInteractions(shape,list){return{...shape,prototype:list[0]??null,additional_interactions:list.slice(1)};}
export function interactionFor(shape,trigger){return interactions(shape).find(p=>(p.trigger??'click')===trigger);}
// The actions one trigger runs, in order: the interaction itself, then its follow-ups.
export const actionSteps=p=>p?[p,...(p.then??[])]:[];
export const MAX_FOLLOW_UPS=7;
// "Two", "Go back", "Open overlay: Menu" — one action, named for lists and summaries.
export function actionLabel(p,frameName){
 if(p.action==='back')return 'Go back';if(p.action==='close')return 'Close overlay';
 return (p.action==='overlay'?'Open overlay: ':p.action==='swap'?'Swap overlay: ':'')+(frameName(p.target)??'Unavailable');
}
export const sequenceLabel=(p,frameName)=>actionSteps(p).map(step=>actionLabel(step,frameName)).join(', then ');
export const triggerLabels={click:'On click',mouseenter:'Mouse enter',mouseleave:'Mouse leave',afterdelay:'After delay',mousedown:'Mouse down / Touch press',mouseup:'Mouse up / Touch release',drag:'On drag'};
