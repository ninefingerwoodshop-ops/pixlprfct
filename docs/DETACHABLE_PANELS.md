# Detachable panels — alpha.21, 2026-11-01

SVG Animation and Design share independent parent panel windows, icon docks, and in-editor side flyouts. These features are included in the [Windows alpha.21 preview](https://github.com/ninefingerwoodshop-ops/pixlprfct/releases/tag/v0.1.1-alpha.21) and the browser editor. The dated local entries below preserve the development record; package verification is recorded in the release notes.

## Using the panels

- Click **Collapse** in a parent heading to reduce it to an icon. Click its icon to open the panel beside the strip inside the editor; click again, click outside, or press Escape to dismiss. **Expand** restores the dock. Collapsed preferences survive refresh. This action never creates a separate window.
- Collapse/Expand glyphs show the next action: left docks collapse left and expand right; right docks collapse right and expand left; bottom docks collapse down and expand up. The glyph updates when Pen tools changes its dock side.
- Drag a parent panel heading. After 4 px of movement its separate window opens and
  continues following the cursor while the mouse button is held. Release to
  place it. Escape cancels the tear-out and returns the controls.
- The heading's ↗ button opens the same panel without dragging. Close the window,
  click **Dock panel**, or use its original slot's dock action to put it back.
- SVG **Pen tools** has **Dock Pen tools on right**. It can return from a separate
  window directly to the right inspector, remain there in Select mode, or float
  over the stage again. Its docking preference is saved.
- SVG sidebar actions are icons with accessible names and shared tooltips. With
  Elements detached, the sidebar becomes a 48 px rail: **Projects**, **Import
  SVG**, **Download**, **Show Elements panel**, **Dock Elements panel**. Docking
  Elements restores the 296 px sidebar and its list/search controls.
- Detached windows, positions, and sizes are saved on this device, separately
  for Design and SVG Animation. Refreshing, or reopening that editor after an
  application restart, restores them. Explicitly closing/docking a window removes
  it from the saved detached layout. These preferences do not alter artwork or
  create Undo entries. Browsers must permit pop-up windows for automatic restore;
  blocked restoration retains the saved layout and explains how to reopen it.

Design parent panels are **Layers** (including Pages), **Assets**, **Inspector**,
**Drawing tools**, and **Timeline**. SVG parents are **Elements**, **Inspector**,
**Drawing tools**, **Pen tools**, and **Timeline**. Every parent has a matching
icon. Child property sections remain inside the parent and have no tear-out
controls. Existing saved section windows migrate to the containing Inspector
(or Layers for Pages). This supersedes the earlier per-section delivery in the
same local batch. Grouped docking and named presets remain open.

## Implementation and verification

The original controls move between documents; there is one editor, document
writer, and history. A UI lookup registry finds live controls across windows.
Cosmetic ancestor wrappers retain inspector styling and read-only states without
applying the main editor's responsive sidebar hiding. Custom dropdowns and color/
effect popovers use their owning window, and moved popovers return with their
panel. Input focus, selection changes, and native menu commands remain connected.

`tests/browser/design-panels.spec.mjs` covers live property edits, selection,
Undo, immediate dragging, Layout/Fill/Effects, popup recovery, Pages/Layers/tools,
and Design/Motion transitions. `svg-animation-panels.spec.mjs` covers SVG panel
controls, read-only access, right docking, the five-icon rail/tooltips and refresh
restoration, in addition to earlier timeline/easing and Pen workflows.

`scripts/acceptance/panels-desktop.mjs` verifies real native window movement while
held, stopping on release, exact 420×160 position / 360×540 size restoration across
refresh and full Electron restart, and removing the saved entry when docked. It
uses a temporary profile. Evidence: `.local/design-panels/native-layout.json`,
`native-layout.log`, `native-sidebar.png`, and `native-restored-elements.png`.
Existing native sandbox, context isolation, navigation and bridge restrictions
remain in place. The new shutdown notification only tells the owning editor to
preserve its layout while the app closes; panel windows receive no bridge.

Live Figma was inspected before this change: selected Rectangle 2 in Capwah
Components, dark inspector sections, a 241 px right sidebar, and the bottom tool
belt. Existing field components and styles were retained. Tear-out behavior,
right-docked SVG Pen tools and the compact SVG rail are owner-requested extensions;
no Figma or Illustrator interaction parity claim is made.

## Final scope adjustment — 2026-11-01

The owner requested Adobe-style icon docks and side flyouts after the initial
per-section implementation. Those behaviors are explicit PixlPrfct extensions;
no Figma or Adobe parity claim is made. Browser tests cover adjacent placement,
repeat-click/outside/Escape dismissal, live edits, refresh persistence, no new
window on icon click, and subsequent explicit tear-out/docking. The original
native cursor-following and restart tests remain applicable to parent windows.

## Verification closeout — 2026-11-01 (local source)

- Full unit suite: 3 Rust and 1,053 JavaScript tests passed.
- Browser suite: 137 workflows exercised; 129 passed on the initial run. Eight
  checks were corrected for the requested parent-header/collapse UI and one
  save-timing race, then all eight passed on recheck. Visual baselines were
  reviewed and updated for the deliberate parent-header changes.
- Final feature run: 22 panel/gradient browser checks passed, including next-state
  icons on left/right/bottom docks, independent gradient/object rotation,
  detached Inspector editing and native SVG stop animation. The four gradient
  checks also passed after the final imported-color resolution adjustment.
- Final native acceptance passed cursor-following drag, stop-on-release, refresh,
  full restart with exact bounds, and explicit docking clearing the saved window.
- Production build, TypeScript check, generated editor API check, and diff check
  passed. Changed-file lint has no errors (one existing location.assign warning
  in the SVG editor; the final new modules/tests have no warnings).

Logs and screenshots are in `.local/design-panels/`: `all-unit-final.log`,
`final-browser.log`, `final-recheck.log`, `final-feature-checks.log`,
`gradient-color-final.log`, `native-layout-final.log`, `production-build.log`,
`typecheck-final.log`, `browser-design-flyout.png`, `browser-gradient-preview.png`.
The development preview runs at `http://127.0.0.1:5173`; no public deployment or
installed application update was made.

## Complete parent icon audit — 2026-11-01 (local source)

The owner reconfirmed that Fill, Stroke, Transform and other child sections stay
inside their parent Inspector. All five parent panels in each editor have a
matching header/window icon, Collapse/Expand controls and an independent tear-out:

- Design: Layers (including Pages), Assets, Inspector, Drawing tools, Timeline.
- SVG Animation: Elements, Inspector, Pen tools, Drawing tools, Timeline.

Every remaining Show/Dock control is now an icon with an accessible name and
tooltip. Side docks are 48 px wide; narrow-dock tooltips appear alongside the
column so they cannot cover the next button. Collapsed Design sidebars retain
document actions, Projects, Import, Download and save recovery. Rename can be
used without docking the torn-out panel. SVG save/retry/recovery actions likewise
keep icons when the sidebar is compact. Detached inactive Layers/Assets slots
hide with their panel, and compact Pen/Inspector or Pen/toolbelt docks no longer
compete for the same space.

Evidence: `icon-audit-browser-final.log`, `icon-audit-editor-regression.log`,
`icon-audit-unit.log`, `icon-audit-typecheck.log`, `icon-audit-lint.log` in
`.local/design-panels/`. The parent-panel audit exercises every parent through
collapse, expand, tear-out and docking; a real quota-failure scenario verifies
that recovery and downloading remain reachable from the compact sidebar.

Audit verification: 21 panel browser tests passed; the two comprehensive parent
checks passed again with simultaneous-dock and detached Layers/Assets switching
assertions. All 13 existing editor browser scenarios and 11 tooltip/desktop unit
checks passed. Typecheck, production build, and native drag/refresh/restart
acceptance passed. Lint reports no errors; existing warnings in `app.js` and
`svg-animation.js` remain. Both browser projects were refreshed and the compact
Design layout was inspected live (`browser-all-panel-icons.png`).

### Logo and toggle order — 2026-11-01 (local source)

Both editors keep the left drawer's PixlPrfct logo first, then the collapse or
expand toggle, before document/project actions. The toggle moves with its live
panel into a flyout when needed; its icon still depicts the next action. Parent
headers remain visible while their contents scroll. Existing collapse, flyout,
tear-out, docking and refresh workflows pass all 21 panel browser checks
(`.local/design-panels/top-toggle-browser.log`); ESLint and diff checks pass.
The browser previews were refreshed and both open/closed states inspected.
This is a local update, not a published release.

Follow-up (2026-11-01, local): SVG Animation's expanded toggle is now inline
with its logo; its collapsed toggle stays underneath. Design uses its existing
navigation logo only, with the expanded toggle following the document-title
dropdown. Compact docks retain their top toggle. Both updated headers were
inspected in the browser (`inline-toggle-svg.png`, `inline-toggle-design.png`
in `.local/design-panels/`).
The four focused workflows pass (three initially; the Design parent audit
passed after retaining the title row in Assets). Logs: `inline-toggle-browser.log`
and `inline-toggle-design-recheck.log`. ESLint and diff checks also pass.

## Alpha.21 release verification — 2026-11-01

Fresh release checks passed: 3 Rust and 1,053 JavaScript tests; all 143 browser scenarios; and 25 final panel/site cases after the interface-only icon catalog correction. Production build, typecheck, generated API validation, Rust formatting/Clippy and lint passed (57 existing lint warnings, no errors). Native cursor-following, release, refresh, full-restart bounds restoration and explicit docking acceptance passed with a temporary Electron profile. Evidence is in `.local/release-alpha21/`.

The release notes and `BUILD-PROVENANCE.json` identify the exact Windows package source and build run. This delivery does not close the real OS sleep/wake or human-pilot gaps, and does not install a new app on the development Mac.
