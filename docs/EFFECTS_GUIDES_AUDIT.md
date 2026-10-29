# Effects and Layout guides — 2026-10-28

## Reference and visual verification

Inspected the live Figma Employee Experience reference. With the user's approval,
duplicated Frame 1 as “PixlPrfct inspector reference QA,” inspected populated Drop
shadow, Layer blur, Grid, Columns, and Rows settings, then deleted only that copy.
The original Frame 1 remains in the reference.

Implemented the measured structure for the existing supported effects and guides:
compact rows, eye visibility buttons, minus actions, plus menus, and separate dark
settings popovers. These replace the old inline accordions and switches.

| Measurement | Figma | PixlPrfct |
| --- | ---: | ---: |
| Inspector row | 240 × 32 | 240 × 32 |
| Effect row trigger | 156 × 26 | 156 × 26 |
| Eye / remove target | 24 × 24 | 24 × 24 |
| Guide type trigger | 124 × 24 | 124 × 24 |
| Settings width | 240 | 240 |
| Drop shadow panel height | 224 | 224 |
| Grid panel height | 128 | 128 |
| Columns / rows panel height | 256 | 256 |
| Effect / guide header height | 40 / 48 | 40 / 48 |
| Form label / gap / field | 64 / 8 / 136 | 64 / 8 / 136 |
| Fields / vertical pitch | 24 / 32 | 24 / 32 |
| Panel / swatch radius | 13 / 2 | 13 / 2 |

The reference viewport was 1248 × 914; the isolated test viewport was 1280 × 720.
Measurements above are fixed control dimensions, not a whole-screen image-diff
certification. The custom Glassmorphism extension and guide style management
remain available.

## Behavior fixes

- A zero-radius blur remains an editable effect. Explicit presence is serialized
  separately from radius and visibility, including clipboard, history, and
  component inheritance. Removing the row clears presence.
- Settings forms remain mounted during value edits, preserving focus, selection,
  and nested menus. Type changes retain the settings panel and applicable values.
- Adding an effect/guide opens its settings and brings its row into view.
- Numeric limits and integral guide counts are checked before committing.
- Visibility preserves all settings. Shadow conversion cannot overwrite another
  existing blur; background blur conversion respects its 200px engine limit.
- Shadow ordering remains available by dragging or Alt+Up/Down.
- Popovers clamp to the viewport and can be dragged. They grow upward when needed
  to keep fields visible. Nested color-picker Escape closes only that picker.
- The global control CSS no longer overrides measured sizes, corner radii, or eye
  button states. Shared custom dropdowns remain in use.
- New guides start as Figma's red 10px grid at 10% opacity; switching to stripes
  starts with five tracks and 20px gutters. Existing saved values are preserved.

## Browser checks

Used a separate “Effects and guides QA” local project. It retains a sample shadow
and guide for inspection. Removed the temporary zero-radius blur from the earlier
“Picker and toolbar QA” rectangle after confirming its value survived reload.

Verified:

- Drop shadow creation, blur editing, hide/show with value retention, conversion
  to Inner shadow and Layer blur, zero radius, and reload persistence.
- Multiple shadows, Alt+Up reordering, deletion, and document Undo.
- Background blur creation, automatic CSS canvas activation, rejection of 201px,
  acceptance of 200px, and removal.
- Glassmorphism preset and actual fill opacity updates, followed by Undo to restore
  the frame's original paint, stroke, and corners. Opening Glassmorphism settings
  from an ordinary background blur preserves the existing paint and geometry.
- Grid creation and settings auto-opening; Columns/Rows switching; count, color,
  width, offset, and gutter edits; hide/show; invalid count rejection; reload;
  guide removal and Undo.
- Guide styles: create, rename, detach, reapply, delete; global visibility.
- Nested color picker viewport containment and Escape, settings close/escape,
  draggable popup movement, and focus after type changes.
- Final browser error/warning log empty.

## Automated validation

- Full JavaScript suite: 801 tests, 799 passing, the same two baseline failures.
- Final focused effects/guides/color/popup suites: 30 passing.
- Rust: 3 passing. WASM rebuilt; served assets copied to public/editor.
- Changed JavaScript syntax and CSS parsing pass.

Baseline failures remain `tests/css-renderer.test.mjs:10` (live/export CSS equality)
and `tests/icon-library.test.mjs:6` (older missing vendored icon glyphs).

## Remaining Figma parity — explicitly unimplemented

This completes the compact-row/popover replacement for the supported controls; it
does not certify complete Figma feature or pixel parity. Missing corresponding
controls are not presented as working buttons:

- Per-effect blend modes and effect-style libraries.
- Progressive blur, Noise, Texture, Figma Glass, and Shader effects. PixlPrfct's
  existing Glassmorphism preset is a distinct extension, not Figma Glass.
- Guide Auto count and variable binding of guide/effect numeric/color fields.
  Count is a validated integer input rather than Figma's Auto-capable combo box.
- Full Figma color-library controls within effect/guide color popovers. These
  currently provide a working solid-color spectrum/hue picker plus hex and
  opacity fields in the parent settings panel.
- Arbitrary effect ordering/duplication across blur and shadow types; the engine
  still stores one layer blur, one background blur, and up to eight shadows.
