use super::*;
use std::collections::{HashMap, HashSet};

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum Component {
    Master,
    Instance {
        master: u32,
        source: u32,
        #[serde(default)]
        overrides: Vec<String>,
    },
}
const FIELDS: &[&str] = &[
    "name",
    "text",
    "fill",
    "appearance",
    "typography",
    "hidden",
    "locked",
    "image",
    "stroke_width",
    "points",
    "handles",
    "closed",
    "clip_content",
    "auto_layout",
    "layout_grids",
    "guide_style",
    "prototype",
    "layout_item",
    "constraints",
    "width",
    "height",
    "x",
    "y",
];

fn subfields(field: &str) -> &'static [&'static str] {
    match field {
        "typography" => &[
            "sizing",
            "font_size",
            "font_family",
            "font_weight",
            "align",
            "line_height",
            "wrap",
        ],
        "appearance" => &[
            "gradient",
            "opacity",
            "corner_radius",
            "corner_radii",
            "fill_enabled",
            "stroke_enabled",
            "stroke_color",
            "stroke_dash",
            "stroke_dash_offset",
            "stroke_cap",
            "stroke_join",
            "stroke_miter_limit",
        ],
        "constraints" => &["horizontal", "vertical"],
        "layout_item" => &[
            "fill_width",
            "fill_height",
            "absolute",
            "min_width",
            "max_width",
            "min_height",
            "max_height",
        ],
        "auto_layout" => &[
            "direction",
            "wrap",
            "cross_gap",
            "align_content",
            "gap",
            "padding_top",
            "padding_right",
            "padding_bottom",
            "padding_left",
            "align",
            "justify",
            "hug_width",
            "hug_height",
        ],
        _ => &[],
    }
}
fn valid_override(path: &str) -> bool {
    if let Some((field, property)) = path.split_once('.') {
        subfields(field).contains(&property)
    } else {
        FIELDS.contains(&path)
    }
}
// Legacy paint defaults must be compared by appearance, not by whether the
// optional object was serialized. Otherwise changing opacity also overrides fill.
fn effective_value(s: &Shape) -> serde_json::Value {
    let mut value = serde_json::to_value(s).unwrap();
    if s.appearance.is_none() {
        value["appearance"] = serde_json::json!({"gradient":null,"opacity":1.0,"corner_radius":0.0,"corner_radii":null,"stroke_dash":[],"stroke_dash_offset":0.0,"stroke_cap":"round","stroke_join":"round","stroke_miter_limit":10.0,"fill_enabled":s.points.is_empty()||s.closed,"stroke_enabled":!s.points.is_empty(),"stroke_color":if s.points.is_empty(){"#000000"}else{&s.fill}});
    }
    if s.typography.is_none() {
        value["typography"] = serde_json::to_value(Typography::default()).unwrap();
    }
    value
}
fn apply_overrides(
    shape: &mut Shape,
    previous: &Shape,
    overrides: &[String],
) -> Result<(), String> {
    let mut value = serde_json::to_value(&shape).unwrap();
    let defaults = effective_value(shape);
    let old = effective_value(previous);
    for path in overrides {
        if path == "x" || path == "y" {
            continue;
        }
        if let Some((field, property)) = path.split_once('.') {
            if !value[field].is_object() {
                value[field] = if defaults[field].is_object() {
                    defaults[field].clone()
                } else {
                    old[field].clone()
                };
            }
            if value[field].is_object() {
                value[field][property] = old[field][property].clone();
            }
        } else {
            value[path] = serde_json::to_value(previous).unwrap()[path].clone();
        }
    }
    *shape = serde_json::from_value(value).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn subtree(shapes: &[Shape], root: u32) -> Vec<Shape> {
    fn walk(shapes: &[Shape], id: u32, out: &mut Vec<Shape>) {
        if let Some(s) = shapes.iter().find(|s| s.id == id) {
            out.push(s.clone());
            for child in shapes.iter().filter(|s| s.parent_id == id) {
                walk(shapes, child.id, out);
            }
        }
    }
    let mut out = vec![];
    walk(shapes, root, &mut out);
    out
}

pub fn validate_links(doc: &Document) -> Result<(), String> {
    let by_id: HashMap<_, _> = doc.shapes.iter().map(|s| (s.id, s)).collect();
    let mut sources = HashSet::new();
    for s in &doc.shapes {
        let parent = by_id.get(&s.parent_id).and_then(|p| p.component.as_ref());
        match &s.component {
            Some(Component::Master) => {
                if s.kind != "frame" {
                    return Err("Components must be frames".into());
                }
            }
            Some(Component::Instance {
                master,
                source,
                overrides,
            }) => {
                if *master == 0
                    || *source == 0
                    || overrides.len() > 64
                    || overrides.iter().any(|f| !valid_override(f))
                    || overrides.iter().collect::<HashSet<_>>().len() != overrides.len()
                {
                    return Err("Invalid component link or override".into());
                }
                if master == source {
                    if s.kind != "frame" {
                        return Err("Instances must be frames".into());
                    }
                } else if !matches!(parent, Some(Component::Instance { master: m, .. }) if m == master)
                {
                    return Err("Detach the instance before changing its structure".into());
                }
                let mut root = s;
                while matches!(&root.component,Some(Component::Instance{master,source,..}) if master != source)
                {
                    root = by_id
                        .get(&root.parent_id)
                        .copied()
                        .ok_or("Invalid instance ancestry")?;
                }
                if !sources.insert((root.id, *source)) {
                    return Err("Duplicate component source in an instance".into());
                }
            }
            None => {
                if matches!(parent, Some(Component::Instance { .. })) {
                    return Err("Detach the instance before adding layers".into());
                }
            }
        }
        if matches!(s.component, Some(Component::Master))
            || matches!(&s.component,Some(Component::Instance{master,source,..}) if master==source)
        {
            let mut p = s.parent_id;
            while let Some(ancestor) = by_id.get(&p) {
                if ancestor.component.is_some() {
                    return Err("Nested components are not supported yet".into());
                }
                p = ancestor.parent_id;
            }
        }
    }
    Ok(())
}

pub fn record_overrides(old: &Shape, new: &mut Shape) -> Result<(), String> {
    if new.guide_style == old.guide_style && new.layout_grids != old.layout_grids {
        new.guide_style = 0;
    }
    if old.component != new.component {
        return Err("Use the component actions to change component links".into());
    }
    if let Some(Component::Instance {
        master,
        source,
        overrides,
    }) = &old.component
    {
        if new.kind != old.kind
            || (master != source && new.parent_id != old.parent_id)
            || new.group_id != old.group_id
        {
            return Err("Detach the instance before changing its structure".into());
        }
        let a = effective_value(old);
        let b = effective_value(new);
        let mut changed = overrides.clone();
        for field in FIELDS {
            if a[field] == b[field] || changed.iter().any(|f| f == field) {
                continue;
            }
            if !subfields(field).is_empty() && a[field].is_object() && b[field].is_object() {
                for property in subfields(field) {
                    let path = format!("{field}.{property}");
                    if a[field][property] != b[field][property] && !changed.contains(&path) {
                        changed.push(path);
                    }
                }
            } else {
                changed.retain(|f| !f.starts_with(&format!("{field}.")));
                changed.push((*field).into());
            }
        }
        if a["layout_grids"] != b["layout_grids"] || a["guide_style"] != b["guide_style"] {
            for field in ["layout_grids", "guide_style"] {
                if !changed.iter().any(|p| p == field) {
                    changed.push(field.into());
                }
            }
        }
        new.component = Some(Component::Instance {
            master: *master,
            source: *source,
            overrides: changed,
        });
    }
    Ok(())
}

// Structural edits to instance descendants must be explicit detaches. Whole
// instances may still be moved, duplicated, removed and reordered normally.
pub fn protect_structure(old: &Document, new: &Document) -> Result<(), String> {
    for s in &old.shapes {
        if let Some(Component::Instance { master, source, .. }) = &s.component {
            if master == source {
                continue;
            }
            let structure = |doc: &Document| {
                subtree(&doc.shapes, *master)
                    .iter()
                    .map(|s| (s.id, s.parent_id, s.group_id, s.group_name.clone()))
                    .collect::<Vec<_>>()
            };
            // Staged operations may already have synchronized a main-component
            // structural edit before the outer transaction is committed.
            if structure(old) != structure(new) {
                continue;
            }
            let mut root = s;
            while let Some(Component::Instance { master, source, .. }) = &root.component {
                if master == source {
                    break;
                }
                root = old.shapes.iter().find(|p| p.id == root.parent_id).unwrap();
            }
            let Some(new_root) = new.shapes.iter().find(|n| n.id == root.id) else {
                continue;
            };
            if new_root.component.is_none() {
                continue;
            }
            let Some(n) = new.shapes.iter().find(|n| n.id == s.id) else {
                return Err("Detach the instance before removing its layers".into());
            };
            if n.parent_id != s.parent_id
                || n.group_id != s.group_id
                || n.group_name != s.group_name
                || n.component.as_ref().is_none()
            {
                return Err("Detach the instance before changing its structure".into());
            }
            let order = |doc: &Document| {
                doc.shapes
                    .iter()
                    .filter(|n| n.parent_id == s.parent_id)
                    .map(|n| n.id)
                    .collect::<Vec<_>>()
            };
            if order(old) != order(new) {
                return Err("Detach the instance before reordering its layers".into());
            }
        }
    }
    Ok(())
}

pub fn sync(doc: &mut Document, next: &mut u32) -> Result<(), String> {
    let roots: Vec<_> = doc.shapes.iter().filter(|s|matches!(&s.component,Some(Component::Instance{master,source,..}) if master==source)).map(|s|s.id).collect();
    for id in roots {
        let old = subtree(&doc.shapes, id);
        let root = &old[0];
        let Some(Component::Instance { master, .. }) = root.component else {
            unreachable!()
        };
        let source = subtree(&doc.shapes, master);
        if source
            .first()
            .is_none_or(|s| s.component != Some(Component::Master))
        {
            let ids: HashSet<_> = old.iter().map(|s| s.id).collect();
            for s in &mut doc.shapes {
                if ids.contains(&s.id) {
                    s.component = None;
                }
            }
            continue;
        }
        let allocate = |next: &mut u32| -> Result<u32, String> {
            let id = *next;
            *next = next.checked_add(1).ok_or("Shape ID limit reached")?;
            Ok(id)
        };
        let mut built: Vec<Shape> = vec![];
        let mut map = HashMap::new();
        let mut groups = HashMap::new();
        for src in &source {
            let previous = old.iter().find(
                |s| matches!(&s.component,Some(Component::Instance{source,..}) if *source==src.id),
            );
            let new_id = if let Some(p) = previous {
                p.id
            } else {
                allocate(next)?
            };
            map.insert(src.id, new_id);
            let mut shape = src.clone();
            shape.flow_name = previous.map_or_else(String::new, |p| p.flow_name.clone());
            shape.id = new_id;
            shape.page_id = root.page_id;
            shape.parent_id = if src.id == master {
                root.parent_id
            } else {
                map[&src.parent_id]
            };
            shape.group_id = if src.id == master {
                root.group_id
            } else if src.group_id == 0 {
                0
            } else if let Some(id) = groups.get(&src.group_id) {
                *id
            } else {
                let id = new_id;
                groups.insert(src.group_id, id);
                id
            };
            if src.id == master {
                shape.group_name = root.group_name.clone();
                shape.x = root.x;
                shape.y = root.y;
            } else {
                let sp = source.iter().find(|s| s.id == src.parent_id).unwrap();
                let np = built.iter().find(|s| s.id == shape.parent_id).unwrap();
                let mut constrained = src.clone();
                if let Some(p) = previous {
                    if let Some(Component::Instance { overrides, .. }) = &p.component {
                        apply_overrides(&mut constrained, p, overrides)?;
                    }
                }
                (shape.x, shape.width) = constrain_axis(
                    src.x,
                    src.width,
                    sp.x,
                    sp.width,
                    np.x,
                    np.width,
                    &constrained.constraints.horizontal,
                );
                (shape.y, shape.height) = constrain_axis(
                    src.y,
                    src.height,
                    sp.y,
                    sp.height,
                    np.y,
                    np.height,
                    &constrained.constraints.vertical,
                );
            }
            let overrides = match previous.and_then(|s| s.component.as_ref()) {
                Some(Component::Instance { overrides, .. }) => overrides.clone(),
                _ => vec![],
            };
            if let Some(p) = previous {
                apply_overrides(&mut shape, p, &overrides)?;
                if src.id != master {
                    let op = old.iter().find(|s| s.id == p.parent_id).unwrap();
                    let np = built.iter().find(|s| s.id == shape.parent_id).unwrap();
                    if overrides.iter().any(|f| f == "x") {
                        shape.x = np.x + p.x - op.x;
                    }
                    if overrides.iter().any(|f| f == "y") {
                        shape.y = np.y + p.y - op.y;
                    }
                }
            }
            shape.component = Some(Component::Instance {
                master,
                source: src.id,
                overrides,
            });
            built.push(shape);
        }
        let ids: HashSet<_> = old.iter().map(|s| s.id).collect();
        let slot = doc.shapes.iter().position(|s| s.id == id).unwrap();
        doc.shapes.retain(|s| !ids.contains(&s.id));
        doc.shapes.splice(slot..slot, built);
        if doc.shapes.len() > 10_000 {
            return Err("Document exceeds 10,000 layers".into());
        }
    }
    Ok(())
}

#[wasm_bindgen]
impl Editor {
    pub fn create_component(&mut self, id: u32) -> Result<(), String> {
        let mut doc = self.document.clone();
        let tree = subtree(&doc.shapes, id);
        if tree.is_empty() || tree.iter().any(|s| s.component.is_some()) {
            return Err("Select an ordinary frame to create a component".into());
        }
        let root = doc
            .shapes
            .iter_mut()
            .find(|s| s.id == id && s.page_id == doc.active_page)
            .ok_or("Frame not found on this page")?;
        if root.kind != "frame" {
            return Err("Select a frame to create a component".into());
        }
        root.component = Some(Component::Master);
        self.commit(doc)
    }

    pub fn create_instance(&mut self, master: u32, x: f64, y: f64) -> Result<u32, String> {
        if self.next_id == u32::MAX {
            return Err("Shape ID limit reached".into());
        }
        let mut root = self
            .document
            .shapes
            .iter()
            .find(|s| s.id == master && s.component == Some(Component::Master))
            .ok_or("Main component not found")?
            .clone();
        let id = self.next_id;
        root.id = id;
        root.parent_id = 0;
        root.group_id = 0;
        root.group_name.clear();
        root.flow_name.clear();
        root.page_id = self.document.active_page;
        root.x = x;
        root.y = y;
        root.component = Some(Component::Instance {
            master,
            source: master,
            overrides: vec![],
        });
        let mut doc = self.document.clone();
        doc.shapes.push(root);
        self.commit(doc)?;
        self.next_id = self.next_id.max(id + 1);
        Ok(id)
    }

    pub fn detach_instance(&mut self, id: u32) -> Result<(), String> {
        let root = self.instance_root(id)?;
        let ids: HashSet<_> = subtree(&self.document.shapes, root)
            .iter()
            .map(|s| s.id)
            .collect();
        let mut doc = self.document.clone();
        for s in &mut doc.shapes {
            if ids.contains(&s.id) {
                s.component = None;
            }
        }
        self.commit(doc)
    }

    pub fn swap_instance(&mut self, id: u32, master: u32) -> Result<u32, String> {
        let root = self.instance_root(id)?;
        let old = subtree(&self.document.shapes, root);
        let Some(Component::Instance {
            master: old_master, ..
        }) = old[0].component
        else {
            unreachable!()
        };
        if old_master == master {
            return Ok(root);
        }
        let target = subtree(&self.document.shapes, master);
        if target
            .first()
            .is_none_or(|s| s.component != Some(Component::Master))
        {
            return Err("Main component not found".into());
        }
        let original = subtree(&self.document.shapes, old_master);
        // Match layer names, kinds and hierarchy. Repeated sibling names match
        // by occurrence in paint order; instance renames do not alter identity.
        fn match_children(
            old: &[Shape],
            new: &[Shape],
            a: u32,
            b: u32,
            map: &mut HashMap<u32, u32>,
        ) {
            let mut used = HashSet::new();
            for child in old.iter().filter(|s| s.parent_id == a) {
                if let Some(other) = new.iter().find(|s| {
                    s.parent_id == b
                        && s.name == child.name
                        && s.kind == child.kind
                        && !used.contains(&s.id)
                }) {
                    used.insert(other.id);
                    map.insert(child.id, other.id);
                    match_children(old, new, child.id, other.id, map);
                }
            }
        }
        let mut mapping = HashMap::from([(old_master, master)]);
        match_children(&original, &target, old_master, master, &mut mapping);
        let mut kept = vec![];
        for mut s in old.clone() {
            if let Some(Component::Instance {
                source, overrides, ..
            }) = &s.component
            {
                if let Some(&source) = mapping.get(source) {
                    s.component = Some(Component::Instance {
                        master,
                        source,
                        overrides: overrides.clone(),
                    });
                    // Groups are reconstructed from the new main component.
                    if s.id != root {
                        s.group_id = 0;
                        s.group_name.clear();
                    }
                    kept.push(s);
                }
            }
        }
        let ids: HashSet<_> = old.iter().map(|s| s.id).collect();
        let mut doc = self.document.clone();
        let slot = doc.shapes.iter().position(|s| s.id == root).unwrap();
        doc.shapes.retain(|s| !ids.contains(&s.id));
        doc.shapes.splice(slot..slot, kept);
        let mut next = self.next_id.max(
            doc.shapes
                .iter()
                .map(|s| s.id.max(s.group_id))
                .max()
                .unwrap_or(0)
                .saturating_add(1),
        );
        sync(&mut doc, &mut next)?;
        component_properties::transfer_on_swap(&self.document, &mut doc, root, old_master, master)?;
        self.commit_document(doc)?;
        self.next_id = self.next_id.max(next);
        Ok(root)
    }

    pub fn reset_override(&mut self, id: u32, path: &str) -> Result<(), String> {
        if !valid_override(path) {
            return Err("Unknown override property".into());
        }
        if let Some(shape) = self.document.shapes.iter().find(|s| s.id == id) {
            if let Some(Component::Instance { master, source, .. }) = &shape.component {
                if let Some(p) = self.document.component_properties.iter().find(|p| {
                    p.component_id == *master
                        && p.targets.contains(source)
                        && component_properties::field(p) == path
                }) {
                    return self.reset_component_property(id, p.id);
                }
            }
        }
        let mut doc = self.document.clone();
        let shape = doc
            .shapes
            .iter_mut()
            .find(|s| s.id == id && s.page_id == doc.active_page)
            .ok_or("Layer not found")?;
        let Some(Component::Instance { overrides, .. }) = &mut shape.component else {
            return Err("Select an instance layer".into());
        };
        overrides.retain(|p| {
            p != path
                && !p.starts_with(&format!("{path}."))
                && !(["layout_grids", "guide_style"].contains(&path)
                    && ["layout_grids", "guide_style"].contains(&p.as_str()))
        });
        self.commit(doc)
    }

    pub fn reset_instance(&mut self, id: u32) -> Result<(), String> {
        let root = self.instance_root(id)?;
        let ids: HashSet<_> = subtree(&self.document.shapes, root)
            .iter()
            .map(|s| s.id)
            .collect();
        let mut doc = self.document.clone();
        for s in &mut doc.shapes {
            if ids.contains(&s.id) {
                if let Some(Component::Instance { overrides, .. }) = &mut s.component {
                    overrides.clear();
                }
            }
        }
        self.commit(doc)
    }
}

impl Editor {
    pub(crate) fn instance_root(&self, id: u32) -> Result<u32, String> {
        let mut s = self
            .document
            .shapes
            .iter()
            .find(|s| s.id == id && s.page_id == self.document.active_page)
            .ok_or("Instance not found")?;
        loop {
            match &s.component {
                Some(Component::Instance { master, source, .. }) if master == source => {
                    return Ok(s.id)
                }
                Some(Component::Instance { .. }) => {
                    s = self
                        .document
                        .shapes
                        .iter()
                        .find(|p| p.id == s.parent_id)
                        .ok_or("Instance parent not found")?
                }
                _ => return Err("Select an instance".into()),
            }
        }
    }
}
