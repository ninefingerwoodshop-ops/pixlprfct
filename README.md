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
- Shape and pen menus with line, arrow, polygon, star, point-by-point pen, and freehand pencil tools. Drag to draw shapes; Shift constrains proportions or line angles, and Alt draws from the center. Vector color and stroke weight are editable, with normalized geometry that survives resizing, history, save/load, and SVG export.
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

Drawing shortcuts: L line, Shift+L arrow, P pen, Shift+P pencil. Click pen anchors, then press Enter to finish an open path or click the first anchor to close it. Escape cancels an unfinished drawing. Polygon and star are in the Shape tools menu. Clicking without dragging places a default-size shape.

## Architecture

`src/lib.rs` owns versioned documents, shapes, mutations, history, hit testing, and validation. It builds as both a native Rust library and a WASM module. The native library can later back a desktop application.

`web/app.js` adapts pointer and keyboard input to the Rust engine and draws the returned document using Canvas 2D. HTML/CSS supply the editor interface. Rendering and browser UI are currently JavaScript; this is not an all-Rust UI or GPU renderer.

`tests/wasm.test.mjs` exercises the compiled browser WASM bindings in Node; Rust unit tests cover history, loading, and hit testing. This does not replace visual or pointer-interaction testing in a real browser.

## Current limits

No accounts, cloud document sync, multiplayer, components, auto layout, groups, image import, or `.fig` import. Pen currently creates straight segments; Bézier handles, vector point editing, Boolean operations, and pencil smoothing are not implemented. Polygon and star use fixed point counts. Paths have one paint color, a round stroke, and a 4096-point limit. Frames are background shapes, not containers: parent/child selection and moving frame contents are not implemented yet. Multi-selection supports movement and alignment, but not collective resizing. Marquee intersects bounding boxes; no deep selection of nested objects is available. Alignment targets the selection bounds, not a parent frame. Text supports one style per box and clips to the box, with a warning in the inspector. Fonts are limited to Manrope, DM Sans, Georgia, and the system monospace font. Manrope and DM Sans load from Google Fonts; system fallbacks apply when unavailable. SVG uses the same measured wrapping and alignment as the canvas, but still depends on fonts available in the viewing application (fonts are not embedded).

Interface references: [current navigation](https://help.figma.com/hc/en-us/articles/360039831974-Explore-the-navigation-bar-and-left-sidebar), [selection](https://help.figma.com/hc/en-us/articles/360040449873-Select-layers-and-objects), and [alignment and distribution](https://help.figma.com/hc/en-us/articles/360039956914-Adjust-alignment-rotation-position-and-dimensions). Unimplemented Figma features are not presented as functioning controls.

Local storage belongs to this browser and origin; use **Save file** for portable backups. Multiple tabs do not merge edits. The desktop application is not implemented yet.

Use **+ New page** in the Pages sidebar to start another canvas. Select a page and use **Rename** or **Delete page** below the list. At least one page must remain. On narrow screens the page picker and page controls appear above the canvas. Save files include every page; SVG export includes only the current page. Version 1 files and existing local designs automatically migrate to Page 1 in the version 2 format. Page navigation does not consume undo history; undo/redo of an edit returns to its saved active page.

## Hosting

The `dist/` output is a static website. Serve `.wasm` as `application/wasm`. No backend or secrets are required. Build with `npm run build` before uploading; generated `dist/` and `web/pkg/` are not committed.
