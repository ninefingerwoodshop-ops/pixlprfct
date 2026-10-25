use crate::Shape;
pub fn hit(s: &Shape, x: f64, y: f64) -> bool {
    if s.closed || s.points.len() < 2 || s.appearance.as_ref().is_some_and(|a| !a.stroke_enabled) {
        return false;
    }
    let world = |p: [f64; 2]| [s.x + p[0] * s.width, s.y + p[1] * s.height];
    let nodes: Vec<_> = s.points.iter().copied().map(world).collect();
    for end in [false, true] {
        let configured = s.appearance.as_ref().and_then(|a| {
            if end {
                a.stroke_end.as_deref()
            } else {
                a.stroke_start.as_deref()
            }
        });
        let kind = configured.unwrap_or(if end && s.kind == "arrow" {
            "legacy_arrow"
        } else {
            "none"
        });
        if kind == "none" {
            continue;
        }
        let i = if end { nodes.len() - 1 } else { 0 };
        let j = if end { i - 1 } else { 1 };
        let p = nodes[i];
        let mut candidates = Vec::new();
        if let Some(h) = s.handles.get(i) {
            candidates.push(world(h[if end { 0 } else { 1 }]));
        }
        if let Some(h) = s.handles.get(j) {
            candidates.push(world(h[if end { 1 } else { 0 }]));
        }
        if end {
            candidates.extend(nodes[..i].iter().rev().copied());
        } else {
            candidates.extend(nodes[1..].iter().copied());
        }
        let Some(q) = candidates
            .iter()
            .find(|q| (p[0] - q[0]).hypot(p[1] - q[1]) > 1e-9)
        else {
            continue;
        };
        let len = (p[0] - q[0]).hypot(p[1] - q[1]);
        let u = [(p[0] - q[0]) / len, (p[1] - q[1]) / len];
        let px = (x - p[0]) * u[0] + (y - p[1]) * u[1];
        let py = -(x - p[0]) * u[1] + (y - p[1]) * u[0];
        let w = s.stroke_width;
        if kind == "circle" {
            if px.hypot(py) <= 2.0 * w {
                return true;
            }
            continue;
        }
        let (points, closed): (Vec<[f64; 2]>, bool) = match kind {
            "line" => (
                vec![[-3.0 * w, -3.0 * w], [0.0, 0.0], [-3.0 * w, 3.0 * w]],
                false,
            ),
            "legacy_arrow" => {
                let size = ((p[0] - nodes[j][0]).hypot(p[1] - nodes[j][1]) * 0.4)
                    .min(10.0_f64.max(w * 4.0));
                (
                    vec![
                        [-0.5_f64.cos() * size, -0.5_f64.sin() * size],
                        [0.0, 0.0],
                        [-0.5_f64.cos() * size, 0.5_f64.sin() * size],
                    ],
                    false,
                )
            }
            "triangle" => (
                vec![[0.0, 0.0], [-4.0 * w, -2.0 * w], [-4.0 * w, 2.0 * w]],
                true,
            ),
            "reverse_triangle" => (vec![[-4.0 * w, 0.0], [0.0, -2.0 * w], [0.0, 2.0 * w]], true),
            "diamond" => (
                vec![
                    [0.0, 0.0],
                    [-3.0 * w, -2.0 * w],
                    [-6.0 * w, 0.0],
                    [-3.0 * w, 2.0 * w],
                ],
                true,
            ),
            _ => continue,
        };
        let mut inside = false;
        for k in 0..if closed {
            points.len()
        } else {
            points.len() - 1
        } {
            let a = points[k];
            let b = points[(k + 1) % points.len()];
            let dx = b[0] - a[0];
            let dy = b[1] - a[1];
            if !closed {
                let t = (((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy).max(1e-12))
                    .clamp(0.0, 1.0);
                if (px - a[0] - t * dx).hypot(py - a[1] - t * dy) <= (w / 2.0).max(4.0) {
                    return true;
                }
            }
            if closed && (a[1] > py) != (b[1] > py) && px < dx * (py - a[1]) / dy + a[0] {
                inside = !inside;
            }
        }
        if inside {
            return true;
        }
    }
    false
}
