import test from 'node:test';
import assert from 'node:assert/strict';
import {installColorPicker} from '../web/color-picker.js';

// Minimal event target: exercise cancellation sequences without a browser engine.
class Element {
 children=[];attributes={};style={setProperty(){}};capture=null;
 append(...children){this.children.push(...children);}
 setAttribute(name,value){this.attributes[name]=value;}
 getBoundingClientRect(){return {left:0,top:0,width:100,height:100};}
 setPointerCapture(id){this.capture=id;}
 hasPointerCapture(id){return this.capture===id;}
 releasePointerCapture(){this.capture=null;this.onlostpointercapture?.();}
 focus(){}
}
test('canceling saturation drags restores preview without a document edit',()=>{
 const prior=globalThis.document;globalThis.document={createElement:()=>new Element()};
 try{
  const host=new Element(),commits=[],sync=installColorPicker(host,'Fill',color=>commits.push(color)),area=host.children[0];
  sync('#ff0000');const start=area.attributes['aria-valuetext'];
  const event={button:0,pointerId:1,clientX:20,clientY:80,preventDefault(){},stopPropagation(){}};
  for(const cancel of [()=>area.onpointercancel(),()=>area.onkeydown({...event,key:'Escape'}),()=>area.onlostpointercapture()]){
   area.onpointerdown(event);assert.notEqual(area.attributes['aria-valuetext'],start);cancel();
   assert.equal(area.attributes['aria-valuetext'],start);assert.equal(area.capture,null);assert.deepEqual(commits,[]);
   area.onpointerup(event);assert.deepEqual(commits,[]);
  }
  area.onpointerdown(event);area.onpointerup(event);assert.equal(commits.length,1);assert.equal(area.capture,null);
 }finally{globalThis.document=prior;}
});
