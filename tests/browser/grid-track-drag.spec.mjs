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
// Track handles appear for the selected grid frame without entering spacing mode.
async function openGrid(page,data){
 await seed(page,data);await select(page,data.frame);await page.locator('#canvas').focus();await page.keyboard.press('Control+0');
 // At 100% the frame name label is anchored 26 px above the frame's top-left corner.
 const label=await page.locator('.frame-label').first().boundingBox();
 const origin={x:label.x-100,y:label.y+26-100},at=(x,y)=>({x:origin.x+x,y:origin.y+y});
 const columnMiddle=(order,index)=>columnStart(order,index)+order[index]/2;
 return {
  at,
  // The pill for a column: centred over it, 34 px above the frame. Hover a cell in the column first so it shows.
  column:async(order,index)=>{const x=columnMiddle(order,index);await page.mouse.move(origin.x+x,origin.y+150);await page.mouse.move(origin.x+x,origin.y+100-34,{steps:3});return at(x,100-34);},
  row:async(middle)=>{await page.mouse.move(origin.x+150,origin.y+middle);await page.mouse.move(origin.x+100-34,origin.y+middle,{steps:3});return at(100-34,middle);},
 };
}
const panel=page=>page.locator('#grid-track-panel');
const chosen=(page,axis='Columns')=>panel(page).locator('.grid-track-panel-section',{has:page.getByRole('heading',{name:axis,exact:true})}).locator('.grid-track-panel-row.selected .grid-track-panel-index');
async function drag(page,from,to){await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move((from.x+to.x)/2,(from.y+to.y)/2,{steps:4});await page.mouse.move(to.x,to.y,{steps:4});}

