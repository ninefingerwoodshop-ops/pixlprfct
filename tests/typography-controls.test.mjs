import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeEngine,createHeadlessEditor} from '../mcp/projects.mjs';
import {textSize,layoutText,textSvg,displayedText,letterSpacing} from '../web/typography.js';
import {compileCssScene} from '../web/css-renderer.js';
import {parseLetterSpacing} from '../web/text-style-controls.js';
import {variableColor} from '../web/color-variable-picker.js';
await initializeEngine();
const doc=e=>JSON.parse(e.snapshot()),get=(e,id)=>doc(e).shapes.find(s=>s.id===id);
test('spacing and case affect sizing, wrapping and portable text output without changing authored text',()=>{
 const e=createHeadlessEditor();try{const id=e.add('text',0,0),s=get(e,id),typography={...s.typography,font_size:20,sizing:'width',letter_spacing:10,letter_spacing_unit:'%',text_case:'upper'};e.update(JSON.stringify({...s,text:'Hello',typography}));const shape=get(e,id);assert.equal(shape.text,'Hello');assert.equal(shape.width,65);assert.equal(letterSpacing(typography),2);assert.deepEqual(textSize(shape,t=>t.length*10),[60,24]);assert.equal(layoutText(shape,t=>t.length*10).lines[0].text,'HELLO');assert.match(textSvg(shape,layoutText(shape,t=>t.length*10)),/letter-spacing="2"/);assert.match(compileCssScene([shape]).css,/letter-spacing:2px/);assert.match(compileCssScene([shape]).css,/text-transform:uppercase/);
 const wrap=layoutText({...shape,width:24,typography:{...typography,sizing:'height'}},t=>t.length*10);assert.deepEqual(wrap.lines.map(l=>l.text),['HE','LL','O']);const reload=createHeadlessEditor();try{reload.load(e.snapshot());assert.equal(reload.snapshot(),e.snapshot());}finally{reload.free();}
 }finally{e.free();}
});
test('text styles propagate spacing and case into component instances and undo the whole change',()=>{
 const e=createHeadlessEditor();try{const master=e.add('frame',0,0),label=e.add('text',10,10);e.reparent_many(JSON.stringify([label]),master);e.create_component(master);const instance=e.create_instance(master,500,0),style={id:0,name:'Body',typography:{...get(e,label).typography,letter_spacing:2,letter_spacing_unit:'px',text_case:'lower'}},id=e.save_text_style(JSON.stringify(style),label);const child=doc(e).shapes.find(s=>s.parent_id===instance);assert.equal(child.typography.letter_spacing,2);const before=e.snapshot();e.save_text_style(JSON.stringify({...style,id,typography:{...style.typography,letter_spacing:5,text_case:'upper'}}),0);assert.equal(get(e,child.id).typography.text_case,'upper');assert.equal(get(e,child.id).typography.letter_spacing,5);e.undo();assert.equal(e.snapshot(),before);
 const saved=e.snapshot();for(const patch of [{letter_spacing:1001},{letter_spacing_unit:'em'},{text_case:'bogus'}]){assert.throws(()=>e.update(JSON.stringify({...get(e,label),typography:{...get(e,label).typography,...patch}})));assert.equal(e.snapshot(),saved);}
 }finally{e.free();}
});
test('spacing parser rejects invalid values and casing handles Unicode',()=>{assert.deepEqual(parseLetterSpacing('-2.5%'),{letter_spacing:-2.5,letter_spacing_unit:'%'});assert.deepEqual(parseLetterSpacing(' 1px '),{letter_spacing:1,letter_spacing_unit:'px'});for(const value of ['Infinity','2em','1001',''])assert.throws(()=>parseLetterSpacing(value));assert.equal(displayedText('élan vital',{text_case:'title'}),'Élan Vital');assert.equal(displayedText('Straße',{text_case:'upper'}),'STRASSE');});
test('shadow variable preview resolves page and ancestor modes, aliases and cycles safely',()=>{
 const doc={pages:[{id:1,variable_modes:{1:2}}],shapes:[{id:1,parent_id:0,page_id:1,variable_modes:{1:1}},{id:2,parent_id:1,page_id:1}],variables:{collections:[{id:1,default_mode:1}],values:[{id:1,collection_id:1,values:{1:'#ff0000',2:'#0000ff'}},{id:2,collection_id:1,values:{1:{alias:1},2:{alias:1}}}]}};
 assert.equal(variableColor(doc,doc.shapes[1],2),'#ff0000');doc.shapes[0].variable_modes={};assert.equal(variableColor(doc,doc.shapes[1],2),'#0000ff');doc.variables.values[0].values[2]={alias:2};assert.equal(variableColor(doc,doc.shapes[1],2),null);
});
