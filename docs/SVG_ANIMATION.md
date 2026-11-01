# SVG Animation

This separate design type is available from **Projects → New design → SVG
Animation** in the repository source and the [Windows v0.1.1-alpha.18
preview](https://github.com/ninefingerwoodshop-ops/pixlprfct/releases/tag/v0.1.1-alpha.18).
It does not replace Design or its existing Motion mode. Grouped timeline editing
was merged in PR #37; group easing and precise selection timing followed in
PRs #39 and #40. Animation reuse and reversal followed in PRs #42 and #43.
Duplication and playhead/keyframe snapping followed in PRs #45 and #46.
All are included in alpha.18. The older Windows
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

Source update pending merge; not included in Windows v0.1.1-alpha.18.

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

Editor asset preparation and the browser editor build pass. Timeline proof:
`.local/svg-animation/timeline-multiselect.png` and `timeline-multiselect-menu.png`.
Demo proofs: `.local/svg-animation/motion-path-workspace.png` and
`.local/svg-animation/morph-workspace.png`. The editable morph example is
`.local/svg-animation/morph-study.pixl`.

Cloud browser tests use a mocked API; they do not certify a deployed server or
multi-user environment. Visual inspection verifies the dock and inspector layout,
not exhaustive pixel parity or SVGator feature parity. Local screenshots are in
`.local/svg-animation/`.
