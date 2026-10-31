# Figma fidelity requirement

Recorded from the user's explicit direction on 2026-10-28:

> I want pixel-perfect from what Figma has. We're probably going to add a whole bunch more tools they don't have, but I want it to look exactly like Figma's.

The live Figma interface is the visual and interaction reference. Approximate, inspired-by layouts are not acceptable substitutes. Preserve PixlPrfct branding and support additional tools without replacing the familiar foundation.

## Bottom toolbelt

Observed groups: Move (Move, Hand, Scale), Region (Frame, Section, Slice), Shape (Rectangle, Line, Arrow, Ellipse, Polygon, Star, Image/video), Creation (Pen, Pencil), Type (Text, Text on path), Code (Code, Spec), Comment (Comment, Annotation, Measurement), Actions, and the Draw/Design/Motion/Dev Mode segment. Plugins are excluded at the user's request. Frame and Design mode must have distinct icons, as must the other mode controls.

## Motion reference

Observed in the live Figma file at a 1248 × 914 viewport:

- Timeline is docked across the bottom of the whole editor, not a floating card over the canvas.
- At the observed size, the timeline begins at y=714 and is 200px tall. It has a resize handle and collapse control.
- The canvas, sidebars, and inspector end above the timeline. The floating toolbelt sits above it, with roughly a 12px gap.
- Left track column aligns with the left sidebar boundary (x=298 in this view).
- Timeline header contains Play, auto-keyframing, current time, duration, time format, and Loop. No transform form belongs in this header.
- Time ruler sits beside these controls, with major and minor ticks, a blue scrubber head, and a vertical playhead.
- Tracks and diamond keyframes occupy the body. Keyframes can be selected, moved by dragging, and added by double-clicking. Zoom controls sit at the lower right.
- Right inspector switches to Motion and contains Animations, Transform (Position, Scale, Rotation), Layout (Width, Height), and Appearance (Opacity, Corner radius). Diamond controls add/remove property keyframes.

Reference colors follow the selected Figma theme. Match like-for-like themes when comparing. Recheck the live interface rather than treating these viewport-specific measurements as universal constants.

## Verification

Compare screenshots at the same viewport and theme. Check expanded and collapsed states, hover/selected states, keyboard input, resizing, timeline scrolling/zooming, switching modes, and document persistence. Document any remaining functional or visual differences instead of claiming parity.

## Current verification — 2026-10-28

The Motion view now uses the measured full-width dock, 200px starting height, 48px ruler/control header, property tracks, and right-hand transform inspector. Frame and Design mode have separate icons.

Verified in the local browser: moving a Position keyframe without moving the other property tracks, editing a position value at the playhead, scrubbing to the end, resizing with the keyboard, collapse/expand, timeline zoom, and switching between Motion, Design, and Dev Mode. Design restores its paint sections and the full-height canvas. Text-on-path creation and editing also work in the toolbar flow. The focused JavaScript checks (35) and Rust tests (3) pass.

This checkpoint was not certified as pixel-perfect. The local editor has since adopted the dark theme; the later inspector audit below records same-theme measurements. Motion also still needs parity for named animations, easing/curve editing, audio, and video export. Escape cancellation is implemented for keyframe and resize drags but has not yet been exercised in the browser. Keep these differences explicit during subsequent work.


## Dark palette and paint picker (2026-10-28)

The user selected Figma's dark appearance for the entire app. Shared chrome uses
`#2c2c2c` surfaces, `#383838` fields, `#444444` borders/hover, white primary text,
`#b3b3b3` secondary text and `#0d99ff` accent. The workspace is `#1e1e1e`.
Document fills, image pixels, export colors and project previews retain their
saved values. Projects, account/setup, menus and workspace tools share these tokens.

Live Figma picker measurements at 100% zoom: 240px wide, 12px corners,
40px header, 41px paint-mode toolbar, 16px content inset, 208px square spectrum,
24px fields/actions, 16px swatches in nine columns with 8px gaps. Gradient overview
uses a stop strip and 32px stop rows; editing a stop opens a second picker to the
left. Mode changes keep the top fixed; growing content scrolls within the viewport.

