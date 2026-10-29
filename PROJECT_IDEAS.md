# PixlPrfct — saved direction and next steps

Saved October 28, 2026. This is a continuation note, not a claim that every historical request is implemented or verified. Check the current code and UI before starting any item below.

## Latest review

See [Grid workflow review](docs/GRID_WORKFLOW_REVIEW.md) for the hands-on walkthrough, canvas resize fixes, and current passing test results. A separate **Grid walkthrough** page is saved in the local editor document.

## Where we stopped

Responsive Grid editing now has a full browser pass: base-track edits under an active query, editing the override itself, switching boundaries, overlapping Grid-to-Flex queries, and restoring the original width after reload with Undo/Redo. Named-area measurements use the active browser layout while inputs retain base values. Children show their responsive parent’s status and breakpoint/restore controls. The canvas now resolves the media cascade once, fixing a freeze when overlapping queries switched Grid to Flex.

The next responsive pass covered changing column counts and multiple named areas. Active area placement and occupied-track measurements now follow the rendered breakpoint, while base editing controls keep their meaning. Omitted areas auto-place without creating stale implicit columns, retaining their saved bindings and children. Renaming an area updates every breakpoint template atomically and rejects collisions with names used only by a breakpoint. Canvas area drawing directs users to Layout CSS when the active query overrides area definitions or track counts; switching into such a query exits drawing mode.

Named-area track settings now use compact disclosures. Each collapsed track keeps its row/column name, CSS sizing rule, measured pixel size, and active limit warning visible. Expand individual tracks to edit their units and min/max settings. Open state survives edits and undo/redo for the same selected area; changing selection resets the track disclosures. Enter and Space toggle a track, and navigation keys do not leak into canvas editing.

Relevant files:
- `web/grid-controls.js` — named-area track disclosures and keyboard handling.
- `web/editor.css` — compact track summaries, focus rings, and existing resize notices.
- `web/grid-area-track-values.js` — live measurements remain visible in collapsed summaries.
- `web/grid-resize-feedback.js` — existing limits, automatic reveal, and pause/resume behavior.

Verified in the real editor: four-track named area, expanding/collapsing with keyboard, editing a minmax minimum, and undo/redo while retaining expansion. The existing document was restored after the temporary edit. In an isolated 240px inspector using the same modules, verified a 12-column layout, collapsed-track limit feedback, automatic reveal, manual scroll pause, Resume, Option+R, and end-of-drag cleanup without horizontal overflow. A later canvas pass verified real resize drags, bounded fixed/minmax tracks, ordinary cell spans, and deterministic Escape/pointercancel/lost-capture/blur event paths. Dimensions, selection, history, and limit cleanup were preserved on cancellation; the review documents the event-injection method.

Bounded fixed/percent/em tracks now preserve their preferred size using CSS clamp(). Finite minmax tracks now grow toward their limits in the engine, matching CSS canvas geometry. Relevant additions: `web/grid-model.js`, `web/layout-css.js`, `src/grid.rs`, and regression tests.

All 722 JavaScript tests and 3 Rust tests pass. WASM rebuilt and served assets refreshed. No commit or deployment is implied by this note.

## Immediate follow-up ideas

1. Extend canvas coverage to responsive minmax units, intrinsic/content sizing, and OS-level focus switching during a drag. The bounded resize and deterministic interruption paths now pass.
2. Verify responsive exports and cross-browser behavior. Canvas tests now cover query-driven track counts/named areas, rename, omission/reappearance, base edits under active overrides, reload and width restoration.
3. Check track disclosure behavior when parent tracks are reordered/deleted. Moving named areas between breakpoint tracks now has a separate active readout and stable base controls.
4. Keep prioritizing complete user workflows over isolated tooltip refinements. The old broader-suite failures in the October 26 review are historical; the current baseline is clean.

## Product direction to preserve

