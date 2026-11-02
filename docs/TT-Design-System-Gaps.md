# Territory Track Design System — Gaps & Limitations

Running list from building the PixlPrfct design system (project: "Territory Track Design System").
Last updated: 2026-10-30

## Library import and responsiveness follow-up — 2026-10-30

- Existing local projects can add device-published PixlPrfct libraries and portable
  releases, or import Figma `.fig` snapshots through Manage libraries. Shared
  projects use libraries published in their own workspace. See `LIBRARIES.md`.
- B17 and B19 are resolved locally. New B39 below tracks both import sources and
  their precise boundaries. Figma live account/URL synchronization is not present.
- 3 Rust + 978 JavaScript tests, 20 functional browser scenarios, ten reviewed
  baselines, production build, TypeScript, formatting/Clippy and catalog checks
  pass. Lint has 0 errors / 56 warnings. The unchanged 100ms browser gate now
  passes at 58.4ms p95 / 54.2ms median in isolated headless Chromium. B33 retains
  the broader frame-time objective; historical failures below remain evidence.
- Full-stack paint previews replace Page Styles' basic solid approximations.
  B38 retains folder/group commands, other style categories and exhaustive parity.
- Alpha.12 is installed in both existing bundle paths; native About, strict
  signatures, automatic MCP discovery and current offline-project preservation
  pass. App/profile backups and proof are retained. Actual OS sleep/wake and the
  participant pilot remain unverified; no public release or remote CI claimed.

## Historical daily-work workflow follow-up — 2026-10-30 (local source/build)

- Page Styles now browses and manages Text, Color and Effect styles without a selection. Named color styles support fill/stroke application, variables, components, libraries, detach/delete and history. B38 remains open for complete visual/workflow parity; no exact whole-interface match is claimed.
- B29 is resolved locally with revision- and scope-pinned export chunks, Unicode-safe boundaries, bounded manifests and reconstruction tests. This protocol change requires consumers of large exports to follow the returned cursors.
- A public five-page, 727-layer fixture passes import, shared-style/component edits, save/reopen, export and reimport with exact document equality. It found and fixed default slot children losing their own CSS class during font refresh.
- Functional regression and visual evidence are recorded in `RELEASE_ACCEPTANCE.md` and `CAPABILITY_MATRIX.md`. The 100ms browser latency gate still fails: the final visible Chromium comparison measured 199.2ms p95 (141.1ms median). B33 stays open. A complete `test:browser` run is therefore not green.
- The pilot protocol and outcome calculator are ready in `PILOT_PLAN.md`; no people have participated, no invitations were sent, and there is no retention result. B23 still needs an actual 40-minute desktop sleep/wake run. Existing installed alpha.11 and public-release evidence below remain historical and separate.

## Alpha.11 installation and follow-up — 2026-10-30

- Alpha.11 is installed in both existing local desktop bundle paths. Native About and deep/strict signature checks pass. Backups of the app bundles, profile and open design are in `.local/evaluation-fixes/`. No public release or merge is claimed.
- Full production build, 3 Rust + 958 JavaScript tests, 12 Chromium regressions with six reviewed baselines, TypeScript, formatting/Clippy, and the 97-command/49-model catalog pass. Lint: 0 errors / 56 existing warnings.
- The reopened user design retains 724 layers, 10 pages, 87 components, 121 variables and 14 effect styles. A real MCP client reconnects automatically. The only raw-document differences are existing load-time device-frame defaults on seven frames; the explicitly migrated comparison matches completely.
- The reported set-label collision is suppressed without editing artwork; B31 retains broader placement-parity verification. Property pruning is now indexed; complex name edits fall from 30.5 to 15.3ms and previews from 33.1 to 17.9ms. B33 stays open for end-to-end latency.
- The installed-app real OS sleep probe reaches ready state. It requires manual sleep/wake because scheduling an automatic wake needs administrator authentication. B23 remains open until actual sleep evidence passes.

## Evaluation implementation follow-up — 2026-10-30 (historical source/build checkpoint)

- Local fixes close B27, B32, B36 and B37 with the evidence appended to each entry. B31 is partially addressed; set-label placement remains open. B33 is measured and improved but remains above the complex-document frame budget. B23 retains a separate OS-sleep acceptance requirement.
- Full build, 3 Rust + 957 JavaScript tests, 11 isolated Chromium scenarios, reviewed screenshot baselines, TypeScript, formatting/Clippy and the 97-command/49-model catalog pass. Lint has zero errors after excluding generated copies; pre-existing warnings remain. CI now includes lint, typecheck, catalog and functional/visual browser jobs, but no remote CI run is claimed.
- Persistence/recovery, Page paint, typography/style controls and color-variable picking are extracted into focused modules. [CAPABILITY_MATRIX.md](CAPABILITY_MATRIX.md), `roadmap.json` and `inspector-parity.json` separate implementation, UI, visual, installed and release status.
- These changes are **local source/build only**. The previously installed alpha.10 bundles and public release state were not changed. TerritoryIQ/design-file work remains separate.

## Project evaluation checkpoint — 2026-10-30 (historical baseline)

- Read-only source evaluation plus isolated local-browser checks recorded in [PROJECT_EVALUATION_2026-10-30.md](PROJECT_EVALUATION_2026-10-30.md). No application fixes or releases are claimed.
- Added B36 for a browser-reproduced same-file local-tab overwrite and B37 for the code-inspected missing unload protection after local save failure. Existing completed entries and open issues are preserved.
- Current checks: full build, 3 Rust + 946 JavaScript tests, TypeScript, Rust formatting/Clippy, and generated API catalog pass. Initial repository lint has zero errors and 228 warnings, mostly generated copies. Motion dock geometry and custom controls were checked locally; no whole-interface pixel-parity certification. B23, B27, B31, B32, B33 and B35 remain open.

## Frame enclosure follow-up — 2026-10-30

- [x] **Drawing or dragging an ordinary frame around existing layers adopts fully enclosed sibling trees (local implementation).** Captured groups/components keep their descendants and visible positions. Partial overlaps, hidden/locked trees, protected component destinations, sections and generated grid cells are excluded; existing grid drop placement remains unchanged. Creation/movement and adoption are one atomic undo step. Drop targeting avoids placing a large enclosing frame inside a smaller frame it surrounds.
- Verification: 3 Rust + 934 JavaScript tests pass, including eight enclosure cases covering components, rotation, nesting, page isolation, partial overlaps, no-op moves and history. Editor build, formatting and changed-code lint pass (13 existing app.js warnings). Browser checks confirm draw, frame-label drag, hierarchy, undo/redo and reload persistence. Live Figma inspection confirms draw-to-enclose; drag-to-enclose is the user's requested extension. Evidence: `.local/frame-containment/`. Desktop installation is recorded separately after verification; no public release is claimed.
- Installation verification (2026-10-30): both local app copies updated to **0.1.1-alpha.9** and pass strict macOS signature verification. Native About confirms alpha.9, and the saved Territory Track document reopened on Components · Button. The installed bundle includes the new canvas calls and both engine operations. Alpha.8 rollback copies are retained in `.local/frame-containment/desktop-backup/`. This is a local installation; the frame change has not been published.

## Icon coverage follow-up — 2026-10-30

- [x] **Territory Track icon names represented in PixlPrfct (local implementation).** Added 133 original symbols to PixlPrfct Icons 0.9.0, bringing the catalog to 679. The editor is synced with the canonical source, fonts and searchable aliases. The source inventory maps 599 web, shared-library, avatar, dashboard/assistant and iOS references to 313 symbols, with no missing targets; five non-icon helper values are explicitly excluded. All previous names, drawings and codepoints are preserved.
- Verification: 3 Rust + 926 JavaScript tests pass; all six fonts, three weights, SVG exports, new-path bounds and reproducible rebuilds pass. All additions were inspected at 16/24 px and as SVGs. See `docs/TERRITORY_ICON_COVERAGE.md` for scope and the live source check. SF fill states map to the same symbol in the chosen PixlPrfct weight; application provider migration and exact third-party artwork matching are separate. No public release is claimed.
- Installation verification (2026-10-30): both local desktop copies updated to **0.1.1-alpha.8**, with alpha.7 rollback copies retained. Strict macOS signature verification passes. The saved document reopened; the running icon library shows **679 icons**, and `brain.head.profile` finds and renders the new `brain-profile` symbol. Proof: `.local/icon-coverage/desktop-icon-catalog.png` and `.local/icon-coverage/desktop-icon-coverage.png`. This is a local installation, not a published release.

## Performance follow-up — 2026-10-30

