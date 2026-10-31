// Bound MCP responses without changing file contents. Offsets count UTF-16 code
// units, and chunks never split a surrogate pair. Every cursor pins the revision
// and export scope so a consumer cannot silently join different file versions.
export function exportChunks(files,state,args,scope){
 const limit=args.limit??64000;if(!Number.isInteger(limit)||limit<256||limit>64000)throw new Error('Export chunk limit must be between 256 and 64000 characters.');
 const cursor=(name,offset)=>encodeURIComponent(JSON.stringify({revision:state.revision,scope,name,offset}));
 const manifest=files.map(({name,text})=>({name,characters:text.length,bytes:new TextEncoder().encode(text).length,cursor:cursor(name,0)}));
 if(!args.cursor){if(files.reduce((n,f)=>n+f.text.length,0)<=limit)return {...state,partial:false,files};return {...state,partial:true,files:manifest,instructions:'Read each file using its cursor and identical export options. Concatenate chunk text until nextCursor is null.'};}
 let token;try{token=JSON.parse(decodeURIComponent(args.cursor));}catch{throw new Error('Invalid export cursor.');}
 if(token.revision!==state.revision)throw new Error('Document changed during export. Start a new export.');
 if(token.scope!==scope)throw new Error('Keep the same export options when continuing an export.');
 const file=files.find(f=>f.name===token.name),offset=token.offset;
 if(!file||!Number.isInteger(offset)||offset<0||offset>file.text.length||(offset>0&&/[\uD800-\uDBFF]/.test(file.text[offset-1])&&/[\uDC00-\uDFFF]/.test(file.text[offset]??'')))throw new Error('Invalid export file or offset.');
 let end=Math.min(file.text.length,offset+limit);if(end<file.text.length&&/[\uD800-\uDBFF]/.test(file.text[end-1]))end--;
 return {...state,partial:offset>0||end<file.text.length,files:[{name:file.name,text:file.text.slice(offset,end)}],pagination:{offset,characters:file.text.length,nextCursor:end<file.text.length?cursor(file.name,end):null}};
}
