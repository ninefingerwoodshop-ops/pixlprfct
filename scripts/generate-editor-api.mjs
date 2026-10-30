import {readFile,writeFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
// Keep agent discovery tied to the actual compiled engine, rather than a second API.
const types=await readFile(new URL('web/pkg/pixlprfct_core.d.ts',root),'utf8');
const excluded=new Set(['free','clear_history','load','set_write_guard','set_text_measurer','refresh_text_layout','undo','redo','snapshot']);
const readOnly=new Set(['copy_layers','can_redo','can_undo','grid_layout','hit_test','prototype_hit_test','prototype_hits','prototype_pointer_hits','preview_update_many','preview_layout_update','preview_grid_drop']);
const jsonNames=new Set(['json','selection','variables','placements']);
const notes={
 add:'Create a layer with engine defaults. Prefer build/create to set properties in one undo step.',
 insert:'Insert a complete Shape. ID and page are assigned by the engine. Prefer build/create for partial properties.',
 update:'Replace one complete Shape. Prefer build/update for a partial deep patch.',
 update_many:'Replace complete Shapes on the active page. Layout and component propagation run automatically.',
 update_across_pages:'Replace complete Shapes on any page.',
 move_into:'Pass an array of complete Shapes with desired world coordinates, then destination parent ID (0 = root).',
 move_into_before:'Like move_into; before is a sibling ID, or 0 to append.',
 move_into_cells:'Array of complete Shapes, grid parent ID, and array of placements. Inspect grid_layout first.',
 reparent_many:'Array of layer IDs and destination parent ID. Coordinates are document/world coordinates.',
 save_variables:'Replace the Variables object containing collections and values. Read existing definitions first.',
 bind_variable:'Bind a variable to a property path; variable 0 detaches it. Paths include fill, text, typography.font_size, and paint stack colors.',
 select_page:'Change the active page; returns no value.',
 save_text_style:'Create/update TextStyle {id,name,description?,typography}. ID 0 creates. layer_id 0 saves without binding; otherwise applies across pages. Shares family, size, weight and line height, preserving alignment, wrapping and sizing.',
 apply_text_style:'Apply a text style to text layer IDs across pages. style_id 0 detaches, retaining typography.',
 remove_text_style:'Delete a text style and detach linked layers without changing their appearance.',
 bind_shadow_color:'Bind a color variable to a shadow by zero-based index. variable 0 detaches. Binding travels with the shadow when reordered. For reusable styles, set effects.shadows[index].color_variable in save_effect_style.',
 save_effect_style:'Create or update an EffectStyle {id,name,description?,effects}. ID 0 creates; layer_id 0 saves without binding. Updates propagate to all linked layers across pages. Effects contains shadows, layer_blur, backdrop_blur and their enabled/present flags; other appearance is preserved.',
 apply_effect_style:'Apply a saved effect style to selected layer IDs. style_id 0 detaches, preserving current effects. Component instances inherit from the main component.',
 remove_effect_style:'Delete a saved effect style and detach all linked layers, preserving their current effects. Undoable.',
 save_guide_style:'Save a GuideStyle; frame_id 0 does not apply it to a frame.',
 set_component_property:'Set a component property. json is the structured property value, not an encoded string.',
 combine_variants:'Combine at least two sibling main component IDs into a component set with a visible container. Parses Property=Value pairs (including multiple comma-separated properties). Returns its frame ID. One undo step.',
 save_component_set:'Save a ComponentSet definition. Sibling main components receive a visible container automatically; legacy cross-page definitions remain logical sets.',
 set_variant_property:'On a main component, edit its property value; on an instance, switch to the closest matching variant. Unknown properties and duplicate combinations fail atomically.',
 add_variant:'Add a variant to a main component or component-set frame. Creates the set automatically for a standalone main. Returns the new main component ID. One undo step.',
 create_component:'Turn a layer subtree into a main component.',
 create_instance:'Create an instance of a main component, including descendants.',
 place_instance:'Create an instance inside parent (0 = page root).',
 paste_layers:'Portable clipboard object from copy_layers, x/y offsets, and parent ID.',
 copy_layers:'Array of layer IDs. Returns the portable clipboard object.',
 duplicate_many_offset:'Array of layer IDs and explicit x/y translation. Use 0,0 to duplicate in place; hierarchy, variable bindings and exposed component properties are preserved. Flow children remain governed by auto layout. duplicate and duplicate_many retain the interactive +24/+24 offset.',
 group_many:'Array of sibling IDs. Returns the new group ID.',
 auto_layout_selection:'Array of layer IDs. Infers a Flex layout and returns its frame ID.',
 drop_layers:'Array of layer IDs, destination layer ID, and position before/after/inside.',
 arrange_many:'Array of layer IDs and front/back/forward/backward.',
 align_many:'Array of layer IDs and left/center/right/top/middle/bottom.',
 distribute_many:'Array of layer IDs and horizontal/vertical.',
 shift_grid_track:'Grid frame ID, columns/rows, zero-based index, and -1 or 1.',
 move_grid_track:'Grid frame ID, columns/rows, zero-based source index, and insertion boundary before (track count appends). Connected spans move together in one undo step.',
 delete_grid_track:'Grid frame ID, columns/rows, zero-based index.',
};
const commands=[...types.slice(0,types.indexOf('export type InitInput')).matchAll(/^    (\w+)\(([^)]*)\): (\w+);$/gm)].filter(([,name])=>!excluded.has(name)).map(([,name,args,returns])=>({name,readOnly:readOnly.has(name),description:notes[name]??name.replaceAll('_',' '),args:args?args.split(', ').map(part=>{const [name,type]=part.split(': ');return {name,type:jsonNames.has(name)?'json':type};}):[],returns}));
const models={};
for(const file of (await readdir(new URL('src/',root))).filter(name=>name.endsWith('.rs')).sort()){
 const source=await readFile(new URL('src/'+file,root),'utf8');
 for(const match of source.matchAll(/pub (struct|enum) (\w+)\s*\{/g)){
  if(['Editor'].includes(match[2]))continue;
  let end=match.index+match[0].length,depth=1;while(end<source.length&&depth){if(source[end]==='{')depth++;else if(source[end]==='}')depth--;end++;}
  const attributes=source.slice(0,match.index).match(/(?:#\[[^\n]+\]\n)*$/)?.[0]??'';
  const declaration=attributes+source.slice(match.index,end);
  // These are exact Rust/serde declarations, with field attributes retained.
  models[match[2]]={file:'src/'+file,kind:match[1],declaration};
 }
}
const output='// Generated by scripts/generate-editor-api.mjs. Do not edit by hand.\nexport const engineCommands='+JSON.stringify(commands,null,2)+';\nexport const modelReference='+JSON.stringify(models,null,2)+';\n';
const target=new URL('web/editor-api.js',root);
if(process.argv.includes('--check')){if(await readFile(target,'utf8')!==output)throw new Error('Editor API catalog is stale. Run npm run mcp:catalog after building the engine.');}
else await writeFile(target,output);
console.error(`Editor API: ${commands.length} commands, ${Object.keys(models).length} model definitions (${fileURLToPath(target)}).`);
