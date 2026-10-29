use serde::{Deserialize, Serialize};
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct EditorMeta {
    pub role: String,
    pub body: String,
    pub resolved: bool,
    pub replies: Vec<String>,
    pub text_path: Option<TextPath>,
    pub motion: Option<Motion>,
}
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct TextPath {
    pub points: Vec<[f64; 2]>,
    pub offset: f64,
    pub reverse: bool,
}
#[derive(Clone, Debug, Default, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct Motion {
    pub duration: f64,
    pub looping: bool,
    pub keyframes: Vec<Keyframe>,
}
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Keyframe {
    pub time: f64,
    pub x: f64,
    pub y: f64,
    pub rotation: f64,
    pub scale: f64,
    pub opacity: f64,
    #[serde(default = "unit_scale")]
    pub scale_y: f64,
    #[serde(default)]
    pub width: Option<f64>,
    #[serde(default)]
    pub height: Option<f64>,
    #[serde(default)]
    pub corner_radius: Option<f64>,
    #[serde(default)]
    pub properties: Vec<String>,
}
fn unit_scale() -> f64 {
    1.0
}
pub fn validate(shape: &crate::Shape) -> Result<(), String> {
    let Some(meta) = &shape.editor_meta else {
        return Ok(());
    };
    if ![
        "",
        "section",
        "slice",
        "comment",
        "annotation",
        "measurement",
        "spec",
    ]
    .contains(&meta.role.as_str())
        || meta.body.len() > 10000
        || meta.replies.len() > 100
        || meta.replies.iter().any(|s| s.len() > 10000)
        || (meta.role == "section" && shape.kind != "frame")
    {
        return Err("Invalid editor tool data".into());
    }
    if let Some(path) = &meta.text_path {
        if shape.kind != "text"
            || path.points.len() < 2
            || path.points.len() > 4096
            || path
                .points
                .iter()
                .flatten()
                .any(|v| !v.is_finite() || v.abs() > 100.0)
            || !path.offset.is_finite()
            || !(0.0..=1.0).contains(&path.offset)
        {
            return Err("Invalid text path".into());
        }
    }
    if let Some(motion) = &meta.motion {
        if !motion.duration.is_finite()
            || !(1.0..=60000.0).contains(&motion.duration)
            || motion.keyframes.len() > 200
            || motion.keyframes.windows(2).any(|w| w[0].time >= w[1].time)
            || motion.keyframes.iter().any(|k| {
                ![k.time, k.x, k.y, k.rotation, k.scale, k.opacity]
                    .iter()
                    .all(|v| v.is_finite())
                    || k.time < 0.0
                    || k.time > motion.duration
                    || k.x.abs() > 1000000.0
                    || k.y.abs() > 1000000.0
                    || k.rotation.abs() > 36000.0
                    || !(0.01..=100.0).contains(&k.scale)
                    || !k.scale_y.is_finite()
                    || !(0.01..=100.0).contains(&k.scale_y)
                    || !(0.0..=1.0).contains(&k.opacity)
                    || [k.width, k.height, k.corner_radius]
                        .iter()
                        .flatten()
                        .any(|v| !v.is_finite() || *v < 0.0 || *v > 1000000.0)
                    || k.width == Some(0.0)
                    || k.height == Some(0.0)
                    || k.properties.len() > 9
                    || k.properties.iter().any(|p| {
                        ![
                            "x",
                            "y",
                            "rotation",
                            "scale",
                            "scale_y",
                            "opacity",
                            "width",
                            "height",
                            "corner_radius",
                        ]
                        .contains(&p.as_str())
                    })
            })
        {
            return Err("Invalid motion keyframes".into());
        }
    }
    Ok(())
}
