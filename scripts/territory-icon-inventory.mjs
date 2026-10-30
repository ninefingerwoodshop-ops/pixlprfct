// Audit named UI icons in the local Territory Track web and iOS source trees.
// Source snapshots are checked into the icon package; live scans detect additions.
import {readFile, readdir, writeFile} from 'node:fs/promises';
import {resolve, relative} from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';

const namePattern=/^[a-z][a-z0-9.-]*$/i;
async function files(root,extensions){
 const result=[];
 for(const item of await readdir(root,{withFileTypes:true})){
  if(item.name.startsWith('.')||['node_modules','build','dist'].includes(item.name))continue;
  const path=resolve(root,item.name);
  if(item.isDirectory())result.push(...await files(path,extensions));
  else if(extensions.some(ext=>path.endsWith(ext))&&!/\.(spec|test)\./.test(path))result.push(path);
 }
 return result.sort();
}
function stringValues(node){
 const result=[];
 function visit(n){
  if(ts.isStringLiteralLike(n)&&namePattern.test(n.text))result.push(n.text);
  else if(ts.isPropertyAssignment(n))visit(n.initializer);
  else if(ts.isConditionalExpression(n)){visit(n.whenTrue);visit(n.whenFalse);}
  else if(ts.isElementAccessExpression(n))visit(n.expression);
  else if(ts.isCallExpression(n)){if(n.arguments[0])visit(n.arguments[0]);}
  else if(ts.isBinaryExpression(n)&&![ts.SyntaxKind.BarBarToken,ts.SyntaxKind.QuestionQuestionToken].includes(n.operatorToken.kind))return;
  else ts.forEachChild(n,visit);
 }
 visit(node);return result;
}
export async function inventory(webRoot,iosRoot){
 const entries=new Map();
 function add(group,name,file,line){
  if(!namePattern.test(name))return;
  const key=`${group}:${name}`;
  if(!entries.has(key))entries.set(key,{group,name,uses:[]});
  const use=`${file}:${line}`;
  if(!entries.get(key).uses.includes(use))entries.get(key).uses.push(use);
 }
 function html(text,file,lineOffset=0){
  text=text.replace(/<!--[\s\S]*?-->/g,m=>m.replace(/[^\n]/g,' '));
  const line=i=>lineOffset+text.slice(0,i).split('\n').length;
  for(const m of text.matchAll(/(?<![\w\[])(appIcon|nfIcon)="([a-z][a-z0-9-]*)"/g))add(m[1]==='nfIcon'?'lucide':'web',m[2],file,line(m.index));
  const expressionNames=value=>stringValues(ts.createSourceFile('expression.ts',`(${value})`,ts.ScriptTarget.Latest,true));
  for(const m of text.matchAll(/\[(appIcon|nfIcon)\]="([^"]+)"/g))
   for(const name of expressionNames(m[2]))add(m[1]==='nfIcon'?'lucide':'web',name,file,line(m.index));
  for(const m of text.matchAll(/<(app-icon|nf-icon)\b[^>]*?\s(name|\[name\])="([^"]+)"/g)){
   const names=m[2]==='name'?[m[3]]:expressionNames(m[3]);
   for(const name of names)add(m[1]==='nf-icon'?'lucide':'web',name,file,line(m.index));
  }
  for(const m of text.matchAll(/class="([^"]*)"/g))for(const cls of m[1].split(/\s+/))
   if(/^ph-[a-z][a-z0-9-]*$/.test(cls)&&!['ph-light','ph-fill','ph-bold','ph-thin','ph-duotone'].includes(cls))add('web',cls.slice(3),file,line(m.index));
 }
 for(const file of await files(resolve(webRoot,'client/src/app'),['.ts','.html'])){
  const text=await readFile(file,'utf8'),rel=relative(webRoot,file);
  if(file.endsWith('.html')){html(text,rel);continue;}
  const source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
  const line=node=>source.getLineAndCharacterOfPosition(node.getStart(source)).line+1;
  function emit(group,node){for(const name of stringValues(node))add(group,name,rel,line(node));}
  function visit(node){
   if(ts.isCallExpression(node)&&/^(nfIconSvg|iconSvg|iconHtml)$/.test(node.expression.getText(source))&&node.arguments[0])emit(node.expression.getText(source)==='nfIconSvg'?'lucide':'web',node.arguments[0]);
   if((ts.isPropertyAssignment(node)||ts.isPropertyDeclaration(node))&&node.initializer&&/^(icon|iconName|leadingIcon|trailingIcon|emptyIcon|loadingIcon)$/i.test(node.name.getText(source)))emit('web',node.initializer);
   if((ts.isMethodDeclaration(node)||ts.isGetAccessorDeclaration(node))&&/icon/i.test(node.name.getText(source))&&node.body){
    function returns(n){if(ts.isReturnStatement(n)&&n.expression)emit('web',n.expression);else if(ts.isVariableDeclaration(n)&&n.initializer&&ts.isObjectLiteralExpression(n.initializer))for(const p of n.initializer.properties)if(ts.isPropertyAssignment(p))emit('web',p.initializer);ts.forEachChild(n,returns);}
    returns(node.body);
   }
   if(ts.isVariableDeclaration(node)&&node.initializer&&ts.isObjectLiteralExpression(node.initializer)&&/ICON/.test(node.name.getText(source))){
    const registry=node.name.getText(source);
    for(const p of node.initializer.properties){
     if(!ts.isPropertyAssignment(p))continue;
     const key=p.name.text??p.name.getText(source);
     if(registry==='NF_ICON_REGISTRY')add('lucide',key,rel,line(p));
     else if(registry==='ICON_SVG')add('avatar',key,rel,line(p));
     else if(ts.isStringLiteralLike(p.initializer)&&/^[Mm][0-9\s]/.test(p.initializer.text))add('custom',`${rel.split('/').slice(-2,-1)[0]}.${key}`,rel,line(p));
     else emit('web',p.initializer);
    }
   }
   if(ts.isStringLiteralLike(node)&&node.text.includes('<'))html(node.text,rel,line(node)-1);
   ts.forEachChild(node,visit);
  }
  // Translation tables are implementation, not call sites.
  if(!file.endsWith('/phosphor-map.ts'))visit(source);
 }
 for(const folder of ['TerritoryTrack','TerritoryTrackWidgets','Shared'])for(const file of await files(resolve(iosRoot,folder),['.swift'])){
  const text=(await readFile(file,'utf8')).replace(/\/\/[^\n]*/g,''),rel=relative(iosRoot,file);
  const line=i=>text.slice(0,i).split('\n').length;
  function swiftNames(expression,offset){
   expression=expression.replace(/(?:==|!=)\s*"[^"]*"/g,'');
   expression=expression.replace(/case\s+"[^"]*"\s*:/g,'');
   for(const m of expression.matchAll(/"([a-z][a-z0-9.]*)"/g))add('ios',m[1],rel,line(offset+m.index));
  }
  for(const m of text.matchAll(/\b(?:systemName|systemImage|systemImageName|icon|symbol)\s*:\s*([^\n,]+)/g))swiftNames(m[1],m.index);
  // The iPad tab strip uses tuples: (tab, label, SF Symbol).
  for(const m of text.matchAll(/\(\.[\w]+,\s*"[^"]+",\s*"([a-z][a-z0-9.]*)"\)/g))add('ios',m[1],rel,line(m.index));
  for(const m of text.matchAll(/(?:var\s+\w*(?:icon|symbol|systemImage)\w*\s*:\s*String|func\s+\w*(?:icon|symbol)\w*\([^)]*\)\s*->\s*String)\s*\{/gi)){
   let depth=1,end=m.index+m[0].length;
   for(;end<text.length&&depth;end++){if(text[end]==='{')depth++;else if(text[end]==='}')depth--;}
   swiftNames(text.slice(m.index+m[0].length,end-1),m.index+m[0].length);
  }
 }
 return [...entries.values()].sort((a,b)=>`${a.group}:${a.name}`.localeCompare(`${b.group}:${b.name}`));
}

if(import.meta.url===pathToFileURL(process.argv[1]).href){
 const [webRoot,iosRoot,output,manifestPath='web/icon-library-assets/territory-track.json']=process.argv.slice(2);
 if(!webRoot||!iosRoot)throw Error('Usage: node scripts/territory-icon-inventory.mjs <TerritoryIQ> <TerritoryTrackIOS> [output.json]');
 const entries=await inventory(webRoot,iosRoot);
 if(output==='--check'){
  const manifest=JSON.parse(await readFile(manifestPath,'utf8'));
  const mapped=new Set(manifest.references.map(e=>`${e.group}:${e.name}`));
  const missing=entries.filter(e=>!mapped.has(`${e.group}:${e.name}`)&&!manifest.ignoredReferences?.[`${e.group}:${e.name}`]);
  if(missing.length){console.error('Unmapped Territory Track icons:',JSON.stringify(missing,null,2));process.exitCode=1;}
  else console.log(`All ${entries.length} scanned references are covered or explicitly classified as non-icons.`);
 }
 else if(output)await writeFile(output,JSON.stringify(entries,null,2)+'\n');
 else console.log(JSON.stringify(entries,null,2));
 console.error(`${entries.length} icon references: ${JSON.stringify(Object.fromEntries([...new Set(entries.map(x=>x.group))].map(group=>[group,entries.filter(x=>x.group===group).length])))}`);
}
