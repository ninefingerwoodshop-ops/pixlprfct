import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {inflateSync} from 'node:zlib';
import {test,expect,seed} from './fixtures.mjs';
import {createHeadlessEditor} from '../../mcp/projects.mjs';

function frames(){
 const e=createHeadlessEditor(),doc=()=>JSON.parse(e.snapshot()),get=id=>doc().shapes.find(s=>s.id===id),edit=(id,p)=>e.update(JSON.stringify({...get(id),...p}));
 try{
  const first=e.add('frame',0,0);edit(first,{name:'Cover',width:320,height:200,fill:'#ffffff'});
  const block=e.add('rectangle',40,40);edit(block,{name:'Block',width:120,height:80,fill:'#ff0000'});e.reparent_many(JSON.stringify([block]),first);
  const second=e.add('frame',400,0);edit(second,{name:'Details',width:160,height:240,fill:'#0000ff'});
  const body=doc();body.name='PDF acceptance';return {body:JSON.stringify(body)};
 }finally{e.free();}
}
async function exportAs(page,{format,scope,scale='1',transparent=true},info,name){
 await page.evaluate(()=>document.getElementById('export-artwork').click());
 const dialog=page.getByRole('dialog',{name:'Export artwork'});await expect(dialog).toBeVisible();
 await page.evaluate(({format,scope,scale,transparent})=>{const set=(id,value)=>{const el=document.getElementById(id);if(el.type==='checkbox')el.checked=value;else el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));};set('export-scope',scope);set('export-format',format);set('export-scale',scale);set('export-transparent',transparent);},{format,scope,scale,transparent});
 const summary=await page.locator('#export-summary').textContent();
 const pending=page.waitForEvent('download');await page.locator('#export-download').click();const download=await pending,path=info.outputPath(name);await download.saveAs(path);
 await expect(dialog).toBeHidden();return {path,summary,filename:download.suggestedFilename()};
}

test('top-level frames export as one multi-page PDF sized 1 pt per pixel',async({page},info)=>{
 await seed(page,frames());
 const {path,summary,filename}=await exportAs(page,{format:'pdf',scope:'frames',scale:'2'},info,'frames.pdf');
 expect(summary).toContain('2 pages in one PDF');expect(filename).toMatch(/\.pdf$/);
 const pdf=await readFile(path);expect(pdf.subarray(0,8).toString('latin1')).toBe('%PDF-1.4');
 execFileSync('qpdf',['--check',path]);
 const info1=execFileSync('pdfinfo',['-f','1','-l','2',path]).toString();
 expect(info1).toMatch(/Pages:\s+2/);expect(info1).toMatch(/Page\s+1 size:\s+320 x 200 pts/);expect(info1).toMatch(/Page\s+2 size:\s+160 x 240 pts/);
 // Rendered at 72 dpi with the 2× image downsampled: check fill colors at known points.
 const out=info.outputPath('page');execFileSync('pdftoppm',['-r','72','-png',path,out]);
 const colors=execFileSync('python3',['-c',`
import zlib,struct,sys
def px(path,x,y):
  data=open(path,'rb').read();i=8;w=h=0;idat=b''
  while i<len(data):
    n=struct.unpack('>I',data[i:i+4])[0];t=data[i+4:i+8];c=data[i+8:i+8+n];i+=12+n
    if t==b'IHDR':w,h,bd,ct=struct.unpack('>IIBB',c[:10]);ch={2:3,6:4}[ct]
    if t==b'IDAT':idat+=c
  raw=zlib.decompress(idat);stride=w*ch;rows=[];prev=bytearray(stride);p=0
  for r in range(h):
    f=raw[p];line=bytearray(raw[p+1:p+1+stride]);p+=1+stride
    for k in range(stride):
      a=line[k-ch] if k>=ch else 0;b=prev[k];cc=prev[k-ch] if k>=ch else 0
      if f==1:line[k]=(line[k]+a)&255
      elif f==2:line[k]=(line[k]+b)&255
      elif f==3:line[k]=(line[k]+(a+b)//2)&255
      elif f==4:
        pa,pb,pc=abs(b-cc),abs(a-cc),abs(a+b-2*cc);pr=a if pa<=pb and pa<=pc else (b if pb<=pc else cc);line[k]=(line[k]+pr)&255
    rows.append(line);prev=line
  return list(rows[y][x*ch:x*ch+3])
print(px(sys.argv[1],100,80),px(sys.argv[1],10,10),px(sys.argv[2],80,120))
`,out+'-1.png',out+'-2.png']).toString().trim();
 expect(colors).toBe('[255, 0, 0] [255, 255, 255] [0, 0, 255]');
});

test('transparent selection exports keep an alpha mask and opaque backgrounds do not',async({page},info)=>{
 await seed(page);
 const clear=await exportAs(page,{format:'pdf',scope:'page'},info,'clear.pdf');
 expect(clear.summary).toMatch(/^1 page · \d+ × \d+ pt · pages are images at 1×/);
 const clearPdf=(await readFile(clear.path)).toString('latin1');expect(clearPdf).toContain('/SMask');
 const solid=await exportAs(page,{format:'pdf',scope:'page',transparent:false},info,'solid.pdf');
 const solidPdf=await readFile(solid.path);expect(solidPdf.toString('latin1')).not.toContain('/SMask');
 execFileSync('qpdf',['--check',solid.path]);
 // The page image matches the canvas rendering size of the exported area.
 const header=solidPdf.toString('latin1').match(/\/Width (\d+) \/Height (\d+) \/ColorSpace \/DeviceRGB/),media=solidPdf.toString('latin1').match(/\/MediaBox \[0 0 ([\d.]+) ([\d.]+)\]/);
 expect(Number(header[1])).toBe(Math.ceil(Number(media[1])));expect(Number(header[2])).toBe(Math.ceil(Number(media[2])));
 const start=solidPdf.indexOf('stream\n',solidPdf.indexOf('/ColorSpace /DeviceRGB'))+7,length=Number(solidPdf.toString('latin1').match(/\/ColorSpace \/DeviceRGB \/BitsPerComponent 8 \/Filter \/FlateDecode \/Length (\d+)/)[1]);
 expect(inflateSync(solidPdf.subarray(start,start+length)).length).toBe(Number(header[1])*Number(header[2])*3);
});

