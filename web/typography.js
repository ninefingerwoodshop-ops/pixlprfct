export function textStyle(shape) {
  const style = shape.typography || { font_size: Math.max(10, Math.min(72, shape.height * .66)), font_family: 'Manrope', font_weight: 600, align: 'left', line_height: 1.2, wrap: false };
  return {...style, sizing:style.sizing||'fixed', wrap:style.sizing==='width'?shape.layout_item?.max_width!=null:style.sizing==='height'?true:style.wrap};
}

export function textSize(shape, measure) {
  const style=textStyle(shape);
  const natural=style.sizing==='width'?Math.max(1,Math.ceil(Math.max(...shape.text.replace(/\r\n?/g,'\n').split('\n').map(measure)))):shape.width;
  const width=Math.min(shape.layout_item?.max_width??1e6,Math.max(shape.layout_item?.min_width??1,natural));
  return [width,Math.max(1,Math.ceil(layoutText({...shape,width},measure).height))];
}

// Measure the alphabetic baseline relative to the same top origin used by
// canvas text rendering. The difference avoids assuming a font ascent ratio.
export function textBaseline(shape, ctx) {
  ctx.save();ctx.font=fontCss(textStyle(shape));ctx.textBaseline='alphabetic';
  const alphabetic=ctx.measureText('Hg').actualBoundingBoxAscent;
  ctx.textBaseline='top';const top=ctx.measureText('Hg').actualBoundingBoxAscent;ctx.restore();
  const offset=alphabetic-top;return Number.isFinite(offset)&&offset>=0?offset:textStyle(shape).font_size*.8;
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
export function layoutText(shape, measure) {
  const style = textStyle(shape), lines = [];
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  for (const paragraph of shape.text.replace(/\r\n?/g, '\n').split('\n')) {
    if (!style.wrap || !paragraph) { lines.push(paragraph); continue; }
    let line = '';
    for (const token of paragraph.match(/\S+|\s+/gu) || []) {
      if (measure(line + token) <= shape.width) { line += token; continue; }
      if (line) { lines.push(line.trimEnd()); line = ''; }
      if (!token.trim()) continue;
      for (const { segment } of segmenter.segment(token)) {
        if (line && measure(line + segment) > shape.width) { lines.push(line); line = ''; }
        line += segment;
      }
    }
    if (line || !lines.length) lines.push(line.trimEnd());
  }
  const step = style.font_size * style.line_height;
  const height = Math.max(style.font_size, (lines.length - 1) * step + style.font_size);
  const fraction = style.align === 'center' ? .5 : style.align === 'right' ? 1 : 0;
  return {
    style, height,
    overflow: height > shape.height + .01 || lines.some(line => measure(line) > shape.width + .01),
    lines: lines.map((text, index) => ({ text, x: shape.x + fraction * shape.width, y: shape.y + index * step })),
  };
}

export function escapeXml(value) { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c])); }

export function textSvg(shape, layout) {
  const { style, lines } = layout;
  const anchor = { left: 'start', center: 'middle', right: 'end' }[style.align];
  return `<clipPath id="clip${shape.id}"><rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}"/></clipPath><text clip-path="url(#clip${shape.id})" ${paintAttributes(shape)} font-family="${escapeXml(style.font_family)}" font-size="${style.font_size}" font-weight="${style.font_weight}" text-anchor="${anchor}" dominant-baseline="text-before-edge" xml:space="preserve">${lines.map(line => `<tspan x="${line.x}" y="${line.y}">${escapeXml(line.text)}</tspan>`).join('')}</text>`;
}
import {paintAttributes} from './appearance.js';
