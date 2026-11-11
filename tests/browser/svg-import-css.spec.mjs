import {test,expect,seed,saved} from './fixtures.mjs';

const paste=(page,text)=>page.evaluate(text=>{const data=new DataTransfer();data.setData('text/plain',text);document.body.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true,cancelable:true}));},text);
const illustrator=`<?xml version="1.0" encoding="UTF-8"?>
<svg id="Layer_1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80" width="120" height="80">
  <defs><style type="text/css"><![CDATA[
    /* exported class rules */
    .cls-1 { fill: #fbb03b; }
    .cls-2, #ring { fill: none; stroke: rebeccapurple; stroke-width: 4px; }
    .cls-3 { fill: rgba(0, 113, 188, 0.5); }
  ]]></style></defs>
  <rect class="cls-1" x="10" y="10" width="40" height="30"/>
  <circle id="ring" cx="80" cy="40" r="20"/>
  <path class="cls-3" d="M10 60 H110 V70 H10 Z" style="fill-opacity:.5"/>
</svg>`;

test('pasted SVG with a style sheet keeps its class paint, and unsupported CSS is refused whole',async({page})=>{
 await seed(page);
 const before=(await saved(page)).shapes.length;
 await paste(page,illustrator);
 await expect.poll(async()=>(await saved(page)).shapes.length).toBe(before+4);
 const shapes=(await saved(page)).shapes.slice(before),[frame,box,ring,bar]=shapes;
 expect(frame.kind).toBe('frame');expect(frame.width).toBe(120);
 expect(box.fill).toBe('#fbb03b');expect(box.appearance.stroke_enabled).toBe(false);
 expect(ring.appearance.fill_enabled).toBe(false);expect(ring.appearance.stroke_color).toBe('#663399');expect(ring.stroke_width).toBe(4);
 expect(bar.fill).toBe('#0071bc');expect(bar.appearance.fill_opacity).toBe(.25);
 // One undo removes the whole import.
 await page.keyboard.press('ControlOrMeta+z');await expect.poll(async()=>(await saved(page)).shapes.length).toBe(before);
 // A descendant selector is not supported: nothing is inserted and the reason is shown.
 await paste(page,illustrator.replace('.cls-1 {','g .cls-1 {'));
 await expect(page.locator('#toast')).toContainText('Unsupported SVG CSS selector');
 expect((await saved(page)).shapes.length).toBe(before);
});