- User reports sluggish canvas interaction, property/page changes and AI/MCP work. Added B33 below, retaining it as partially improved until expensive layout previews are further reduced.
- The 727-layer document exposed repeated whole-layer color serialization, redundant MCP commits, shadow repainting on every pan, repeated frame-label DOM rebuilding, and full revision serialization from the connection-status timer. These paths are optimized; pointer redraws coalesce into animation frames.
- Measured pan redraw medians improved from **11–23 ms to 0.4–0.6 ms** on three pages; a comparable 20-update MCP batch improved from **2.80 s to 1.05 s**. Engine text update/preview improved from **54–57 ms to 34–36 ms**. The resulting saved document is byte-identical between baseline and optimized engines. See `docs/PERFORMANCE.md` for method, fidelity checks and limits.
- Validation: **3 Rust + 924 JavaScript tests**, editor/desktop builds, catalog check, Rust formatting and zero lint errors (13 existing warnings). Local alpha.7 package passes deep/strict macOS signature verification. Native About confirms **0.1.1-alpha.7**; the saved project reopened and a fresh real MCP client read all **727 layers, 87 components, 121 variables, 14 effect styles and 10 pages** after automatic connection. The open browser editor was also reloaded with the new assets. The alpha.6 app and profile are preserved in `.local/alpha-7-update-backup/`. No public release is claimed.

## Alpha review follow-up — 2026-10-30

- Incoming review: approximately 87 components, 121 variables, 14 effect styles and 10 pages; 30 tool issues reported with 14 closed. The prior **24-entry repository checkpoint below is historical**, not an assertion that the incoming list had only 24 issues. New reports are retained below without dropping older unresolved items.
- Current reconciled B checklist: **23 of 34 entries addressed; 11 open**. This expands the incoming reports with separately tracked UI and visual gaps. Checked entries include local implementation/verified existing behavior and do not mean every feature has shipped publicly; B23 remains open for real sleep acceptance.
- The five acceptance priorities are idle recovery, paged reads, parsing named variants, text styles, and variable-bound shadow colors. Implemented in the current checkout, with core/MCP coverage; inspector pickers for text styles and shadow variables remain pending. This is not a team-readiness or full Figma-parity certification.
- Verified: 3 Rust + 919 JavaScript tests; generated catalog (91 commands / 46 models); changed-code lint has zero errors and 13 existing app.js warnings. Real WebSocket tests cover server restart, stable-session reconnect, interrupted writes without replay, and a **simulated** 40-minute clock advance with hung discovery. A real long-duration OS sleep soak remains pending.
- Visual evidence: live Figma button-label inspection, then native canvas/CSS comparison on a copy of the 727-layer, 10-page Territory Track document. Screenshots are in `.local/ui-audit-2026-10-30/`. Existing authored styles/variables were not migrated; TerritoryIQ and design-file tasks remain separate.
- Local alpha.6 package builds and passes deep/strict macOS signature verification. The previous app and profile are retained in `.local/alpha-6-update-backup/`. Installation/runtime verification is recorded separately below; no public release is claimed.
- Installed/runtime verification (2026-10-30): native About confirms **0.1.1-alpha.6** and the saved document reopened. A real stdio MCP client read all **727 layers in 15 pages**, with an **8,603-character default response**, and confirmed **87 components, 121 variables, 14 effect styles, 10 pages**. Native page navigation preserved the revision; native editor reload automatically reconnected with the same live session ID and rejected the old cursor/revision. Revision tokens now include a runtime epoch, preventing pre-reload writes being accepted after a counter reset. Proof: `.local/ui-audit-2026-10-30/live-mcp-proof.json`. Claude was fully quit/reopened; process checks confirm its old MCP processes exited and new ones use this checkout. No prompt was sent to Claude, so its original conversation's own tool call remains a user acceptance check.

---

## Tally checkpoint — 2026-10-29

