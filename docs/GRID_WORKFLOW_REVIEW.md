# Grid workflow review — October 26, 2026

## Outcome

Walked through the editor on a separate **Grid walkthrough** page in the existing local document. Existing pages were not edited. The test page remains available to inspect; its outer frame is at the 769px breakpoint-preview width, with Restore width available for its original 555px width.

### Fixed during the review

- Drawing a new shape in unused space inside an occupied grid cell previously used automatic placement and could create an unexpected new row. Creation now uses the measured cell under the pointer, retaining named-area assignments and existing wrappers. Masonry retains automatic placement.
- Grid lines now stay visible while editing named areas, even when the pointer is over the inspector. Ordinary grid outlines still follow the hover behavior.
- The Grid CSS output uses the layer's actual generated/custom class rather than the generic `.grid` selector.
- Responsive status explains that visual controls edit base layout and the CSS editor edits breakpoint overrides.
- Updated one Grid export assertion to follow layer-derived CSS class names.

### Verified in the running editor

- Draw a custom frame and enable Grid Layout without altering Flex tools.
- Set columns and rows, draw a named area, rename it, and confirm the matching layer name changes.
- Add multiple items inside an area; they stack in the default vertical Flex wrapper.
- Switch a wrapper to nested Grid Layout and change its columns.
- Drag across the visual placement picker to change the span; the item fills the selected span and other automatic items reflow.
- Undo the span edit and retain the selected item and original placement.
- Edit CSS, add a media query, switch to Flex below 768px, and switch back to Grid above it.
- Restore the original preview width, then reload and confirm saved layout/media-query data remains.
- Drag a named area; use arrows to move it and Shift+arrow to resize it. Assigned contents remain attached.
- Delete an area without removing its wrapper/content; undo restores the area and selection.
- Drag an item between cell wrappers and reorder two items within a cell.
- Reproduce and retest the drawing-placement bug: a new shape now joins the intended existing cell without creating another wrapper/row.
- Inspect the generated CSS class and named-area track-size controls.

### Automated checks

- **125 focused tests passed:** Grid models, creation, wrapper placement, named-area lifecycle, reorder/delete, visual-picker gestures, resize feedback, area-track sizes, masonry, layout keyboard behavior, CSS/media queries, class names, and breakpoint restoration.
- Added regressions for creation into an occupied cell, wrapper reuse, vertical stacking, atomic undo/redo, named-area targeting, and preserving automatic masonry placement.
- `cargo test` passed (3 tests).
- JavaScript syntax checks passed for changed application modules; served editor assets refreshed.
- Broader JavaScript suite: **668/701 passed, 33 failed** before adding the final two creation regressions. These failures are not a clean whole-app result. Most concern component overrides, protection behavior, and older expectations; they require separate triage rather than indiscriminate assertion changes.

### Verification limits and follow-ups

- Masonry resize observation, export behavior, cancellation, and min/max feedback have automated coverage; this session did not manually exercise every branch of these interactions in the browser.
- This is not a full WCAG audit or cross-browser certification.
- Named-area track controls become lengthy when an area spans many minmax tracks. A future UX pass should make individual track settings collapsible while keeping measured sizes and limit feedback visible.
- Keep testing responsive overrides separately from base-layout editing. Changing a base control while an override is active can legitimately have no visible effect; the new hint makes this distinction explicit.

## Commands to repeat

```sh
node --test tests/grid*.test.mjs tests/masonry.test.mjs tests/layout-css.test.mjs tests/layout-keyboard.test.mjs tests/layout-class.test.mjs tests/breakpoint-preview.test.mjs
cargo test
node scripts/prepare-editor.mjs
```

## Broader-suite failures to triage separately

