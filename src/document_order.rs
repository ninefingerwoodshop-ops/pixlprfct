use crate::Shape;
use std::collections::HashMap;

// Validation guarantees a rooted, acyclic tree. Preserve sibling order while
// traversing each edge once; move shapes instead of cloning their payloads.
pub fn parents_first(shapes: &mut Vec<Shape>) {
    let mut children: HashMap<u32, Vec<Shape>> = HashMap::new();
    for shape in shapes.drain(..) {
        children.entry(shape.parent_id).or_default().push(shape);
    }
    fn append(parent: u32, children: &mut HashMap<u32, Vec<Shape>>, out: &mut Vec<Shape>) {
        for shape in children.remove(&parent).unwrap_or_default() {
            let id = shape.id;
            out.push(shape);
            append(id, children, out);
        }
    }
    append(0, &mut children, shapes);
}
