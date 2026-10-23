export function bounds(shapes) {
  if (!shapes.length) return null;
  const x = Math.min(...shapes.map(s => s.x)), y = Math.min(...shapes.map(s => s.y));
  return { x, y, width: Math.max(...shapes.map(s => s.x + s.width)) - x, height: Math.max(...shapes.map(s => s.y + s.height)) - y };
}
export function marqueeSelection(shapes, start, end) {
  const x = Math.min(start.x, end.x), y = Math.min(start.y, end.y);
  const right = Math.max(start.x, end.x), bottom = Math.max(start.y, end.y);
  return shapes.filter(s => !s.hidden && s.x <= right && s.x + s.width >= x && s.y <= bottom && s.y + s.height >= y).map(s => s.id);
}
export function layerRange(shapes, anchor, target) {
  const a = shapes.findIndex(s => s.id === anchor), b = shapes.findIndex(s => s.id === target);
  return a < 0 || b < 0 ? [target] : shapes.slice(Math.min(a, b), Math.max(a, b) + 1).map(s => s.id);
}
