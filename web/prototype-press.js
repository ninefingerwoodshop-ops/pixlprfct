// A handled press/release consumes its compatibility click. Keep the gesture
// across screen changes so a press can open a menu and a release can select it.
export function prototypePress(){
 let pointer=null,suppress=false;
 const primary=e=>e.isPrimary!==false&&e.button===0;
 return{
  down(event,hits={}){if(!primary(event))return 0;pointer=event.pointerId;suppress=!!hits.mousedown;return hits.mousedown??0;},
  up(event,hits={}){if(!primary(event)||pointer!==event.pointerId)return 0;pointer=null;if(hits.mouseup)suppress=true;return hits.mouseup??0;},
  cancel(event){if(pointer===event.pointerId){pointer=null;suppress=true;}},
  click(){const allowed=!suppress;suppress=false;return allowed;},
  reset(){pointer=null;suppress=false;}
 };
}