function words(){
 const e=createHeadlessEditor(),doc=()=>JSON.parse(e.snapshot()),get=id=>doc().shapes.find(s=>s.id===id),edit=(id,p)=>e.update(JSON.stringify({...get(id),...p}));
 const type={font_family:'Arial',font_size:14,font_weight:400,align:'left',line_height:1.2,wrap:false,sizing:'fixed'};
 try{
  const frame=e.add('frame',0,0);edit(frame,{name:'Sheet',width:400,height:300,fill:'#ffffff',clip_content:true});
  const text=(name,props)=>{const id=e.add('text',props.x,props.y);edit(id,{name,fill:'#000000',width:300,height:60,...props});e.reparent_many(JSON.stringify([id]),frame);return id;};
  text('Title',{x:40,y:30,text:'Selectable',typography:{...type,font_size:40}});
  text('Body',{x:40,y:120,width:150,height:120,text:'The quick brown fox jumps over the lazy dog',typography:{...type,wrap:true}});
  text('Shout',{x:220,y:120,width:160,height:30,text:'loud ünïcode 日本',typography:{...type,text_case:'upper',align:'right'}});
  text('Side',{x:340,y:290,width:120,height:30,text:'Sideways',rotation:90,typography:{...type,font_size:20}});
  text('Hidden',{x:220,y:160,text:'Secret',hidden:true});
  text('Outside',{x:520,y:40,text:'Clipped'});
  const body=doc();body.name='PDF text';return {body:JSON.stringify(body)};
 }finally{e.free();}
}

test('exported PDF text can be extracted and lines up with the painted glyphs',async({page},info)=>{
 await seed(page,words());
 const {path}=await exportAs(page,{format:'pdf',scope:'frames',scale:'2',transparent:false},info,'text.pdf');
 execFileSync('qpdf',['--check',path]);
 expect(execFileSync('pdffonts',[path]).toString()).toMatch(/PixlPrfctGlyphless\s+CID TrueType\s+Identity-H\s+yes no\s+yes/);
 const plain=execFileSync('pdftotext',[path,'-']).toString().replace(/\s+/g,' ');
 for(const phrase of ['Selectable','The quick brown fox jumps over the lazy dog','LOUD ÜNÏCODE 日本','Sideways'])expect(plain).toContain(phrase);
 expect(plain).not.toContain('Secret');expect(plain).not.toContain('Clipped');
 const boxes=[...execFileSync('pdftotext',['-bbox',path,'-']).toString().matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]+)<\/word>/g)].map(([,x0,y0,x1,y1,word])=>({word,x0:+x0,y0:+y0,x1:+x1,y1:+y1}));
 const box=word=>boxes.find(b=>b.word===word);
 // Render the page and find where the ink actually is; the invisible words must cover it.
 const out=info.outputPath('text');execFileSync('pdftoppm',['-r','72','-gray',path,out]);
 const pgm=await readFile(out+'-1.pgm'),[,w,h]=pgm.subarray(0,20).toString('latin1').match(/^P5\s+(\d+)\s+(\d+)\s+255\s/),pixels=pgm.subarray(pgm.length-w*h);
 const ink=(x0,y0,x1,y1)=>{let left=Infinity,right=-1,top=Infinity,bottom=-1;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(pixels[y*w+x]<140){left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);}return {left,right,top,bottom};};
 expect([Number(w),Number(h)]).toEqual([400,300]);
 const title=box('Selectable'),titleInk=ink(0,20,400,100);
 expect(Math.abs(title.x0-titleInk.left)).toBeLessThan(4);expect(Math.abs(title.x1-titleInk.right)).toBeLessThan(4);
 expect(title.y0).toBeLessThanOrEqual(titleInk.top+2);expect(title.y1).toBeGreaterThanOrEqual(titleInk.bottom-10);
 // Wrapped lines keep their painted order and positions; each word starts where its ink starts.
 const fox=box('fox'),lazy=box('lazy');expect(lazy.y0).toBeGreaterThan(fox.y0);
 for(const word of ['The','jumps','dog']){const b=box(word),found=ink(Math.floor(b.x0)-3,Math.floor(b.y0),Math.ceil(b.x1)+3,Math.ceil(b.y1));expect(Math.abs(found.left-b.x0),word).toBeLessThan(3);expect(Math.abs(found.right-b.x1),word).toBeLessThan(3);}
 // Right-aligned text ends at its layer edge (220 + 160).
 expect(Math.abs(box('日本').x1-380)).toBeLessThan(1.5);
 // Rotated 90° counter-clockwise: the word runs up the page, taller than wide, over its ink.
 const side=box('Sideways'),sideInk=ink(330,150,390,300);
 expect(side.y1-side.y0).toBeGreaterThan(3*(side.x1-side.x0));
 expect(Math.abs(side.y0-sideInk.top)).toBeLessThan(4);expect(Math.abs(side.y1-sideInk.bottom)).toBeLessThan(4);
 expect(side.x0).toBeLessThanOrEqual(sideInk.left+2);expect(side.x1).toBeGreaterThanOrEqual(sideInk.right-6);
});