- Scope confirmed by the user: work on **B (PixlPrfct)**; keep **A and C tracked**.
- B: **14 of 24 current checklist entries addressed; 10 remain open.** This includes the new component-variant workflow and verified Assets grouping. The newly received repeat MCP-disconnection report remains open; earlier closures and installation notes are retained.
- `[x]` preserves a closed report; the note states whether it is fixed locally, verified existing behavior, or shipped. Never delete completed entries. Append new gaps and retain earlier resolution notes if an item reopens.
- These new fixes are on `codex/design-system-gaps`, in the managed `design-system-gaps` checkout. **Local closure is not a claim of deployment or installation.** New runtime features need an editor build/reload and an MCP restart. Existing design-file content has not been migrated.
- Validation: editor build; complete suite of 3 Rust + 885 JavaScript tests after integrating PR #28 and the native-control stroke follow-up; MCP catalog drift check; changed JavaScript lint (0 errors, 2 pre-existing unused-import warnings). Browser import showed a long-label main component at 240 × 40 with both axes Hug and unclipped text. This is functional verification, not certification of pixel-perfect UI parity.
- MCP reconnect follow-up (2026-10-29): automatic desktop discovery, reconnect/backoff, heartbeat recovery, browser reload/back-navigation recovery, and concurrent agent ports are implemented in [draft PR #29](https://github.com/ninefingerwoodshop-ops/pixlprfct/pull/29). The installed app and running MCP processes still need the updated build; closure here records the tested implementation, not deployment.
- Authoring details and supported formats: `docs/MCP.md`. Regression coverage: `tests/design-system-gaps.test.mjs` and `tests/mcp-server.test.mjs`.
- Desktop update installed (2026-10-29): **0.1.1-alpha.4** is running on this Mac with the updated local editor assets and MCP runtime. Claude connected automatically; reloading the editor restored the connection without pairing. Two independent stdio MCP launches also discovered and read the same 8-page, 613-layer design automatically. Original app/profile backups were retained. This is a local prerelease installation, not a public release or a merged PR.
- Variant follow-up (2026-10-29): editor build and desktop 0.1.1-alpha.5 package pass; 3 Rust + 904 JavaScript tests pass, including new creation/undo/persistence/duplication/library cases. Browser checks covered Create component, Add variant, Combine as variants, property rename/value editing, adding a second property, instance switching, Assets grouping, and reload persistence. MCP catalog: 87 commands / 45 models. Changed-code lint has no errors; the existing app.js warnings remain.
- Variant installation follow-up (2026-10-29): **0.1.1-alpha.5 is installed and running** on this Mac, with a rollback copy of alpha.4 and the app profile. The native About panel confirms the version; Current variant and Add variant controls are present. Claude was reloaded to restart its MCP process and reconnected automatically without pairing. A fresh real stdio MCP client verified `add_variant` and `combine_variants`, automatically connected, and read the unchanged 8-page, 613-layer design. All three GitHub checks passed for implementation commit `0b23550`. The B23 idle/sleep recurrence remains open.
- Keep incoming additions from the Desktop source when reconciling this repository snapshot. Update entries in place, preserving history.

---

## A. Codebase gaps (TerritoryIQ) — fix in code

### Buttons
- [ ] **Two button specs disagree.** `.btn` (_nf-globals.scss) + `--btn-*` tokens vs the shared `ttBtn` component (app/shared/button). The design file follows `.btn` / `--btn-*`.
  - Primary bg: `--btn-primary-bg` = navy-700, `ttBtn` = navy-600
  - Primary hover: `--btn-primary-bg-hover` = navy-600, `ttBtn` = navy-800
  - Secondary border: `--btn-secondary-border` = navy-700, `ttBtn` = `--border-strong`
  - Size: `.btn` = 42px / 16px text / padding 0 16; `ttBtn` = 40px / 14px text / padding 8 12
- [ ] **`ttBtn` primary/outline/tertiary hard-code primitives** (`--tt-navy-600/800`, `--hero-fg`), so they ignore dark mode.
- [ ] **`ttBtn` secondary active uses `color-mix(text 25%, surface)`.** This has no token and can't be represented in design tools.
- [ ] **`_misc.scss` globally overrides `.btn--secondary`** (border none, 14px, padding 0 12). It loads after `_nf-globals`, so every secondary loses its border.
- [ ] **`_button.scss` is 100% commented out.** Dead file; delete it or restore it.

### Tokens
- [ ] **Type scale duplicates:** `--text-xs`, `--text-sm`, `--text-lg` and `--text-base` are all 1rem (16px). Only base, xl, 2xl and 3xl are distinct.
- [ ] **Radius duplicates:** `--radius-xs/-lg/-xl/-2xl` are all 0.75rem (12px). `--radius-xs` is larger than `--radius-sm`, which is backwards.
- [ ] **`--brand-accent` / `--brand-accent-rgb` mismatch (light):** `_theme.scss` sets `--brand-accent: pin-500` but `--brand-accent-rgb: 16 42 71` (navy channels). The comment above it says aliases are being re-routed to navy, yet the hex stays orange.
- [ ] **Focus ring and nav indicator: docs vs code.** The brand rule says Pin orange marks focus rings. Code uses navy-700 in light mode and pin-50 in dark (`--border-focus`, `--focus-ring`, `--nav-indicator`). Pick one and update the other.
- [ ] **Leftover Tailwind blue:** `--primary-hover: #1d4ed8` and `--primary-subtle: #eff6ff` aren't navy. Anything using `--accent-hover`/`--accent-subtle` inherits blue. Gradient fallbacks also reference `#f7941d` / `#2563eb`.
- [ ] **`--border-strong` uses `color-mix()`.** It resolves to #748ca6 (light); this isn't portable to iOS or design tools, so store the resolved hex.
- [ ] **Legacy palettes still shipped:** `--color-*` (Tailwind ramps), `--badge-*`, `--event-*`, `--persona-*`, `--google-*` and the `purple/indigo` extras. They weren't brought into the design file.

### Forms & inputs
- [ ] **`tt-input` focus border hard-codes `--tt-navy-400`.** It's a primitive, not a semantic token, so it doesn't adapt to dark mode. Add an `--input-border-focus` token.
- [ ] **`--input-border` (#e5dfd5) is effectively unused/contradicted.** `tt-input` uses `--border-strong` for its resting border (per the WCAG 3:1 comment), so `--input-border` would fail contrast if anything still uses it. Remove it or repoint it to `--border-strong`.
- [ ] **`tt-input` hover border uses `--text-muted`.** That's a text token used as a border; add `--input-border-hover`.
- [ ] **Focus ring opacity (0.2) and width (4px) are magic numbers** in `input.component.scss`. Tokenize them, e.g. `--focus-ring-width` and `--focus-ring-alpha`.
- [ ] **Disabled treatment is inconsistent:** buttons use opacity 0.5, inputs use 0.6 plus a `--surface-hover` fill. Pick one rule.
- [ ] **Field error text is 16px (`.field-error`)** while label and hint are 13px. Errors render larger than their labels.
- [ ] **`.form-group` gap conflict:** `_nf-globals.scss` sets 0.5rem, then `_misc.scss` (loaded later) sets 0.25rem, and a media block in `_nf-globals` sets 0.5rem again. The effective gap depends on breakpoint and load order.

- [ ] **Checkbox/radio hover and focus use `--secondary`**, not `--focus-ring` / `--border-focus`. Focus color differs between inputs, buttons and checkboxes.
- [ ] **Checkbox/radio shadow is raw `rgba(0,0,0,0.18)` (0 0 12px)** with no token, and it's heavier than `--shadow-badge`.
- [ ] **A third disabled opacity:** checkbox/radio use 0.4 (buttons 0.5, inputs 0.6).
- [ ] **Checkbox/radio size (24px) and radius (6px) aren't tokens.** 6px isn't in the radius scale (4/8/12).

- [ ] **Two toggle implementations disagree:**
  - global `.toggle` (_nf-globals): 40×24 track, 18px thumb, off = `--border`, disabled 0.45, focus = `--secondary` outline
  - shared `tt-toggle`: 46×24 track, 20px thumb, off = `--border-strong`, disabled 0.6, focus = 4px ring

  The design file follows `tt-toggle`. 0.45 is a fourth disabled opacity.
- [ ] **`tt-select` variant styles hard-code primitives** (`--tt-navy-400/600/800`, `--hero-fg`) for focus/open and its dark variants, so they don't adapt to dark mode. It's the same issue as `tt-input`.
- [ ] **Select's "selected" checkmark is green (`--success-text`)** while every other selection indicator (checkbox, radio, toggle) is navy `button/primary`. Pick one.
- [ ] **Select panel min-width is 300px (18.75rem)** but the trigger's min-width is 100px, so the panel can be much wider than its trigger.
- [ ] **Select chips use `color-mix(... 10%, transparent)`.** That background has no token.
- [ ] **Button xs (13px) and lg (17px / 1.0625rem) text sizes** aren't on the type scale.

### Search & tags
- [ ] **Two search inputs disagree:** the global `.search-input` uses radius 4, 16px text, a `--secondary` focus border and a 2px `--secondary-muted` ring. The shared `tt-search` uses radius 8, 14px text, a navy-400 border and a 4px ring at 20%. The design file follows `tt-search`.
- [ ] **`tt-search--lg` is 46px**; inputs and selects use 48px for lg. Its lg text stays at 14px.
- [ ] **`tt-tag` tones use the legacy Tailwind `--badge-*` palette** (e.g. success = #ecfdf5 / #065f46). The semantic `--success-bg` / `--success-text` (#e5f1e1 / #173404) aren't used, so tags and alerts show two different greens, ambers, reds and blues. The design file binds tags to the `status/*` tokens.
- [ ] **The `tt-tag` neutral tone hard-codes `--tt-navy-900` + `--hero-fg`**, so it doesn't adapt to dark mode.
- [ ] **`tt-tag` purple and pink tones have no semantic token** (they're Tailwind `--badge-purple/pink`). They were left out of the design file.
- [ ] **Three badge shapes coexist:** `tt-tag` (pill, 14/500), `tt-type-badge` (radius 4, 13/600) and `.brand-badge` (radius 4, 14/600, `color-mix` colors).
- [ ] **The tag remove button's hover uses raw `rgb(255 255 255 / 0.18)`**, which is invisible on light tones.

- [ ] **No shared sidebar/nav component.** The `--nav-*` tokens are used ad hoc in feature SCSS (settings, billing, route planner), often through `color-mix(--nav-indicator 10–15%)`. There's no canonical nav item to model in the design file.
- [ ] **`tt-tabs` hover uses `color-mix(surface 55%, transparent)`**, which has no token.
- [ ] **Toast info accent uses `--accent`** (navy). Toasts have no warning tone, though status/warning exists.
- [ ] **`.card` uses radius 8 + `--shadow-card`; `tt-info-card` uses radius 12 + `--shadow-lg`.** These are two card treatments.
- [ ] **`tt-modal` title falls back to `--text-base, 0.9375rem`**, which resolves to 16px; the 15px fallback is stale.
- [ ] **`announcement-banner` hard-codes primitives and Tailwind** (`--tt-navy-600/800`, `--tt-trail-rust`, `--color-red-700`, `#fff`), so it doesn't follow the theme.

### Type & spacing
- [ ] **Body default text (14px) has no token.** It's set directly on `body` in `_base.scss`, while `--text-sm` is 16px.
- [ ] **No heading-size tokens.** `_tokens.scss` only sets heading font-family (Lato); h1–h6 sizes aren't tokenized.
- [ ] **`--page-padding` / `--section-gap` = 1.125rem (18px)** sits off the 4px spacing grid. Use 16px or 20px, or document the exception.

### Dark mode
- [ ] **About 10 stacked `[data-theme="dark"]` blocks in `_nf-globals.scss`.** Later `:root` presets already clobbered earlier dark values once (the comment admits it). The cascade is fragile; consolidate into one block.
- [ ] **Dark status fills keep their light values** (`--success`, `--warning`, `--danger` and their `-hover` variants). This is intentional for white-on-fill, but it isn't documented as a token rule.

### Cross-platform
- [ ] **Web → iOS tokens are hand-synced** (`_tokens.scss` → `Theme.swift` / `BrandTokens.swift`). iOS has fewer tokens and nothing diffs them.

---

## B. PixlPrfct MCP / editor limitations — report or work around

- [x] ~~**No variable aliasing.** Semantic variables (TT Color) hold hex copies instead of pointing at TT Primitives, so changing a primitive does NOT cascade.~~
  - B1 — Verified existing support (2026-10-29). Semantic values accept `{alias: primitive_id}`, including across collections. Added MCP examples and verified primitive edits, mode changes, bindings, undo, and persistence. Existing hex copies in the design file still need conversion (section C is outside this task).
- [x] ~~**No text auto-width via MCP.** `sizing: "auto_width"` is rejected. Button labels are fixed at 56px, so editing the Label property to longer text will clip unless you resize the label in the editor.~~
  - B2 — Fixed locally (2026-10-29). MCP create/update accept `typography.sizing: "auto_width"` and `"auto_height"`; serialized values remain `width` / `height`. Longer labels resize their button and instances. Verified with automated tests and real-font browser rendering. Existing fixed labels are not silently migrated.
- [x] ~~**`create_component` reset the frame's `hug_width` to false.** Re-set after the fact.~~
  - B3 — Verified / root cause addressed (2026-10-29). Component conversion preserves Hug. Fill children force their parent to Fixed; B4 prevents intrinsic labels acquiring Fill during layout inference. Regression covers conversion, growing labels, instances and undo.
- [x] ~~**`auto_layout_selection` sets existing children to fill width.** This collapsed the label to 0 until reset.~~
  - B4 — Fixed locally (2026-10-29). Auto-width text retains intrinsic width and text-only vertical wrappers hug. Fixed children that span the available width retain the existing Figma-style Fill inference; use direct `auto_layout` properties for exact authored sizing.
- [x] ~~**Child x/y are absolute page coordinates**, even inside frames. Creating children of a frame not at 0,0 misplaces them silently.~~
  - B5 — Fixed locally (2026-10-29). MCP create accepts `coordinate_space: "parent"`, converting x/y once from the parent’s stored origin. The backwards-compatible default and update/engine coordinates remain world coordinates. Auto layout still governs flow children. Placement and atomic rejection are tested.
- [x] ~~**`duplicate` offsets the copy by +24/+24.** It has to be repositioned after duplicating.~~
  - B6 — Fixed locally (2026-10-29). New `duplicate_many_offset(ids, xOffset, yOffset)` supports `0,0` and exact translations while preserving descendants and bindings. Interactive duplicate retains its +24/+24 offset. Verified undo and legacy behavior.
- [x] **Effect styles: fixed in PixlPrfct 0.1.1-alpha.3.** 14 styles saved and linked: shadow/xs, sm, card, md, lg, xl, 2xl, modal, badge, kanban-card, focus/ring, focus/outline, control/soft, focus/outline + control/soft. Components use them (focus states, select menu, toggle thumbs, checkbox/radio).
- [x] ~~**Still no text styles via MCP.** Typography is only number/string variables plus the specimen page.~~
  - B7 — Partially closed (2026-10-29). **Effect styles completed in [PR #28](https://github.com/ninefingerwoodshop-ops/pixlprfct/pull/28)** (`save_effect_style`, `apply_effect_style`, `remove_effect_style`); the implementing chat reports desktop 0.1.1-alpha.3 and MCP verified. **Text styles remain open.** The original combined report is now tracked as separate effect- and text-style entries above.
  - Resolution (2026-10-30, local core/MCP): `save_text_style`, `apply_text_style` and `remove_text_style` share family/size/weight/line height across pages and instances, preserve local alignment/sizing, detach on font edits, and remap/protect library definitions. Atomic rollback, propagation, persistence, exports and libraries tested. A text-style inspector picker and letter spacing/case are still separate gaps.
- [x] ~~**`save_effect_style` with a layer_id only works when that layer is on the active page** ("Select a layer on this page"). Each page has to be selected first.~~
  - B20 — Newly tracked (2026-10-29); not resolved in the reconnect fix.
  - Resolution (2026-10-30, local): save-and-apply now looks up the layer across all pages, retaining the visible page and existing instance/library protection.
- [x] ~~**Stroke color variable bindings export as hard-coded hex** in HTML/CSS export. Fills and text export as `var(...)`.~~
  - B8 — Fixed locally (2026-10-29). HTML/framework exports retain `var(...)` for solid strokes, stacked paints, inside/outside masks, per-side borders and native controls, preserving alpha. Regression covers HTML, React, Vue and Angular. Standalone SVG intentionally remains a resolved snapshot.
- [x] ~~**Number variables export unitless** (`--px-space-4: 16`, not `16px`). They need `calc(var(...) * 1px)` to use in CSS.~~
  - B9 — Resolved as documented contract (2026-10-29). Generic number tokens must remain unitless for opacity, font weight and line height. Existing length bindings automatically export `calc(var(...) * 1px)`; tests verify actual width output. Custom CSS must supply its intended unit. No blanket px suffix was added.
- [x] ~~**`stroke_color` rejects 8-digit hex (alpha).** Use `stroke_opacity` instead.~~
  - B10 — Fixed locally (2026-10-29). MCP create/update accept `#RRGGBBAA` and normalize to RGB + stroke opacity. Explicit `stroke_opacity` wins. Malformed colors reject atomically. Raw engine commands and serialized files still use separate fields.
- [ ] **Text wrap breaks mid-word.** Long token names on swatches split, e.g. "bg-hov / er".
  - B11 — Open (2026-10-29). Current layout deliberately breaks an overlong unbreakable token at grapheme boundaries; CSS uses overflow-wrap:anywhere. Auto-width text avoids this unless max_width constrains it. A selectable word-breaking policy and the reported swatch layout still need verification/fixing; no closure claimed.
- [x] ~~**Reference docs gaps:** the variable `Value` format and `sizing` enum values aren't documented; model lookups fail when querying more than one name at once.~~
  - B12 — Fixed locally (2026-10-29). Reference includes typed Value literals/alias format, sizing values, coordinates and alpha contracts. Model searches accept arrays, comma-separated names and whitespace-separated exact model names. Verified both the runtime reference and an actual MCP client request.

- [x] ~~**Edits made in the editor bump the revision** (even switching pages), so MCP writes fail with "Revision conflict" until the document is re-read.~~
  - B13 — Resolution (2026-10-30, local): page navigation is excluded from the content revision. Content edits still invalidate stale writes. Optional `page` on build/command scopes creation independently of the user's visible page; page restoration and revision/cursor behavior are tested.
- [x] ~~**`read` without `ids` returns the whole document** (over 100k characters, truncated) with no pagination. Use `ids` or `query`.~~
  - B14 — Resolution (2026-10-30, local): default 50, maximum 200 layers; filter/revision-bound cursors plus offset pagination, totals and `hasMore`. Full reads page shapes and explicitly mark partial documents. A 125-layer fixture verifies 50/50/25 pages without duplicates or omissions, and stale-cursor rejection. Exports remain separately tracked below.
- [ ] **Input components use fixed widths (280px)** with no stretch/fill constraint, so instances don't resize to a container's width.

- [x] ~~**Shadow colors can't bind to variables.** Focus rings built as spread shadows use fixed hex (white gap + navy ring), so they don't switch in Dark mode.~~
  - B16 — Resolution (2026-10-30, local core/MCP): `DropShadow.color_variable` and `bind_shadow_color` resolve color aliases and page/frame modes, including reusable effect styles and instances. Bindings survive reorder/library remapping; literal edits and token deletion detach safely; CSS export retains tokens. Tests cover all these paths. Inspector variable picking is pending; existing fixed-color styles need deliberate design-file migration.
- [x] ~~**Publishing the library is UI-only:** Assets → Manage libraries → This file → Publish (needs the self-hosted workspace). The MCP can create main components and sets but can't publish or confirm how Assets lists them.~~
  - B17 — Resolution (2026-10-30, local): `pixlprfct_libraries` lists bounded releases, links and grouped Assets entries, and supports publish/add/update/remove with revision, project identity and existing source permissions. Local device publication no longer requires self hosting. Real WebSocket browser regression verifies publish/discover/add/place/remove and protected edits; headless catalogs are explicitly unsupported.
- [x] ~~**Variant masters use Figma-style names** ("Checked=Off, State=Default"). If Assets lists masters by layer name rather than by set, Checkbox and Radio variants will look identical; check the Assets panel.~~
  - B18 — Verified (2026-10-29). Assets shows one card per component set, named for the set, with a custom variant dropdown displaying property/value pairs. Verified in the live editor after creating two variants with State and Size properties; the Assets count was one component. Automated asset grouping/search regression passes.

- [x] ~~**Pen/vector stroke color is set through `fill`**, not a stroke property. It's unintuitive, but it binds to variables fine.~~
  - B19 — Resolution (2026-10-30, local): newly drawn vectors and MCP vector creation initialize explicit fill/stroke appearance. `appearance.stroke_color` controls the stroke independently of fill; legacy fallback remains compatible. Regression verifies open-pen stroke enablement/color, no fill, SVG output and saved-file round trip. All vector tests pass.

- [x] ~~**MCP keeps dropping its connection and requires manual reconnection.** It should connect to PixlPrfct automatically.~~
  - B21 — Fixed locally (2026-10-29). Desktop local and allowed team-server workspaces discover running MCP servers automatically, including changed ports/codes after restarts. Connections recover after interruptions, reloads, back-navigation and silent stalls. Multiple agents can connect without default-port collisions. Explicit Disconnect remains paused until Connect; old sessions cannot edit a different project, and interrupted edits are never replayed. Normal browser editors remember pairing for the current tab/project but still need a fresh code after a server restart. Real WebSocket restart recovery and lifecycle regression tests pass; final validation: 3 Rust + 898 JavaScript tests, editor/desktop bundle build, MCP catalog check, and changed-code lint with zero errors or warnings. Requires an updated desktop/editor and MCP server; the installed build is not yet updated.
  - Installation follow-up (2026-10-29): installed desktop 0.1.1-alpha.4 plus editor/MCP runtime on this Mac. Verified automatic Claude connection, editor reload recovery, and discovery after two fresh server launches. No manual pairing was required; the design remained at 8 pages and 613 layers.

- [x] ~~**Create components with variants just like Figma.** The editor needs direct creation, combining, and property-editing workflows.~~
  - B22 — Implemented and tested (2026-10-29). Create component → Add variant now creates a visible component set automatically. Multiple sibling main components can Combine as variants. The inspector shows set Properties and editable Current variant values; instances use shared custom dropdowns. Set containers have purple outlines and four-diamond labels; Assets groups variants. Add/combine are atomic undo steps; set/page duplication, save/reload, instance text overrides and published-library remapping are covered. Live Figma set/variant/property-popover references were inspected; measured controls are 24px with 16px inspector inset. This closes the core authoring workflow, not every Figma component feature or a certification of whole-app pixel parity. Desktop 0.1.1-alpha.5 is now installed; the native inspector and updated MCP commands were verified. See the installation checkpoint above.

- [ ] **The live MCP connection drops on its own** (twice in about 40 minutes on 2026-10-29, roughly 35–40 minutes after pairing). The bridge URL and pairing code stay the same (the server didn't restart), so the editor tab is what's disconnecting, possibly from idling or sleep. A batch in flight fails with "Live editor session not connected". Add auto-reconnect, or a longer-lived pairing for the same tab.
  - B23 — Newly tracked recurrence (2026-10-29). Keep open pending reproduction of the reported idle/sleep failure on the installed reconnect build. The earlier B21 implementation and validation history are preserved; this report is not closed by the variant work.
  - Acceptance evidence (2026-10-30, local): the real socket transport remained connected for 40 wall-clock minutes (2,400,113ms), answered a read, then reconnected and answered another read after a bridge restart. Script: `npm run test:idle`; log: `.local/evaluation-fixes/mcp-idle.jsonl`. This uses a headless editor and does not put the OS to sleep; keep open for installed-app OS sleep/wake verification.
  - Installed follow-up (2026-10-30, alpha.11): automatic reconnection and full paged read pass after app replacement; the saved design is preserved. `npm run test:sleep` reached ready state, then was stopped without a qualifying sleep/wake result. No user action is pending; B23 remains open for OS-sleep verification. A ready probe is not a passing sleep result.
  - Targeted fix (2026-10-30, local): hung discovery no longer blocks heartbeat/retry work; focus/visibility/online wakes recovery; desktop background throttling is disabled; authenticated reconnect preserves the tab/project session ID within a running server. Real-socket simulated sleep/reconnect and no-replay tests pass. **Retained open for a real long-idle/OS-sleep acceptance test**, rather than equating simulated elapsed time with a completed soak.

- [x] ~~**`combine_variants` ignores `Property=Value` names and creates Property 1.**~~
  - B24 — Resolution (2026-10-30, local): parses multiple comma-separated properties, preserves key order, accepts reordered keys on later members, and rejects incomplete/duplicate combinations atomically. Existing plain-name inference remains supported. Regression verifies property values, undo and persistence.
- [x] ~~**`save_component_set` creates sets with no visible canvas container.**~~
  - B25 — Resolution (2026-10-30, local): sibling mains get a padded set frame automatically, including inactive-page saves. Undo restores the original hierarchy. Legacy cross-page sets remain logical metadata because they cannot share one canvas container.
- [x] ~~**`set_variant_property` only works on instances.**~~
  - B26 — Resolution (2026-10-30, local): main components now edit their own variant values; instances still switch matching variants. Invalid names and duplicate combinations reject atomically.
- [x] ~~**Typography lacks letter spacing and uppercase/text case.**~~
  - B27 — Incoming review (2026-10-30). Still open; text-style support does not close these missing font attributes.
  - Resolution (2026-10-30, local): letter spacing in px/% and text case now persist in Rust, propagate through styles/components, drive sizing and Canvas/SVG/CSS, and expose working inspector controls. New model tests and the browser style/create/edit/reload test pass; live Figma reference and Type settings baseline reviewed. Advanced typography remains separate.
- [ ] **Instances reportedly ignore a main component's no-fill setting.**
  - B28 — Incoming review (2026-10-30). Current-engine regression verifies no fill both before instantiation and after toggling the main. The reported file/UI path is not yet reproduced; retain open, with no speculative engine change or closure.
- [x] ~~**Full exports can exceed a million characters.**~~
  - B29 — Incoming review (2026-10-30). Paged reads resolve normal inspection, but export responses still need chunking/file-oriented retrieval. Prefer page/selection exports meanwhile; this is a workaround.
  - Resolution (2026-10-30, local): large exports return a bounded file manifest and 256–64,000-character chunks. Cursors pin revision and scope and never split surrogate pairs; changed documents/options reject. `tests/export-chunks.test.mjs`, reconstructed MCP/runtime exports and design-system export tests pass. Small exports retain `files[].text`. This is a source/build fix, not an installed or public release.
- [x] ~~**Canvas button labels sit above the CSS-rendered text position.**~~
  - B30 — Resolution (2026-10-30, local): complete line-height boxes and measured alphabetic baselines now drive Canvas/SVG/inline editing. Fixed labels no longer shift upward; wrapped text retains the full final line and blank paragraphs. Compared the actual button page in native canvas and CSS modes after inspecting live Figma; regression covers top/center/bottom alignment, sizing and baseline metrics. This does not certify every text/font combination.
- [ ] **Page background display and set-label placement need further visual parity work.**
  - B31 — Observed (2026-10-30): the Page inspector displays a static F5F5F5 swatch while the workspace is dark; some authored dark headings are consequently hard to read. Set labels can overlap adjacent authored content. Keep UI theme independent from document paint; do not recolor the design file as a workaround.
  - Partial resolution (2026-10-30, local): replaced the static swatch with per-page background color, opacity and visibility. Duplicate/undo/validation/serialization and browser page-switch/reload checks pass. Document paint remains independent from the dark UI theme. Set-label overlap remains open.
  - Follow-up (2026-10-30, installed alpha.11): live Figma measured at 53%, 28% and 3%; label font/line height, icon size/gap and projected-width clipping updated. The reported Table Row collision is suppressed when its automatic label overlaps other root artwork; Layers remains available. Browser collision/select/rename/zoom/reload checks and a reviewed baseline pass. This suppression is a PixlPrfct safeguard, not verified Figma collision-algorithm parity, so retain the broader placement item open.
- [x] ~~**Text-style and shadow-variable inspector pickers are missing.**~~
  - B32 — Explicit remaining UI scope (2026-10-30). New core/MCP features are functional; corresponding inspector affordances need live Figma inspection and implementation before UI parity can be claimed.
  - Resolution (2026-10-30, local): live Figma inspected; text style create/apply/edit/detach/delete and shadow-variable collection/search/list/grid selection/detach added. Engine/style propagation and actual browser selection/reload pass; reviewed picker baselines verify the implemented surfaces. No whole-interface parity or installation claim.
  - Upgrade diagnosis (2026-10-29): Claude’s window reload left a pre-update MCP process on port 63512 alive while PixlPrfct connected to a newer process. Claude still reported an empty session list. The previous installation check established a connection to a server, but did not verify the server used by the affected conversation. Fully quitting and reopening Claude removed the old processes; both newly launched servers were automatically discovered and each had an established desktop socket. The app showed 2 connected agents. This corrects the earlier verification claim. After the user authorized a read-only check in the original Claude conversation, Claude called its PixlPrfct tools and confirmed “It’s connected now,” one live session, and 613 layers with nothing edited. The stale-process upgrade mismatch is resolved and verified end to end; the original idle/sleep recurrence remains open.

- [ ] **Editor feels clunky and slow across canvas, properties/pages and MCP edits.**
  - B33 — Reported and partially improved (2026-10-30, local alpha.7): bounded canvas caching, stable frame-label DOM, direct color resolution, reduced instance/MCP work, coalesced drawing and cheap connection-status updates. Pan redraws and 20-edit batch timings improve substantially (see performance checkpoint). Large layout previews still take approximately 36 ms before drawing, so retain open for further incremental-layout profiling; do not equate the measured speedup with universal 60 fps.
  - Follow-up (2026-10-30, local): transaction-local structure/order caches, linear parent ordering and move-based history preserve the exact private benchmark document hash. Name edit 32.4→30.5ms, position preview 35.3→33.1ms, 20-edit batch 1059.5→967.7ms. Public content-edit/width-preview benchmark added; see PERFORMANCE.md. Remains open for complex-document latency.
  - Follow-up (2026-10-30, installed alpha.11): phase profiling found ~16.7ms in whole-document property pruning. Parent-indexed target checks, shared serialization for write guards and elimination of an immediate duplicate validation reduce name edits to 15.3ms, previews to 17.9ms and a 20-edit batch to 647.3ms. Benchmark snapshot hash is unchanged. Actual content edits measure 14.27ms median and width previews 17.30ms. B33 remains open because preview time still exceeds the frame budget before drawing.

- [x] **Component slots: editable content inside linked instances.**
  - B34 — Resolution (2026-10-30, local alpha.10): nested-frame conversion and selection wrapping, unbound Slot properties, default/modified content, arbitrary child layers and independent nested instances, reset/clear, preferred instances, advisory min/max limits, empty-slot targets, and counter-axis fill are implemented. Custom content survives main updates, duplication, same-file clipboard, save/reload, library use, and matching slot properties on variant swaps. Engine structure protection still applies outside slots. Live Figma reference and browser interaction evidence are in `.local/slots/`; 12 slot regressions and the complete 3 Rust + 946 JavaScript suite pass. Both local desktop bundles were updated and strict signature checks passed; this is not a published release or merged change.
- [ ] **Remaining slot parity details.**
  - B35 — Tracked (2026-10-30): rich-text description formatting, bulk authoring across variants, and native .fig slot metadata import remain outside the verified implementation. Existing Button/Input design-file slot work below remains open; adding editor support does not migrate those components.

- [x] ~~**A stale local-project tab silently overwrites newer saved edits.**~~
  - B36 — Confirmed (2026-10-30, local current build): opened the same fresh starter draft in two browser tabs, renamed it in A and observed “Saved on this device,” then clicked All projects in unchanged B. Projects showed the old name again. `LocalDrafts.put` replaces the stored body without checking the version originally opened by the caller; an independent storage reproduction confirms the overwrite. This affects entire document bodies. Add local conflict detection and recovery, including navigation/lifecycle saves. Evaluation evidence: `docs/PROJECT_EVALUATION_2026-10-30.md`. No fix or release claimed.
  - Resolution (2026-10-30, local): compare against the body opened by this tab, serialize writes with Web Locks, skip unchanged stale snapshots, and retain conflicting edits until copied/exported. Browser tests verify untouched-tab navigation preserves newer work and conflicting edits can become a separate project; local persistence regressions pass.

- [x] ~~**Local save failure lacks unsaved-work protection on close/reload.**~~
  - B37 — Code-inspected (2026-10-30): failed local persistence changes status text, while the unload warning applies only to cloud sessions. Local edits after the last successful save can be lost if storage writes fail and the tab closes/reloads. Existing storage tests verify preservation of the older saved copy, not recovery of newer unsaved edits. Browser quota exhaustion was not induced during evaluation. Track the successful local-save acknowledgment, expose recovery/export, and verify the failure-and-close flow. No fix or release claimed.
  - Resolution (2026-10-30, local): successful-save acknowledgment, dirty unload protection, per-tab recovery snapshots and visible retry/copy/download/latest actions added. Chromium injects QuotaExceededError on durable writes, verifies the unload guard and recovery record, reloads, and verifies successful retry. If both browser stores fail, export/keeping the tab open remains necessary; no storage-capacity migration claimed.

- [ ] **Unselected/page inspector lacks Figma's document Styles surface.**
  - B38 — Observed (2026-10-30, current alpha.11 workspace): live Figma exposes Styles with Text, Color and Effect sections when nothing is selected. PixlPrfct exposes page variable modes and onboarding/selection tips instead (`web/index.html:114`). Existing layer text/effect pickers work; this entry concerns the page-level style browsing/management workflow and its visual parity. Native Figma and local browser screenshots are recorded in the current reassessment in `docs/PROJECT_EVALUATION_2026-10-30.md`. No implementation, matched-viewport pixel certification or release claimed.
  - Partial resolution (2026-10-30, local): added page-level Text/Color/Effect categories, slash groups, create/edit/rename/duplicate/delete, keyboard actions and linked color styles. Inspected live Figma's 241px inspector, 32px rows, inline text metrics, Create style menu and 304px creation forms. Three new browser baselines plus create/apply/edit/reload and nested gradient-picker checks cover these states. Page variable modes remain a separate existing section; Animation/Layout guide creation is not included in this new menu, nested folder/group commands and advanced paint thumbnails remain parity work. Keep open for these differences and exhaustive matched-state pixel verification.


- [x] ~~**Add another published library to the project already being edited, from PixlPrfct or Figma.**~~
  - B39 — Resolution (2026-10-30, local): device/workspace discovery, portable `.pixllib` releases, Add to file, protected linked assets, updates and import into existing local projects implemented. Figma `.fig` imports retain supported components/variant sets/variables/styles as snapshots. Real Capwah import: 46 masters, 11 sets, 15 variables and 12 styles; manual add/placement plus four browser library scenarios pass. Existing document/page/artwork and saves survive import and updates.
  - Boundaries: no live Figma catalog/URL sync; raw Figma/Pixl reimports create separate snapshots. Native Figma nested instances detach and exposed properties/slots/mixed text have disclosed limitations. Shared projects require an external file to be imported/published as a source in that workspace before consumption. These are explicit workflow limits, not cross-workspace permission bypasses.

### Current remaining verification notes

- Integration verification (2026-10-31, local source): the 727-layer browser gate
  measured 78.9 ms median / 83.6 ms p95 in a serial run (100 ms limit). Browser
  workers are serial so concurrent scenarios do not distort this latency gate.
  Fixed first-edit Undo in a live session by updating controls after personal
  history is recorded; the two-user edit/undo/conflict scenario passes. These
  checks do not close the remaining B33 frame-time or B38 visual-parity gaps.

- B33: the earlier local serial run passed the 100ms browser release gate; the later cross-environment follow-up below exceeds it. Universal 16.7ms frame time also remains unproven.
- B38: advanced paint thumbnails now use the actual stacked-paint renderer, including variable/opacity/gradient/pattern resolution. Folder/group operations, other style categories and exhaustive pixel parity remain open.

---

## C. Design file to-dos

- [x] Button sizes xs (28) / sm (36) / lg (48) for Primary + Secondary — Button set now has a Size property
- [ ] Button variants: ghost, outline, tertiary, quicklink, text-danger, icon/circle
- [x] Button Focus state (Primary + Secondary)
- [ ] Button icon slot (leading/trailing)
- [ ] Dark-mode preview frame on the Button page
- [x] Typography specimen page (headings Lato, body Open Sans) — page "Foundations · Type & Spacing"
- [x] Spacing specimen page — same page
- [x] Input component set (Default, Hover, Focus, Error, Disabled, Read-only) + form-field examples — page "Components · Input"
- [ ] Input sizes: sm (32), lg (48); leading-icon and clear-button slots
- [x] Select (6 states) + Select menu + Textarea (4 states) — page "Components · Toggle, Select & Textarea"
- [x] Search component set (Default/Hover/Focus/Disabled) + Tag set (Neutral/Success/Warning/Danger/Info) — page "Components · Search & Tag"
- [ ] Danger button sizes/focus; Input/Select/Search sm & lg sizes; removable Tag; Tag purple/pink (pending token decision)
- [ ] **No semantic token for the neutral tag** (navy-900 bg). The design file binds it to the primitive `navy/900`; add something like `tag/neutral/bg`.
- [x] Checkbox + Radio component sets (Off/On × Default/Hover/Focus/Disabled) — page "Components · Checkbox & Radio"
- [x] Toggle component set (Off/On × Default/Focus/Disabled)
- [ ] **J:** publish the library from Assets → Manage libraries so other projects can use these components
- [ ] Cards, nav, alerts/banners, table rows, modal

## Team workflow follow-up — 2026-10-30

- [x] **Safe shared editing with explicit ownership and handoff.** Local alpha.13 implementation adds server-enforced 90-second leases, renewal, request/release/handoff, revision and membership fencing. UI and MCP share the edit gate. Slow uploads after handoff/revocation are rejected. Simulated authenticated API and browser checks pass; simultaneous co-editing remains a separate open feature.
- [x] **File viewer/commenter/editor roles and attributed review.** Share manages existing workspace members; copying a link grants no anonymous access. Review threads support replies, resolve/reopen and page/layer navigation without changing artwork revisions. Synthetic accounts only; no real-user messages sent.
- [x] **Useful protected library instances.** Authors opt into exposed text/visibility, size/layout and same-set variants. Source definitions, styling, hierarchy and detaching remain protected. Engine/UI/MCP/server share the guard; accepted overrides survive reload and a published update. Defaults remain protected.
- [x] **Simulated team recovery acceptance.** Four isolated browser contexts plus an unauthorized API account exercise roles, handoff, offline recovery, persistent server restart and restored SQLite backup. The existing configured PostgreSQL schema was separately backed up and additively migrated with unchanged design content/revision. See `docs/TEAM_SIMULATION_2026-10-30.md`.
- [ ] **Remaining team workflow scope:** simultaneous multiplayer editing, canvas comment pins, mentions/notifications/activity inbox, cross-workspace/public sharing, real SMTP and managed-provider restore drill, and independent human usability/adoption evidence. Human participant count is zero.

- Installation checkpoint (2026-10-30, alpha.13): both existing local desktop bundle paths updated; native About and strict signatures verified. The reopened one-frame Territory Track document exactly matches its fresh pre-update normalized digest via MCP. The local team server was restarted after a private PostgreSQL backup/additive migration; existing design content/revision unchanged. 3 Rust + 985 JS tests and 23 browser scenarios pass across the full and targeted runs; catalog 100 commands / 51 models / 14 tools. No public release, real participants, simultaneous co-editing or managed-provider restore certification claimed.

### Team follow-up resolution — 2026-10-30, alpha.14 local

Preserves the alpha.13 checkpoint above; these are additional local resolutions,
not a public-release claim or TerritoryIQ code/design-file changes.

- [x] **Mentions, activity inbox and reviews:** durable unread state, recipient
  filtering, notification preferences and revision-bound request/approve/change
  decisions. Authenticated API and separate-browser simulations pass.
- [x] **First team workflow:** invitation recipient validation and joining,
  shared-project guidance, location clarity and first-library links. Browser test
  verifies the intended workspace and wrong-recipient recovery.
- [x] **Library lifecycle:** release notes and immutable history, change previews,
  consumer pins, retirement, permission-filtered project usage and rollback as a
  new release. API and browser lifecycle checks pass.
- [x] **Simultaneous editing:** field-level merges, explicit collision choices,
  session-specific undo, presence/cursors, retained local recovery and membership
  fencing. Two authenticated browsers verify independent edits, undo and
  disconnect collisions. One-second polling; character-level CRDT parity is not
  claimed.
- [x] **Managed PostgreSQL restore drill:** consistent backup restored into an
  isolated temporary PostgreSQL 17 cluster. Before migration all 19 tables match;
  the first scheduled backup after migration matches all 26 tables. Existing
  design content/revision digest is unchanged after repeating the migration.
- [x] **Operational readiness in the local installation:** private daily backups
  enabled, readiness endpoint, administrator status, SMTP transport check and
  persistent notification retry queue. Real email delivery still needs SMTP.
- [ ] **Public release gates:** Developer ID certificate/private key and
  notarization credentials on this Mac, HTTPS feed/artifact hosting, real SMTP
  delivery, and a signed update/rollback drill. Paid Apple membership is confirmed;
  `security find-identity` still reports zero usable signing identities.
- [ ] **Remaining distinct scope:** canvas comment pins, cross-workspace/public
  sharing, exhaustive Figma parity, universal 60 fps, long production soak and
  independent human usability evidence. Human participant count remains zero.

Evidence and precise local/shipped status: `docs/TEAM_RELEASE_WORK.md` and
`.local/team-next/`. This closes the implemented portions of the mixed
“Remaining team workflow scope” entry above; the open subitems are retained here.

- Installation evidence (2026-10-30, alpha.14): both existing desktop paths
  updated with the local arm64 build; native About, strict ad-hoc signatures and
  update-configuration message verified. All four local projects remain; Territory
  Track matches its fresh pre-update normalized digest after automatic MCP
  reconnect. The local team server is healthy with private daily backups enabled.
  Public signing/notarization and real email/update delivery remain open above.

## Scope correction and MCP setup — 2026-10-30 (local)

The user clarified that each team sets up its own infrastructure. This supersedes
the earlier publisher SMTP / mandatory HTTPS update-host gate above. A public
Mac installer still needs Developer ID signing and notarization. Automatic
updates are optional; a team’s production SMTP and DNS/TLS are that installation’s
acceptance requirements. Local trials need neither SMTP nor an update service.

- [x] AI-assisted installation tools: opt-in directory access, redacted setup
  plans, stable-secret configuration updates, revision checks, migrations,
  native trial lifecycle, Docker orchestration, health/mail checks, backup and
  isolated verification. Real stdio MCP acceptance uses synthetic accounts and
  confirms persistence across restart. Evidence: `.local/team-next/mcp-setup-tests.log`.
- [ ] Real Docker daemon deployment and team-provider delivery/TLS verification.
  Docker is unavailable on this Mac; command contracts do not establish a real
  deployment. Human participants remain zero. See MCP_SETUP.md.

These are local source changes; the installed alpha.14 app and existing team
database were not replaced or reconfigured by this follow-up.

- Cross-environment follow-up (2026-10-31, source verification): the completed
  final GitHub Linux browser run passed 48 functional scenarios but the 727-layer
  latency scenario measured 142–148.7 ms p95; macOS measured 219.3–221.4 ms. Both
  exceed the 100 ms target. macOS passed 47 scenarios and the library import
  scenario passed on retry. Local serial evidence above remains valid; B33 stays
  open for broader performance.
  Automatic CI workflows and required status checks were removed at the
  owner’s request. This policy change does not resolve the performance gap.

## Product evaluation and roadmap — 2026-11-01 (planning only)

Evaluated Design and SVG Animation against alpha.20 source (`ffbea1a`). See
[the evaluation](PRODUCT_EVALUATION_2026-11-01.md) and
[Pen workspace proposal](PEN_WORKSPACE_PROPOSAL.md). No product gap is resolved
by this planning pass, and no new editor feature was implemented or shipped.

- [x] ~~**B40 — SVG object-body dragging does not translate artwork.**~~ Originally reproduced
  in the sample Core: a body drag leaves X/Y at zero and creates no undo entry.
  Numeric position controls work; resize/rotation handles are already in
  alpha.20. Evidence: `.local/product-evaluation-2026-11-01/svg-drag-does-not-move.png`.
  - Local resolution (2026-11-01, not shipped): object-body dragging updates X/Y
    at the playhead with one undo entry; Shift constrains movement, arrows nudge
    focused canvas selection. Five browser workflows verify save/reopen, nested
    transforms/zoom, selected groups with motion paths, no-op/cancel/seek/blur,
    and read-only/lease-release protection. Existing resize and rotation remain.
    Evidence: `.local/svg-editing/body-drag.png` and `svg-animation-move.spec.mjs`.
- [x] ~~**B41 — SVG import replaces artwork and clears tracks without an Add vs
  Replace choice.**~~ Code-inspected in `web/svg-animation.js` `importSvg`.
  Same-session Undo was available; the initial evaluation made no irreversible-loss claim.
  - Earlier checkpoint (2026-11-01, local source only; superseded below): `svg-animation-import.js` prepared
    Add/Replace changes without mutating the input. Add preserves existing IDs,
    tracks, origins and canvas dimensions, remaps incoming local references, and
    retains the imported viewport/default paints. Four Chromium cases pass,
    including persistence and animated export. The module was not yet connected
    to editor controls, so B41 remained unresolved. Live Figma inspection for the
    next UI work was blocked by the locked Mac; B40 was also still open.
  - Local resolution after unlock (2026-11-01, not shipped): nonempty files now
    offer Add to canvas (default), Replace artwork, and Cancel through the shared
    custom dropdown. Add preserves existing animation and canvas dimensions;
    Replace explicitly clears tracks/origins and adopts the imported canvas.
    Both are one undoable change. Nine browser cases cover merge/reference
    isolation, sanitization/limits, export, dialog geometry, cancellation,
    undo/redo/reopen, drop/desktop import, stale documents and edit leases.
    Evidence: `.local/svg-editing/import-choice.png`; import and import-ui specs.
- [ ] **B42 — SVG authoring lacks ordinary Pen/Pencil, base-path node editing,
  multi-object construction and a complete layer organization workflow.**
  Morph-keyframe editing and imported groups/masks already work. The owner
  requested a pen-icon cursor and movable right-side toolbar, matching the
  bottom toolbelt, with Pen/Pencil tools and stroke/fill controls synchronized
  with the inspector. This was a proposal at the initial evaluation.
  - [x] ~~B42a — Ordinary SVG Pen and icon cursor.~~ Local resolution (2026-11-01):
    corner/cubic drawing, open/closed paths and continuation from either endpoint.
  - [x] ~~B42b — Core base-path anchor editing.~~ Local resolution (2026-11-01):
    anchor/handle drag and nudge, curve-preserving midpoint insertion, deletion,
    and smooth/corner conversion. Split/join followed in B42e; multi-node editing
    remains open.
  - [x] ~~B42c — Movable palette and synchronized paints.~~ Local resolution
    (2026-11-01): pointer/keyboard movement, Home reset, viewport clamping and
    shared fill/stroke/opacity/weight controls; enforced read-only/editing leases.
  - Evidence: six new Chromium drawing scenarios, mathematical cubic-subdivision
    and reversal checks, save/reopen/export/undo coverage; live Figma reference
    and rendered result in `.local/svg-pen/`. See [SVG guide](SVG_ANIMATION.md).
    Source only, not installed or shipped; full B42 remains unchecked for
    joining separate elements, whole-path smoothing, multi-object construction
    and layer organization.
  - [x] ~~B42d — SVG Pencil with adjustable freehand smoothing.~~ Local resolution
    (2026-11-01): Shift+P, 0–100% smoothing reused from Design, editable cubic
    handles, round stroke ends, Shift-constrained straight lines, shared paints,
    one-step undo, persistence/export and edit-lease protection. Six new Chromium
    cases cover geometry, limits, cancellation, history and permissions; two new
    model cases cover conversion and atomic bounds. Live Figma reference and
    rendered result: `.local/svg-pencil/figma-pencil.png` and `verified.png`.
    This smooths new strokes; it does not resolve whole-path smoothing or Brush.
    Local source only, not installed or shipped.
  - [x] ~~B42e — Split/open paths and join endpoints within one SVG path element.~~
    Local resolution (2026-11-01): preserve cubic segments and element identity,
    join either endpoint orientation, merge coincident endpoints or add straight
    bridges, with one-step undo, export/reopen and Morph/edit-lease protection.
    Joining separate elements remains open. Live Figma reference and rendered
    result: `.local/svg-topology/figma-vector-toolbar.png` and `verified.png`.
    Local source only, not installed or shipped.
  - [x] ~~B42f — Discoverable open Pen completion and path deletion.~~ Local
    resolution (2026-11-01): visible Finish path label and Enter guidance; open
    Pen paths can be followed by another animated object. Delete/Backspace from
    the canvas/layer list and inspector/palette trash actions remove the selected
    path and its tracks, with undo. Text fields, timeline keys and editing leases
    retain their protections. Local source only, not installed or shipped.
  - B42e/f evidence: six Chromium topology/open-path/deletion workflows and five
    model cases; all 83 SVG browser cases pass across the broad and corrected
    focused runs, with 3 Rust and 1,050 JavaScript tests passing. See the
    [dated delivery record](SVG_ANIMATION.md#2026-11-01--splitjoin-and-open-path-workflows-local-source)
    and `.local/svg-topology/` logs. Full B42 remains open for the scope above.
  - [x] ~~B42g — Live Pen strokes, ordinary open completion and stage picking.~~
    Local resolution (2026-11-01): real stroke/next-segment preview; Escape or
    Select preserves an open path; explicit Discard cancels. Direct canvas
    selection includes thin painted strokes at different zooms. Five new browser
    cases cover paint, transformed picking, history, continuation and read-only
    selection. Supersedes the earlier draft-Escape behavior; source only.
- [ ] **B43 — Design and SVG Animation lack a direct editable handoff.** The
  separate document/motion models require manual artwork exchange. SVG also
  lacks Design's coediting, comments, libraries and MCP access. Scope each
  integration independently; do not remove existing safety or lease boundaries.

- [ ] **B44 — Detachable sections and independent panel windows.** Owner request
  (2026-11-01) explicitly chooses windows outside PixlPrfct.
  - [x] ~~B44a — SVG Animation panels.~~ Local implementation: every inspector
    section, Elements, Timeline and Pen tools can detach and dock with current
    controls/selection, shared history and enforced editing leases. Eight browser
    workflows cover live edits, dropdowns/colors, timeline, closing, blocked
    popups, header dragging, easing/timing and read-only access. Native Electron
    acceptance verifies actual independent windows, docking, close restoration
    and native-menu undo/redo with sandbox/isolation retained. See the latest
    [SVG delivery record](SVG_ANIMATION.md#2026-11-01--live-strokes-stage-selection-and-separate-panels-local-source).
    Local source only; no installed or shipped release claim.
  - [x] ~~B44b — Integrate the separate Design workspace.~~ Local resolution
    (2026-11-01): Pages, Layers, Assets, Drawing tools, Motion timeline and inspector
    sections use independent windows with shared controls/history. Browser checks
    exercise selection, edits, Undo, dropdowns/popovers, Pages and Motion transitions.
    See [panel delivery and evidence](DETACHABLE_PANELS.md). No installed/shipped claim.
  - [ ] B44c — Save panel arrangements and support grouped docking.
    - [x] ~~Save panel arrangements.~~ Local resolution (2026-11-01): window
      position/size and SVG Pen right-dock preference survive refresh/restart.
      Native acceptance verifies cursor-following drag, release, exact restored
      bounds, and clearing saved windows on explicit docking. Evidence:
      `.local/design-panels/native-layout.json`.
    - [ ] Grouped docking and named workspace presets remain open.
  - [x] ~~B44d — SVG compact sidebar when Elements is detached.~~ Local resolution
    (2026-11-01): 48 px column of five icons with shared tooltips for Projects,
    Import SVG, Download, Show Elements and Dock Elements. Browser checks cover
    layout, tooltips, docking and refresh restoration.

  - [x] ~~B44e — Parent-only tear-outs and icon flyouts.~~ Local resolution
    (2026-11-01): Layers/Pages, Assets, Inspector, Drawing tools, Elements, Pen
    tools and Timeline have appropriate parent icons. Collapse saves an icon
    dock; an icon opens its live panel beside the strip without a new window.
    Repeat click, outside click or Escape dismisses it. Child sections travel
    with the parent. This owner-requested scope **supersedes** the per-section
    behavior recorded in B44a/B44b; their completed work and evidence are retained.
    `design-panels.spec.mjs` and `svg-animation-panels.spec.mjs` verify live edits,
    adjacent geometry, dismissal, restoration and distinct window tear-out.
    Follow-up (2026-11-01, local): collapse/expand arrows now point toward the
    future state for left, right and bottom docks; a browser check exercises
    both actions and confirms their opposite glyphs.
- [x] ~~B45 — SVG gradient animation and independent gradient rotation.~~ Local
  resolution (2026-11-01): linear/radial fill and stroke paints, per-element
  gradient rotation separate from object rotation, timed stop colors/positions/
  opacity, add/delete static stops, flip/90° rotation, shared-definition isolation,
  save/reopen, Undo and native animated SVG export. Two model and four browser
  tests cover interpolation, validation, imported inheritance, independence,
  native export matrices, persistence, detached Inspector stop edits, and named/currentColor/alpha preservation. New/live controls follow
  the inspected Figma gradient structure; keyframe controls are an extension.
  Angular/diamond gradient animation is outside this delivery. Local source
  only; not included in published alpha.20.

B33 remains open using the later cross-environment evidence. B31/B35/B38 remain
partly unresolved. B36/B37 recovery fixes and completed B39 library workflows
remain credited. Main Design already has Pen, Pencil, anchors and gradients;
the SVG authoring gap does not reopen those completed capabilities. TerritoryIQ
and design-file work remain tracked separately.

Verification: full unit suite passed (3 Rust + 1,040 JavaScript); targeted SVG
model/controller run passed 36 tests. Browser spot checks and source inspection
support the findings above; no new performance or complete UI parity claim.

### Panel and gradient verification closeout — 2026-11-01, local source

B44e and B45 follow-up verification: 22 final feature browser checks pass, plus
four gradient checks after imported color/opacity resolution was finalized.
Native parent-window acceptance passes cursor tracking, refresh/restart bounds
and explicit docking. Full units pass (3 Rust + 1,053 JavaScript); the broader
137-workflow browser run had 129 initial passes and eight subsequently corrected
and passing rechecks. Production build, typecheck, changed-file lint (no errors),
generated API and diff checks pass. Evidence and exact run scope are recorded in
[Detachable panels](DETACHABLE_PANELS.md#verification-closeout--2026-11-01-local-source).
These remain local changes, not a published alpha.20 update or complete parity.

B44e follow-up (2026-11-01, local source): the owner reconfirmed parent-only
tear-outs. Completed an icon audit of all five parents in both Design and SVG
Animation, including window headers, compact Show/Dock actions, sidebar project
actions and save recovery. Fixed tooltip overlap with the next icon and kept
renaming available while compact. See the [parent icon audit](DETACHABLE_PANELS.md#complete-parent-icon-audit--2026-11-01-local-source).
Grouped docking and named workspace presets remain open; no shipped release
or Figma/Adobe parity claim is added.

B44e follow-up (2026-11-01, local): left drawers now keep the logo first and the
collapse/expand toggle immediately below it in both states, above project
actions. Parent headers stay visible during scrolling. All 21 panel browser
checks pass (`.local/design-panels/top-toggle-browser.log`); live previews were
refreshed. No release was published.

B44e header refinement (2026-11-01, local): SVG's expanded toggle shares the
logo row. Design's duplicate logo is removed and its expanded toggle follows
the document-title dropdown. Compact toggle ordering is retained. Live browser
captures: `.local/design-panels/inline-toggle-{svg,design}.png`.
Verification: three focused browser checks passed initially; the Design parent
audit passed after fixing the Assets title-row visibility. ESLint and diff
checks pass. This remains local source only.

B44e audit evidence (2026-11-01, local): 21 panel and 13 existing editor browser
checks passed, followed by two expanded parent checks for simultaneous docks and
inactive detached panels. Eleven tooltip/desktop units, typecheck, production
build, and native window restoration passed. Both browser previews are updated.

### Alpha.21 release follow-through — 2026-11-01

The completed SVG drawing/editing/import, parent panel workspace and independent gradient animation work is included in [Windows alpha.21](https://github.com/ninefingerwoodshop-ops/pixlprfct/releases/tag/v0.1.1-alpha.21). Earlier local completion entries remain historical evidence; uncompleted child items remain open. [Panel Workspace](wiki/Panel-Workspace.md) documents the final parent-only scope and icon flyouts.

Release source validation: 3 Rust + 1,053 JavaScript tests, 143 browser workflows, 25 final panel/site checks, production build, types, generated API, lint and Rust formatting/Clippy. Native panel acceptance verifies cursor following, stop-on-release, refresh/restart restoration and explicit docking. Package provenance, checksums and Windows verification are recorded with the release. This does not claim full interface parity, real sleep/wake, a participant pilot, or resolution of TerritoryIQ code/design-file work.
