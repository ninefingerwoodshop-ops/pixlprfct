use crate::Shape;
use std::collections::HashMap;

// Validation guarantees a rooted, acyclic tree. Preserve sibling order while
// traversing each edge once. Documents are almost always already in this
// order after the first commit, so compute the order on indices and only move
// layer payloads when it actually differs.
pub fn parents_first(shapes: &mut Vec<Shape>) {
    let mut children: HashMap<u32, Vec<usize>> = HashMap::new();
    for (i, shape) in shapes.iter().enumerate() {
        children.entry(shape.parent_id).or_default().push(i);
    }
    let mut order = Vec::with_capacity(shapes.len());
    // Each parent's list is taken once, exactly like the recursive version.
    let mut stack: Vec<std::vec::IntoIter<usize>> =
        vec![children.remove(&0).unwrap_or_default().into_iter()];
    while let Some(siblings) = stack.last_mut() {
        let Some(index) = siblings.next() else {
            stack.pop();
            continue;
        };
        order.push(index);
        stack.push(
            children
                .remove(&shapes[index].id)
                .unwrap_or_default()
                .into_iter(),
        );
    }
    if order.len() == shapes.len() && order.iter().enumerate().all(|(i, &n)| i == n) {
        return;
    }
    // Layers not reachable from the root are dropped, as before.
    let mut slots: Vec<Option<Shape>> = shapes.drain(..).map(Some).collect();
    shapes.extend(order.into_iter().filter_map(|i| slots[i].take()));
}
