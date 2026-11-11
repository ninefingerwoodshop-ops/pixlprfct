// SVG/CSS color values for the editable SVG importer. Every accepted value
// becomes a #rrggbb color plus an alpha between 0 and 1.
const NAMED=Object.fromEntries("aliceblue f0f8ff antiquewhite faebd7 aqua 00ffff aquamarine 7fffd4 azure f0ffff beige f5f5dc bisque ffe4c4 black 000000 blanchedalmond ffebcd blue 0000ff blueviolet 8a2be2 brown a52a2a burlywood deb887 cadetblue 5f9ea0 chartreuse 7fff00 chocolate d2691e coral ff7f50 cornflowerblue 6495ed cornsilk fff8dc crimson dc143c cyan 00ffff darkblue 00008b darkcyan 008b8b darkgoldenrod b8860b darkgray a9a9a9 darkgreen 006400 darkgrey a9a9a9 darkkhaki bdb76b darkmagenta 8b008b darkolivegreen 556b2f darkorange ff8c00 darkorchid 9932cc darkred 8b0000 darksalmon e9967a darkseagreen 8fbc8f darkslateblue 483d8b darkslategray 2f4f4f darkslategrey 2f4f4f darkturquoise 00ced1 darkviolet 9400d3 deeppink ff1493 deepskyblue 00bfff dimgray 696969 dimgrey 696969 dodgerblue 1e90ff firebrick b22222 floralwhite fffaf0 forestgreen 228b22 fuchsia ff00ff gainsboro dcdcdc ghostwhite f8f8ff gold ffd700 goldenrod daa520 gray 808080 green 008000 greenyellow adff2f grey 808080 honeydew f0fff0 hotpink ff69b4 indianred cd5c5c indigo 4b0082 ivory fffff0 khaki f0e68c lavender e6e6fa lavenderblush fff0f5 lawngreen 7cfc00 lemonchiffon fffacd lightblue add8e6 lightcoral f08080 lightcyan e0ffff lightgoldenrodyellow fafad2 lightgray d3d3d3 lightgreen 90ee90 lightgrey d3d3d3 lightpink ffb6c1 lightsalmon ffa07a lightseagreen 20b2aa lightskyblue 87cefa lightslategray 778899 lightslategrey 778899 lightsteelblue b0c4de lightyellow ffffe0 lime 00ff00 limegreen 32cd32 linen faf0e6 magenta ff00ff maroon 800000 mediumaquamarine 66cdaa mediumblue 0000cd mediumorchid ba55d3 mediumpurple 9370db mediumseagreen 3cb371 mediumslateblue 7b68ee mediumspringgreen 00fa9a mediumturquoise 48d1cc mediumvioletred c71585 midnightblue 191970 mintcream f5fffa mistyrose ffe4e1 moccasin ffe4b5 navajowhite ffdead navy 000080 oldlace fdf5e6 olive 808000 olivedrab 6b8e23 orange ffa500 orangered ff4500 orchid da70d6 palegoldenrod eee8aa palegreen 98fb98 paleturquoise afeeee palevioletred db7093 papayawhip ffefd5 peachpuff ffdab9 peru cd853f pink ffc0cb plum dda0dd powderblue b0e0e6 purple 800080 rebeccapurple 663399 red ff0000 rosybrown bc8f8f royalblue 4169e1 saddlebrown 8b4513 salmon fa8072 sandybrown f4a460 seagreen 2e8b57 seashell fff5ee sienna a0522d silver c0c0c0 skyblue 87ceeb slateblue 6a5acd slategray 708090 slategrey 708090 snow fffafa springgreen 00ff7f steelblue 4682b4 tan d2b48c teal 008080 thistle d8bfd8 tomato ff6347 turquoise 40e0d0 violet ee82ee wheat f5deb3 white ffffff whitesmoke f5f5f5 yellow ffff00 yellowgreen 9acd32".match(/\S+ \S+/g).map(pair=>pair.split(' ')));
const hex2=value=>Math.round(Math.max(0,Math.min(255,value))).toString(16).padStart(2,'0');
const fail=value=>{throw new Error('Unsupported SVG paint: '+value.slice(0,60)+'. Use a named, hex, RGB or HSL color.');};
const number=/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
function alphaOf(part,source){
 if(part==null)return 1;
 const percent=part.endsWith('%'),text=percent?part.slice(0,-1):part;if(!number.test(text))fail(source);
 return Math.max(0,Math.min(1,Number(text)/(percent?100:1)));
}
// Splits "r, g, b, a" and "r g b / a" argument lists into three channels and an optional alpha.
function channels(body,source){
 const [main,slash,...extra]=body.split('/').map(part=>part.trim());if(extra.length)fail(source);
 const parts=main.split(/\s*,\s*|\s+/).filter(Boolean);
 if(slash!==undefined){if(parts.length!==3||main.includes(','))fail(source);return [...parts,slash];}
 if(parts.length<3||parts.length>4||(parts.length===4&&!main.includes(',')))fail(source);
 return parts;
}
function hslToRgb(h,s,l){
 h=((h%360)+360)%360;s=Math.max(0,Math.min(1,s));l=Math.max(0,Math.min(1,l));
 const a=s*Math.min(l,1-l),f=n=>{const k=(n+h/30)%12;return 255*(l-a*Math.max(-1,Math.min(k-3,9-k,1)));};
 return [f(0),f(8),f(4)];
}
/** @returns {{hex:string,alpha:number}|null} null means no paint (`none` or fully `transparent`). */
export function parseSvgColor(value,current='#000000'){
 const source=String(value).trim();let text=source.toLowerCase();
 if(text==='currentcolor')text=String(current).trim().toLowerCase();
 if(text==='none'||text==='transparent')return null;
 if(NAMED[text])return {hex:'#'+NAMED[text],alpha:1};
 if(/^#[0-9a-f]+$/.test(text)){
  const digits=text.slice(1);
  if(digits.length===3||digits.length===4){const full=[...digits].map(c=>c+c).join('');return {hex:'#'+full.slice(0,6),alpha:digits.length===4?parseInt(full.slice(6),16)/255:1};}
  if(digits.length===6||digits.length===8)return {hex:'#'+digits.slice(0,6),alpha:digits.length===8?parseInt(digits.slice(6),16)/255:1};
  fail(source);
 }
 const call=text.match(/^(rgba?|hsla?)\(([^()]*)\)$/);if(!call)fail(source);
 const parts=channels(call[2],source),alpha=alphaOf(parts[3],source);
 if(call[1].startsWith('rgb')){
  const percent=parts.slice(0,3).map(p=>p.endsWith('%'));if(percent.some(p=>p!==percent[0]))fail(source);
  const rgb=parts.slice(0,3).map(p=>{const t=percent[0]?p.slice(0,-1):p;if(!number.test(t))fail(source);return percent[0]?Number(t)*255/100:Number(t);});
  return {hex:'#'+rgb.map(hex2).join(''),alpha};
 }
 const hue=parts[0].replace(/deg$/,'');if(!number.test(hue)||!parts[1].endsWith('%')||!parts[2].endsWith('%'))fail(source);
 const [s,l]=[parts[1],parts[2]].map(p=>{const t=p.slice(0,-1);if(!number.test(t))fail(source);return Number(t)/100;});
 return {hex:'#'+hslToRgb(Number(hue),s,l).map(hex2).join(''),alpha};
}
