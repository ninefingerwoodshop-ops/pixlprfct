export function instanceContext(doc, shape) {
  if (shape?.component?.type !== 'instance') return null;
  const byId = new Map(doc.shapes.map(s => [s.id,s]));
  let root = shape;
  const parents = new Set();
  while (root.component?.master !== root.component?.source && !parents.has(root.id)) {
    parents.add(root.id);
    const parent = byId.get(root.parent_id);
    if (!parent || parent.component?.type !== 'instance') break;
    root = parent;
  }
  let source = byId.get(shape.component.source), nestedMain = null;
  const seen = new Set();
  while (source?.component?.type === 'instance' && !seen.has(source.id)) {
    seen.add(source.id);
    nestedMain = byId.get(source.component.master) ?? nestedMain;
    source = byId.get(source.component.source);
  }
  return {root, main:byId.get(shape.component.master), nestedMain, isRoot:root.id===shape.id};
}