The current picker includes all six paint types, but complete Figma feature parity
is not claimed. AI image generation, shader-library creation workflows, and
per-gradient-stop variable bindings still need separate implementation.

## Right drawer audit (2026-10-28)

See [RIGHT_DRAWER_AUDIT.md](RIGHT_DRAWER_AUDIT.md) for measured Design section
geometry, browser checks, bug fixes, test results, and the remaining parity gaps.
The core text inspector now matches the observed section and field coordinates.
This is not a claim of complete visual or functional parity across the drawer.

## Section labels and Grid access (2026-10-29)

The user explicitly requests label-click collapse/expand for right-drawer
sections, without disclosure chevrons. This is an intentional interaction
extension to the Figma reference. Collapsing settings never disables their
document properties. Header add actions stay independent and reveal the section
when adding a paint, effect, or layout guide.

The user then requested a Layout header menu with **Flexbox** and **CSS Grid**.
Grid tools live inside Layout and collapse with it. Flexbox exposes horizontal
and vertical flow; the menu also removes an existing layout. Section hover
backgrounds extend across the drawer instead of ending at the label button.
These choices intentionally extend the reference UI.

Browser verification covered enabling and switching layout types, changing
columns and checking generated CSS after reload, label and keyboard collapse,
saved collapsed states, and adding paints/effects/guides from collapsed sections.
General CSS editing is available for every layer through **CSS & responsive
layout → Edit CSS**; see [CSS_EDITING.md](CSS_EDITING.md).

## Administration (2026-10-29)

The live team Admin console was inspected in Dashboard, People, Content,
Settings, and the invitation dialog. See [ADMIN_CONSOLE.md](ADMIN_CONSOLE.md)
for the measured geometry, implemented workflows, authorization, and remaining
parity limits. Admin is reachable from Projects in both server and static builds;
the local build exposes database setup without implying that a server is connected.

### Reusable effect styles (2026-10-29)

Inspected the live Figma desktop interface in Booking & Scheduler and Territory Track Design System. The Effects header uses the four-dot Apply styles button followed by Add effect. The Effect styles picker has a title, create (+), close, search, and style list. The live Edit effect style panel measures 304 CSS px wide, with a 40 px header, 136 px checkerboard preview, 112 px white circular sample, 16 px content insets, and 24 px name/description controls. Name and Description use a 96 px label-plus-gap column; Properties contains the same editable effect rows as the layer inspector. Create new effect style adds a Create style footer action. These observations are implemented with the shared settings popover, inputs and custom dropdown controls. The picker offers imported styles already present in the document; library publishing and importing continue through Manage libraries.

Reference captures: `figma-edit-effect-style.png` and `figma-create-effect-style.png` in the October 29 task artifact folder. No Figma style content was modified during inspection.

## Components and variants — live reference 2026-10-29

Inspected the native Figma app in Territory Track Design System, button page:
https://www.figma.com/design/wsDTBgrzPpnKyaJlMOakOG/Territory-Track-Design-System?node-id=10-607
The selected set has four-diamond layer/canvas glyphs, a purple dashed boundary,
and a purple variant-count badge. Its 241px right inspector has a 16px inset,
a 13px component title, a diamond-plus Add variant button, and a Properties list.
Rows are 208px wide and 24px high, with 8px gaps, 11px text, a hollow diamond,
property name, and muted comma-separated values. Clicking a property name edits
it inline. A selected main instead shows Current variant, a select-set action,
and two-column property-name / editable-value fields.

Create property → Variant opens a 304px popover to the left of the inspector:
40px title bar, 16px content inset, Name and Value fields, default Property /
Default values, and a right-aligned Create property button. Use the shared
settings popover and custom dropdowns. Interface colors are #2c2c2c and #383838;
component canvas paint remains authored document data.

