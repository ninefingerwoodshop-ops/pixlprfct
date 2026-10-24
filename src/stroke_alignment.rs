use crate::Shape;
pub fn reach(s: &Shape) -> f64 {
    let Some(a) = &s.appearance else {
        return if s.points.is_empty() {
            0.0
        } else {
            s.stroke_width / 2.0
        };
    };
    if !a.stroke_enabled {
        return 0.0;
    }
    if !s.points.is_empty() && !s.closed {
        return s.stroke_width / 2.0;
    }
    s.stroke_width
        * match a.stroke_alignment.as_str() {
            "inside" => 0.0,
            "outside" => 1.0,
            _ => 0.5,
        }
}
pub fn hit(s: &Shape, x: f64, y: f64) -> bool {
    let pad = reach(s);
    if pad == 0.0 || !s.points.is_empty() || s.kind == "text" {
        return false;
    }
    if x < s.x - pad || x > s.x + s.width + pad || y < s.y - pad || y > s.y + s.height + pad {
        return false;
    }
    if s.kind == "ellipse" {
        let rx = s.width / 2.0;
        let ry = s.height / 2.0;
        let px = (x - s.x - rx).abs();
        let py = (y - s.y - ry).abs();
        if (px / rx).powi(2) + (py / ry).powi(2) <= 1.0 {
            return true;
        }
        let (mut lo, mut hi) = (0.0, std::f64::consts::FRAC_PI_2);
        for _ in 0..60 {
            let t = (lo + hi) / 2.0;
            let derivative =
                (ry * ry - rx * rx) * t.sin() * t.cos() + rx * px * t.sin() - ry * py * t.cos();
            if derivative < 0.0 {
                lo = t;
            } else {
                hi = t;
            }
        }
        let t = (lo + hi) / 2.0;
        return (px - rx * t.cos()).hypot(py - ry * t.sin()) <= pad;
    }
    let a = s.appearance.as_ref().unwrap();
    let r = a.corner_radii.unwrap_or([a.corner_radius; 4]);
    let scale = 1.0_f64
        .min(s.width / (r[0] + r[1]))
        .min(s.width / (r[3] + r[2]))
        .min(s.height / (r[0] + r[3]))
        .min(s.height / (r[1] + r[2]));
    let r = r.map(|v| v * scale);
    for (radius, cx, cy, left, top) in [
        (r[0], s.x + r[0], s.y + r[0], true, true),
        (r[1], s.x + s.width - r[1], s.y + r[1], false, true),
        (
            r[2],
            s.x + s.width - r[2],
            s.y + s.height - r[2],
            false,
            false,
        ),
        (r[3], s.x + r[3], s.y + s.height - r[3], true, false),
    ] {
        if (if left { x < cx } else { x > cx }) && (if top { y < cy } else { y > cy }) {
            let dx = (x - cx).abs();
            let dy = (y - cy).abs();
            let rounded = radius > 0.0 || a.stroke_join == "round";
            if rounded && dx.hypot(dy) > radius + pad {
                return false;
            }
            if !rounded
                && (a.stroke_join == "bevel" || a.stroke_miter_limit < 2.0_f64.sqrt())
                && dx + dy > pad
            {
                return false;
            }
        }
    }
    true
}
