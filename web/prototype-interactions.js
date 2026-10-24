export function interactions(shape){return[...(shape.prototype?[shape.prototype]:[]),...(shape.additional_interactions??[])];}
export function withInteractions(shape,list){return{...shape,prototype:list[0]??null,additional_interactions:list.slice(1)};}
export function interactionFor(shape,trigger){return interactions(shape).find(p=>(p.trigger??'click')===trigger);}
export const triggerLabels={click:'On click',mouseenter:'Mouse enter',mouseleave:'Mouse leave',afterdelay:'After delay',mousedown:'Mouse down / Touch press',mouseup:'Mouse up / Touch release'};
