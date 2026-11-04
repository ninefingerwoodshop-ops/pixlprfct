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
