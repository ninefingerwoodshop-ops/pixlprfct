# PixlPrfct

A browser-first design editor with a reusable Rust document engine compiled to WebAssembly. The editor now follows the structure and interaction conventions of the current Figma Design UI, while retaining the PixlPrfct name. This is an early, single-user prototype, not a complete Figma replacement.

## Run locally

Requires Rust with the `wasm32-unknown-unknown` target, a native C/C++ linker for Rust tests, and Node.js 22 or newer.

```sh
rustup target add wasm32-unknown-unknown
npm ci
npm run build
npm test
npm run dev
```

Open http://127.0.0.1:4173. Rebuild after source changes; the local server serves `dist/` without a bundler. The build uses wasm-pack's native ES-module `web` target (https://wasm-bindgen.github.io/wasm-pack/book/commands/build.html).

## First milestone

- Canvas pan/zoom, rectangles, ellipses, text, and visual frame backgrounds.
- Shape and pen menus with line, arrow, polygon, star, point-by-point pen, and freehand pencil tools. Drag to draw shapes; Shift constrains proportions or line angles, and Alt draws from the center. Vector color and stroke weight are editable, with normalized geometry that survives resizing, history, save/load, and PNG/SVG export.
- Multiple pages: create, rename, switch, and delete with undo. Each page has independent layers and an in-session pan/zoom position.
- Multi-selection, marquee selection, dragging, single-object corner resizing, arrow-key nudging, and axis-constrained movement while holding Shift.
- Align to selection bounds, distribute equal gaps, and batch fill, duplicate, delete, and move operations with one undo step per operation.
- Vertical navigation rail, resizable file sidebar, searchable layer list, compact properties inspector, and floating drawing toolbar.
- Layers, visibility, fill, position, dimensions, duplicate/delete, and layer order.
- Rust-backed hit testing, document validation, and 100-step undo/redo.
- Browser-local autosave, `.pixl` JSON save/load, and SVG export.
- Text controls for font family, size, weight, alignment, line spacing, wrapping, and fitting the box height to its content. Double-click canvas text to focus the content editor.
- An editable starter composition to explore immediately.

Shortcuts: V select, H pan, F frame, R rectangle, O ellipse, T text, Shift+1 fit page, Shift+2 fit selection, Space+drag pan, Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z redo, Ctrl/Cmd+D duplicate, Ctrl/Cmd+S save, Ctrl/Cmd+A select all visible objects on the page. Scroll pans; Ctrl/Cmd+scroll zooms. Shift-click toggles canvas objects, Shift-click selects a layer range in the sidebar, and Ctrl/Cmd-click toggles individual sidebar layers. Alt+A/D/W/S aligns the selection left/right/top/bottom. Click to place a shape, then resize it. Text content is edited in the inspector. The menu and Help rail button show shortcuts.

Drawing shortcuts: L line, Shift+L arrow, P pen, Shift+P pencil. Click pen anchors for corners or drag to create mirrored Bézier handles, then press Enter to finish an open path or click the first anchor to close it. Double-click a vector, press Enter with it selected, or use **Edit vector points** to drag its anchors and handles. Alt-drag an anchor to add handles; Enter exits editing. Escape cancels an unfinished drawing. Polygon and star are in the Shape tools menu. Clicking without dragging places a default-size shape.

