use crate::Shape;
use std::collections::HashMap;

// Keep layout/document order intact. Reverse sibling subtrees only for painting
// and hit testing; a descendant must stay inside its parent's stacking context.
pub(crate) fn paint_order(shapes: &[Shape]) -> Vec<&Shape> {
    let mut children: HashMap<u32, Vec<&Shape>> = HashMap::new();
    for s in shapes {
        children.entry(s.parent_id).or_default().push(s);
    }
    fn visit<'a>(s: &'a Shape, children: &HashMap<u32, Vec<&'a Shape>>, out: &mut Vec<&'a Shape>) {
        out.push(s);
        if let Some(list) = children.get(&s.id) {
            if s.auto_layout
                .as_ref()
                .is_some_and(|l| l.canvas_stacking == "first")
            {
                for child in list.iter().rev() {
                    visit(child, children, out);
                }
            } else {
                for child in list {
                    visit(child, children, out);
                }
            }
        }
    }
    let mut out = Vec::with_capacity(shapes.len());
    if let Some(roots) = children.get(&0) {
        for root in roots {
            visit(root, &children, &mut out);
        }
    }
    out
}
