# Territory Track Design System — Gaps & Limitations

Running list from building the PixlPrfct design system (project: "Territory Track Design System").
Last updated: 2026-10-29

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
- [ ] **Still no text styles via MCP.** Typography is only number/string variables plus the specimen page.
  - B7 — Partially closed (2026-10-29). **Effect styles completed in [PR #28](https://github.com/ninefingerwoodshop-ops/pixlprfct/pull/28)** (`save_effect_style`, `apply_effect_style`, `remove_effect_style`); the implementing chat reports desktop 0.1.1-alpha.3 and MCP verified. **Text styles remain open.** The original combined report is now tracked as separate effect- and text-style entries above.
- [ ] **`save_effect_style` with a layer_id only works when that layer is on the active page** ("Select a layer on this page"). Each page has to be selected first.
  - B20 — Newly tracked (2026-10-29); not resolved in the reconnect fix.
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

- [ ] **Edits made in the editor bump the revision** (even switching pages), so MCP writes fail with "Revision conflict" until the document is re-read.
- [ ] **`read` without `ids` returns the whole document** (over 100k characters, truncated) with no pagination. Use `ids` or `query`.
- [ ] **Input components use fixed widths (280px)** with no stretch/fill constraint, so instances don't resize to a container's width.

- [ ] **Shadow colors can't bind to variables.** Focus rings built as spread shadows use fixed hex (white gap + navy ring), so they don't switch in Dark mode.
- [ ] **Publishing the library is UI-only:** Assets → Manage libraries → This file → Publish (needs the self-hosted workspace). The MCP can create main components and sets but can't publish or confirm how Assets lists them.
- [x] ~~**Variant masters use Figma-style names** ("Checked=Off, State=Default"). If Assets lists masters by layer name rather than by set, Checkbox and Radio variants will look identical; check the Assets panel.~~
  - B18 — Verified (2026-10-29). Assets shows one card per component set, named for the set, with a custom variant dropdown displaying property/value pairs. Verified in the live editor after creating two variants with State and Size properties; the Assets count was one component. Automated asset grouping/search regression passes.

- [ ] **Pen/vector stroke color is set through `fill`**, not a stroke property. It's unintuitive, but it binds to variables fine.

- [x] ~~**MCP keeps dropping its connection and requires manual reconnection.** It should connect to PixlPrfct automatically.~~
  - B21 — Fixed locally (2026-10-29). Desktop local and allowed team-server workspaces discover running MCP servers automatically, including changed ports/codes after restarts. Connections recover after interruptions, reloads, back-navigation and silent stalls. Multiple agents can connect without default-port collisions. Explicit Disconnect remains paused until Connect; old sessions cannot edit a different project, and interrupted edits are never replayed. Normal browser editors remember pairing for the current tab/project but still need a fresh code after a server restart. Real WebSocket restart recovery and lifecycle regression tests pass; final validation: 3 Rust + 898 JavaScript tests, editor/desktop bundle build, MCP catalog check, and changed-code lint with zero errors or warnings. Requires an updated desktop/editor and MCP server; the installed build is not yet updated.
  - Installation follow-up (2026-10-29): installed desktop 0.1.1-alpha.4 plus editor/MCP runtime on this Mac. Verified automatic Claude connection, editor reload recovery, and discovery after two fresh server launches. No manual pairing was required; the design remained at 8 pages and 613 layers.

- [x] ~~**Create components with variants just like Figma.** The editor needs direct creation, combining, and property-editing workflows.~~
  - B22 — Implemented and tested (2026-10-29). Create component → Add variant now creates a visible component set automatically. Multiple sibling main components can Combine as variants. The inspector shows set Properties and editable Current variant values; instances use shared custom dropdowns. Set containers have purple outlines and four-diamond labels; Assets groups variants. Add/combine are atomic undo steps; set/page duplication, save/reload, instance text overrides and published-library remapping are covered. Live Figma set/variant/property-popover references were inspected; measured controls are 24px with 16px inspector inset. This closes the core authoring workflow, not every Figma component feature or a certification of whole-app pixel parity. Desktop 0.1.1-alpha.5 is built; installation verification follows.

- [ ] **The live MCP connection drops on its own** (twice in about 40 minutes on 2026-10-29, roughly 35–40 minutes after pairing). The bridge URL and pairing code stay the same (the server didn't restart), so the editor tab is what's disconnecting, possibly from idling or sleep. A batch in flight fails with "Live editor session not connected". Add auto-reconnect, or a longer-lived pairing for the same tab.
  - B23 — Newly tracked recurrence (2026-10-29). Keep open pending reproduction of the reported idle/sleep failure on the installed reconnect build. The earlier B21 implementation and validation history are preserved; this report is not closed by the variant work.

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
