import {test,expect,seed,saved,select} from './fixtures.mjs';
import {initializeEngine,createHeadlessEditor} from '../../mcp/projects.mjs';
await initializeEngine();

// A root 4 × 2 grid with distinct fixed column widths, so order is observable.
function gridFixture(){
 const e=createHeadlessEditor(),doc=()=>JSON.parse(e.snapshot()),get=id=>doc().shapes.find(s=>s.id===id),edit=(id,p)=>e.update(JSON.stringify({...get(id),...p}));
 try{
  const frame=e.add('frame',100,100),ids=[];edit(frame,{name:'Grid',width:600,height:300});
  for(let i=0;i<8;i++){const id=e.add('rectangle',0,0);edit(id,{name:`Cell ${i+1}`,width:40,height:40,layout_item:{...get(id).layout_item,fill_width:true,fill_height:true}});ids.push(id);}
  e.reparent_many(JSON.stringify(ids),frame);
  edit(frame,{auto_layout:{direction:'grid',gap:10,cross_gap:10,padding_top:10,padding_right:10,padding_bottom:10,padding_left:10,align:'start',justify:'start',hug_width:false,hug_height:false,grid:{columns:[100,120,140,160].map(value=>({mode:'fixed',value})),rows:[],auto_rows:{mode:'fr',value:1}}}});
  const body=doc();body.name='Browser acceptance';return {body:JSON.stringify(body),frame,ids};
 }finally{e.free();}
}
const widths=async(page,frame)=>(await saved(page)).shapes.find(s=>s.id===frame).auto_layout.grid.columns.map(t=>t.value);
// Each layer sits in a cell wrapper; the wrapper carries the grid placement.
const rowsOf=async(page,data)=>{const shapes=(await saved(page)).shapes,get=id=>shapes.find(s=>s.id===id);return data.ids.map(id=>get(get(id).parent_id).layout_item.grid_cell?.row??null);};
// Column starts in document space: 10 px padding, then width + 10 px gap.
const columnStart=(order,index)=>110+order.slice(0,index).reduce((sum,width)=>sum+width+10,0);
async function editSpacing(page,data){
 await seed(page,data);await select(page,data.frame);await page.locator('#canvas').focus();await page.keyboard.press('Control+0');
 // The inspector's "Edit grid spacing on canvas" button forwards to this control.
 await page.locator('#edit-layout-spacing').evaluate(button=>button.click());await expect(page.locator('#edit-layout-spacing')).toHaveAttribute('aria-pressed','true');
 // At 100% the frame name label is anchored 26 px above the frame's top-left corner.
 const label=await page.locator('.frame-label').first().boundingBox();
 const origin={x:label.x-100,y:label.y+26-100};
 return {
  column:(order,index,offset=20)=>({x:origin.x+columnStart(order,index)+offset,y:origin.y+100-34}),
  row:(top,offset=20)=>({x:origin.x+100-14,y:origin.y+top+offset}),
  at:(x,y)=>({x:origin.x+x,y:origin.y+y}),
 };
}
async function drag(page,from,to){await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move((from.x+to.x)/2,(from.y+to.y)/2,{steps:4});await page.mouse.move(to.x,to.y,{steps:4});}

test('dragging a column header on the canvas reorders that column in one undo step',async({page})=>{
 const data=gridFixture(),start=[100,120,140,160],view=await editSpacing(page,data);
 const from=view.column(start,0);await drag(page,from,view.at(columnStart(start,2)+130,66));await page.mouse.up();
 await expect.poll(()=>widths(page,data.frame)).toEqual([120,140,100,160]);
 // The moved column stays selected in the inspector at its new position.
 await page.locator('#grid-columns-section>summary').click();
 await expect(page.locator('#grid-columns-section .grid-track-card.grid-track-selected')).toHaveCount(1);
 await expect(page.locator('#grid-columns-section .grid-track-card').nth(2)).toHaveClass(/grid-track-selected/);
 await page.locator('#canvas').focus();await page.keyboard.press('Control+z');
 await expect.poll(()=>widths(page,data.frame)).toEqual(start);
});
test('Ctrl-click builds a split selection that drags together and Escape cancels a drag',async({page})=>{
 const data=gridFixture(),start=[100,120,140,160],view=await editSpacing(page,data);
 const first=view.column(start,0),third=view.column(start,2);
 await page.mouse.click(first.x,first.y);await page.keyboard.down('Control');await page.mouse.click(third.x,third.y);await page.keyboard.up('Control');
 await page.locator('#grid-columns-section>summary').click();
 await expect(page.locator('#grid-columns-section .grid-track-card.grid-track-selected')).toHaveCount(2);
 // Escape during the drag leaves the document and the selection alone.
 await drag(page,third,view.at(590,66));await page.keyboard.press('Escape');await page.mouse.up();
 await expect(page.locator('#grid-columns-section .grid-track-card.grid-track-selected')).toHaveCount(2);
 expect(await widths(page,data.frame)).toEqual(start);
 await drag(page,third,view.at(590,66));await page.mouse.up();
 await expect.poll(()=>widths(page,data.frame)).toEqual([120,160,100,140]);
 await expect(page.locator('#grid-columns-section .grid-track-card').nth(2)).toHaveClass(/grid-track-selected/);
 await expect(page.locator('#grid-columns-section .grid-track-card').nth(3)).toHaveClass(/grid-track-selected/);
 // Alt + Arrow shifts the whole selection one position.
 await page.locator('#canvas').focus();await page.keyboard.press('Alt+ArrowLeft');
 await expect.poll(()=>widths(page,data.frame)).toEqual([120,100,140,160]);
 await page.keyboard.press('Control+z');await page.keyboard.press('Control+z');
 await expect.poll(()=>widths(page,data.frame)).toEqual(start);
});
test('Shift-click selects a range and row headers reorder rows',async({page})=>{
 const data=gridFixture(),start=[100,120,140,160],view=await editSpacing(page,data);
 const first=view.column(start,0),third=view.column(start,2);
 await page.mouse.click(first.x,first.y);await page.keyboard.down('Shift');await page.mouse.click(third.x,third.y);await page.keyboard.up('Shift');
 await page.locator('#grid-columns-section>summary').click();
 await expect(page.locator('#grid-columns-section .grid-track-card.grid-track-selected')).toHaveCount(3);
 // Two automatic 135 px rows: 110–245 and 255–390. Drag the first below the second.
 await drag(page,view.row(110),view.at(86,380));await page.mouse.up();
 await expect.poll(()=>rowsOf(page,data)).toEqual([2,2,2,2,1,1,1,1]);
 await expect(page.locator('#grid-columns-section .grid-track-card.grid-track-selected')).toHaveCount(0);
});
