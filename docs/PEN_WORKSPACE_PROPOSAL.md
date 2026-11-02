# Pen workspace proposal

Updated November 2, 2026. **Drawing foundation shipped in alpha.21; arbitrary
segment anchor insertion and handle mirroring are verified in local source only.**

The owner authorized roadmap development after the planning pass. Pen, core
Direct Selection, and the movable palette are now implemented in local source.
[Usage and verification](SVG_ANIMATION.md#2026-11-01--pen-and-base-path-editing-local-source)
record the delivered scope. The original proposal and remaining candidates below
are retained; this does not mark the entire drawing foundation complete.

Second batch verified locally: object-body dragging, keyboard movement and the
explicit Add/Replace SVG import workflow. Multi-object selection, duplication and
group construction remain open. See the [movement/import delivery record](SVG_ANIMATION.md#2026-11-01--object-movement-and-addreplace-import-local-source).

Third batch: Pencil with adjustable freehand smoothing, Shift-constrained lines,
round stroke ends, editable cubic handles and one-step undo. This reuses Design's
smoothing model; whole-path smoothing of existing artwork and Brush remain open.
See the [Pencil delivery record](SVG_ANIMATION.md#2026-11-01--pencil-and-freehand-smoothing-local-source).

Fourth batch: split/open paths and join endpoints within one SVG element. The
owner's preview feedback also adds visible **Finish path** guidance and path
deletion from the keyboard, inspector and palette. Open Pen paths work as motion
routes. Joining separate elements and multi-object selection remain open.
See the [split/join delivery record](SVG_ANIMATION.md#2026-11-01--splitjoin-and-open-path-workflows-local-source).

Fifth batch: actual stroke/next-segment previews, stage selection near thin strokes,
and Escape/Select completion of open paths. Every SVG inspector section, Elements,
Timeline and Pen tools can now open in independent windows outside the editor.
The owner explicitly chose separate windows. The next local batch adds Design
integration, cursor-connected dragging, saved window bounds, right-docked Pen
tools, and the compact SVG icon rail. Grouped docking remains open. See
[panel delivery](DETACHABLE_PANELS.md). See the latest [delivery record](SVG_ANIMATION.md#2026-11-01--live-strokes-stage-selection-and-separate-panels-local-source).

This records the product owner's requested Pen/Pencil experience for the
[public roadmap](https://ninefingerwoodshop-ops.github.io/pixlprfct/roadmap.html).
The initial gap is in SVG Animation. Design already has Pen, Pencil and anchor
editing; reuse that foundation where possible. Whether the new floating toolbar
also ships in Design in the first release remains a scope decision.

## Requested interaction

- Selecting Pen uses the tool's pen icon as the canvas cursor. The nib is the
  drawing hotspot; selecting another tool restores that tool's cursor.
- Selecting Pen opens a toolbar floating on the right side of the workspace.
  Match the existing bottom floating toolbar's visual treatment, density, icons,
  selection states and controls. This is a requested extension of the familiar
  interface; it does not replace the right inspector.
- The toolbar can be dragged around the workspace. Keep it reachable after
  resizing the window and provide a keyboard-accessible way to reposition or
  reset it. Its placement must not become artwork or create document undo steps.
- Include stroke and fill color pickers in the floating toolbar. The existing
  right inspector continues to control both. Every edit must immediately agree
  across the toolbar, inspector and canvas, with one shared selection and undo
  history. Use the application's shared color/input controls.
- Provide a complete Pen/Pencil tool set with working vector editing,
  rather than a single path creation button. Preserve PixlPrfct branding and the
  existing dark interface foundation. Document paint remains independent of theme.

## Proposed tool inventory

| Tool | Intended behavior | Scope status |
| --- | --- | --- |
| Pen | Click for corners, drag for Bézier handles; finish open paths, close paths, and continue endpoints | Implemented locally: corners/cubics, open/closed paths, both endpoints |
| Direct Selection | Select, move and nudge anchors and handles independently | Implemented locally for ordinary path geometry |
| Add/Delete Anchor | Add an anchor while preserving the curve; remove selected anchors with predictable geometry | Midpoint insertion/deletion in alpha.21; arbitrary segment double-click insertion verified locally (November 2) |
| Convert Anchor | Switch corner/smooth behavior; separate or reconnect handles | Corner/smooth conversion; independent, angle-only and angle-and-length mirroring verified locally (November 2) |
| Split/Join | Cut at an anchor, open a closed path, and join compatible endpoints | Implemented locally within and across compatible SVG path elements; independent animation/references remain guarded |
| Pencil | Draw editable freehand paths with adjustable smoothing | Implemented locally; 0–100% smoothing, Shift constraint, round ends and editable cubic handles |
| Smooth | Refine an existing path without redrawing the whole object | Proposed detail; exact gesture to discuss |
| Brush | Expressive strokes, potentially including pressure, width and presets | Accepted candidate; behavior and release scope not set |

Fill and stroke colors are explicitly requested. Fill/stroke none, opacity,
stroke width, caps and joins should follow the shared paint model; decide which
appear directly in this compact toolbar and which stay in the inspector.

## Acceptance criteria

1. Inspect and record live reference UI before changing equivalent editor
   workflows. Compare the floating toolbar against the actual existing toolbelt;
   use the user-requested right-side extension without inventing a new theme.
2. Pen selection exposes the correct cursor and toolbar. Switching among its
   editing tools changes both behavior and the selected tool indicator.
3. Stroke/fill edits in either surface immediately update the other surface and
   the selected artwork. With no path selected, drawing defaults are clear and
   the next path uses them; no invisible selection mutation occurs.
4. Dragging the toolbar never draws on or moves artwork. Window resizing cannot
   strand it offscreen. Focus and keyboard access remain usable.
5. Basic drawing and node editing work on transformed paths at different zoom
   levels. Escape cancels unfinished gestures; undo/redo restores one completed
   edit at a time. Save/reopen and SVG export preserve the resulting geometry.
6. Base-path editing and morph-keyframe editing remain distinct. A user must not
   accidentally create animation when intending to edit the original drawing.
7. Read-only files and SVG editing leases remain enforced. No unavailable tool
   is presented as finished functionality.

## Original scope questions

- Agree on the first usable tool set: Pen and anchor editing alone, or Pencil
  and smoothing in the same release.
- Decide whether the floating toolbar stays open when switching to Selection,
  how it is dismissed/reopened, and whether its position is remembered per user.
- Decide whether movement is limited to the canvas or may overlap the editor
  panels, while keeping the timeline and essential controls accessible.
- Define Brush behavior with example artwork: uniform strokes, pressure-based
  width, artistic brushes, or a staged subset.
- Agree on how base-path changes affect existing morph and motion-path tracks.
- Choose SVG-first delivery or a shared toolbar rollout to both workspaces.

These were open at proposal time. The first-delivery decisions below resolve the
implemented subset; remaining candidates have no delivery commitment or date.

## First delivery decisions — 2026-11-01

- SVG Animation first. Design's existing tools are unchanged. Pen and core anchor
  editing were delivered together; Pencil followed in the third batch and
  split/join within one element in the fourth. Joining separate elements and
  whole-path smoothing remain open. Brush behavior is still undecided.
- Finish an open Pen path with Enter or **Finish path**; clicking its first anchor
  closes it. Delete a selected path with Delete/Backspace from the canvas or layer
  list, or use the inspector/palette trash action. Each deletion is undoable.
- Pen/Direct Selection opens the palette. V, Select element, Close, or leaving
  drawing for playback/timeline/morph editing dismisses it. Escape cancels an
  active gesture; otherwise it finishes a valid open path and leaves drawing mode.
  Use Discard unfinished path to abandon a draft.
- Palette movement stays inside the canvas workspace. Drag its grip, use arrows
  (Shift: 10px), or Home to reset. Position lasts for this editor session and is
  clamped on resize; it is not document content or history.
- The palette and inspector share solid paint, none, opacity and stroke weight.
  No selection means drawing defaults. Existing paint animators edit the current
  keyframe; without an animator these controls edit the source artwork. Editing a
  solid color replaces any imported gradient on that paint.
- Base-path edits retain animation tracks and transform origins. Paths with a
  Morph animator require the existing timed-node editor or removal of that
  animator before ordinary editing. Assigned motion routes remain captured
  snapshots; reassign the route to pick up later path changes.
- Supported geometry: path elements, up to 512 anchors and 64 subpaths, bounded
  coordinates. Shape-to-path conversion, vector networks, multi-node selection,
  handle mirroring and exhaustive pixel parity remain open.

## Arbitrary segment insertion — 2026-11-02 (local source)

Direct Selection now accepts a double-click anywhere along a selected base path
to insert an anchor without altering its curve. It uses the Design editor's
existing segment-picking approach in screen coordinates, including SVG groups,
rotation, nonuniform scaling and zoom. Near-anchor clicks retain ordinary anchor
editing; the palette's midpoint command remains the keyboard-accessible option.
Nine drawing browser checks and 13 drawing/topology model checks pass, including
Undo/Redo, reopening, export, closing segments and edit permissions. This does
not close multi-node selection, joining separate elements or handle mirroring.

## Handle mirroring — 2026-11-02 (local source)

The next batch closes base-path handle mirroring: the right Path inspector uses
the live Figma reference's three-option control, with independent handles,
preserved opposite length, or symmetric handles. It supports pointer and keyboard
editing, Undo/Redo, native reopening, topology changes and detached Inspector
windows. Curved interior/closed-path anchors are supported; corners require
Smooth anchor first, and open endpoints are disabled. Morph animation keeps its
separate editor. SVG exports retain geometry without editor-only mode metadata.

Five new browser scenarios and 46 related browser regressions pass, alongside
18 model checks. The owner's bottom toolbar request is also implemented in both
editors: Drawing tools stays expanded, including migrated saved layouts, while
tear-out and docking remain available. See the [delivery record](SVG_ANIMATION.md#2026-11-02--handle-mirroring-and-an-expanded-toolbelt-local-source).
This supersedes the historical mirroring-open notes above; multi-node selection,
separate-element joining and full Figma parity remain open. Not yet released.

Toolbar clarification (2026-11-02, local): the main Drawing tools bar now moves
within each editor instead of opening a separate window. This supersedes the
previous tear-out statement for that bar. Other parent panels retain their
window behavior; see [the current toolbar record](DETACHABLE_PANELS.md#main-toolbar-moves-within-the-editor--2026-11-02-local-correction).

## Group anchor movement — 2026-11-02 (local source)

Completed the next bounded step: Shift-click or Shift+Enter adds/removes anchors
within one base-path element; drag any selected anchor or use arrows (Shift for
10 units) to move the group and its handles. Transforms, mirroring metadata,
existing animation, Undo/Redo, native reopening and SVG export are preserved.
Escape cancels a drag. Selecting a handle or another element clears the group.
Single-anchor operations are disabled for groups; marquee/lasso selection, bulk
anchor operations, multi-object selection and joining separate elements remain
open. Verified with three browser scenarios and two model tests; see
[the delivery record](SVG_ANIMATION.md#2026-11-02--group-anchor-movement-local-source).
Not in the alpha.21 download. Next vector scope: joining separate path elements.

## Joining separate path elements — 2026-11-02 (local source)

The next vector step now works through the existing Join endpoints control:
select an open endpoint, activate Join, then click or keyboard-activate an endpoint
on another path. All of that target's subpaths transfer into the starting path's
coordinates; its appearance, ID and stacking position are retained. Existing
curves/handles stay in place, a gap receives a straight bridge, and coincident ends
merge. The target element is removed in the same undoable change.

Shared parent animation remains intact. Paths with independent animation on
either path or an exclusive ancestor, targets referenced by other artwork, and
collapsed transforms are rejected without edits. These limitations remain open;
no implicit animation baking or reference rewriting is claimed. Existing
within-element joining still supports the previously documented animation scope.
Native reopening, export, Undo/Redo, Escape and read-only protection are verified.
Next bounded vector step: marquee anchor selection within one base-path element.


## 2026-11-02 — Marquee anchor selection (local source)

Direct Selection now supports dragging a rectangular selection from either the
artboard or surrounding canvas. It selects enclosed anchors across subpaths of
one base-path element, with live highlights; Shift adds to the existing group.
The resulting group supports existing transformed dragging and keyboard nudging.
Escape, pointer cancellation, lost capture, blur, zoom and document/mode changes
cancel the gesture. Selection never changes the document or enters Undo history.
Join-target mode, timed Morph paths and read-only documents cannot start it.

Five browser scenarios cover the new interactions. Live Figma box selection and
selected-anchor appearance were inspected before implementation; transient box
opacity and Shift-box equivalence were not independently measured. Evidence:
`.local/svg-marquee/{marquee,live-preview,figma-anchor-selection}.png`.
Not in alpha.21 downloads. Next bounded vector scope: bulk anchor operations;
lasso selection and multi-object editing remain open.