Verification: the updated editor's title measured 13px, property rows 208×24px,
action buttons 24×24px, and inspector inset 16px. Browser interaction verified
creation, combining, renaming, multiple properties, instance switching, Assets
grouping, and reload persistence. This is the core variant-authoring workflow;
advanced Figma component features and whole-interface pixel parity are not
claimed. The existing editor panel remains 240px wide.

## Text alignment — live reference 2026-10-30

Inspected the native Figma Territory Track Design System button page at 100%
zoom, label node `10:609` within main `10:608`. Its Open Sans SemiBold 14 label
has a 14px line-height/text box, centered at y=13 inside a 40px parent. The
typography inspector exposes horizontal and vertical alignment independently.
The existing PixlPrfct design uses different authored dimensions (including
16px text in 42px buttons); those document choices were preserved.

The PixlPrfct canvas painted fixed-box labels about 4px above its CSS preview:
it used a top-origin font baseline and omitted the final line's leading from
text measurement. It now uses full line boxes and a measured alphabetic
baseline for Canvas/SVG, with the same vertical offset in inline editing.
Canvas and CSS screenshots of the actual Button page at the same 90% zoom
confirm the visible shift is gone. Reference and result captures are in
`.local/ui-audit-2026-10-30/`. Automated checks cover line wrapping, blank lines,
top/center/bottom offsets, Hug measurements and baseline alignment.

No new inspector layouts were introduced in this patch. Text-style and shadow
variable authoring is available through MCP; corresponding inspector pickers
remain a separate parity gap. Headless font metrics are approximate, and this
comparison is not a claim of exact rendering for every font/platform.

## Frame enclosure — live reference 2026-10-30

Tested in the native Figma app on a temporary page (removed after inspection).
Drawing a 100 × 75 frame around an existing 50 × 25 rectangle nests the rectangle
without changing its canvas position. The Layers panel indents it under the
frame. Moving that existing frame over a second rectangle leaves the second
rectangle outside its hierarchy in the observed Figma build.

The user explicitly requests that moving a frame over elements also adopt them.
PixlPrfct therefore supports enclosure on drawing and moving ordinary frames;
the move behavior is an intentional extension to the observed reference.
Only fully enclosed, visible, unlocked sibling trees are adopted. Groups,
components and nested frames remain intact, and rotated geometry is preserved.
Component instances, component sets, sections and generated grid cells do not
automatically capture layers as destination frames. Existing grid drop behavior
remains unchanged. No new interface controls or layout changes were introduced.

Browser verification covered drawing, frame-label dragging, the resulting layer
hierarchy, one-step undo/redo, and reload persistence. Reference and result
screenshots are retained in `.local/frame-containment/`.

## Component slots — live reference 2026-10-30

Inspected the native Figma app using temporary component/slot pages, removed
again after capture. Reference captures: `.local/slots/figma-create-property.png`,
`figma-slot-inspector.png`, `figma-instance.png`, `figma-picker.png`, and
`figma-picker-results.png`.

Observed workflow: Properties → + → Slot creates a property, including an
unbound property. A nested frame can Convert to slot and choose an existing
property or create one. Slots have a pink square-plus layer icon and empty
canvas target; the instance property displays Default/Modified with Add instances
and reset/delete-content actions. Main-component layout stays authoritative;
slot contents can contain ordinary layers and independent component instances.
The settings popover is 304 CSS px wide with a 40 px header, 16 px body inset,
24 px controls, dark #2c2c2c surface, Name/Description, layer limits, preferred
instances, empty display, and counter-axis fill. The Add instances picker is
240 px wide, with search, a library dropdown, page folders, component thumbnails,
and List/Grid/Show subfolders options.