Press K for Scale: drag from the lower-right of a selection or apply a percentage in the inspector. Scaling keeps the upper-left fixed and changes text sizes and vector stroke weights along with the geometry. Multi-layer scaling commits as one undo step. Values beyond document limits are rejected atomically. Scale follows the [Figma scale tool's proportional resizing behavior](https://help.figma.com/hc/en-us/articles/360040451453-Scale-layers-while-maintaining-proportions); alternate scale anchors are not implemented.

Group layers with Ctrl/Cmd+G and ungroup with Ctrl/Cmd+Shift+G. Expand or collapse a group in Layers, rename it in the inspector, and click a child row (or Ctrl/Cmd-click the canvas) to edit that child. Canvas selection, movement, nudging, scaling, duplication, and deletion act on the selected group members. Groups persist in `.pixl` files and local storage. Grouping makes a contiguous paint stack at the topmost selected member; undo restores the original order. Grouping existing groups merges their members into one flat group. Alignment/distribution of grouped selections is disabled until groups are ungrouped.

Remaining replacement work is tracked in `roadmap.json`; a feature deployment does not mean full Figma parity.

Ctrl/Cmd+C, X, and V copy, cut, and paste selected layers, including frame descendants, group relationships, embedded images, typography, appearance, constraints, and auto layout. The clipboard uses a versioned PixlPrfct JSON payload, so copies work across pages and PixlPrfct files/tabs with independent layer IDs. Selecting a frame makes it the paste destination; otherwise repeated pastes offset on the page. The file menu's **Paste over selection** places copied roots at the selected layer's position as siblings. Ctrl/Cmd+Shift+V also requests this when the host delivers the shortcut; some embedded browsers intercept it, so use the menu there. Plain text pasted onto the canvas becomes an editable text layer. Input fields retain their normal text clipboard behavior. External Figma/SVG clipboard formats, paste-to-replace, multi-frame paste, and viewport-aware placement remain pending.

In vector editing mode, double-click a segment to insert an anchor without changing the curve. Click an anchor to select it, use arrow keys to nudge (Shift for ten pixels), Delete to remove it, or the inspector's Make smooth/Make corner actions to change its handles. Each edit supports undo and persists in saved files/SVG. Closed paths retain at least three anchors and open paths at least two; exit vector editing before deleting a whole layer. Deleting an anchor reconnects the remaining neighbors using their existing handles, so it can change the curve.

Auto layout supports horizontal/vertical flow, gap, four padding values, cross-axis alignment, main-axis alignment/space-between, hug width/height, and child fill width/height. Select a frame and press Shift+A to enable it, or select sibling layers and press Shift+A to wrap them in a new layout frame. Set Flow to None to remove layout. Children reflow after insert/delete, resize, visibility changes, or reordering; drag inside a layout to change order. Ignore auto layout leaves a child positioned independently. Nested layouts resolve in the Rust engine and save/export with their computed geometry. As in [Figma's sizing rules](https://help.figma.com/hc/en-us/articles/360040451373-Guide-to-auto-layout-in-Figma), a fill child switches parent hugging off on the corresponding axis. Wrapping/grid, min/max sizing, and on-canvas spacing handles remain pending. Flat group members currently participate as individual layout children; use a nested frame to keep a composition together.

Appearance controls include layer opacity, a uniform corner radius for rectangles/frames/images, fill visibility, and an independent solid stroke color and weight. Frame opacity composites the frame and its descendants together; rounded frame clipping also applies to selection and SVG export. The Scale tool scales radii and enabled stroke weights. Strokes are currently centered, with round vector caps/joins; per-corner radii, multiple paints, stroke alignment/dashes, and effects remain pending.

Children of frames have independent horizontal and vertical constraints: left/top, right/bottom, center, both edges, or scale. Set these in the Constraints inspector, including for multiple selected children. Resizing a frame by its handles or dimensions updates nested children in one undo step, with a live drag preview. Both-edge stretching clamps at a one-pixel minimum when the frame becomes too small. The K Scale tool explicitly scales the entire subtree and bypasses resize constraints. Text box constraints do not scale font sizes. These modes follow [Figma's constraint behavior](https://help.figma.com/hc/en-us/articles/360039957734-Apply-constraints-to-define-how-layers-resize); layout grids and advanced auto-layout sizing remain pending.

Place PNG, JPEG, or WebP images with the toolbar image button or Ctrl/Cmd+Shift+K. You can also drop files onto the canvas or paste an image from the clipboard. The inspector supports fit, fill/crop, crop zoom and position, reset, and replacement. Images and crops persist in `.pixl` files and are embedded in SVG exports. Imports are resized to at most 2048 pixels on their longest side; encoded image data is limited to 2 MB per image and the complete document to 5 MB. Larger images may need compression before import. SVG import is not implemented yet.

## Architecture

`src/lib.rs` owns versioned documents, shapes, mutations, history, hit testing, and validation. It builds as both a native Rust library and a WASM module. The native library can later back a desktop application.

`web/app.js` adapts pointer and keyboard input to the Rust engine and draws the returned document using Canvas 2D. HTML/CSS supply the editor interface. Rendering and browser UI are currently JavaScript; this is not an all-Rust UI or GPU renderer.

`tests/wasm.test.mjs` exercises the compiled browser WASM bindings in Node; Rust unit tests cover history, loading, and hit testing. This does not replace visual or pointer-interaction testing in a real browser.

## Current limits

No accounts, cloud document sync, multiplayer, nested components/variants, nested groups, or `.fig` import. Vector path joining/splitting, Boolean operations, and pencil smoothing are not implemented. Polygon and star use fixed point counts. Paths support separate solid fill and stroke colors, round stroke caps/joins, and a 4096-point limit. Their selection bounds include control handles. Frames support nested parent relationships, movement with descendants, subtree duplication/deletion, inherited visibility, and expandable layer trees. Assign layers with Parent frame → Move into frame; choose Page to detach. Coordinates are currently page-relative. Frames have a Clip content toggle, respected by rendering, selection, and SVG export. New UI-created frames clip by default; old documents retain their previous overflow behavior. Drawing starts inside the frontmost visible frame at the initial pointer position. Dragging uses the moved selection’s center to choose a destination frame, with reparenting and movement in one undo step; direct drags of individual group members retain their parent. Multi-selection supports proportional scaling, but not independent width/height stretching. Marquee intersects bounding boxes; no deep selection of nested objects is available. Alignment targets the selection bounds, not a parent frame. Text supports one style per box and clips to the box, with a warning in the inspector. Fonts are limited to Manrope, DM Sans, Georgia, and the system monospace font. Manrope and DM Sans load from Google Fonts; system fallbacks apply when unavailable. SVG uses the same measured wrapping and alignment as the canvas, but still depends on fonts available in the viewing application (fonts are not embedded).

Interface references: [current navigation](https://help.figma.com/hc/en-us/articles/360039831974-Explore-the-navigation-bar-and-left-sidebar), [selection](https://help.figma.com/hc/en-us/articles/360040449873-Select-layers-and-objects), and [alignment and distribution](https://help.figma.com/hc/en-us/articles/360039956914-Adjust-alignment-rotation-position-and-dimensions). Unimplemented Figma features are not presented as functioning controls.

Local storage belongs to this browser and origin; use **Save file** for portable backups. Multiple tabs do not merge edits. The desktop application is not implemented yet.

Use **+ New page** in the Pages sidebar to start another canvas. Select a page and use **Rename** or **Delete page** below the list. At least one page must remain. On narrow screens the page picker and page controls appear above the canvas. Save files include every page; artwork export includes the current page or selected layers. Version 1 files and existing local designs automatically migrate to Page 1 in the version 2 format. Page navigation does not consume undo history; undo/redo of an edit returns to its saved active page.

## Hosting

The `dist/` output is a static website. Serve `.wasm` as `application/wasm`. No backend or secrets are required. Build with `npm run build` before uploading; generated `dist/` and `web/pkg/` are not committed.

Export opens a dialog for PNG or SVG, current page or selection, 0.25–8× scale, and transparent or solid backgrounds. Selection export includes selected frame descendants and their clipping/opacity, independently of unselected ancestors. PNG waits for embedded images and fonts, then uses the same compositing renderer as the canvas. PNG output is limited to 8192 pixels per edge and 16 megapixels; deeply nested translucent frames have an additional memory limit. SVG retains editable vectors and embedded images, but relies on available fonts. PDF, JPEG, slices, and batch export remain pending.

Text sizing supports Fixed size, Auto width (hard line breaks), and Auto height (wrap to the current width). New text uses Auto width; pasted plain text uses Auto height. Editing width switches Auto width to Auto height; editing height switches to Fixed size. Fill width inside auto layout switches Auto width to Auto height, and Fill height uses Fixed size. Browser font measurements feed the Rust layout transaction, so text edits, wrapping after parent resize, nested hug sizes, and undo stay together. Native consumers without a text measurement provider retain stored text dimensions. Existing files default to Fixed size.

Fill controls support solid, linear gradient, and radial gradient paints on shapes, frames, vectors, and text. Gradients have 2–16 stops, editable hex/color values, stop position and opacity, add/remove, and color reversal. Start/end coordinates are percentages of the layer bounds; radial start is the center and the distance to end controls radius in normalized bounds. Radial fills scale with the layer aspect ratio. They survive undo, copy/paste, scaling, save/load, PNG, and SVG. Canvas radial fills use cached tiles sized for the current drawing transform, bounded to 8192 pixels per edge and 16 megapixels; SVG retains vector gradients. Angular/diamond gradients, independent radial-axis editing, gradient strokes, and multiple fills remain pending.

Choose Edit gradient on canvas in Fill to drag square endpoints and circular color stops. Double-click the gradient line to insert an interpolated stop. Shift snaps endpoint directions to 45° and stop positions to 10% increments. Tab cycles handles while the canvas has focus; arrow keys nudge endpoints by 1 px or stops by 1%, with Shift for 10. Delete removes the selected stop while retaining at least two. Enter finishes editing; Escape cancels an active drag or exits edit mode. Each completed drag is one undo step.

Use the padlock beside a layer, Lock selection in the inspector, or Ctrl/Cmd+Shift+L to toggle locks. Locked frames lock descendants through inheritance; unlock the parent to restore canvas access. Canvas hit testing, marquee, select-all, dragging, resizing, scaling, nudging, and vector/gradient editing respect locks. Locked frames are excluded from automatic drawing/drop containment. Layers remain selectable and editable through the layer list and inspector, following [Figma’s documented locking behavior](https://help.figma.com/hc/en-us/articles/360041596573-Lock-and-unlock-layers). Explicit inspector edits, duplication, and clipboard actions remain available. Locked children move with an explicitly transformed unlocked parent. Locks persist in documents and history and do not hide content from exports. Flat groups currently lock through their selected member layers; true nested group containers remain pending.

Select a frame and choose **Create component** to make it reusable. **Insert instance**, or a component in the sidebar library, places a linked copy on the current page. Main-component edits propagate across pages, including added/removed layers, constraints, and auto layout. Instance edits preserve property overrides; **Reset all overrides** restores the main values while retaining placement, and **Detach instance** makes ordinary editable layers. **Go to main component** navigates to its page. Duplicate preserves links; portable clipboard copies deliberately detach links to avoid binding to unrelated IDs in another file. Removing a main component detaches its instances while retaining their last appearance; undo restores the links. Components currently require a frame; nested components, variants, swapping and library sharing remain pending. Overrides are tracked per shape field: typography and appearance each override as a whole object. Detach before adding/removing/reordering instance children.