- swapping retains matched overrides and IDs, inherits the replacement, and is one undo step
- child constraints and instance dimensions are protected
- instance geometry respects constraints, placement, main-driven resizing, duplication and portable clipboard
- all offered blend modes persist and propagate, invalid modes reject atomically, overrides reset independently
- control types produce real native HTML with escaped labels and supported attributes
- corner arrays validate atomically, roundtrip, scale and support independent component overrides
- glass persists through save, undo, instances and independent overrides; rejects invalid blur
- CSS canvas preserves empty-frame dimensions and removes fixed gaps for automatic spacing
- resizing a group inside an instance keeps descendant geometry scaled through component synchronization
- Figma parity: nested frame constraints also survive group resizing in component instances
- Figma parity: enclosing frame constraints pass through nested groups
- guide styles and component overrides keep binding and values together
- inner kinds synchronize with components while instance effects remain independently overridable
- starter modes reflect behavior and preserve existing mode values
- blur component overrides reset independently and scale with geometry
- baseline alignment ignores vertical flow and component instances can override the toggle
- guide validation is atomic and component overrides retain independent guides
- component stacking overrides propagate independently and reset
- component instances preserve individual stroke inclusion overrides and reset them
- duplicate page preserves all layer properties and hierarchy with fresh IDs, and undoes atomically
- paint opacity component overrides preserve unrelated appearance changes
- component trigger overrides remain intact until reset
- component interaction collections inherit together, preserve overrides and reset together
- timer settings propagate through components and can be independently overridden as an interaction
- pushing text/styles updates the main and other instances, retains geometry and independent overrides, and undoes once
- shadow overrides are independent of opacity and scaling changes geometry without changing paint
- stroke positions persist, inherit and override independently with atomic validation
- stroke gradients preserve independent fill, component overrides and history
- endpoint paint persists, validates atomically and overrides each instance end independently
- stroke overrides preserve unrelated main edits and reset independently
- miter limit overrides reset independently of other component paints
- component instances inherit bindings, permit explicit overrides and duplicate in-document
- typography survives history and roundtrip; invalid updates are atomic

## October 27 follow-up — compact area tracks

Named-area tracks now have individual disclosures, with the sizing rule and live pixel measurement always visible. Limit warnings stay outside the disclosure so a collapsed track still explains why resizing stopped. Expansion survives edits and undo/redo for the same selected area. Native Enter/Space behavior works without entering the selected canvas group; navigation keys stay in the inspector.

Browser checks covered the saved four-track header area, minmax editing, and undo/redo. The temporary edit was undone. An isolated 240px panel using the production modules covered 12 columns, a collapsed maximum-limit warning, automatic reveal, manual-scroll pause, Resume, Option+R, and cleanup/restoration at drag end. No horizontal overflow was present. The fixture was removed after review. Actual canvas drag capture/cancellation and reduced-motion preference switching were not repeated manually.

The current full suite passes: **703 JavaScript tests and 3 Rust tests**. The broader-suite failures listed above describe the October 26 baseline, before the later instance-protection test fixes.

## October 27 follow-up — canvas resizing and cancellation

Tested a separate local document with bounded columns (160px, min 100/max 220; 140px, min 60/max 180), a 12px gap, and a bounded 100px row (min 60/max 160). The existing document was not edited.

Two sizing mismatches were reproduced and fixed:

