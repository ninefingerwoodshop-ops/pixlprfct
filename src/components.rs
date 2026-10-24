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
    "layout_item",
    "constraints",
    "width",
    "height",
    "x",
    "y",
];

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
                    || overrides.len() > FIELDS.len()
                    || overrides.iter().any(|f| !FIELDS.contains(&f.as_str()))
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
        let a = serde_json::to_value(old).unwrap();
        let b = serde_json::to_value(&new).unwrap();
        let mut changed = overrides.clone();
        for field in FIELDS {
            if a[field] != b[field] && !changed.iter().any(|f| f == field) {
                changed.push((*field).into());
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
                let id = previous
                    .filter(|p| p.group_id != 0)
                    .map(|p| p.group_id)
                    .unwrap_or(new_id);
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
                (shape.x, shape.width) = constrain_axis(
                    src.x,
                    src.width,
                    sp.x,
                    sp.width,
                    np.x,
                    np.width,
                    &src.constraints.horizontal,
                );
                (shape.y, shape.height) = constrain_axis(
                    src.y,
                    src.height,
                    sp.y,
                    sp.height,
                    np.y,
                    np.height,
                    &src.constraints.vertical,
                );
            }
            let overrides = match previous.and_then(|s| s.component.as_ref()) {
                Some(Component::Instance { overrides, .. }) => overrides.clone(),
                _ => vec![],
            };
            if let Some(p) = previous {
                let mut value = serde_json::to_value(&shape).unwrap();
                let previous_value = serde_json::to_value(p).unwrap();
                for field in &overrides {
                    if field == "x" || field == "y" {
                        continue;
                    }
                    value[field] = previous_value[field].clone();
                }
                shape = serde_json::from_value(value).map_err(|e| e.to_string())?;
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
    fn instance_root(&self, id: u32) -> Result<u32, String> {
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
