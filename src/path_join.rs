use crate::Shape;
type Node = [[f64; 2]; 3];
fn nodes(s: &Shape) -> Vec<Node> {
    s.points
        .iter()
        .enumerate()
        .map(|(i, p)| {
            let h = s.handles.get(i).copied().unwrap_or([*p, *p]);
            [*p, h[0], h[1]].map(|v| [s.x + v[0] * s.width, s.y + v[1] * s.height])
        })
        .collect()
}
fn reverse(nodes: &mut [Node]) {
    nodes.reverse();
    for n in nodes {
        n.swap(1, 2);
    }
}
fn distance(a: [f64; 2], b: [f64; 2]) -> f64 {
    (a[0] - b[0]).hypot(a[1] - b[1])
}
pub fn join(a: &Shape, b: &Shape) -> Result<Shape, String> {
    if a.closed || b.closed || a.points.len() < 2 || b.points.len() < 2 {
        return Err("Choose two open vector paths".into());
    }
    let mut left = nodes(a);
    let mut right = nodes(b);
    let mut best = (false, false, f64::INFINITY);
    for (ra, rb) in [(false, false), (true, false), (false, true), (true, true)] {
        let d = distance(
            left[if ra { 0 } else { left.len() - 1 }][0],
            right[if rb { right.len() - 1 } else { 0 }][0],
        );
        if d < best.2 {
            best = (ra, rb, d);
        }
    }
    if best.0 {
        reverse(&mut left);
    }
    if best.1 {
        reverse(&mut right);
    }
    let last = left.len() - 1;
    if best.2 < 1e-9 {
        left[last][2] = right[0][2];
        left.extend_from_slice(&right[1..]);
    } else {
        left[last][2] = left[last][0];
        right[0][1] = right[0][0];
        left.extend(right);
    }
    if left.len() > 4096 {
        return Err("Joined paths may contain at most 4096 anchors".into());
    }
    left[0][1] = left[0][0];
    let last = left.len() - 1;
    left[last][2] = left[last][0];
    let min = [
        left.iter()
            .flatten()
            .map(|p| p[0])
            .fold(f64::INFINITY, f64::min),
        left.iter()
            .flatten()
            .map(|p| p[1])
            .fold(f64::INFINITY, f64::min),
    ];
    let max = [
        left.iter()
            .flatten()
            .map(|p| p[0])
            .fold(f64::NEG_INFINITY, f64::max),
        left.iter()
            .flatten()
            .map(|p| p[1])
            .fold(f64::NEG_INFINITY, f64::max),
    ];
    let mut result = a.clone();
    if result.kind == "line" {
        result.kind = "pen".into();
    }
    result.x = min[0];
    result.y = min[1];
    result.width = (max[0] - min[0]).max(1.0);
    result.height = (max[1] - min[1]).max(1.0);
    let norm = |p: [f64; 2]| {
        [
            (p[0] - min[0]) / result.width,
            (p[1] - min[1]) / result.height,
        ]
    };
    result.points = left.iter().map(|n| norm(n[0])).collect();
    result.handles = left.iter().map(|n| [norm(n[1]), norm(n[2])]).collect();
    Ok(result)
}