Implemented the native slot model, authoring, content editing, advisory limits,
preferred component selection, canvas insertion targets, main/default propagation,
reset, clear, copy/paste, duplication, library remapping/protection, and same-name
slot preservation on variant swaps. The editor uses its shared custom dropdowns.
The browser check created an unbound property, drew a rectangle directly into
an instance slot, inserted a linked Badge, reset the slot, and inspected settings
and the folder-based picker. Captures: `.local/slots/pixlprfct-verified.png`,
`pixlprfct-create-slot.png`, and `pixlprfct-picker.png`.

This is working slot functionality, not a certification of exhaustive Figma
parity. Rich-text description formatting, bulk slot authoring across several
variants, and preservation of native Figma slot metadata during .fig import
remain unverified/unimplemented. Descriptions currently use plain text. Existing
Territory Track component definitions have not been migrated automatically.

Installed locally as desktop **0.1.1-alpha.10** in both existing app bundles.
Native About confirms the version (`.local/slots/desktop-version.png`), both
strict/deep signature checks passed, and the saved Territory Track design was
reopened at its original draft URL. Final checks: 3 Rust + 946 JavaScript tests
pass; API catalog and Rust formatting are current; changed-code lint has zero
errors (13 existing app.js warnings). Changes remain local on
`codex/frame-containment`, alongside the frame-enclosure work.

## Evaluation follow-up — 2026-10-30

Inspected the live native Figma UI before implementing Pages, typography/style
controls, Page paint and shadow-variable selection. Captures are retained locally
in `.local/evaluation-fixes/figma-pages-text.png`, `figma-text-styles.png`,
`figma-create-text-style.png`, `figma-type-settings.png`, `figma-page.png`, and
`figma-shadow-variables.png`. The reference was read only; artwork was not changed.
The native capture is 3600×2006 physical pixels at 2× scale.

Measured structure: Pages has a 40px header with 24px Find/Add actions, 32px rows,
8px row insets, neutral #383838 selected background, and a resize boundary above
Layers. Its height and drawer width are user adjustable. Text styles use a 216px
picker with a 40px header, searchable grouped names and per-style edit controls;
the style form and Type settings are 304px. Letter spacing sits beside line height.
Page paint uses a 24px field and eye action. Shadow color Libraries uses a 240px
surface, 40px header and search row, library selector, and 32px swatch rows.

The implementation follows those measured surfaces and uses shared custom inputs
and dropdowns. Spacing accepts px/%; case preserves authored text; styles support
create/apply/edit/detach/delete; Page paint supports color/opacity/visibility and
persists per page. Shadow variables support collection/search/list/grid selection
and detachment. Unsupported advanced typography controls were not added as dummies.

Five reviewed Chromium baselines are committed under
`tests/browser/editor.spec.mjs-snapshots/`: Pages, Text styles, Type settings,
Shadow variables, and Motion. Geometry assertions check Pages dimensions/selection
color, swatch visibility and full-width Motion. Functional tests additionally
cover persistence, quota recovery, in-place slot text, variants, and Motion editing.
The screenshot review found and corrected a 28px shared-button override, invisible
shadow swatches, white picker rows and centered style labels.

This verifies the listed controls and regression states, not exhaustive pixel
parity across fonts, resolutions, all menus or the whole Figma interface. Existing
set-label placement and advanced typography/slot gaps remain tracked separately.

## Set labels — 2026-10-30 follow-up

Re-inspected the live Button component set at 53%, 28% and 3% zoom. Its name stays
at a fixed screen font size, aligned to the set's left edge above its boundary;
the four-diamond glyph precedes it. At 3% the name clips to the projected set
width rather than reserving a minimum 80px label. Captures are retained locally
as `figma-set-label-selected.png`, `figma-set-label-overview.png` and
`figma-set-label-3-percent.png` in `.local/evaluation-fixes/`.

Labels now use 12px type / 16px line height, a 12px glyph with 4px gap, a 24px row
26px above the boundary, and the projected frame width. The reported Table Row
label covered the preceding table header. PixlPrfct suppresses an automatic set
label if its text box intersects other root artwork, retaining selection through
Layers and the set outline; no authored geometry or paint is changed. This
collision safeguard is a PixlPrfct extension, not a claim that Figma uses the same
collision algorithm. Browser checks cover collision visibility, selection,
renaming, narrow-zoom clipping and reload. `set-labels-darwin.png` is the sixth
reviewed baseline. Whole-product visual parity remains unverified.


