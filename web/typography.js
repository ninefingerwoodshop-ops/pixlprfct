const graphemes=new Intl.Segmenter(undefined,{granularity:'grapheme'});
export const letterSpacing=style=>(style.letter_spacing??0)*(style.letter_spacing_unit==='%'?style.font_size/100:1);
export const textTransform=style=>({upper:'uppercase',lower:'lowercase',title:'capitalize'}[style.text_case]??'none');
export function displayedText(text,style){
 if(style.text_case==='upper')return text.toUpperCase();
 if(style.text_case==='lower')return text.toLowerCase();
 if(style.text_case==='title')return text.replace(/(^|[^\p{L}\p{N}])(\p{L})/gu,(_,before,letter)=>before+letter.toUpperCase());
 return text;
}
export const spacedMeasure=(measure,style)=>{const spacing=letterSpacing(style);return spacing?value=>Math.max(0,measure(value)+[...graphemes.segment(value)].length*spacing):measure;};

export function textStyle(shape) {
  const style = shape.typography || { font_size: Math.max(10, Math.min(72, shape.height * .66)), font_family: 'Manrope', font_weight: 600, align: 'left', line_height: 1.2, wrap: false };
  return {...style, sizing:style.sizing||'fixed', wrap:style.sizing==='width'?shape.layout_item?.max_width!=null:style.sizing==='height'?true:style.wrap};
}

export function textSize(shape, measure) {
  const style=textStyle(shape),widthOf=spacedMeasure(measure,style);
  const natural=style.sizing==='width'?Math.max(1,Math.ceil(Math.max(...displayedText(shape.text,style).replace(/\r\n?/g,'\n').split('\n').map(widthOf)))):shape.width;
  const width=Math.min(shape.layout_item?.max_width??1e6,Math.max(shape.layout_item?.min_width??1,natural));
  return [width,Math.max(1,Math.ceil(layoutText({...shape,width},measure).height))];
}

// CSS centers the font's ascent/descent within each complete line box. Canvas
// "top" and SVG "text-before-edge" use different font origins, so use an
// explicit alphabetic baseline for every painted representation instead.
export function fontBaseline(style, ctx) {
  let metrics={};
  if(ctx){ctx.save();ctx.font=fontCss(style);ctx.textBaseline='alphabetic';metrics=ctx.measureText('Hg');ctx.restore();}
  const ascent=Number.isFinite(metrics.fontBoundingBoxAscent)?metrics.fontBoundingBoxAscent:style.font_size*.8;
  const descent=Number.isFinite(metrics.fontBoundingBoxDescent)?metrics.fontBoundingBoxDescent:style.font_size*.2;
  return (style.font_size*(style.line_height??1.2)-ascent-descent)/2+ascent;
}

export function textBaseline(shape, ctx) {
  const style=textStyle(shape),baseline=fontBaseline(style,ctx);
  ctx.save();ctx.font=fontCss(style);
  const layout=layoutText(shape,text=>ctx.measureText(text).width,baseline);ctx.restore();
  // Auto sizing has not yet committed its new height during engine measurement.
  return baseline+(style.sizing==='fixed'?layout.lines[0].y-shape.y:0);
}

export function resizeText(shape, widthChanged, heightChanged) {
  if(shape.kind!=='text')return shape;
  const style=textStyle(shape),sizing=heightChanged?'fixed':widthChanged&&style.sizing==='width'?'height':style.sizing;
  return {...shape,typography:{...style,sizing},layout_item:{...shape.layout_item,fill_width:widthChanged?false:!!shape.layout_item?.fill_width,fill_height:heightChanged?false:!!shape.layout_item?.fill_height,absolute:!!shape.layout_item?.absolute}};
}

export function fontCss(style) {
  const family = style.font_family === 'monospace' ? 'monospace' : `"${style.font_family}", ${style.font_family === 'Georgia' ? 'serif' : 'sans-serif'}`;
  return `${style.font_weight} ${style.font_size}px ${family}`;
}

// Measure is injected so the same line layout drives Canvas and SVG output.
// Hard line breaks and blank lines are retained. Long words break at grapheme
// boundaries, avoiding split emoji and combining marks.
export function layoutText(shape, measure, baseline=fontBaseline(textStyle(shape))) {
  const style = textStyle(shape), lines = [];measure=spacedMeasure(measure,style);
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  for (const paragraph of displayedText(shape.text,style).replace(/\r\n?/g, '\n').split('\n')) {
    if (!style.wrap || !paragraph) { lines.push(paragraph); continue; }
    let line = '', paragraphStart=lines.length;
    for (const token of paragraph.match(/\S+|\s+/gu) || []) {
      if (measure(line + token) <= shape.width) { line += token; continue; }
      if (line) { lines.push(line.trimEnd()); line = ''; }
      if (!token.trim()) continue;
      for (const { segment } of segmenter.segment(token)) {
        if (line && measure(line + segment) > shape.width) { lines.push(line); line = ''; }
        line += segment;
      }
    }
    if (line || lines.length===paragraphStart) lines.push(line.trimEnd());
  }
  const step = style.font_size * style.line_height;
  const height = lines.length * step;
  const fraction = style.align === 'center' ? .5 : style.align === 'right' ? 1 : 0;
  const verticalOffset=Math.max(0,shape.height-height)*(style.vertical_align==='center'?.5:style.vertical_align==='bottom'?1:0);
  return {
    style, height, baseline,
    overflow: height > shape.height + .01 || lines.some(line => measure(line) > shape.width + .01),
    lines: lines.map((text, index) => ({ text, x: shape.x + fraction * shape.width, y: shape.y + verticalOffset + index * step })),
  };
}

export function escapeXml(value) { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c])); }

export function textSvg(shape, layout) {
  const { style, lines, baseline=fontBaseline(layout.style) } = layout;
  if(shape.editor_meta?.text_path){const p=shape.editor_meta.text_path,points=p.reverse?[...p.points].reverse():p.points,d=points.map(([x,y],i)=>(i?'L':'M')+(shape.x+x*shape.width)+' '+(shape.y+y*shape.height)).join(' '),offset=style.align==='center'?50:style.align==='right'?100:p.offset*100;return `<defs><path id="text-path-${shape.id}" d="${d}"/></defs><text ${paintAttributes(shape)} font-family="${escapeXml(style.font_family)}" font-size="${style.font_size}" font-weight="${style.font_weight}"${letterSpacing(style)?` letter-spacing="${letterSpacing(style)}"`:""} text-anchor="${style.align==='center'?'middle':style.align==='right'?'end':'start'}"><textPath href="#text-path-${shape.id}" startOffset="${offset}%">${escapeXml(displayedText(shape.text,style))}</textPath></text>`;}

  const anchor = { left: 'start', center: 'middle', right: 'end' }[style.align];
  return `<clipPath id="clip${shape.id}"><rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}"/></clipPath><text clip-path="url(#clip${shape.id})" ${paintAttributes(shape)} font-family="${escapeXml(style.font_family)}" font-size="${style.font_size}" font-weight="${style.font_weight}"${letterSpacing(style)?` letter-spacing="${letterSpacing(style)}"`:""} text-anchor="${anchor}" dominant-baseline="alphabetic" xml:space="preserve">${lines.map(line => `<tspan x="${line.x}" y="${line.y+baseline}">${escapeXml(line.text)}</tspan>`).join('')}</text>`;
}
import {paintAttributes} from './appearance.js';
