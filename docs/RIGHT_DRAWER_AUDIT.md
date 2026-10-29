# Right drawer audit — 2026-10-28

Desktop packaging is outside this work. The editor remains under development.
The user's requirement is an exact Figma facsimile for equivalent tools, with
PixlPrfct branding and its additional tools retained. **This audit does not certify
complete pixel-perfect or feature parity.**

## Reference and measured geometry

Inspected the live Figma Design, Prototype, Dev, and Motion inspectors in the
Employee Experience reference file. Selected Rectangle 6, frames, and Application
name text; no reference-document content was edited during this audit.

Both browser views used a 1248 × 914 viewport and dark chrome. The inspector has
240px of content, a 48px top bar, 32px tabs, and a 50px selection header. Standard
fields are 24px high; two-column fields are 88px wide with an 8px gap and a 24px
action column. Labels use 10px text; fields and section titles use 11px text with
450 and 550 weights. Font family uses a 32px field.

The following text-layer geometry now matches the observed reference:

| Element | Top | Bottom / height |
| --- | ---: | ---: |
| Position section | 130 | 327 |
| X/Y fields | 238 | 24 high |
| Rotation field | 286 | 24 high |
| Layout section | 327 | 476 |
| Appearance section | 476 | 579 |
| Typography section | 579 | 794 |
| Font family | 619 | 32 high |
| Line height | 705 | 24 high |
| Text alignment | 753 | 24 high |

These are measured layout matches, not a screenshot-diff certification. Layer
content differs between the two documents. Several glyphs and advanced controls
still differ, as listed below.

## Changes

- Composed the existing inspector controls into the reference section order.
  Position, Layout, Appearance, and Typography stay visible rather than becoming
  optional feature switches or persisted collapsed accordions.
- Restored the selection header when returning from Dev/Motion; moved zoom into
  the tabs row. Layer actions remain available from the selection menu.
- Moved Auto layout into Layout, with flow, sizing, alignment, gap, padding,
  independent padding, wrap, and clip content. Grid remains a working flow option.
- Kept Margin, CSS/responsive controls, device chrome, layout-child extensions,
  text-content controls, and text-on-path settings accessible without displacing
  the standard fields.
- Corrected text Hug sizing so the dimension menus agree with the auto-width,
  auto-height, and fixed-size buttons. Display line height as a percentage.
- Fixed numeric and quarter-turn rotation to preserve the visual center.
  Quarter turns now work for all layer kinds; rectangle flips retain their
  existing geometry-specific implementation.
- Made blend mode open the shared dropdown directly. Variable-mode popups use
  the top layer and viewport-aware positioning.
- Fixed the effect-add menu being clipped by a closed details element, its
  expanded state, keyboard navigation, and focus behavior.
- Fixed canceled color-spectrum drags committing a paint change. Pointer cancel,
  capture loss, and Escape now discard the preview; a later pointerup cannot
  commit the canceled drag.
- Fixed dropdowns swallowing document Undo/Redo shortcuts. Escape dismisses an
  inspector popup without clearing selection. Enter/Space on a focused control
  no longer also invoke canvas editing shortcuts.
- Deferred focus-triggered tooltips until a popup finishes opening, preventing a
  reentrant `showPopover` exception.

## Browser checks completed

Checks used the agent-owned “Picker and toolbar QA” document. Temporary edits
were undone or restored through the UI; final rectangle has one fill, no strokes
or effects, uniform zero corners, and its original bounds. The text layer retains
its original fixed bounds and 120% line height. The drawer is back to 240px.

| Tools | Observed result |
| --- | --- |
| Width, opacity, uniform/individual corners | Values commit; undo restores them |
| Rotation | Text quarter turn preserves center; undo restores bounds/angle |
| Text resizing | Width Hug updates both axes and auto-width button; Undo from the focused menu restores fixed bounds |
| Auto layout | Horizontal/vertical/Grid switching, padding, individual padding, and undo work |
| Fill | Add a second fill, hide/show, remove, and blend-mode editing work |
| Stroke | Add, weight 2→6, Center→Inside, dash `8 4`, popup dismissal, and removal work; defaults restored |
| Effects | Add Drop shadow, blur 8→20, disable/re-enable preserving 20, remove; keyboard-add Layer blur and remove |
| Layout guides | Add columns, count 4→6, disable preserving count, remove |
| Prototype | Create navigation to Desktop, choose Dissolve, expose duration/easing, delete interaction |
| Dev and Motion | Inspect code appears; timeline and shared paint sections restore correctly across mode switches |
| Export | Selected rectangle SVG export completes; success status displayed |
| Popups | Blend, variable mode, effects, and advanced stroke stay in viewport; Escape preserves selection |
| Drawer sizing | Drag 240→320→240; controls and popups remain usable |
| Console | No new errors in the final popup/keyboard checks after the tooltip fix |

The automated suite also covers responsive Grid, min/max sizing, variables,
paints, effects, guide geometry, components, history, serialization, and export.
Those suites are regression coverage, not evidence that every UI state was
manually exercised during this pass.

## Validation

- JavaScript full suite: 796 tests, 794 passing, two pre-existing failures.
- Rust: three tests passing.
- Changed JavaScript syntax checks and CSS parsing pass.
- Updated assets are copied to `public/editor`.

Pre-existing failures:

1. `tests/css-renderer.test.mjs:10`: the test expects exported CSS to contain the
   complete live CSS string, but live and export paths have different output.
2. `tests/icon-library.test.mjs:6`: the vendored icon font CSS is missing earlier
   toolbar/Motion glyphs. The new blend icon has a portable SVG CSS fallback;
   older missing glyphs are not repaired by this audit.

## Remaining parity work — do not mark verified

- Effects and guide rows now use measured compact rows and settings popovers.
  See [the dedicated audit](EFFECTS_GUIDES_AUDIT.md) for verification and the
  remaining advanced controls; full Figma feature/pixel parity is not certified.
- Typography lacks letter spacing and advanced type settings. Some field-prefix
  glyphs, unit presentation, and control icons are not exact reference matches.
- Flip controls operate on rectangles only. Other selected kinds correctly show
  those unsupported operations disabled.
- Prototype's interaction editing remains a different layout; Figma scroll
  behavior and Smart Animate are not implemented.
- Dev Inspect still presents generated CSS/HTML rather than Figma's complete
  property-list/code, variable-mode, color, and text-content layout.
- Export uses the existing artwork dialog rather than per-layer export presets.
- Motion named animations, easing curves, audio, and video export remain outside
  the current implementation. See the Motion notes in FIGMA_UI_REFERENCE.md.
- Picker limitations recorded in FIGMA_UI_REFERENCE.md still apply, including
  per-gradient-stop variable bindings and shader-library workflows.
- Multi-selection, image/component-specific, and every advanced Grid state were
  not individually compared against live Figma during this browser pass.
