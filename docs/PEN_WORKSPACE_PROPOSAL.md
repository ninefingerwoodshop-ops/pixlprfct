# Pen workspace proposal

Updated November 2, 2026. **Drawing foundation shipped in alpha.21; arbitrary
segment insertion, group anchor actions, whole-subpath removal, smoothing and multi-object selection are verified
in local source only.**

The owner authorized roadmap development after the planning pass. Pen, core
Direct Selection, and the movable palette are now implemented in local source.
[Usage and verification](SVG_ANIMATION.md#2026-11-01--pen-and-base-path-editing-local-source)
record the delivered scope. The original proposal and remaining candidates below
are retained; dated delivery records below supersede their earlier remainders. This does not mark the entire drawing foundation complete.

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
| Smooth | Refine an existing path without redrawing the whole object | Local whole-path reduction with 0–100% amount and Smooth path in the Path inspector; closed seams/endpoints, compact-curve no-ops and one Undo |
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


## 2026-11-02 — Bulk Smooth, Corner and Delete (local source)

The existing Pen tools now apply Smooth, Corner and Delete to all selected
anchors across subpaths in one base-path element. Tooltips/accessibility labels
identify a group selection. Each successful action is one document history entry;
selected groups remain selected after Smooth/Corner. Deletion uses original
indexes, preserves surviving handles/mirroring metadata and selects a nearby
survivor in each affected subpath. Every subpath must retain two anchors; an
invalid request rejects the entire action without changing selection or history.
Delete/Backspace acts on anchors while Direct Selection owns canvas focus; fields,
read-only documents, Join mode, active drags and timed Morph paths are guarded.

Five new browser workflows and three model tests cover open/closed subpaths,
metadata, atomic validation, shortcuts, Undo/Redo, animation isolation, native
reopening and SVG export. Evidence: `.local/svg-bulk-anchors/smoothed.png` and
`live-preview.png`. Live Figma selected-anchor controls and Vector commands were
inspected; its destructive operations were not executed on user artwork. This
extends the existing local Smooth/Corner/Delete semantics, not a verified match
to every reference deletion/healing behavior. Local only, not alpha.21.

Next bounded vector scope: lasso anchor selection. Bulk insertion/mirroring,
removing entire subpaths, and multi-object editing remain open.


## 2026-11-02 — Lasso anchor selection (local source)

In Edit base path, Lasso in Pen tools selects anchors inside a freeform outline
across subpaths of the current element. The closing edge is implicit; concave
and crossing regions use the drawn shape rather than its bounding rectangle.
Highlights update during the gesture. Shift extends the group, Escape restores
it, and Direct Selection (A) returns to box selection without losing the group.
The selected anchors support existing group movement and bulk actions.
Selection never edits artwork or adds Undo history. Cancellation, read-only
leases, timed Morph paths and Join-target mode retain the existing protections.

Live Figma's Lasso control and non-area trace behavior were inspected first.
The 62 × 24px control, 16px icon, label, radius and active color follow that
reference; full freeform reference gestures and transient fill were not captured.
Six browser workflows and three geometry tests cover the local behavior.
Evidence: `.local/svg-lasso/{tracing,live-preview,figma-lasso-control}.png`.
This completes the earlier lasso remainder locally, not in alpha.21 downloads.
Next bounded vector step: bulk handle mirroring. Bulk insertion, whole-subpath
removal and multi-object editing remain open.


## 2026-11-02 — Bulk handle mirroring (local source)

The existing Path inspector Mirroring control now applies independent, angle-only
or angle-and-length modes to selected curved interior anchors across subpaths.
Mixed modes leave all three segments unselected, with a keyboard entry point on
No mirroring. Group edits keep the selected anchors and make one Undo entry.
Each anchor's outgoing handle drives group alignment; a collapsed outgoing handle
falls back to its incoming handle. Single-anchor edits retain the selected-handle
behavior. Angle-only keeps the opposite length; independent mode preserves the
curve. Any ineligible anchor or out-of-range result rejects the entire action.

The 184 × 24px inspector control and icon arrangement are unchanged. Live Figma
multi-anchor inspector layout was inspected read-only; automatic approval review
blocked applying a reference mode because it could alter persisted artwork.
Reference group geometry and mixed-state equivalence therefore remain unverified.
Five browser workflows and three model tests cover local behavior, including
native reopening, export, animation isolation, keyboard/focus and detached panels.
Evidence: `.local/svg-bulk-mirroring/{mixed,symmetric,live-preview}.png`.
This completes bulk mirroring locally, not in alpha.21. Next bounded vector step:
bulk midpoint insertion. Whole-subpath removal and multi-object editing remain open.


## 2026-11-02 — Bulk midpoint insertion (local source)

Add midpoints after selected anchors extends the existing midpoint action to a
group within one base-path element. It subdivides each selected anchor’s following
segment at t=0.5, including adjacent segments and closed seams, without changing
the cubic curves. Original indexes are resolved before insertion; new midpoints
become the selection, with a single Undo entry. Other subpaths, transforms,
appearance and animation tracks stay intact. Any open final endpoint, stale
address or result over 512 total anchors rejects the entire operation. Active
node/selection drags, Join, timed Morph and read-only editing remain guarded.

Four model tests verify all original curves, selection ordering/deduplication,
mirroring metadata and atomic endpoint/limit rejection. Four browser workflows
verify group insertion, persistence/export, Undo/Redo, selection and gesture guards;
existing group tests cover Join, leases and Morph. Undo also repairs the active
anchor when a newly inserted point disappears, so Split/Continue/Join address the
surviving selection. Live Figma’s vector toolbar and
Vector menu were inspected read-only; no equivalent bulk midpoint command was
identified. The existing local control retains its layout and icon with a plural
label. This is a PixlPrfct extension, not a claim of reference workflow parity.
Evidence: `.local/svg-bulk-insertion/{inserted,live-preview}.png`.

This closes the earlier bulk-insertion remainder locally, not in alpha.21.
Next bounded vector step: whole-subpath removal. Multi-object editing and
joining independently animated or referenced paths remain open.


## 2026-11-02 — Whole-subpath removal (local source)

Select every anchor in an open or closed subpath with Shift-click, box or Lasso,
then use the existing Delete control or Delete/Backspace. Complete subpaths are
removed; partial deletions must retain at least two anchors. Mixed requests are
validated before any change, so a one-anchor remainder rejects the entire edit.
Surviving subpaths keep their cubic geometry, order and mirroring metadata; the
SVG element keeps its identity, paint/transform attributes, tracks and origins.
Selection indexes remap to surviving subpaths for continued keyboard editing.

Removing every subpath uses the existing element-deletion lifecycle, cleaning its
tracks/origin without saving empty geometry. Other elements and their animation
remain intact. Each operation has one Undo; Redo, native reopening and SVG export
preserve the result. Join, active gestures, read-only leases and timed Morph paths
retain their existing guards. Five new browser workflows and four model tests
cover these cases alongside the existing bulk-action restriction tests.

Live Figma's vector toolbar and Edit > Delete entry were inspected read-only.
The existing local control is reused; reference deletion geometry was not changed
or verified, so no exact workflow/pixel parity is claimed. Evidence:
`.local/svg-subpath-removal/{figma-vector-reference,live-preview}.png`.
This supersedes the earlier whole-subpath-removal remainder. Local source only,
not alpha.21. Next bounded vector step: smoothing existing paths. Multi-object
editing and joining independently animated/referenced paths remain open.


## 2026-11-02 — Smoothing existing paths (local source)

The Path inspector now provides a session-only **Smoothing %** setting and an
explicit **Smooth path** action. It refines every subpath in the selected base
path, including when only some anchors are selected. The amount alone changes
no artwork. Zero strength and already-compact contours are no-ops; each successful
pass has one Undo. Native reopening, animated SVG export and detached inspectors
retain the result and share history.

The model samples actual cubic segments in screen space, then reuses Pencil's
point reduction and corner/handle policy. Closed rings reduce both sides of a
fixed seam, retain non-collinear area, and fit seam handles cyclically. Open
endpoints stay fixed. A pass only replaces contours when it reduces their anchor
count; existing economical cubic geometry/metadata is retained exactly. Retained
sharp turns stay corners; smooth fitted points receive angle-mirroring metadata.
Paint/transform attributes, element identity, animation tracks and origins persist.

Invalid values, non-invertible transforms, excessive sampling or out-of-range
results reject the entire pass. Join, drawing/anchor/selection/object gestures,
playback, read-only leases and timed Morph remain guarded. Amount cancellation
and invalid fields write no artwork; a completed pass resets anchor selection to
the first surviving anchor and restores the action's keyboard focus.

Six model tests plus the four shared Pencil tests verify geometry/reduction,
cubic shape, closed seams, endpoints, transforms, no-ops and atomic failures.
Six browser workflows cover the controls, guards, history, native reopening,
clean export and detached Inspector. Evidence:
`.local/svg-path-smoothing/{smoothed,live-preview}.png`.
This closes whole-path smoothing locally, not in alpha.21. Interactive brush
smoothing and full reference Simplify semantics are separate scope. Next bounded
vector step: multi-object selection; duplication and grouping follow separately.


## 2026-11-02 — Multi-object selection (local source)

SVG object selection now supports Shift-click toggles, box selection from blank
canvas or workspace, Shift extension, and Command/Ctrl deep boxes for nested
non-group elements. Elements supports Shift ranges and Command/Ctrl toggles,
including keyboard activation, filtered lists and detached panels. Select All
works from canvas/layers; Escape and blank clicks clear. A selected object's
Shift-drag still constrains its existing single-object movement.

Selection is transient and never enters document history, saves or exports.
Ancestor/descendant choices are exclusive. Transformed geometry bounds determine
box intersections; hidden, fully transparent and out-of-viewport elements are
excluded from box/Select All. Default boxes select roots/groups. Escape, capture
loss, blur and document/time/mode changes cancel unfinished boxes.

Individual and aggregate blue outlines accompany an “N selected” inspector
heading. Single-object property controls are hidden for a group to avoid editing
an arbitrary last item. Batch move/resize/rotation, paint editing and deletion,
duplication and grouping remain open. No full Figma multi-selection inspector or
transform parity is claimed; masks/clips are not used for exact painted hit areas.

Six browser workflows and four model tests cover modifiers, nesting, transformed
bounds, history neutrality, keyboard scope, cancellation, read-only files,
export/reopening and detached Elements. Existing movement and anchor-selection
regressions cover Shift-drag and box/Lasso isolation. Evidence:
`.local/svg-object-selection/{live-preview,figma-restored}.png`.
Local source only, not alpha.21. Next bounded vector step: duplication.