- Bounded fixed tracks emitted `minmax(min,max)`, discarding the preferred size. A 312 × 100 area therefore rendered at 412 × 160, and canvas drags appeared stuck. Fixed, percent, and em tracks now emit `clamp(min,preferred,max)`. Layout CSS editing roundtrips these values and validates their bounds.
- Finite `minmax()` tracks stayed at content/minimum size in the engine while CSS grew them toward their maximum. The engine now distributes available space to their growth limits before allocating fractional tracks, following the [CSS Grid maximization step](https://www.w3.org/TR/css-grid-1/#algo-grow-tracks). This brings inspector values, preview geometry, and canvas size into agreement while preserving the original minmax rule.

Native browser drags verified horizontal-only resizing without a height change, corner resizing, the 412 × 160 maximum, the 172 × 60 minimum, and feedback cleanup after release. Ordinary cell resizing changed its span from one column to two and undid atomically. A mixed minmax/fixed scenario verified maximum and minimum feedback, intact minmax rules, and matching inspector/canvas dimensions.

Cancellation checks used native drags on the production canvas in a temporary diagnostic page. That page injected Escape, pointercancel, or window blur after a real drag preview; lost-capture testing called `releasePointerCapture` during the drag. Each restored dimensions and selection, left Undo/Redo availability unchanged, and cleared feedback and track-limit highlights. Escape was also triggered with active limit warnings, and Redo afterward restored the preceding committed resize. These are deterministic event-path checks, not an OS-level focus-switch test. The diagnostic page was removed.

Validation: **708 JavaScript tests and 3 Rust tests passed**, including new preferred-size/CSS roundtrip and finite-minmax allocation regressions. WASM rebuilt; served editor assets refreshed. Rust formatting and diff checks passed. Targeted ESLint reported no errors and five pre-existing unused-variable warnings in `grid-advanced.test.mjs`.

## October 28 follow-up — responsive Grid editing

Used the separate local test document with an original 600px frame width. Added a Grid override at `max-width: 500px`, another at `min-width: 701px`, and an overlapping switch to vertical Flex at `max-width: 320px`.

Fixed three related issues:

- Named-area track measurements and dimensions used engine/base geometry while the CSS canvas showed the active query. Measurements now refresh after browser layout; editable track inputs retain the base value. For example, a 210px base column correctly reports 110px on canvas under the small-screen override. At a Flex breakpoint, track measurements say “Not in active Grid”.
- Selecting a child hid its parent’s responsive context. The inspector now shows the nearest responsive ancestor, its active query and breakpoint controls, plus which frame’s Layout CSS to edit. Restoring width remains available with the child selected.
- Overlapping Grid-to-Flex queries froze the canvas because rendering applied the media cascade twice. CSS generation and measured geometry now share the same resolved scene.

Browser verification used real keyboard input to commit track values and normal inspector controls. Edited the base column from 160px to 180px on the parent, then to 210px from the named area while the 90px override remained active. Edited that override to 110px through Layout CSS; live preview, Cancel, and Apply all behaved correctly. Switched repeatedly across 500/501px, 700/701px and 320/321px, verifying CSS tracks, inspector measurements, active-query status, and selected layer. No scripted interruption fixture was needed.

Reloaded while previewing, restored the original 600px width from the selected child, then verified Undo/Redo and Restore all. Base and media-query edits survived; restoration cleared the stored preview baseline. The test document finished at its original width. The existing Launch concept document was not edited.

Validation: **713 JavaScript tests and 3 Rust tests passed**. Added regressions for preserving base inputs, Flex measurement cleanup, inherited query context, a shared responsive scene, and the edit/switch/reload/restore lifecycle. Targeted ESLint had no errors (13 existing warnings in `app.js`); diff checks passed and served assets were refreshed. Cross-browser testing, query-driven area/track-count changes, and responsive exports remain separate follow-ups.

## October 28 follow-up — responsive column counts and named areas

Tested the isolated local document with two base columns, a one-column layout at 500px, three columns at 701px, and omitted areas at 320px. Added a second named area and changed the base column count from two to three while the one-column query was active. Switching to 501px showed the new base column; the query continued to render one column. The original Launch concept document was not edited.

Fixed the failures found in this pass:

- Active Grid measurements previously reused base placements. A two-column area moved to one column on row 2 still reported its old row/span and a removed column as 0px. Measured CSS placement now follows active named-area definitions and automatic placement. The inspector shows active occupied tracks separately from stable base controls; absent tracks say “Not present at this breakpoint”.
- Omitting an area retained its saved explicit span, creating an unwanted implicit second column at 320px. Rendering now auto-places omitted-area contents in one cell while preserving the document’s binding, layer identity and nested content. Returning to a matching template restores the binding.
- Renaming an area left old names in media templates, detaching the renamed layer at those widths. The engine now updates whole area tokens in every breakpoint template in the same undo step, preserves similarly named areas, and rejects collisions with names used only in responsive templates.
- Canvas area editing combined base area definitions with active tracks. Drawing is now unavailable when a matching query overrides areas or changes track counts, with guidance to edit Layout CSS or switch to a base-layout width. Switching into an overridden structure exits area drawing. Size-only overrides with unchanged track counts remain eligible.

Native browser checks verified both named areas across 500/501px, 700/701px and 320/321px, plus the renamed layer’s placement, reload persistence, original-width restoration to 600px and Undo/Redo. The test document finished at 600px with its new base column and rename intact. Automated regressions also cover retained nested children, aligned automatic placements, atomic rename/collision rejection, and save/restore history.

Validation: **722 JavaScript tests and 3 Rust tests passed**. WASM rebuilt and served assets refreshed. Rust formatting and diff checks passed; targeted ESLint reported no errors and the same 13 existing warnings in `app.js`. Responsive export parity and cross-browser testing remain unverified.
