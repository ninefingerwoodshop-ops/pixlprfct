use crate::Shape;
impl Shape {
    // Figma angles are counter-clockwise around the layer's local origin.
    pub(crate) fn visual_bounds(&self) -> (f64, f64, f64, f64) {
        let (sin, cos) = self.rotation.to_radians().sin_cos();
        let xs = [
            0.0,
            self.width * cos,
            self.height * sin,
            self.width * cos + self.height * sin,
        ];
        let ys = [
            0.0,
            -self.width * sin,
            self.height * cos,
            -self.width * sin + self.height * cos,
        ];
        let left = xs.into_iter().fold(f64::INFINITY, f64::min);
        let top = ys.into_iter().fold(f64::INFINITY, f64::min);
        (
            self.x + left,
            self.y + top,
            xs.into_iter().fold(f64::NEG_INFINITY, f64::max) - left,
            ys.into_iter().fold(f64::NEG_INFINITY, f64::max) - top,
        )
    }
    pub(crate) fn unrotate_point(&self, x: f64, y: f64) -> (f64, f64) {
        let (sin, cos) = self.rotation.to_radians().sin_cos();
        let (dx, dy) = (x - self.x, y - self.y);
        (self.x + dx * cos - dy * sin, self.y + dx * sin + dy * cos)
    }
}
