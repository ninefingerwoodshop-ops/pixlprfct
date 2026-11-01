# Pen workspace proposal

Updated November 1, 2026. **Planning only; implementation has not started.**

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
- Provide an Illustrator-style Pen/Pencil tool set with working vector editing,
  rather than a single path creation button. Preserve PixlPrfct branding and the
  Figma dark interface foundation. Document paint remains independent of theme.

## Proposed tool inventory

| Tool | Intended behavior | Scope status |
| --- | --- | --- |
| Pen | Click for corners, drag for Bézier handles; finish open paths, close paths, and continue endpoints | Priority requested |
| Direct Selection | Select, move and nudge anchors and handles independently | Accepted candidate |
| Add/Delete Anchor | Add an anchor while preserving the curve; remove selected anchors with predictable geometry | Accepted candidate |
| Convert Anchor | Switch corner/smooth behavior; separate or reconnect handles | Accepted candidate |
| Split/Join | Cut at an anchor, open a closed path, and join compatible endpoints | Proposed detail of the Pen tool set |
| Pencil | Draw editable freehand paths with adjustable smoothing | Accepted candidate; first-release inclusion to discuss |
| Smooth | Refine an existing path without redrawing the whole object | Proposed detail; exact gesture to discuss |
| Brush | Expressive strokes, potentially including pressure, width and presets | Accepted candidate; behavior and release scope not set |

Fill and stroke colors are explicitly requested. Fill/stroke none, opacity,
stroke width, caps and joins should follow the shared paint model; decide which
appear directly in this compact toolbar and which stay in the inspector.

## Acceptance criteria for a future implementation

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

## Decisions before development

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

These are open design decisions, not implementation commitments or dates.