## Page Styles and text inspector — 2026-10-30 follow-up

Inspected the live Figma desktop Territory Track Design System, without editing
its artwork. The right inspector reports 241px. Styles has Text/Color/Effect
categories, 32px rows, 16px samples, slash folders, hover actions and inline text
metrics (`name · size/line-height`). Its Create style menu contains Text, Color,
Effect, Animation and Layout guide. Text/color creation forms are 304px wide:
40px header, 16px content inset, text preview 120px high and color preview 104px.
The text form has Name/Description, Properties, full-width family and paired
weight/size and line-height/letter-spacing controls.

Implemented and manually inspected the Text/Color/Effect paths using shared
controls. The top-level creation menu currently exposes these three implemented
paths. Figma's Animation/Layout guide entries, nested folder/group operations,
advanced paint thumbnails, and exhaustive matched-state pixel comparison remain
separate parity work. The existing Page variable-mode section remains visible.
The review corrected centered style labels, metadata placement, duplicate form
heading text and the paint row escaping its shared inspector styling.

The live text Layout inspector contains two Resizing captions; the earlier
suggestion that this duplication itself was a mismatch is withdrawn. Semibold
now fits the 88px weight field without shrinking the label font.

Evidence: local visualization files `figma-page-inspector-reference.png`,
`figma-create-color-style-reference.png`, `figma-text-inspector-reference.png`,
`pixl-page-styles-implemented.png`, `pixl-text-style-form.png`,
`pixl-color-style-form.png` and `pixl-text-inspector-legibility.png`. The three
new regression images live under `tests/browser/styles.spec.mjs-snapshots/`.

## Manage libraries — 2026-10-30 follow-up

Inspected live Figma desktop Manage libraries, the published Capwah Components
library detail, and its source file. The modal measures 760×640px: 40px header,
200px navigation, 16px content inset, 64px detail header and 24px controls.
Component tiles are 64px squares; shared styles use compact icon/swatch rows.
PixlPrfct keeps its own branding and adds device/import/export controls within
that structure. The live Added state and native Save local copy workflow were
also inspected. This is targeted matching, not whole-library/Figma parity.

The exported private `.fig` passes worker import and engine normalization with
46 component masters, 11 variant sets, 15 variables and 12 shared styles. It was
added to an existing disposable project; Assets showed the grouped components
and an inserted linked Button. The import report disclosed detached instances,
unsupported exposed-property/slot metadata and mixed-text limitations.

Reference/proof images: `figma-add-library-reference.png` and
`pixl-figma-library-added.png` under this task's local visualization directory.
The reviewed `library-add-to-existing-project-darwin.png` baseline covers the
760×640 modal with a real component thumbnail. Paint preview helpers now render
full paint stacks (including gradients/patterns), variables and opacity in Page
Styles, color-style forms and library details. Nested folder/group operations,
Animation/Layout guide creation and exhaustive matched-state pixel checks remain.

## Team workflow reference — 2026-10-30

Inspected live native Figma Share and Comments in Capwah Components before
implementation. Share: 480 CSS px dialog, 40 px header, 16 px content inset,
member/access rows with custom dropdowns, footer actions, Share beside Present.
Comments: right inspector (241 px in this window), 40 px heading, 24 px search,
16 px content inset, dark surface. References: `figma-share-reference.png` and
`figma-comments-reference.png` in this task’s visualization folder. No Figma
sharing settings or comments were changed. PixlPrfct uses its branding and shared
controls; editing lease/handoff and per-component override permissions are
PixlPrfct extensions. Page/layer comment links are implemented; canvas pins and
Figma-equivalent notification/settings workflows remain open. Geometry checks
and browser screenshots cover the new sharing surface, without claiming global
pixel parity.

