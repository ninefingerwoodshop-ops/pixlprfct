# Direct frames and auto layout comparison

Reference: [Figma comparison file](https://www.figma.com/design/AsBSQYyd3KZLGRi0QM1VPg), October 25, 2026. Fixtures were created with the live Plugin API; conversion and removal were performed with the actual editor shortcuts. Geometry and sizing modes were then read back from Figma.

| Experiment | Observed Figma behavior | Result |
| --- | --- | --- |
| Shift+A on two 100×40 rectangles, 30 apart horizontally, in reverse stacking order | Horizontal, gap 30, padding 0, Hug both axes, geometric order, no wrapper fill or clipping | Corrected |
| Shift+A on a vertical group with 100- and 60-wide children | Vertical, gap 30, fixed 100-wide frame, Hug height, full-width child fills while narrow child stays fixed | Corrected |
| Shift+A on a 300×200 frame with children at offsets 30,40 and 150,40 | Paired padding 30 horizontally and 40 vertically, gap 40, final size 260×120; preserves fill and clipping | Corrected |
| Shift+A on a single 100×40 rectangle | Transparent vertical wrapper at x−10,y−10, size 120×60; child fills width | Corrected |
| Shift+A on empty 300×200 frame | Retains 300×200, Hug both axes, gap/padding 10 | Corrected |
| Hide the final flow child | Empty layout retains the previous size | Corrected |
| Center two 80-wide children with gap 20 in a 100-wide frame, padding 10 | Relative x positions −40 and 60; End alignment gives −90 and 10 | Corrected |
| Space-between when children overflow | No negative automatic gap; x positions 10 and 90 | Confirmed in engine; corrected CSS renderer |
| Fill two nested layouts in a 400-wide row, one with 60 total horizontal padding | Outer widths 170 and 230 | Existing behavior confirmed |
| Frame constraints MIN/MAX/CENTER/STRETCH/SCALE on resize 300×200 → 500×400 | Fixed/pinned/centered/stretched/scaled geometry | Existing behavior confirmed with measured regression test |
| New frame | White fill, clipping enabled | Corrected clipping default; framing a selection still creates a transparent, non-clipping wrapper |
| Frame Selection on a group | Wraps the group, preserves nested structure | Existing behavior confirmed |
| Alt+Shift+A | Removes auto layout, preserves frame and child geometry | Added shortcut and action |
| Explicit width/height edits | Edited axis becomes Fixed | Corrected inspector and both canvas rendering modes |

Tests: `tests/figma-layout-parity.test.mjs`. CSS canvas and HTML export share the corrections for empty layouts, automatic spacing, negative main-axis gaps, and inside-stroke padding.

## Complex nested comparison — 2026-10-25

Direct Figma measurements used fixtures `8:2`, `8:13`, `10:2`, and `11:2` in the same reference file. Shift+A was invoked in the actual Figma UI for conversion; the plugin read the resulting geometry and measured subsequent resizing.

| Case | Figma result | Editor result |
| --- | --- | --- |
| Four 120×60 cells in a 340×220 frame, arranged as two columns and two rows | Fixed 2×2 grid, padding 20, column gap 40, row gap 60, fractional tracks, Fill cells become 130×60 | Corrected: previously collapsed into a single row |
| Two nested row groups in an outer group | Only outer group becomes vertical auto layout; row groups and descendants retain their hierarchy | Confirmed |
| 320-wide vertical parent, padding 20; Fill-width wrapped child, padding 10, gaps 12; three 120×40 grandchildren | Child 280×112, parent height 152 | Confirmed |
| Narrow parent to 220 | Child 180×164, parent height 204; three rows | Confirmed |
| Hide last grandchild while narrow | Child height 112, parent height 152 | Confirmed |
| Add another vertical ancestor with padding 20, gap 16, and a 30-high Fill-width footer | At width 360: height 238, footer y=188 relative to shell; at width 260: height 290, footer y=240 | Confirmed |
| Absolute 60×60 overlay at inner offset 250,−20 | Remains in place and does not enlarge any Hug ancestor | Confirmed |

Regression tests also cover grid resizing, geometric cell assignment independent of stacking order, save/reload, and atomic undo. Existing nested groups are deliberately preserved, matching the observed Figma behavior.

Conversion inference covers rows, columns, single objects, groups, existing frames, and aligned grids. The later irregular-arrangement comparison below extends this to unequal cells and missing cells. Arbitrary composition heuristics remain outside this measured parity claim.

The branch includes origin/main through `176e543`, including the newer sizing inspector and editable project export. The shared sizing helper is reused by the manual-resize fix.

## Irregular arrangements — direct Figma comparison

Figma UI Shift+A measurements in fixtures `14:2`–`14:22` and `17:2`:

- Unequal 2×2 cells at (20,20), (160,20), (20,120), (160,120) in a 360×240 frame become a fixed grid with equal fractional tracks, padding 20, gaps 50 horizontally and 60 vertically. Final cells are 135×70. Corrected inference previously required identical dimensions.
- An L-shaped arrangement with the bottom-right cell missing becomes a 2×2 grid with that cell empty. Padding 20, gaps 40, final cells 140×80. Corrected inference previously required a complete grid.
- Staggered horizontal items of heights 40,60,80 become top-aligned, gap 30; their vertical offsets are normalized. Corrected the previous unconditional center alignment.
- Three overlapping 100×60 items become a horizontal row with gap 0. Corrected inferred negative gaps; explicitly configured negative gaps remain supported.
- Uneven horizontal gaps of 20 and 80 become gap 50. Existing averaging confirmed.
- A second unequal-height grid with row origins 20 and 160 uses vertical gap 100, matching the shortest item in the preceding row.

These observations extend inference to sparse aligned grids and unequal cells. They are measured heuristics, not a claim that every arbitrary artwork composition will produce the same inference as Figma. The subsequent rotated-layer and overlapping-cluster comparison below extends this coverage.

Autosave verification: local project edits now persist synchronously on commit; an actual document-name edit survived a browser reload, then the original name was restored. Cloud recovery is mirrored to durable browser storage, with per-tab state retained, and a hidden tab flushes pending cloud saves. Unit tests cover reopening recovery, independent tabs, and quota failure. Cloud network synchronization still requires a signed-in cloud file.

## Rotated layers and overlapping 2D clusters — 2026-10-25

Direct comparison used Figma UI Shift+A and plugin measurements in fixtures `18:2`, `18:5`, `18:10`, and `18:14` in the reference file.

| Input | Measured Figma result | Correction |
| --- | --- | --- |
| Two 100×40 rectangles at +30° and −30°, origins (40,80) and (210,80), inside a 360×280 frame | Horizontal Hug frame 336.205×144.641, padding 40/30, gap 43; angles and local dimensions retained; origins become (40,80) and (209.603,30) | Added persistent rotation for fixed-size individual layers; layout uses transformed visual bounds, rendering and hit testing preserve the angle |
| Four overlapping 120×100 tiles at (20,20), (100,20), (20,80), (100,80) | Explicit one-column/four-row grid, frame grows to 360×520, cells 320×120; original children occupy rows 3,1,4,2 | Added collision-aware grid inference and frame growth |
| Three diagonal overlapping 120×100 tiles at (20,20), (90,80), (160,140) | Fixed 2×2 grid in 360×280 frame, gaps 0/20, cells 160×110; children occupy (column,row) (2,1),(1,1),(2,2) | Added explicit collision resolution; tie-to-even row assignment matches measured placement |
| A 240×180 rectangle containing two smaller rectangles | Outer frame becomes vertical 280×220, large child fills width; smaller children become absolute, retaining their positions | Exclude fully contained overlays from flow inference and Hug measurement |

Browser CSS rendering of the rotated pair matches Figma to within 0.003 pixels (browser layout rounding). The inspector's Rotation field edits individual layers; Canvas and SVG/HTML exports render their rotation. Group bounds and export bounds use the rotated extent. Regression coverage includes hit testing, grouping, save/reload, invalid-update atomicity, and undo.

Scope: these are measured inference heuristics for the listed cluster families, not a complete reproduction of Figma's proprietary algorithm for every arrangement. Rotation currently supports individual fixed-size layers. Rotating whole frames/groups and rotated Fill sizing are explicitly rejected rather than producing incorrect geometry. Existing container rotation was not supported before this change.
