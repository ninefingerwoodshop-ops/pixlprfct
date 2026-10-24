// A render is not a pointer boundary. Retain the entry latch across rendering,
// but never carry a pending leave action from a screen that is no longer active.
export function prototypeHover(){
 let entered=new Set(),leaving=[],screen=null;
 return{
  scope(id){if(screen!==id){screen=id;leaving=[];}},
  move(hits={}){const enter=hits.mouseenter??[],leave=hits.mouseleave??[],exited=leaving.find(id=>!leave.includes(id)),arrived=enter.find(id=>!entered.has(id));leaving=leave;entered=new Set(exited?enter.filter(id=>id!==arrived):enter);return exited??arrived??0;},
  exit(){const id=leaving[0]??0;entered.clear();leaving=[];return id;},
  reset(){entered.clear();leaving=[];screen=null;}
 };
}
