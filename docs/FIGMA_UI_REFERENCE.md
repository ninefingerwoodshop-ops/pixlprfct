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
