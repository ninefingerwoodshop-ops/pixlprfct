// A handled press/release consumes its compatibility click. Keep the gesture
// across screen changes so a press can open a menu and a release can select it.
// A drag fires once per press, after the pointer travels DRAG_DISTANCE px from
// where it went down on a layer with an On drag interaction.
export const DRAG_DISTANCE=10;
export function prototypePress(){
 let pointer=null,suppress=false,drag=null;
 const primary=e=>e.isPrimary!==false&&e.button===0;
 return{
  down(event,hits={}){if(!primary(event))return 0;pointer=event.pointerId;suppress=!!hits.mousedown;drag=hits.drag?{id:hits.drag,x:event.clientX,y:event.clientY}:null;return hits.mousedown??0;},
  move(event){if(!drag||pointer!==event.pointerId||Math.hypot(event.clientX-drag.x,event.clientY-drag.y)<DRAG_DISTANCE)return 0;const id=drag.id;drag=null;suppress=true;return id;},
  up(event,hits={}){if(!primary(event)||pointer!==event.pointerId)return 0;pointer=null;drag=null;if(hits.mouseup)suppress=true;return hits.mouseup??0;},
  cancel(event){if(pointer===event.pointerId){pointer=null;drag=null;suppress=true;}},
  click(){const allowed=!suppress;suppress=false;return allowed;},
  reset(){pointer=null;drag=null;suppress=false;}
 };
}