- Build a real design-system authoring tool, initially within one project view; expand to a larger shareable system later.
- Reuse shared inputs, custom dropdowns, color controls, tooltips, icons, typography, spacing, and states. Avoid inventing one-off UI for each feature.
- Progressive disclosure: section labels on the left, enabling checkboxes on the right; hide dependent settings when the feature is off.
- Use PixlPrfct icons by default. Add missing icons to the library instead of substituting unrelated symbols. Blue is the brand accent; main-component identification is purple and instances blue.
- Accessibility is a requirement: visible controls, keyboard support, usable focus, readable contrast, reduced motion, and predictable focus restoration. Do not claim full WCAG compliance from a small test pass.

## Grid and Flex direction

- Keep **Flex Layout** and **Grid Layout** as separate sections with their existing tools. A container uses one layout type, but can nest the other.
- Preserve cell/named-area wrappers. Default their contents to vertical Flex Layout with editable gap; allow switching them to Grid Layout with the existing tools.
- Preserve wrappers when enabling masonry. Automatic placement should use the shortest column and respond to content-height changes.
- Keep explicit row/column placement and spans, visual picker, live canvas preview, insertion indicators, and drag/reorder behavior coherent with the wrapper model.
- Named-area layer names and assigned items should stay synchronized through renaming, moving, resizing, deletion, undo, and redo. Deleting an area should preserve item cell placement.
- Width/height edits on named-area layers should synchronize with parent tracks. Respect minmax constraints rather than replacing them with fixed pixels.
- Keep area track sizes editable without selecting the parent: px, fr, percent, auto, and minmax. Make limiting tracks easy to identify on the canvas and in the inspector.
- Keyboard editing must preserve selection, keep the area visible, and never leak shortcuts from focused text fields or scrollable tooltips into canvas actions.
- Keep handwritten Grid/Flex CSS, autoformatting, live preview, visual controls, unique editable layer-derived class names, and media queries synchronized.
- Responsive previews should show the active query, support jumping to breakpoints, and preserve original widths across pages/reloads with individual and all-frame restore actions.

## Components, starters, and variables

- Starters should be real controls with editable appearance and behavior, suitable for turning into a reusable design system.
- Main-component contents remain editable; instances inherit changes immediately and protect shared appearance while exposing permitted content/state and width options.
- Shared base variables define common control styling and behavior. New starters inherit defaults; one-off changes are explicit overrides with reset-to-default support.
- Deleted variable bindings should revert to inheritance. Required borders inherit default borders unless explicitly overridden. Icon color and label color are independent.
- Keep related variable rows together. Checkbox size is one square-size variable; include label gap. Use appropriate font-family and available font-weight dropdowns.
- Control height should derive from settings/content (Hug); width supports Hug, fixed, full/fill, and permitted min/max settings.
- Dropdown/calendar panels overlay helper and validation text rather than being pushed below it.
- Continue auditing starter coverage: text input, dropdown/multiselect, checkbox, switch, button, radio group, date picker, text area, upload, number input, password, segmented control. Verify actual completeness before choosing the next starter.

## Other retained directions

- Assets should preview actual project components and insert their linked instances, with clear accessible menus.
- Device chrome is optional on selected top-level frames and in prototype preview. Automatic mode can switch phone/tablet/desktop by configurable widths, with Apple/Android families, portrait/landscape, active-device feedback, and reset defaults of 600/1024.
- A Development area should support reusable behavior snippets and custom JavaScript, with honest limits around framework export. Do not promise arbitrary React/Vue/Angular code can be automatically translated between frameworks.
- The separate free icon/font library is at `https://github.com/ninefingerwoodshop-ops/pixlprfct_icons`; its public gallery is `https://ninefingerwoodshop-ops.github.io/pixlprfct_icons/`. Preserve the chosen Unbound brand mark and extend coherent weight variants and website/software icon coverage.

## Working notes for resuming

- Project root: `/Users/jgibbens/pixlprfct`.
- Editor: `http://127.0.0.1:5173/editor/index.html`.
- Source UI is in `web`; refresh served assets with `node scripts/prepare-editor.mjs`.
- Rust/WASM changes require `npm run build:editor` before refreshing assets.
- Preserve existing unrelated working-tree changes. Inspect status/diffs before committing.
- Start with the immediate visual verification above, then prioritize complete user workflows over additional isolated tooltip refinements.