## Review, release and presence references — 2026-10-30

Inspected live Figma before these alpha.14 changes. Screenshots retained in
`.local/team-next/figma-{inbox,comment-settings,invite,publish,multiplayer}.png`.
Inbox: approximately 384×340 CSS px, 48 px header, All/Unread tabs and settings.
Comment notification choices: Everything, Just mentions and replies, Nothing,
Mark all as read. Invite and nested Publish dialogs: 480 px width, 40 px header,
16 px inset; Publish has a description and grouped changes with footer actions.
Multiplayer: 24 px avatar in the right header and an approximately 224 px dark
popover, 16 px inset. No messages, invites or library releases were sent in Figma.

PixlPrfct follows these dimensions, its shared custom inputs/dropdowns and dark
palette. Release/pin/retirement/rollback and revision-bound reviews are working
PixlPrfct extensions. Presence uses 24 px initial avatars and named canvas cursors.
The final browser check measures avatar width, radius and background. Existing
visual regression cases pass. This verifies the inspected states, not global
pixel parity, multi-person Figma cursor behavior, spotlight or voice.

## Separate SVG Animation workspace — 2026-10-31

Inspected live native Figma Motion in Capwah Components before implementation,
including the Move tool's Motion entry, dock, controls, ruler, tracks, and right
inspector. At 1800×965 CSS px of editor content, the reference dock is approximately
200 px high with a 48 px controls/ruler row, a 296 px left track column, and a
241 px right inspector. Retained reference: `.local/svg-animation/figma-motion.png`.

The separate SVG Animation design type reuses the existing Motion dock styles,
icons, dark palette, custom dropdowns, and numeric input component. The dock
spans the entire window, defaults to 200 px, and collapses to 48 px. Properties
and easing stay in the right inspector. SVG element hierarchy and animator
behavior were also inspected in the signed-in SVGator Basic Animations demo;
these are functional extensions within the PixlPrfct interface.

Local proof: `.local/svg-animation/workspace.png`. Browser checks verify a
full-width dock at 1440 px, collapse and resize dimensions, working timeline
controls, and no visible native selects. This verifies the inspected layout and
core workflow; exhaustive matched-state pixel comparison is still outstanding.
No existing TT design-system gap is marked resolved by this separate feature.

### Motion paths and custom easing — 2026-10-31

Rechecked live Figma Motion and the signed-in SVGator Basic Animations easing
popover before extending the separate workspace. SVGator's popover has an
approximately 166 px square curve graph within a 344×284 px panel, with a preset
list alongside it. Retained reference:
`.local/svg-animation/svgator-easing-reference.png`.

The PixlPrfct extension keeps the full-width Motion dock and uses the right
inspector for curve controls and path assignment. The 200×176 px graph, two
keyboard-accessible drag handles, four shared numeric inputs, and shared custom
dropdowns fit its existing 240 px inspector. This adapts the SVGator workflow to
the established Figma-style inspector; it is not a claim of matching SVGator's
popover layout. Local proof at the normal 1160×924 browser viewport:
`.local/svg-animation/motion-path-workspace.png`.

Thirteen SVG browser cases verify the working core, editable curves, route
assignment, persistence, and native SVG export. Closed routes, nested transforms,
reverse travel, and reversed orientation have coverage. Exported route positions
match sampled editor previews within 0.25 SVG units. Exact global visual parity
and the remaining SVGator features remain unverified or unimplemented.

### Path morphing — 2026-10-31

Rechecked the live Figma Motion dock in Capwah Components. It retains its 200 px
height, full-width tracks/ruler and 241 px minimum right inspector. The SVGator
morph guide's rendered node-editing screenshots show anchors, connected Bézier
handles, and edits made after moving the playhead. The separate SVG workspace
extends this workflow with 6 px anchors/handles and larger invisible pointer
targets. Node coordinates use the shared numeric field with X/Y prefixes at
24 px height in the existing right inspector. No additional panel replaces the
Motion dock. This does not verify exact parity with Figma's vector editor.

