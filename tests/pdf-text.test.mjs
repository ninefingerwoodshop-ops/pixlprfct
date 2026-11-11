import test from 'node:test';
import assert from 'node:assert/strict';
import {lineRuns,pdfTextRuns} from '../web/pdf-text.js';

// Every character is half an em wide, so expected positions are easy to state.
const measure=(shape,text)=>[...text].length*shape.typography.font_size*.5,baseline=()=>16;
const typography={font_family:'Arial',font_size:20,font_weight:400,align:'left',line_height:1,wrap:false};
const text=(id,props)=>({id,kind:'text',name:'T',x:0,y:0,width:200,height:20,text:'Hi',hidden:false,typography,...props});
const box={x:0,y:0,width:400,height:300};
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-6,`${actual} ≈ ${expected}`);

test('a line splits into word runs that keep their trailing spaces',()=>{
 const runs=lineRuns('  Hello  big world',t=>t.length*10);
 assert.deepEqual(runs,[{text:'Hello  ',offset:20,width:70},{text:'big ',offset:90,width:40},{text:'world',offset:130,width:50}]);
 assert.deepEqual(lineRuns('   ',t=>t.length),[]);
});

test('runs sit on each line baseline relative to the exported box',()=>{
 const runs=pdfTextRuns([text(1,{x:110,y:60,height:40,text:'One two\nthree'})],{x:100,y:50,width:300,height:200},measure,baseline);
 assert.deepEqual(runs.map(r=>r.text),['One ','two','three']);
 near(runs[0].x,10);near(runs[0].y,26);near(runs[0].width,40);assert.equal(runs[0].size,20);assert.equal(runs[0].angle,0);
 near(runs[1].x,50);near(runs[2].x,10);near(runs[2].y,46);
});

test('alignment, letter spacing and text case match what is painted',()=>{
 const right=pdfTextRuns([text(1,{text:'ab cd',typography:{...typography,align:'right',letter_spacing:2,text_case:'upper'}})],box,measure,baseline);
 // Five characters at 10 px plus 2 px spacing each: the line is 60 px wide and ends at x=200.
 assert.deepEqual(right.map(r=>r.text),['AB ','CD']);near(right[0].x,140);near(right[0].width,36);near(right[1].x,176);near(right[1].width,24);
 const centre=pdfTextRuns([text(1,{typography:{...typography,align:'center',vertical_align:'bottom'},height:60})],box,measure,baseline);
 near(centre[0].x,90);near(centre[0].y,56);
});

test('wrapped text produces one set of runs per visual line',()=>{
 const runs=pdfTextRuns([text(1,{width:60,height:80,text:'aaaa bbbb cccc',typography:{...typography,wrap:true}})],box,measure,baseline);
 assert.deepEqual(runs.map(r=>[r.text,r.y]),[['aaaa',16],['bbbb',36],['cccc',56]]);
});

test('rotation of the layer and its ancestors carries into the run',()=>{
 const [own]=pdfTextRuns([text(1,{x:100,y:100,rotation:90})],box,measure,baseline);
 // Counter-clockwise about the top-left corner: the baseline start 16 px down ends up 16 px right.
 near(own.x,116);near(own.y,100);assert.equal(own.angle,90);
 const frame={id:1,kind:'frame',x:100,y:100,width:200,height:100,rotation:90,hidden:false};
 const [nested]=pdfTextRuns([frame,text(2,{parent_id:1,x:110,y:100})],box,measure,baseline);
 near(nested.x,116);near(nested.y,90);assert.equal(nested.angle,90);
});

test('text that is not painted is left out',()=>{
 const frame={id:1,kind:'frame',x:0,y:0,width:100,height:100,clip_content:true,hidden:false};
 const none=shapes=>assert.deepEqual(pdfTextRuns(shapes,box,measure,baseline),[]);
 none([text(1,{hidden:true})]);
 none([{...frame,hidden:true},text(2,{parent_id:1})]);
 none([{...frame,appearance:{opacity:0}},text(2,{parent_id:1})]);
 none([text(1,{appearance:{fill_enabled:false,stroke_enabled:false}})]);
 none([text(1,{text:' \n '})]);
 // Outside a clipping frame, outside the exported box, and overflowing its own fixed box.
 none([frame,text(2,{parent_id:1,x:150,y:10})]);
 none([text(1,{x:500,y:10})]);
 const overflow=pdfTextRuns([text(1,{height:20,text:'one\ntwo'})],box,measure,baseline);assert.deepEqual(overflow.map(r=>r.text),['one']);
 // A word half inside a clip is kept when its middle is inside.
 const partly=pdfTextRuns([frame,text(2,{parent_id:1,x:70,y:10,text:'abcd efgh'})],box,measure,baseline);assert.deepEqual(partly.map(r=>r.text),['abcd ']);
 assert.equal(pdfTextRuns([{...frame,clip_content:false},text(2,{parent_id:1,x:150,y:10})],box,measure,baseline).length,1);
});

test('text on a path becomes one run along its chord',()=>{
 const shape=text(1,{x:50,y:50,width:200,height:100,text:'abcd',editor_meta:{text_path:{points:[[0,1],[1,1]],offset:0,reverse:false}}});
 const [run]=pdfTextRuns([shape],box,measure,baseline);
 assert.equal(run.text,'abcd');near(run.x,50);near(run.y,150);near(run.width,40);near(run.angle,0);
 const up=pdfTextRuns([{...shape,editor_meta:{text_path:{points:[[0,1],[0,0]],offset:0,reverse:false}}}],box,measure,baseline)[0];
 near(up.x,50);near(up.y,150);near(up.angle,90);
});

test('control characters never reach a run',()=>{
 const [run]=pdfTextRuns([text(1,{text:'a\u0001b'})],box,measure,baseline);assert.equal(run.text,'a b');
});
