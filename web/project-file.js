// Native files retain the engine document, including IDs and cross-page references.
export function projectFile(snapshot){
 const document=JSON.parse(snapshot);
 if(!Array.isArray(document.pages)||!Array.isArray(document.shapes))throw new Error('This is not a PixlPrfct project.');
 if(new TextEncoder().encode(snapshot).length>5_000_000)throw new Error('This project exceeds the current 5 MB native-file limit.');
 const name=(document.name||'Untitled project').replace(/[<>:"/\\|?*\u0000-\u001f]/g,'-').trim()||'Untitled project';
 return {name:name+'.pixl',data:snapshot,type:'application/json'};
}
