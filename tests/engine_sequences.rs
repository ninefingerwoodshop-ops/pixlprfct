// Pseudo-random editing sequences over frames, groups, auto layout, components,
// constraints, previews and history. Debug builds check the cached snapshot
// against a fresh serialization on every `snapshot()` call. With
// `--ignored`, `engine_digest` prints a digest of every observable result so
// two builds can be compared for identical behavior:
//   DIFF_SEEDS=200 DIFF_STEPS=150 cargo test --release --test engine_sequences -- --ignored --nocapture
use pixlprfct_core::Editor;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};

struct Rng(u64);
impl Rng {
    fn next(&mut self) -> u64 {
        self.0 ^= self.0 << 13;
        self.0 ^= self.0 >> 7;
        self.0 ^= self.0 << 17;
        self.0
    }
    fn below(&mut self, n: usize) -> usize {
        (self.next() % n.max(1) as u64) as usize
    }
}

fn ids(e: &Editor) -> Vec<serde_json::Value> {
    let d: serde_json::Value = serde_json::from_str(&e.snapshot()).unwrap();
    let page = d["active_page"].clone();
    d["shapes"]
        .as_array()
        .unwrap()
        .iter()
        .filter(|s| s["page_id"] == page)
        .cloned()
        .collect()
}

#[test]
fn random_edit_sequences_keep_snapshots_consistent() {
    run(12, 80, false);
}

#[test]
#[ignore]
fn engine_digest() {
    let seeds: u64 = std::env::var("DIFF_SEEDS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(40);
    let steps: usize = std::env::var("DIFF_STEPS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(120);
    run(seeds, steps, true);
}

fn run(seeds: u64, steps: usize, report: bool) {
    let mut total = DefaultHasher::new();
    let (mut al, mut gr, mut co, mut ne) = (0usize, 0usize, 0usize, 0usize);
    let mut errors = 0usize;
    let mut oks = 0usize;
    for seed in 1..=seeds {
        let mut r = Rng(seed.wrapping_mul(0x9E3779B97F4A7C15) | 1);
        let mut e = Editor::new();
        let mut h = DefaultHasher::new();
        for step in 0..steps {
            let shapes = ids(&e);
            let pick = |r: &mut Rng| -> Option<serde_json::Value> {
                if shapes.is_empty() {
                    None
                } else {
                    Some(shapes[r.below(shapes.len())].clone())
                }
            };
            let sel = |r: &mut Rng, n: usize| -> String {
                let mut v: Vec<u64> = vec![];
                for _ in 0..n {
                    if let Some(s) = pick(r) {
                        let id = s["id"].as_u64().unwrap();
                        if !v.contains(&id) {
                            v.push(id);
                        }
                    }
                }
                serde_json::to_string(&v).unwrap()
            };
            let op = r.below(17);
            let res: Result<String, String> = match op {
                0 | 1 => {
                    let kinds = ["frame", "rectangle", "ellipse", "text", "frame"];
                    e.add(kinds[r.below(5)], r.below(800) as f64, r.below(600) as f64)
                        .map(|v| v.to_string())
                }
                2 => {
                    let s = {
                        let n = 1 + r.below(3);
                        sel(&mut r, n)
                    };
                    let parent = pick(&mut r)
                        .map(|p| p["id"].as_u64().unwrap() as u32)
                        .unwrap_or(0);
                    e.move_into(&s, parent).map(|_| String::new())
                }
                3 => {
                    let s = sel(&mut r, 1);
                    e.auto_layout_selection(&s).map(|v| format!("{v:?}"))
                }
                4 | 5 => match pick(&mut r) {
                    Some(mut s) => {
                        s["width"] = (10 + r.below(400)).into();
                        s["x"] = (r.below(500) as f64 + 0.5).into();
                        if r.below(2) == 0 {
                            let hz = ["left", "right", "center", "scale", "left_right"][r.below(5)];
                            let vt = ["top", "bottom", "center", "scale", "top_bottom"][r.below(5)];
                            s["constraints"] =
                                serde_json::json!({"horizontal": hz, "vertical": vt});
                        }
                        e.update(&s.to_string()).map(|_| String::new())
                    }
                    None => Ok(String::new()),
                },
                6 => {
                    let s = {
                        let n = 2 + r.below(2);
                        sel(&mut r, n)
                    };
                    e.group_many(&s).map(|v| format!("{v:?}"))
                }
                7 => {
                    let s = sel(&mut r, 1);
                    e.ungroup_many(&s).map(|v| format!("{v:?}"))
                }
                8 => {
                    let s = sel(&mut r, 1);
                    e.duplicate_many(&s)
                }
                9 => {
                    let s = sel(&mut r, 1);
                    e.remove_many(&s).map(|_| String::new())
                }
                10 => e.undo().map(|_| String::new()),
                11 => e.redo().map(|_| String::new()),
                12 => match pick(&mut r) {
                    Some(mut s) => {
                        s["height"] = (5 + r.below(300)).into();
                        e.preview_update_many(&serde_json::to_string(&vec![s]).unwrap())
                    }
                    None => Ok(String::new()),
                },
                13 => match pick(&mut r) {
                    Some(s) => e
                        .reorder(
                            s["id"].as_u64().unwrap() as u32,
                            if r.below(2) == 0 { 1 } else { -1 },
                        )
                        .map(|_| String::new()),
                    None => Ok(String::new()),
                },
                14 => {
                    let s = sel(&mut r, 1);
                    if r.below(2) == 0 {
                        match pick(&mut r) {
                            Some(m) if m["component"].is_object() => {
                                return_inst(&mut e, m["id"].as_u64().unwrap() as u32)
                            }
                            _ => Ok(String::new()),
                        }
                    } else {
                        e.create_component_selection(&s).map(|v| format!("{v:?}"))
                    }
                }
                15 => {
                    let s = {
                        let n = 1 + r.below(2);
                        sel(&mut r, n)
                    };
                    e.frame_selection(&s).map(|v| format!("{v:?}"))
                }
                _ => match pick(&mut r) {
                    Some(mut s) => {
                        if s.get("auto_layout").is_some_and(|l| !l.is_null()) {
                            s["auto_layout"]["gap"] = (r.below(40)).into();
                            s["auto_layout"]["direction"] =
                                ["horizontal", "vertical"][r.below(2)].into();
                        }
                        s["hidden"] = (r.below(5) == 0).into();
                        e.update(&s.to_string()).map(|_| String::new())
                    }
                    None => Ok(String::new()),
                },
            };
            if res.is_err() {
                errors += 1
            } else {
                oks += 1
            }
            (step, op, &res).hash(&mut h);
            e.snapshot().hash(&mut h);
        }
        let fin = e.snapshot();
        al += fin.matches("\"direction\":\"").count();
        gr += fin.matches("\"kind\":\"group\"").count();
        co += fin.matches("\"component\":{").count();
        ne += fin.matches("\"parent_id\":").count() - fin.matches("\"parent_id\":0").count();
        let v = h.finish();
        v.hash(&mut total);
        if report && std::env::var("DIFF_VERBOSE").is_ok() {
            println!("seed {seed}: {v:016x}");
        }
    }
    assert!(oks > errors, "most generated operations should succeed");
    if report {
        println!("final docs: auto-layout {al}, groups {gr}, components {co}, nested {ne}");
        println!("ops ok={oks} err={errors} digest={:016x}", total.finish());
    }
}

fn return_inst(e: &mut Editor, id: u32) -> Result<String, String> {
    e.create_instance(id, 40.0, 40.0).map(|v| v.to_string())
}