Local proof: `.local/svg-animation/morph-workspace.png`. Browser checks cover
node and handle editing, cancel/undo, fixed-topology interpolation, ordinary
shape conversion and exported SVG geometry. Fifteen SVG browser cases pass;
triggers, node insertion/deletion and automatic matching of unrelated shapes
remain outside the implemented scope.


### SVG interactive export — 2026-10-31

Inspected the signed-in SVGator SVG(web) export dialog and animation-start menu.
The separate animator now offers an 800 px export dialog with a 320 px preview
and 240 px options column. The preview runs the actual exported SVG in a sandbox.
The existing dock and right inspector remain in place; choices use shared custom
dropdowns and the existing dark dialog palette. On-load, hover, click, repeat,
and response controls work. This extends the prior morph pass; scroll and
programmatic triggers remain unsupported. Nineteen SVG browser cases pass,
including keyboard playback, motion-path fallback, and read-only export.
Local proof: `site/assets/animation-export.png` (sample artwork, no reference UI).

### Grouped SVG timeline editing — 2026-10-31

Re-inspected live Figma Motion in Capwah Components before this pass. The dock
remains full-width, 200 px high, with a 48 px ruler/controls row and a 241 px
minimum right inspector. The live accessibility description identifies modifier
multi-selection, keyframe dragging and double-click key creation. The reference
file has no animation tracks, so selected-key styling and grouped-edit outcomes
could not be compared in that file. Reference capture:
`.local/svg-animation/figma-multiselect-reference.png`.

The separate SVG workspace retains that dock and inspector structure. Selected
diamonds reuse the existing blue Motion state; drag selection adds a blue marquee.
Copy/Paste/Delete/Select all use the shared keyboard-accessible context menu and
dark palette. Properties and active-key easing stay in the right inspector.
The clipboard currently targets the same elements/properties in the same tab.
This is implemented group editing, not a claim of full Figma/SVGator parity.

Verification: 25 SVG browser cases and 17 model/controller cases pass, including
group dragging, cancel, boundaries, selection-only document stability, paste
rejection, restored tracks, undo/redo and read-only gates. The manual browser
check moved two tracks together and pasted at 500/2000 ms with their 1500 ms
offset intact. Proofs: `.local/svg-animation/timeline-multiselect.png` and
`timeline-multiselect-menu.png`. This pass is local pending merge and has not
been packaged in a desktop release. No TT design-system gap is closed by it.

Release update, 2026-10-31: grouped timeline editing was merged in PR #37 and
packaged in Windows v0.1.1-alpha.15 through PR #38. The earlier paragraph records
its pre-merge checkpoint.

### SVG group easing — 2026-10-31

Rechecked the live native Figma Motion dock and right inspector before this pass.
At the captured 1800 × 1003 logical window size, the dock remains 200 px high
and the right inspector 241 px wide. The file has no animation tracks and reports
a connection problem, so selected-key easing states were not available for a
live comparison. Capture: `.local/svg-animation/figma-group-easing-reference.png`.

The SVG workspace extends its existing right-hand easing editor to the selected
keys. It retains shared dark dropdowns, number fields, the Bézier editor and the
full-width dock. Mixed curves show a disabled Mixed option until the user chooses
a curve; the inspector states the selection count. This is a functional SVG
extension, not a claim of verified pixel parity for Figma's selected-key UI.
The per-segment semantics follow SVGator's official
[easing guide](https://www.svgator.com/help/animation-and-interactivity/how-to-add-ease-effects).

Verification: 29 browser cases and 19 SVG model/controller cases pass, with zero
changed-code lint errors and the existing navigation warning. Manual inspection
confirmed Mixed → Ease out across Rotation and Scale X, with both keys still
selected. Proofs: `.local/svg-animation/group-easing-mixed.png` and
`group-easing-workspace.png`. This source update is not in Windows alpha.15.
No TT design-system gap is closed by this pass.
