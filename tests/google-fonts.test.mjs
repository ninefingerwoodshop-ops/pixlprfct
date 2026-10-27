import test from 'node:test';
import assert from 'node:assert/strict';
import {validFontFamily,googleFontUrl,fontImports} from '../web/google-fonts.js';
test('font URLs encode names and export only used web font styles',()=>{
 assert.equal(googleFontUrl('Space Grotesk',600),'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600&display=swap');
 const shapes=['Poppins','Poppins','Georgia'].map(font_family=>({typography:{font_family,font_weight:400}}));
 assert.equal((fontImports(shapes).match(/@import/g)||[]).length,1);
 assert.ok(validFontFamily('Noto Sans JP'));for(const value of ['', 'bad"font','url(x)','a; color:red'])assert.equal(validFontFamily(value),false);
});
