import test from 'node:test';
import assert from 'node:assert/strict';
import {paintPreview} from '../web/paint-preview.js';
import {defaultGradient} from '../web/gradients.js';
import {emptyPattern,emptyMedia,emptyShader} from '../web/paint-textures.js';
const paint={id:1,color:'#123456',opacity:1,visible:true};
const svg=value=>decodeURIComponent(value.split('data:image/svg+xml,')[1].slice(0,-2));
test('style previews retain radial geometry, order, opacity and blend modes',()=>{
 const radial={...defaultGradient('#ff0000'),kind:'radial'};
 const result=svg(paintPreview({paints:[{...paint,gradient:radial,opacity:.5,blend_mode:'multiply'},{...paint,id:2,color:'#abcdef'},{...paint,id:3,color:'#fedcba',visible:false}]}));
 assert.match(result,/<radialGradient/);assert.match(result,/fill-opacity="0.5"/);assert.match(result,/mix-blend-mode:multiply/);assert(result.indexOf('fill="#abcdef"')<result.indexOf('fill="url(#gradient-'));assert(!result.includes('#fedcba'));
});
test('style previews resolve variables and preserve actual image, pattern and shader paint',()=>{
 const doc={variables:{collections:[{id:1,default_mode:1}],values:[{id:1,collection_id:1,kind:'color',values:{1:'#00ff00'}}]},shapes:[{id:10,kind:'rectangle',parent_id:0,x:40,y:60,width:10,height:10,fill:'#abcdef'}]};
 assert.equal(paintPreview({paints:[paint],color_variables:{1:1}},doc),'#00ff00ff');
 const pattern=svg(paintPreview({paints:[{...paint,pattern:{...emptyPattern(),source_id:10}}]},doc));assert.match(pattern,/#abcdef/);assert.match(pattern,/<pattern/);
 const image='data:image/png;base64,AAAA';for(const extra of [{media:{...emptyMedia('image'),data_url:image}},{shader:{...emptyShader('#ffffff'),snapshot:image}}])assert(svg(paintPreview({paints:[{...paint,...extra}]})).includes(image));
 assert.equal(paintPreview({paints:[{...paint,visible:false}]}),'transparent');
});