test('a pill appears for the hovered cell, becomes a chip, and dragging it reorders the column in one undo step',async({page})=>{
 const data=gridFixture(),start=[100,120,140,160],view=await openGrid(page,data);
 // Nothing is selected yet, so the sidebar still shows the frame's own properties.
 await expect(panel(page)).toBeHidden();
 const from=await view.column(start,0);await page.mouse.down();await page.mouse.up();
 // Selecting a track swaps the sidebar for the Grid panel with that column highlighted.
 await expect(panel(page)).toBeVisible();await expect(panel(page).getByRole('heading',{name:'Grid',exact:true})).toBeVisible();
 await expect(chosen(page)).toHaveText(['1']);await expect(page.locator('#properties')).toBeHidden();
 await expect(panel(page).getByRole('button',{name:'Grid column 1 of 4',exact:true})).toHaveAttribute('aria-pressed','true');
 await drag(page,from,view.at(columnStart(start,2)+130,66));await page.mouse.up();
 await expect.poll(()=>widths(page,data.frame)).toEqual([120,140,100,160]);
 // The moved column stays selected at its new position.
 await expect(chosen(page)).toHaveText(['3']);
 await page.locator('#canvas').focus();await page.keyboard.press('Control+z');
 await expect.poll(()=>widths(page,data.frame)).toEqual(start);
 // Escape clears the track selection and brings the layer properties back.
 await page.keyboard.press('Escape');await expect(panel(page)).toBeHidden();await expect(page.locator('#properties')).toBeVisible();
});
test('Ctrl-click builds a split selection that drags together and Escape cancels a drag',async({page})=>{
 const data=gridFixture(),start=[100,120,140,160],view=await openGrid(page,data);
 const first=await view.column(start,0);await page.mouse.click(first.x,first.y);
 const third=await view.column(start,2);await page.keyboard.down('Control');await page.mouse.click(third.x,third.y);await page.keyboard.up('Control');
 await expect(chosen(page)).toHaveText(['1','3']);
 // Escape during the drag leaves the document and the selection alone.
 await drag(page,third,view.at(590,66));await page.keyboard.press('Escape');await page.mouse.up();
 await expect(chosen(page)).toHaveText(['1','3']);
 expect(await widths(page,data.frame)).toEqual(start);
 await drag(page,third,view.at(590,66));await page.mouse.up();
 await expect.poll(()=>widths(page,data.frame)).toEqual([120,160,100,140]);
 await expect(chosen(page)).toHaveText(['3','4']);
 // Alt + Arrow shifts the whole selection one position.
 await page.locator('#canvas').focus();await page.keyboard.press('Alt+ArrowLeft');
 await expect.poll(()=>widths(page,data.frame)).toEqual([120,100,140,160]);await expect(chosen(page)).toHaveText(['2','3']);
 await page.keyboard.press('Control+z');await page.keyboard.press('Control+z');
 await expect.poll(()=>widths(page,data.frame)).toEqual(start);
});
test('Shift-click selects a range and row handles reorder rows',async({page})=>{
 const data=gridFixture(),start=[100,120,140,160],view=await openGrid(page,data);
 const first=await view.column(start,0);await page.mouse.click(first.x,first.y);
 const third=await view.column(start,2);await page.keyboard.down('Shift');await page.mouse.click(third.x,third.y);await page.keyboard.up('Shift');
 await expect(chosen(page)).toHaveText(['1','2','3']);
 // Two automatic 135 px rows: 110–245 and 255–390. Drag the first below the second.
 const row=await view.row(177);await drag(page,row,view.at(66,380));await page.mouse.up();
 await expect.poll(()=>rowsOf(page,data)).toEqual([2,2,2,2,1,1,1,1]);
 await expect(chosen(page)).toHaveCount(0);
});
test('the chevron menu and the Grid panel change track sizing, add and remove tracks',async({page})=>{
 const data=gridFixture(),start=[100,120,140,160],view=await openGrid(page,data);
 const modes=async()=>(await saved(page)).shapes.find(s=>s.id===data.frame).auto_layout.grid.columns.map(t=>t.mode+':'+t.value);
 const second=await view.column(start,1);await page.mouse.click(second.x,second.y);await expect(chosen(page)).toHaveText(['2']);
 // The chip is 55 px wide ("120" is three characters): its chevron is the last 16 px. Pressing it on a selected track opens the sizing menu.
 await page.mouse.click(second.x+27.5-8,second.y);
 const menu=page.getByRole('menu',{name:'Column 2 sizing'});await expect(menu.getByRole('menuitem')).toHaveText(['✓ Fixed width (120)','Hug contents','Fill container (1fr)']);
 await menu.getByRole('menuitem',{name:'Fill container (1fr)'}).click();
 await expect.poll(modes).toEqual(['fixed:100','fr:1','fixed:140','fixed:160']);
 // The panel row reflects it: sizing Fill, value 1fr.
 const row=panel(page).locator('.grid-track-panel-row').nth(1);
 await expect(row.locator('select')).toHaveValue('fr');await expect(row.locator('input')).toHaveValue('1fr');
 await expect(row.locator('select option')).toHaveText(['Fixed','Hug','Fill']);
 // Type a new share; a value that is not a number is put back.
 await row.locator('input').fill('2.5');await row.locator('input').press('Enter');await expect.poll(modes).toEqual(['fixed:100','fr:2.5','fixed:140','fixed:160']);
 await row.locator('input').fill('wide');await row.locator('input').press('Enter');await expect(row.locator('input')).toHaveValue('2.5fr');expect(await modes()).toEqual(['fixed:100','fr:2.5','fixed:140','fixed:160']);
 // Hug has no number to edit.
 await row.locator('select').evaluate(node=>{node.value='hug';node.dispatchEvent(new Event('change',{bubbles:true}));});
 await expect.poll(async()=>(await modes())[1].split(':')[0]).toBe('hug');await expect(row.locator('input')).toHaveValue('Hug');await expect(row.locator('input')).toBeDisabled();
 // Add a column: it is appended, sized 1fr, and selected.
 await panel(page).getByRole('button',{name:'Add column',exact:true}).click();
 await expect.poll(async()=>(await modes()).length).toBe(5);expect((await modes())[4]).toBe('fr:1');await expect(chosen(page)).toHaveText(['5']);
 // Remove it again from its row.
 await panel(page).getByRole('button',{name:'Remove column 5 of 5',exact:true}).click();
 await expect.poll(async()=>(await modes()).length).toBe(4);
 // The panel stays open on the neighbouring column.
 await expect(chosen(page)).toHaveText(['4']);
 // Clicking a number selects that track; the close button returns to the layer properties.
 await panel(page).getByRole('button',{name:'Grid column 3 of 4',exact:true}).click();await expect(chosen(page)).toHaveText(['3']);
 await panel(page).getByRole('button',{name:'Close',exact:true}).click();await expect(panel(page)).toBeHidden();await expect(page.locator('#properties')).toBeVisible();
 // Figma's sidebar sizes: 24 px controls in 32 px rows.
 await page.mouse.click((await view.column([100,120,140,160],0)).x,second.y);
 expect((await panel(page).locator('.grid-track-panel-row').first().boundingBox()).height).toBe(32);expect((await panel(page).locator('.grid-track-panel-row .inspector-select-trigger').first().boundingBox()).height).toBe(24);
});
