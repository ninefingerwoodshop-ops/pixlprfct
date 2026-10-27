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
