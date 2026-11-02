# SVG Animation

This separate design type is available from **Projects → New design → SVG
Animation** in the repository source and the [Windows v0.1.1-alpha.21
preview](https://github.com/ninefingerwoodshop-ops/pixlprfct/releases/tag/v0.1.1-alpha.21).
It does not replace Design or its existing Motion mode. Grouped timeline editing
was merged in PR #37; group easing and precise selection timing followed in
PRs #39 and #40. Animation reuse and reversal followed in PRs #42 and #43.
Duplication and playhead/keyframe snapping followed in PRs #45 and #46.
All are included in alpha.18; alpha.19 adds keyframe navigation and the Pause
repair from PRs #48 and #49. Alpha.20 adds canvas stretch and rotation handles
from PR #51. Alpha.21 includes Pen/Pencil drawing, open strokes, anchor editing,
stage selection, Add/Replace import, detachable parent panels and independent
fill/stroke gradient animation. The dated local-source notes below record their
development; the alpha.21 release notes record package verification. The older Windows
v0.1.0-alpha.1 download does not include this workspace.

## Core workflow

1. Import a static `.svg` file (or drop it on the canvas). **Try an example**
   provides an orbit animation; the toolbar also adds rectangles and ellipses.
2. Select an SVG element in the canvas or Elements list. Use **Add animator** in
   the right inspector to create a property track.
3. Set the current time and change the property value. The diamond adds or removes
   a keyframe at that time. Position X/Y, rotation, scale X/Y, opacity, fill color,
   stroke color, stroke width, and stroke dash offset are supported.
4. Select a keyframe to choose Linear, Ease, Ease in, Ease out, or Ease in and out.
   For a custom Bézier curve, drag either handle in the right inspector or enter
   X1/Y1/X2/Y2 values. Focused handles accept arrow keys (Shift: larger steps).
   Escape cancels a drag; undo restores the previous curve. Easing belongs to the
   segment from that keyframe toward the next keyframe.
5. Scrub the time ruler, drag diamonds, or use playback. Space toggles playback;
   arrow keys move selected keyframes by 10 ms (Shift: 100 ms), and Delete removes
   them. Undo/redo applies to document edits. Duration changes cannot discard keys.
6. **Export** previews the actual generated SVG. Choose animated or static output,
   playback trigger, and repeat behavior, then download the file. **Static SVG**
   exports the first frame. **Save settings** stores export behavior without downloading.

Transform origins can be entered or centered on the source element. Position is
an offset from imported geometry; scales multiply the imported geometry. The
original transforms and hierarchy remain inside animation wrappers. Canvas fit,
zoom, timeline zoom, timeline resize/collapse, and loop/once playback work.

The timeline's Play/Pause button pauses at the current time; Play resumes from
that position. **Go to start** stops playback and returns to 0 ms. Windows
alpha.19 keeps Pause reliably clickable across animation frames and updates
its tooltip with the playback state. Earlier alpha.18 packages lack this fix.

## Canvas resize and rotation handles

Select an element on the canvas or in Elements to show its blue selection box.
Four square corner handles resize both dimensions; dragging any edge stretches
just that dimension. Drag just outside a corner, where the rotation cursor
appears, to rotate around the current selection center. The size label updates
while dragging.

- **Shift + resize** keeps the current proportions.
- **Alt/Option + resize** keeps the center fixed. Combine with Shift for uniform
  scaling from the center.
- **Shift + rotate** snaps the animation rotation to 15° increments.
- Focus a resize handle and use arrow keys to resize by one SVG unit; Shift uses
  ten. Focus a rotation handle and use arrows for 1°; Shift uses 15°.
- **Escape**, pointer cancellation, loss of pointer capture, or leaving the
  window cancels a drag. Seeking, changing selection, or losing the editing
  lease also cancels it. Clicking without moving creates no keyframe.

Dragging pauses playback. Releasing a changed handle writes the affected scale,
position and/or rotation keys at the current playhead as one undo step; position
keys keep the opposite edge/corner or center anchored. Existing key easing is
preserved. Previewing a drag does not save intermediate document states. Handles
hide while editing morph nodes and are disabled in read-only shared files.

These controls use the animator's existing parent-space transform properties,
including imported groups, nested transforms, motion paths and zoom. Imported
geometry, hierarchy and stored animation origins remain intact. For an element
with its own imported rotation or skew, the box encloses that geometry in the
animation's parent axes; it is not an exact oriented-box reconstruction of every
SVG affine transform. Scales retain the current positive range, 0.001–100;
dragging past an opposite edge stops at the minimum rather than flipping.

Canvas transform handles are included in **Windows v0.1.1-alpha.20**. Earlier
alpha.19 packages contain navigation and the Pause repair, but not these handles.

## Selecting, moving and copying keyframes

Click a diamond to select it. Shift, Cmd or Ctrl-click toggles other diamonds in
the selection, including keys on different property tracks and elements. Drag a
box through the tracks to select a group; hold a modifier to add to the selection.
Click a property label to select its keys, or an element label to select all of
its tracks. Cmd/Ctrl+A selects every key while the timeline has focus. Escape
clears the selection, or cancels an active drag.

Drag any selected diamond to move the whole group. Arrow keys move it by 10 ms,
or 100 ms with Shift. Hold Shift while dragging to align the grabbed diamond
with the playhead, unselected keys on any track, or the animation endpoints.
A dashed blue guide marks the target within 6 screen pixels at any timeline zoom.
Away from a valid target, Shift uses 100 ms intervals. Hold Alt to bypass snapping;
ordinary dragging stays free. Set the playhead before dragging to align to it.
Holding Shift before grabbing an already selected diamond keeps the whole group.
The group keeps its relative spacing and stops together at the beginning/end of
the animation. Snapping skips targets that would cause any selected key to collide
on its own track. Releasing a free or grid move on an occupied time still rejects
the whole move. Escape cancels the drag without adding an undo step.
Double-clicking empty space on a property row still adds a key there.

Playhead/keyframe snapping is included in Windows v0.1.1-alpha.18. The earlier
alpha.17 download uses only the 100 ms Shift grid.

Cmd/Ctrl+C copies the selection. Move the playhead with the ruler or **Current
time**, then Cmd/Ctrl+V pastes the earliest copied key at that time, preserving
all offsets, values and easing. Paste restores a deleted track and its motion
path metadata when needed. It rejects occupied times, out-of-range keys,
incompatible morph geometry and document limits without partial changes.
Delete/Backspace removes the selected keys. Each group edit is one undo step.
Right-click the timeline (or Shift+F10) for Copy, Paste, Duplicate, Reverse,
Delete and Select all.

The clipboard belongs to this open project tab. Ordinary Paste targets the
original elements/properties, including selections across multiple elements.
The clipboard is cleared on reload or changes to the source SVG; it does not
support cross-project copying. Read-only shared files allow selection and
copying but block moves, pastes and deletions.

## Jumping between keyframes

Included in Windows v0.1.1-alpha.19, following the PR #48 merge. Earlier alpha.18
packages do not include keyframe navigation.

With the timeline or time ruler focused, press **Alt/Option+Left** for the
previous keyframe or **Alt/Option+Right** for the next. The same actions appear
at the bottom of the timeline's right-click menu. The shortcuts also work while
that menu is open. Navigation visits the nearest distinct time across all tracks,
skips keys at the current time, and stops at the first or last key without wrapping.
Unavailable menu actions are disabled, including both actions on an empty timeline.

A successful jump pauses playback and scrolls horizontally to reveal the playhead
when necessary. It preserves the selected keys, selected element, clipboard and
undo history, and works in read-only shared files. It does not change the saved
animation. Shortcuts are scoped to the timeline and do not interrupt text/number
entry or an active pointer drag. Ordinary arrows still move selected keys, or
scrub by 10 ms (100 ms with Shift) when the ruler has focus.

## Duplicating at the playhead

Included in Windows v0.1.1-alpha.18. The earlier alpha.17 download does not
include this command.

Select keys on one or more tracks, then move **Current time** to the start of
the new sequence. Right-click the timeline and choose **Duplicate keyframes**,
or press Cmd/Ctrl+D while the timeline has focus. The earliest selected key
lands at the playhead; the other keys retain their relative offsets, values and
easing on their original tracks. A single key can be duplicated too.

The new keys remain selected, the playhead stays at the chosen time, and the
whole duplication is one undo step. Existing keys, origins and motion routes
stay intact. Duplicate does not replace the timeline clipboard, so a previously
copied selection remains available for Paste or Paste to selected element.

An occupied time on any affected track, a key beyond the animation duration,
or a document limit rejects the entire operation. Move the playhead or extend
the animation first; the command does not overwrite existing keys or extend
the duration automatically. Empty selections and read-only files disable it.
Duplicated animation persists in native `.pixl` files and SVG exports.

## Reusing animation on another element

Included in Windows v0.1.1-alpha.17. The earlier alpha.16 download does not
include this command.

Select keys from one element and copy them. Select a destination in the Elements
list or canvas, set **Current time**, then right-click the timeline and choose
**Paste to selected element**. With the timeline focused, Cmd/Ctrl+Shift+V does
the same thing. Ordinary Cmd/Ctrl+V continues to paste onto the original tracks.

Several property tracks from the same source element can be copied together.
The earliest copied key lands at the playhead; all other timing offsets, values,
and easing are retained. Missing property tracks are created on the destination,
and the new keys remain selected. The whole paste is one undo step.

The source animation and destination's existing keys stay intact. Paste retains
the destination's own transform origin, or initializes it to the center of its
source geometry if it has none. Values are copied literally: position remains an
offset from the destination's imported geometry, and scale remains a multiplier.
The command does not match the source element's size or position automatically.

An occupied time on a destination property, a key beyond the animation duration,
or a document limit rejects the entire paste. Copying from several source
elements is ambiguous for this command and is rejected. Morph and motion-path
keys can be pasted only onto their original element; copy transform or appearance
keys to reuse animation on a different element. No geometry or route is copied.

## Easing a selection

Included in Windows v0.1.1-alpha.16. The earlier alpha.15 download edits one
key's easing at a time.

Select keys across one or more tracks, then use **Keyframe easing** in the right
inspector. A preset, numeric Bézier edit, or handle edit applies to every selected
key without changing its time or value. Each committed edit is one undo step.
Equivalent preset/custom curves share one editor. Different curves show **Mixed**;
choose a preset or **Custom** before editing a common curve. Custom starts with
the active key's curve. The inspector shows the number of affected keys.

Easing applies from each key toward its next key on the same track. A final key
can store easing, but it has no outgoing segment until another key follows it.
**Delete selected keyframes** removes the whole selection in one undo step.
Escape cancels a curve drag; undo or a changed selection prevents an old drag
from overwriting newer work. Read-only files show disabled curve controls.
The curves remain in native `.pixl` saves and animated SVG exports.
Editing an individual property value or adding an animator clears the grouped
selection and returns the inspector to that single key.

## Timing a selection

Included in Windows v0.1.1-alpha.16. The earlier alpha.15 download does not
include selection timing controls.

Select timeline keys and use **Keyframe timing** in the right inspector.
**Start (ms)** moves the selection's earliest key to an exact time, keeping its
spacing. **Duration (ms)** stretches or compresses the selection from its earliest
key, preserving proportional spacing across tracks and elements. For example,
keys at 0, 1000 and 3000 ms become 0, 500 and 1500 ms when their duration is 1500 ms.
The animation's overall duration stays unchanged; extend it first to make more room.

Values, easing curves, motion paths, and morph geometry stay with their keys.
Unselected keys stay in place. Times round to the nearest whole millisecond. If
rounding or moving would overlap keys on the same track, the entire edit is
rejected. Keys at one shared time can move together, but their Duration field is
disabled because there is no span to scale.

Enter or leaving a field commits one undo step; Escape restores its previous
value. The selection follows the changed times, and the playhead follows its
active key. Read-only files disable both fields. Timing persists in `.pixl` saves
and exported SVG. Selection timing does not add timeline stretch handles or
change the existing group-drag gesture.

## Reversing keyframes

Included in Windows v0.1.1-alpha.17. The earlier alpha.16 download does not
include this command.

Select a sequence in the timeline, right-click, and choose **Reverse keyframes**.
Shift+F10 opens the same menu with the keyboard. The command mirrors every
selected time between the selection's earliest and latest key, using one shared
range across all selected tracks. For example, values at 0, 900 and 3000 ms move
to 3000, 2100 and 0 ms. Overall animation duration stays unchanged.

Values stay with their keys. Each reversed segment also gets the reversed easing
curve: Ease in becomes Ease out, and custom Bézier curves are reflected in both
axes. The curve remains attached to the segment it controls, rather than simply
moving with the old starting key. The outgoing curve at the end of the selected
range is retained. The new keys remain selected, the playhead follows the active
key, and the whole edit is one undo step.

Transforms, appearance, morph geometry, and motion-path progress are supported.
Origins, routes, unselected tracks, and keys outside the selected range remain
unchanged. Include every key within that range on each affected track; if an
interior key is omitted, the entire reversal is rejected without overwriting it.
The command is disabled for read-only files and selections at a single time.
Reversed animation persists in `.pixl` saves and exported SVG.

## Motion paths

Select the element to animate, then choose an existing shape in the inspector's
**Motion path** dropdown. Paths, lines, polylines, polygons, rectangles, circles,
and ellipses can provide the route. A route must be continuous and have a nonzero
length; it cannot be the target or a descendant of the target.

Assignment creates a **Path progress (%)** track from 0% to 100% over the current
duration. Add or edit progress keys to change timing, hold position, or travel
backward. Choose **Keep orientation**, **Auto rotate**, or **Auto rotate · reverse**.
The element's transform origin follows the route; regular transform and appearance
tracks can animate alongside it. A dashed guide shows the selected element's route.

The route is a snapshot of the unanimated source geometry and transforms when assigned.
Deleting or changing the source afterward does not change the animation. Select
the source again in the dropdown to recapture it. Replacing a route retains its
progress keys, easing, orientation, and existing origin. **No motion path** removes
only the progress track. Native `.pixl` files retain the route and custom curves;
animated SVG export uses `animateMotion`, `keyPoints`, and `keySplines` without
including the editor guide.

## Path morphing

Select a path or geometric shape and choose **Add animator → Morph** or
**Morph → Edit nodes**. Move the playhead, then drag an anchor or Bézier handle
on the canvas. Each completed edit creates or updates the shape keyframe at that
time. The initial track holds the original shape at the start and end of the
animation. Edit the end key too if the shape should stay changed.

The right inspector provides X/Y fields for the selected anchor and its incoming
and outgoing handles. Moving an anchor carries both handles with it. Handles
move independently. Arrow keys move a focused node or handle by one local SVG
unit, or ten with Shift. Escape cancels a drag without adding history; undo/redo
records each completed drag as one edit. **Done editing nodes** hides the overlay.
Scrubbing, easing, retiming, deleting keys, native files, and export work with
morph tracks as they do with other properties.

Rectangles, rounded rectangles, circles, ellipses, lines, polylines, and polygons
are rendered as cubic paths when morphing. Their paint, IDs, and transforms are
retained, and removing the morph track restores the source geometry. Compound
paths are supported. Every key must retain the same node count, subpath order,
and open/closed state. This pass does not add/remove nodes, match unrelated
shapes automatically, select multiple nodes, or convert text and groups to paths.
Each morph supports up to 512 nodes across 64 subpaths. Native SVG export uses
`animate` on `d` with consistent cubic commands; the editor overlay is excluded.

## Interactive export

The export dialog previews the same SVG that will be downloaded. Choose **On load**,
**On hover**, or **On click**. Hover can pause, reset, reverse, or continue when the
pointer leaves. A second click can pause/resume, restart, reverse, or continue.
Repeat can be once or loop; reverse playback stops at the first frame. Keyboard
focus supports hover playback, and Enter/Space activate click animations.

On-load exports use script-free native SVG animation. Interactive exports include
a small self-contained player with no network dependencies. Embed interactive SVG
inline or with an `<object>`; browsers disable its scripts in `<img>` elements and
CSS backgrounds. Static exports contain neither animation nor scripts.

Changes in this dialog are temporary until **Save settings** or **Download SVG**.
Cancel discards them. Settings are saved in `.pixl` files and support undo/redo.
Read-only shared documents can preview and download temporary export settings
without changing the saved project. Preview runs in an opaque sandboxed frame
with the exported geometry and the same trusted player used by downloads. The
player is loaded from a bundled file so the desktop editor continues to block
inline scripts. Preview cannot access the parent document, storage or network.

## Persistence and boundaries

The native `.pixl` payload uses `design_type: "svg-animation"` and a versioned
`svg_animation` member. Each element/property has its own ordered keyframe track.
It stays out of the Rust shape serializer, which does not understand this data.
Project cards, imports, and old generic editor URLs route it to its own workspace.
Download a `.pixl` copy to preserve editable tracks; importing an exported SVG
loads its static artwork, not the original editable timeline.

The workspace uses shared local persistence and recovery, plus revision-checked
cloud saving. Shared files use the existing **Start editing / Finish editing**
lease and server permission checks; another teammate's active lease blocks edits.
Conflicts preserve pending edits and offer a device copy or download. Files
configured for simultaneous editing can be previewed and copied to the device;
that merge protocol is not supported for SVG timelines. This design type does not
offer live collaboration, comments, library workflows, or engine/MCP editing.

SVG import supports common geometry, nested groups, gradients, local references,
clipping, masks, text, embedded PNG/JPEG/WebP images, and a subset of filters.
Scripts, existing animation, foreign objects, and external resources are removed.
Static stylesheet rules are flattened; complex CSS cascade and selectors may
need conversion to presentation attributes before import. Import reports removed
unsupported content. Color tracks animate solid six-digit hex colors; adding
one to a gradient or `none` paint replaces that paint with a solid color.

Current limits are 2 MB SVG source, 5,000 SVG elements, 1,000 tracks, 200 keys per
track, and 60 seconds per animation. Native downloads retain the shared 5 MB file
limit. Text uses available fonts; font files are not embedded. Custom easing
control coordinates are limited to 0–1; overshoot, bounce, and spring curves are
not included. Imported arcs are converted to cubic curves for motion routes.
Node insertion/deletion, a route drawing tool, scroll/programmatic triggers, SVGator project import, and
video/Lottie export remain unsupported.

## Reference and verification

Live SVGator **Basic Animations** was inspected after sign-in: element hierarchy,
Animate controls, right inspector, independent tracks, keyframe selection, easing,
and playback. Its [official workflow overview](https://www.svgator.com/svg-animation-tool)
provides additional reference. PixlPrfct uses its own branding and shared Figma
dark controls; see [the live Figma observations](FIGMA_UI_REFERENCE.md).

For motion paths and custom easing, the signed-in SVGator easing popover was
inspected again, alongside its official
[motion path tutorial](https://www.svgator.com/tutorials/create-a-motion-path-animation)
and [easing guide](https://www.svgator.com/help/animation-and-interactivity/how-to-add-ease-effects).
Morphing follows the node-at-playhead workflow in SVGator's
[morph guide](https://www.svgator.com/help/animation-and-interactivity/how-to-create-a-morph-animation),
whose node and Bézier-handle screenshots were inspected. The Figma Motion dock
was rechecked live before adding the morph controls to the right inspector.

Node tests cover the document model, independent interpolation, easing, retiming,
collision rejection, duration protection, export endpoints, native files, routes,
and acceptance by the cloud document reader. Browser tests cover creation,
sanitized import, property editing, native SVG playback after export, reopening,
keyboard and pointer timeline interactions, local conflict recovery, `.pixl`
reimport, mocked cloud revision conflicts, and shared editing lease headers and
read-only gates. The export test compares actual
browser SVG animation values with editor preview values. Additional checks cover
curve input, keyboard handles, drag/cancel/undo, nested transformed motion paths,
closed routes, deleted source geometry, disconnected-path rejection, reverse
progress, and reversed orientation. Curved-path export positions agree with the
preview within 0.25 SVG units in the sampled poses; native SVG and preview path
sampling use slightly different curve-flattening tolerances.

Morph tests additionally cover shape conversion, anchor/handle input, keyboard
focus, pointer edits, drag cancellation, undo/redo, reopening, topology rejection,
and compound-path serialization. Exported morph geometry matches the preview
within 0.03 SVG units at sampled positions and times under nested transforms.

The signed-in SVGator export dialog and its animation-start menu were also
inspected alongside its [interactive animation guide](https://www.svgator.com/help/animation-and-interactivity/how-to-create-an-interactive-svg-animation).
Interaction checks cover click, keyboard, hover reversal, pause/resume, saved
settings, cancellation, standalone SVG playback, a script-disabled motion-path
fallback, and read-only export without cloud writes.

Grouped timeline editing was checked against live Figma Motion's dock and
selection hints, plus SVGator's
[keyframe operations guide](https://www.svgator.com/help/animation-and-interactivity/how-to-change-keyframe-values)
and [selection tutorial](https://www.svgator.com/tutorials/add-delete-duplicate-keyframes).
Coverage includes cross-track selection, marquee, group movement, relative-time
copy/paste, collisions, duration boundaries, one-step undo/redo, persistence,
source replacement, restored motion/morph tracks and read-only cloud gates.
The desktop-policy regressions cover secure and loopback origins, interactive
preview playback and isolation
from the parent editor; native Mac runtime inspection confirms the same workflow
through the application protocol.

Group-easing checks cover mixed values, presets, custom numeric and keyboard
edits, drag/cancel/undo, stale drags, grouped deletion, export, reopening and
read-only controls. Proofs: `.local/svg-animation/group-easing-mixed.png` and
`group-easing-workspace.png`.

Local verification on 2026-10-31: 32 SVG browser cases and 22 SVG model/controller
cases pass. Selection timing coverage includes scaling and shifting across tracks,
single-time selections, collision/rounding rejection, invalid ranges, Escape,
undo/redo, selection continuity, export, reopening, and read-only fields. It also
covers queued scroll events in shared inspector menus. Timing proof:
`.local/svg-animation/selection-timing-workspace.png`.
Changed-code lint has zero errors and two existing warnings (navigation and a
dropdown expression).

Animation reuse follows the same-property workflow in SVGator's official
[copy/paste tutorial](https://www.svgator.com/tutorials/add-delete-duplicate-keyframes).
Local verification on 2026-10-31: all 34 SVG browser cases and 26 model/controller
cases pass. Added coverage checks destination origins, multiple properties,
relative timing and easing, unchanged source tracks, atomic rejection, one-step
undo/redo, actual exported SVG playback, reopening, and read-only controls.
Changed-code lint has zero errors and one existing navigation warning. Manual
menu verification copied the Core's Scale X keys onto the circle in an isolated
orbit example. Proof: `.local/svg-animation/paste-element-workspace.png`.

Reversal follows SVGator's official
[Reverse keyframes workflow](https://www.svgator.com/tutorials/how-to-reverse-a-sequence-of-keyframes).
It adds mirrored easing for the reversed segments. Local verification on
2026-10-31 covers numeric interpolation at mirrored times, asymmetric custom
curves, staggered tracks, single-key tracks in a group, boundary curves, morphs,
motion paths, colors, omitted-key rejection, and source immutability. Browser
coverage checks selection continuity, undo/redo, native SVG playback, reopening,
disabled states and read-only files. Proofs: `.local/svg-animation/reverse-menu.png`
and `reverse-workspace.png`.
All 36 SVG browser cases and 31 model/controller cases pass. Changed-code lint
has zero errors or warnings, and the editor build passes.

Duplication follows SVGator's official
[duplicate-at-playhead workflow](https://www.svgator.com/tutorials/add-delete-duplicate-keyframes).
Local verification on 2026-10-31: all 38 SVG browser cases and 31 model/controller
cases pass. Coverage checks menu and shortcut invocation, multiple tracks and
single keys, timing/easing preservation, unchanged clipboard, one-step undo/redo,
collision and duration rejection, actual exported playback, reopening and
read-only controls. The existing grouped-paste test now waits for the debounced
save before comparing persisted keys. Changed-code lint has zero errors or
warnings, and the editor build passes. Manual proofs:
`.local/svg-animation/duplicate-menu.png` and `duplicate-workspace.png`.

Snapping follows Figma's documented
[Shift-drag keyframe workflow](https://help.figma.com/hc/en-us/articles/41307938657559-Add-select-and-delete-keyframes).
Local verification on 2026-10-31: all 40 SVG browser cases and 35 model/controller
cases pass. Coverage includes group spacing, the original playhead, cross-track
alignment, zoom and scrolling, screen-space tolerance, collision and range
rejection, deterministic ties (including a fractional playhead), Alt bypass,
ordinary free movement, grid fallback, cancellation, one-step undo/redo and
reopening. Changed-code lint has zero errors or warnings, and the editor build
passes. Automated screenshots were visually inspected at 1440 × 1000:
`.local/svg-animation/snapping-playhead.png` and `snapping-keyframes.png`.

Keyframe navigation verification on 2026-11-01: all 42 SVG browser cases passed;
after adding shortcut handling inside the open menu, all four affected browser
cases passed again. All 36 SVG model/controller cases and two shared menu geometry
cases pass on the final code. Changed-code lint has zero errors or warnings, and
the editor build and diff checks pass. Coverage includes distinct cross-track
times, boundaries, an empty timeline, single-time tracks, fractional playheads,
selection/clipboard/history preservation, read-only navigation, zoomed scrolling,
playback pause, focused inputs, and active-drag protection. Manual browser checks
confirmed menu actions, both shortcuts, and shortcut use with the menu open.
The existing 270 px menu fits at 1280 × 720. Proofs:
`.local/svg-animation/navigation-workspace.png`, `navigation-menu.png`, and
`navigation-zoom.png`. This remains a source update pending merge, outside the
Windows alpha.18 download.

Merge update, 2026-11-01: navigation merged in PR #48. The preceding paragraph
records the local checkpoint; Windows alpha.18 remains unchanged.

Pause-button verification on 2026-11-01: reproduced the reported mouse-click
failure in the live local browser and in a new regression test before the fix.
The timeline replaced the icon on every animation frame, detaching the pointer
target before the click completed. The icon now changes only when playback
changes state. All 43 SVG browser cases pass, including a 150 ms mouse press,
frozen playhead and rendered artwork, resume from the paused time, repeated
pause/resume, Enter/Space activation, Go to start, and unchanged saved content.
Changed-code lint has zero errors or warnings; editor build and diff checks pass.
Manual confirmation left the user's preview paused at 1624 ms. Proofs:
`.local/svg-animation/pause-workspace.png` and `pause-control.png`. This fix is
local pending merge and is not included in Windows alpha.18.

Release preparation, 2026-11-01: PR #49 merged the Pause fix. Windows alpha.19
packages it together with PR #48 navigation. The preceding local checkpoints
record pre-merge verification. See [Desktop](DESKTOP.md) and the alpha.19 release
notes for package availability and the native Windows verification scope.

Editor asset preparation and the browser editor build pass. Timeline proof:
`.local/svg-animation/timeline-multiselect.png` and `timeline-multiselect-menu.png`.
Demo proofs: `.local/svg-animation/motion-path-workspace.png` and
`.local/svg-animation/morph-workspace.png`. The editable morph example is
`.local/svg-animation/morph-study.pixl`.

Cloud browser tests use a mocked API; they do not certify a deployed server or
multi-user environment. Visual inspection verifies the dock and inspector layout,
not exhaustive pixel parity or SVGator feature parity. Local screenshots are in
`.local/svg-animation/`.


## 2026-11-01 — alpha.19 publication and canvas transform verification

- PR #50 merged with the owner's explicit override approval. Windows alpha.19
  is published from `ea20b140ebd97e929b1dc23a258c4c7af431f88c`; merge
  `e97e25e8cb275df424062c2db12957e8c3313edb` has the identical tree.
  Manual Windows build `41312336745` passed 26 desktop/import checks and
  install/startup/uninstall. The downloaded packages passed SHA-256, provenance
  and source comparison; 41 SVG workflows passed against extracted package
  assets. Both public package URLs return HTTP 200. Pages run `41313246085`
  published the verified website. Automatic CI remains disabled and repository
  approval protections remain active.
- Canvas stretching/rotation is verified locally, separately from that release:
  all 51 SVG browser cases pass (43 existing plus eight handle workflows), as do
  36 model/controller cases. Coverage includes opposite anchors, modifiers,
  cancellation, zoom, key easing, one-step undo, persistence, nested transforms,
  native SVG export, motion-path groups, read-only files and editing-lease changes.
- Visual evidence: `.local/svg-animation/transform-workspace.png`,
  `transform-resize.png`, `transform-rotation.png`, and
  `figma-transform-handles.png`. Live Figma selection was inspected before
  implementation. Full visual or feature parity is not claimed.

## 2026-11-01 — alpha.20 release preparation

PR #51 merged canvas stretch and rotation handles with explicit owner approval.
Merge `6f3d74bed07d945ab2b728b9f771dab492cab8d4` matches the verified source tree.
Alpha.20 packages that work and updates the product website with an actual
selected-object screenshot. The preceding alpha.19 and local verification entries
remain historical records; see the alpha.20 release notes for package verification
and publication status.

## 2026-11-01 — Pen and base-path editing (local source)

The first roadmap implementation adds ordinary drawing to SVG Animation. This
work is local source only, not an installed build or the published alpha.20 release.

- Choose **Pen (P)**. Click for corner anchors, drag for cubic handles, press
  **Enter** or **Done** to finish an open path, or click the first anchor to close
  it. Shift constrains placement and handles to 45° increments. Escape cancels
  an unfinished path; each finished path is one undo step.
- Choose **Direct Selection (A)** or **Edit base path** for a path. Drag anchors
  or handles, or focus one and use arrows (Shift: 10 SVG units). **Add midpoint
  after anchor** subdivides the following cubic without changing its shape.
  Delete, Smooth and Corner act on the selected anchor. **Continue selected
  endpoint** resumes either end of an open subpath. These operations edit base
  geometry and do not create morph keyframes.
- Pen opens the right-side **Pen tools** palette. Drag its grip, use arrows on the
  grip, or press Home to reset it. It stays inside the canvas workspace after
  resizing. Position is session-only and never changes document history. Select
  element, V, Close, playback or timeline/morph editing exits drawing mode.
- Palette and inspector share fill/stroke color, none, opacity and stroke weight,
  using the existing custom color picker and number fields. With no selection,
  they edit new-path defaults. Without a paint animator, edits change the source
  artwork; with an existing animator, color/weight edits change the current key.
  Use Add animator or the diamond explicitly to start paint animation. Choosing
  a solid color replaces an imported gradient on that paint.

Base-path edits preserve transforms, existing animation tracks and origins.
A path with a Morph animator uses **Morph → Edit nodes**; remove that animator
before changing base geometry. Assigned motion routes remain captured snapshots
and need reassignment to reflect later source-path edits. Ordinary editing is
currently limited to path elements with 2–512 anchors across up to 64 subpaths,
coordinates within ±100,000, and the existing SVG import size limits.

Split/join, arbitrary segment-click insertion, multi-node selection, handle
mirroring, Pencil/whole-path smoothing and Brush remain open. Object-body dragging,
multi-object organization and explicit Add/Replace import are separate roadmap
items. Unsupported tools are not shown as completed buttons.

Verification: **3 Rust and 1,043 JavaScript tests pass**. Production build,
typecheck, generated API and diff checks pass. Changed-file lint has zero errors
and one existing internal-navigation warning. **57 SVG Chromium scenarios pass**, including six new drawing
workflows and the 51 existing animation/transform workflows. New cases cover
cubic/closed drawing, both endpoint continuation behavior and mathematical
reversal, transformed/zoomed anchor editing, handle cancellation, shared color
picker edits, palette drag/keyboard/reset/resize, one-step undo, save/reopen,
SVG export, unchanged animation tracks/origins, read-only files and lease
acquisition/release. Mathematical tests verify exact cubic subdivision, reversed
handles, validation and separate subpath preservation. Cloud tests use a mocked
API; no deployed team server or installed app is certified here.

Live Figma Pen and vector-edit UI were inspected before implementation. Reference
and result captures are in `.local/svg-pen/figma-vector.png` and `verified.png`.
The palette is the owner's requested extension of the bottom toolbelt. Full
Figma visual/workflow parity is not claimed. See the [reference record](FIGMA_UI_REFERENCE.md)
and [Pen scope](PEN_WORKSPACE_PROPOSAL.md).

## 2026-11-01 — Add/Replace import foundation (in progress)

`web/svg-animation-import.js` adds isolated, synchronous preparation for an
explicit Add or Replace operation. **Historical checkpoint, superseded by the
delivery below:** it was not connected to the editor at this point, so Import SVG
still replaced the artwork as described in B41. No shipped fix was claimed.

Add preserves the destination canvas, original element IDs, animation tracks,
origins and timing settings. Incoming IDs and local paint/clip/mask/use references
are remapped together. A named group contains the incoming SVG viewport, centered
at its intrinsic dimensions; its default inherited paints are isolated from the
destination root. Destination root effects still apply to its descendants.
Replace prepares new artwork with empty tracks/origins and retains animation
settings. Both operations pass through the existing sanitizer and combined
document limits. Preparation never mutates the current animation and requires an
explicit mode, allowing the UI to commit the result as one undoable edit later.

Verification: **4 new Chromium cases pass**, including duplicate-ID/reference
isolation, viewport placement/default paints, active-content removal, combined
element limits, immutable preparation, track/origin preservation, save/reopen
normalization and matching animated-export transforms. Editor build and lint on
the new module/tests pass. Tests are in
`tests/browser/svg-animation-import.spec.mjs`.

The live Figma check for the next interaction/UI work could not run because the
Mac is locked. Unlock was requested. Add/Replace controls, complete import undo
and permission workflows, and object-body dragging remain pending. B40/B41 stay
unchecked; the first delivered Pen batch remains complete locally.

## 2026-11-01 — Object movement and Add/Replace import (local source)

After the Mac was unlocked, live Figma selection, File menu and modal chrome were
inspected. B40 and B41 are now resolved in local source; this work is not in the
published alpha.20 or an installed build.

- In Select mode, drag an object's body to move it. A selected group's children
  move that group. Shift constrains translation to its parent X or Y axis. The
  focused canvas also accepts arrows (Shift: 10 units). Movement writes X/Y
  tracks at the playhead through the same transform path as resize/rotation;
  later playhead positions seed the starting value at time zero. Imported source
  geometry, existing easing, origins and motion-path settings remain intact.
- The gesture previews without saving and commits one undo entry on release.
  Escape, pointer cancellation/capture loss, window blur, seeking, document
  changes and loss of the edit lease cancel the preview. Clicks without movement
  create no history entry. Coordinate mapping accounts for zoom, transformed
  ancestors and animated motion frames. Pen, base nodes and Morph editing retain
  their own canvas interactions.
- Importing into a nonempty SVG opens **Import SVG**, with **Add to canvas** as
  the default, **Replace artwork**, and Cancel. Add preserves existing artwork,
  animation, playhead and canvas size; the incoming SVG becomes a named group
  centered at its intrinsic size. Replace clears old tracks/origins, uses the
  imported canvas size, and resets the playhead. Empty files import directly.
  Both commit one undoable change, and Add/Replace apply to file upload, drop
  and desktop SVG file-open. `.pixl` project import is unchanged.
- Imported IDs and local gradient/clip/mask/use references are remapped together.
  The existing sanitizer and combined document limits apply. Invalid input,
  canceled choices, a document changed while reading/choosing, and a missing or
  expired edit lease cannot overwrite the document. Multi-object selection,
  duplication and group creation remain separate roadmap work.

Four merge/model and ten interaction cases pass in Chromium. They verify geometry,
history, persistence, animated export, custom dropdown keyboard use, cancellation,
stale-document protection and mocked shared-file leases. Screenshots reviewed:
`.local/svg-editing/body-drag.png` and `import-choice.png`. The dialog uses 480px
width, a 40px header, 16px content inset, 28px custom dropdown, and #2c2c2c surface.
See the [reference record](FIGMA_UI_REFERENCE.md) for comparison limits.

Final verification: **3 Rust / 1,043 JavaScript tests, production build, typecheck,
generated API and diff checks pass**. Changed-file lint has zero errors and one
existing internal-navigation warning. The 71-case SVG browser run passed 70 and
exposed an immediate cancel/reopen race; dialog cleanup was made synchronous,
and all ten movement/import UI cases passed on the final rerun, including the
failed case and strengthened visual measurements. Four merge cases and all 57
existing SVG cases passed in the broader run. Logs: `.local/svg-editing/browser-tests.log`,
`browser-final.log`, `unit-tests.log`, and `build.log`.

## 2026-11-01 — Pencil and freehand smoothing (local source)

The third drawing batch adds **Pencil (Shift+P)** to the existing bottom toolbelt
and movable palette. This is local source work, not an installed build or the
published alpha.20. Whole-path smoothing and Brush remain separate roadmap work.

- Drag to preview a stroke in the shared fill/stroke/opacity/weight defaults;
  release to save one editable open path and one undo entry. Pencil remains
  active for subsequent strokes. Round stroke ends and joins are retained in SVG.
- The shared **Smoothing %** input accepts 0–100 (default 50) and is session-only.
  Design's existing point-reduction and Bézier smoothing model runs in screen
  space, then maps anchors and handles into SVG coordinates. Endpoints and sharp
  corners are retained; zoom and nonuniform SVG scaling do not change the visible
  smoothing tolerance. Hold Shift to constrain the stroke to a straight line at
  45-degree increments.
- Resulting paths use ordinary Direct Selection and paint controls. Creation
  leaves existing tracks and origins intact, including at a nonzero playhead.
  Saving/reopening and SVG export preserve the resulting cubic geometry.
- Taps create no artwork. Escape, pointer cancellation/capture loss, window blur,
  tool changes, seeking, document changes and lost edit leases discard unfinished
  strokes. Read-only files cannot draw. No partial path enters history on failure.
- A stroke is bounded to 4,096 pointer samples and 512 resulting anchors, with
  the existing ±100,000 SVG coordinate limit. Over-limit strokes are rejected
  with a message to increase smoothing or shorten the stroke; endpoints are not
  silently truncated. This is fixed-width freehand drawing, without pressure or
  variable-width Brush behavior.

Live Figma Pencil was inspected before implementation. The roadmap's movable
palette and smoothing control are PixlPrfct extensions; exact full Figma parity
is not claimed. Reference and rendered captures are in `.local/svg-pencil/`.
See [UI observations](FIGMA_UI_REFERENCE.md#svg-pencil--live-reference-2026-11-01).

Verification: **all 77 SVG browser cases pass**, including six new Pencil cases;
**3 Rust and 1,045 JavaScript tests pass**, including two new model cases.
Typecheck, changed-file lint, generated API and diff checks pass. The final browser
run includes the initial-preview correction and a corrected test message selector.
The rendered 1800×1003 capture was inspected; geometry assertions cover the 240px
palette, 32px buttons, 24px smoothing input and #2c2c2c surface. Logs:
`.local/svg-pencil/browser-final.log` and `unit-tests.log`. The production build
also passes; see `.local/svg-pencil/build.log`.

## 2026-11-01 — Split/join and open-path workflows (local source)

The fourth drawing batch adds **Split path at anchor** and **Join endpoints** to
the existing movable Pen palette. All operations stay inside one SVG path
element, preserving its identity, transforms, paints, animation tracks and
origins. This is local source work, not an installed build or published alpha.20.

- In **Edit base path**, select an interior anchor and use the scissors action
  to split an open path into two subpaths. On a closed path, any anchor can open
  the loop. Existing cubic segments and their direction are preserved; the cut
  anchor becomes two open endpoints.
- Select an open endpoint, choose **Join endpoints**, then click another endpoint
  or focus it and press Enter. Opposite ends of one subpath close it. Ends of two
  subpaths join in the required direction; coincident endpoints merge, while
  separate endpoints get a straight bridge. Handles and interior anchors are
  rejected with guidance. Escape cancels endpoint picking without editing.
- A split or join is one undo step. Save/reopen and SVG export retain the new
  topology. Paint attributes stay intact, but a split can change filled regions
  and stroke end-cap appearance because SVG fills and caps each subpath.
- Existing limits still apply: 512 total anchors, 64 subpaths and coordinates
  within ±100,000. Invalid operations are rejected atomically. Morph animators
  continue to protect the base topology; use their timed-node editor instead.
  Read-only files disable these controls, and losing the editing lease cancels
  endpoint picking.

The owner's live-preview feedback clarified open-path and deletion workflows:

- **Enter** or **Finish path** finishes an open Pen path; clicking its first
  anchor closes it. The palette now displays that instruction. The open path
  can be selected as another object's **Motion path** and followed in playback.
- A selected path can be removed with **Delete/Backspace** from the canvas or
  layer list, the trash action beside **Edit base path**, or **Delete selected
  path** in the palette. Deleting removes the path's own tracks and transform
  origin as one undoable edit. Text fields and timeline keys keep their existing
  keyboard behavior; an unfinished Pen draft is not deleted by these shortcuts.
- Assigned motion routes remain captured snapshots, as before. Changing or
  deleting the original artwork does not rewrite another object's saved route.

Live Figma's Vector menu and in-object editing toolbar were inspected before
implementation; see [reference observations](FIGMA_UI_REFERENCE.md#svg-splitjoin--live-reference-2026-11-01).
Joining separate SVG elements, multi-object selection, whole-path smoothing,
arbitrary segment cuts and Figma vector-network parity remain open.

Verification: all **83 SVG browser cases** pass across the broad regression run
and the final six-case topology run. The broad run passed 82 cases; its remaining
case used a stale autosave snapshot after undo. After waiting for persistence,
the six new cases pass, including additional canvas-deletion and drawn-route
deletion coverage. The initial Delete-button disabled-state issue was fixed and
its lease acquire/release states are covered. **3 Rust and 1,050 JavaScript tests
pass**, including five new topology model cases. Typecheck, changed-file lint
(zero errors; existing internal-navigation warning), generated API and diff
checks pass. Logs: `.local/svg-topology/browser-all.log`, `browser-final.log`,
`unit-tests.log`, `typecheck.log` and `lint.log`. Rendered captures `verified.png`
and `open-path.png` were inspected.

The production build passes (`.local/svg-topology/build.log`), and the refreshed
preview assets match the verified source files.

The development preview is running on `http://127.0.0.1:5173/`; editor assets are
copied from `web/` by `scripts/prepare-editor.mjs`. Refresh after finishing the
current drawing gesture to load updated controls. The live project was left
untouched during this verification.

## 2026-11-01 — Live strokes, stage selection and separate panels (local source)

The owner's live-preview feedback exposed two remaining drawing problems:
Escape discarded an unfinished Pen path, and the draft showed only an editing
outline. Both are corrected. This supersedes earlier Escape-cancels-draft notes.

- The placed path immediately uses its stroke color, width and opacity. Moving
  the pointer previews the next segment, including after the first anchor.
- **Escape**, **Enter**, **Finish path**, or switching to **Select (V)** preserves
  a path with at least two anchors as an open path. The hover preview is never
  saved as an extra anchor. Click the first anchor to close a path deliberately.
- **Discard unfinished path** cancels the draft. Escape during a handle/Pencil
  drag cancels that gesture. Single-point drafts create no artwork or undo entry.
- Click artwork directly on the stage to select it. Thin painted strokes accept
  clicks within six screen pixels, including transformed/zoomed paths over
  another shape. Paint order and native clipping are respected. Selection itself
  does not edit the document. Path deletion retains the keyboard, inspector and
  palette actions delivered in the preceding batch.

The owner also chose **independent windows outside PixlPrfct**, rather than panels
confined to the editor. This batch integrates the SVG Animation workspace:

- Drag a section heading, or click its **Open … in separate window** icon. Each
  inspector section, Elements, Timeline, and Pen tools has its own window.
  Move/resize the window using the operating system's window controls.
- Controls stay connected to the current selection, timeline, saves and undo
  history. Changing selection updates open inspector panels. A section that is
  unavailable shows a selection prompt instead of stale controls.
- Click **Dock panel**, the dock action in the original slot, or close the window
  to return it. The original slot can also bring its window forward. Leaving the
  editor closes its panel windows. Panel arrangement is not document history.
- Custom dropdowns, color popovers, keyboard shortcuts and timeline context
  menus operate inside their owning window. Editing leases remain enforced.
- Browser popups require the browser to allow them; a blocked popup leaves the
  controls docked and gives a retry instruction. The browser/host ultimately
  controls popup presentation. The desktop integration creates small, resizable
  native windows rather than another full editor.
- This does not yet detach the separate **Design** workspace inspector. Panel
  positions are session-only; saved layouts and cross-window docking groups are
  not implemented. No Illustrator/Figma-wide parity or public release is claimed.

Verification: **109 distinct browser cases pass** across the full 108-case SVG /
Design regression run and the added easing/timing case. The final seven-panel
run also passes after the cross-window resize correction. **3 Rust and 1,051
JavaScript tests pass**; production build, typecheck, generated API check and changed-file lint pass
(zero errors; one existing Next navigation warning). An isolated Electron profile
verified a 280px native panel, live edits, native-menu undo/redo, dock and close
restoration, with sandbox/context isolation retained and no Node or native IPC
bridge exposed. No installed app was replaced.

Evidence: `.local/svg-stage/full-browser.log`, `panels-final.log`,
`panel-easing.log`, `unit.log`, `native-panels.json`, and screenshots
`live-stroke.png`, `selection.png`, `transform-window.png`, `pen-window.png`,
`timeline-window.png`, `native-transform-window.png`. Browser and native evidence
are separate; no public deployment or complete interface parity is claimed.


## 2026-11-01 — Persistent panel workspace and compact sidebar (local source)

The owner clarified that an independent panel must stay connected to the cursor
through the held drag and remember its position across refresh/application restart.
That workflow is implemented and verified with real Electron windows. The SVG Pen
palette can dock on the right and retain that placement. Detaching Elements leaves
a 48 px rail with five icon actions and shared tooltips. Design now uses the same
panel system. See [delivery, controls, boundaries and evidence](DETACHABLE_PANELS.md).
This supersedes the earlier remaining-work notes for Design and saved positions;
grouped docking remains open. No installed or published update is claimed.


## 2026-11-01 — Gradient motion and parent icon docks (local source)

Fill and Stroke now open a 240 px gradient picker with Linear/Radial, flip,
90° rotation, a stop ramp and editable colors/positions/opacity. **Rotation**
inside Fill/Stroke has its own named gradient track; **Transform → Rotation**
continues to rotate the object. Set the playhead and change gradient rotation,
or use Add animator to create its track. **Animate gradient stops** creates
stop keyframes; subsequent stop edits apply at the playhead. Stop count stays
fixed while animated; remove that animator before adding/deleting stops.

Shared imported definitions and inherited gradient stops are copied per animated
paint, so another shape using the original gradient does not change. Existing
SVG gradient transforms and units are retained. Animated exports use native SVG
stop animations and additive gradient transforms; static exports retain the
first frame. Color, offset and opacity interpolate together with track easing.

Parent-only tear-outs and icon-strip side flyouts supersede the earlier section
tear-outs. See [panel behavior](DETACHABLE_PANELS.md). No installed or published
release change is claimed.
