use super::*;

#[wasm_bindgen]
impl Editor {
    // The layer tree displays the paint stack in reverse order.
    pub fn drop_layer(&mut self, id:u32, target:u32, position:&str) -> Result<(),String> {
        if !["before","after","inside"].contains(&position) {return Err("Invalid drop position".into());}
        if id==target {return Ok(());}
        let source=self.document.shapes.iter().find(|s|s.id==id&&s.page_id==self.document.active_page).ok_or("Layer not found")?;
        let destination=self.document.shapes.iter().find(|s|s.id==target&&s.page_id==self.document.active_page).ok_or("Drop target not found")?;
        if position=="inside" && destination.kind!="frame" {return Err("Drop inside a frame".into());}
        let parent=if position=="inside"{target}else{destination.parent_id};
        let moving:Vec<u32>=self.document.shapes.iter().filter(|s|s.id==id||(source.group_id>0&&s.group_id==source.group_id)).map(|s|s.id).collect();
        if moving.contains(&target) {return Ok(());}
        for start in moving.iter().copied().chain(std::iter::once(parent)) {
            let mut cursor=start;
            while cursor!=0 {let s=self.document.shapes.iter().find(|s|s.id==cursor).ok_or("Parent not found")?;if s.locked {return Err("Unlock the layer or its parent before moving it".into());}cursor=s.parent_id;}
        }
        let mut ancestor=parent;
        while ancestor!=0 {if moving.contains(&ancestor){return Err("Cannot move a frame inside itself".into());}ancestor=self.document.shapes.iter().find(|s|s.id==ancestor).unwrap().parent_id;}
        let mut document=self.document.clone();
        let mut moved:Vec<Shape>=document.shapes.iter().filter(|s|moving.contains(&s.id)).cloned().collect();
        for s in &mut moved {s.parent_id=parent;}
        document.shapes.retain(|s|!moving.contains(&s.id));
        let index=if position=="inside" {document.shapes.len()} else {
            let matches=|s:&Shape|s.id==target||(destination.group_id>0&&s.group_id==destination.group_id);
            if position=="before" {document.shapes.iter().rposition(matches).unwrap()+1} else {document.shapes.iter().position(matches).unwrap()}
        };
        document.shapes.splice(index..index,moved);
        if document==self.document{return Ok(());}
        self.commit(document)
    }
}
