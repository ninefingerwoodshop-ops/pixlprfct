import {componentAssets} from './assets.js';
import {libraryForMaster} from './library-model.js';

// Keep discovery bounded even for large catalogs and variant sets. Read the
// returned component IDs through the normal document API for full definitions.
export function libraryCatalog(doc,catalog,project,session,{offset=0,limit=50,query=''}={}){
 if(!Number.isInteger(offset)||offset<0||!Number.isInteger(limit)||limit<1||limit>200)throw new Error('Library pagination requires a nonnegative offset and a limit from 1 to 200.');
 const matches=item=>item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
 const available=catalog.filter(matches),linked=(doc.libraries??[]).filter(matches),assets=componentAssets(doc).filter(a=>{const l=libraryForMaster(doc,a.variants[0].id);return (!l||l.enabled!==false)&&matches(a);});
 const page=items=>items.slice(offset,offset+limit),hasMore=[available,linked,assets].some(items=>items.length>offset+limit),summarize=({id,workspace,name,revision,enabled})=>({id,workspace,name,revision,enabled});
 const assetPage=page(assets).map(({name,variants})=>({name,variants:variants.slice(0,10),variantCount:variants.length,partial:variants.length>10}));
 return {available:page(available).map(item=>({...summarize(item),location:item.device?'device':'workspace',isSource:item.device?item.source_project===project?.id:item.id===session?.active?.id})),linked:page(linked).map(summarize),assets:assetPage,availableCount:available.length,linkedCount:linked.length,assetCount:assets.length,pagination:{offset,limit,hasMore,nextOffset:hasMore?offset+limit:null},partial:offset>0||hasMore||assetPage.some(a=>a.partial)};
}
