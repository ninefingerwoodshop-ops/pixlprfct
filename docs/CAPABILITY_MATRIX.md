# Capability and verification matrix — 2026-10-30

This is the current status source for `roadmap.json` and `inspector-parity.json`.
“Implemented” means code exists and the cited local checks pass. It does not mean
complete Figma parity, an installed update, a merged branch, or a public release.

| Capability | Engine / MCP | Interactive UI | Visual evidence | Installed / released |
| --- | --- | --- | --- | --- |
| Published libraries | Device publication, portable releases, protected ID remapping, release updates and bounded live MCP operations | Add to an existing local project; shared workspace libraries retain permission boundaries | Live Figma 760×640 modal inspected; real component thumbnail baseline; four browser workflows | Installed alpha.12; local verification below |
| Figma library snapshots | Components, native variant sets, variables, shared styles and min/max bindings | Import `.fig`, review limitations, Add to file, insert from Assets | Real file: 46 masters / 11 sets / 15 variables / 12 styles; manual and worker/browser checks | No live Figma catalog/URL sync; see LIBRARIES.md |
| Local projects and recovery | Version-aware writes; cross-tab Web Locks; per-tab recovery; conflict copies and export | Create/edit/reopen, stale tab, conflict copy, quota failure/reload tested in Chromium | Recovery dialog inspected manually | Installed locally in alpha.11; no public release |
| Pages | Navigation, search, reorder, duplicate and history | Inline list; Find; 32px rows; keyboard/pointer resize; page paint | Live Figma inspected; geometry assertions and screenshot baseline | Installed locally in alpha.11; no public release |
| SVG path authoring (2026-11-01) | Browser SVG base geometry; shared Design Pencil smoothing; no Rust/MCP path-authoring API | Pen, Pencil with 0–100% smoothing/Shift constraint, core anchor editing, split/join within one element, live painted open paths, direct stage selection, open motion routes, path deletion, movable shared-paint palette; history, export, persistence and leases | Live Figma vector/Pencil tools inspected; rendered palette reviewed; 18 drawing/Pencil/topology browser workflows and cubic-preservation model checks | Local source only, not published alpha.20; joining separate elements, whole-path smoothing and multi-object workflows remain open |
| SVG independent panels (2026-11-01) | Shared in-memory editor state/history, no duplicate document writer | Every SVG inspector section, Elements, Timeline and Pen tools: tear out, edit, dock and close | Browser workflows and screenshots in `.local/svg-stage/`; native acceptance tracked in SVG guide | Local source only; extended by the shared Design/SVG panel delivery below |
| Shared panel workspace (2026-11-01) | One editor/history, cross-window controls and local UI preferences | Design sections/Pages/Layers/Assets/tools/Motion; cursor-following tear-out, saved bounds, SVG Pen right docking and compact icon rail | [Panel delivery](DETACHABLE_PANELS.md); browser acceptance plus actual Electron refresh/restart and window-position verification | Local source and development preview only; grouped docking remains open |
| SVG object movement and import (2026-11-01) | Parent-space transform tracks; bounded SVG merge with local-reference remapping | Body drag/nudge, Shift constraint; Add/Replace/Cancel, one-step undo, reopen, file drop/desktop import and edit leases | Live Figma selection/menu/modal inspected read-only; 14 browser cases and rendered geometry checks | Local source only, not published alpha.20; live Figma drag gesture and full parity not certified |
| Typography | Letter spacing in px/% and case; text style propagation; sizing, Canvas/SVG/CSS; .fig attribute conversion | Spacing, Type settings, style creation/application/edit/detach | Live Figma inspected; picker and Type settings baselines | Installed locally in alpha.11; no public release |
| Page Styles | Named color styles, text/effect styles, component inheritance and library ID remapping | Unselected Text/Color/Effect browse/create/edit/rename/duplicate/delete, fill/stroke application and detach | Live Figma inspected; three new baselines and nested-picker regression | Installed locally in alpha.12; no public release |
| Bounded MCP exports | Revision/scope cursors, manifest, 64,000-character maximum chunks | Consumers concatenate chunks; small responses retain complete file text | Unicode and runtime reconstruction tests | Installed alpha.12; large-export consumers must follow cursors |
| Page paint | Per-page color, opacity and visibility; validation, duplicate, undo, serialization | Editable swatch/hex/opacity/visibility | Live Figma inspected; page-switch/reload test | Installed locally in alpha.11; no public release |
| Shadow variables | Bindings, aliases and inherited modes already supported | Custom/Libraries picker, collection/search, swatches, detach; available in effect styles | Live Figma inspected; dark rows and swatch assertions, baseline | Installed locally in alpha.11; no public release |
| Components, sets, variants and slots | Implemented; inheritance, protection, swaps, property editing, set containers, slot content | Variant switching and slot editing/reset pass browser tests | Prior live-reference records; no exhaustive parity claim | Alpha.11 installed; root-label overlap suppressed; broader label parity remains |
| Multiple paints, gradients, strokes and effects | Implemented and covered by paint/stroke/effect tests | Existing custom controls | Prior reference records; complete menu coverage remains open | Prior local functionality; no new release verified |
| Transform, frame and layout tools | Rotation, frame enclosure, flex/grid and constraints implemented | Existing controls and canvas manipulation | Prior targeted checks | Prior installed alpha.10 includes frame enclosure |
| Motion | Keyframes and export implemented | Full-width dock, time ruler, animation properties in inspector; keyframe edits, collapse/expand and resize tested | Screenshot baseline; whole Motion parity remains open | Prior functionality; no new release verified |
| Cloud/team storage and self hosting | File roles, exclusive editing leases, commit fencing, attributed review and recovery | Share, request/release/handoff, comments/replies/resolve, author-approved library overrides | Live Figma references; five synthetic actors, four browser contexts, restart/SQLite restore | Alpha.13 local server and desktop updated; simultaneous co-editing remains absent |
| Desktop | Electron packaging, native menus, discovery and boundary tests implemented | Existing macOS installation | Prior native About/signature records | Alpha.13 installed in both existing bundle paths; About, signatures and saved-design preservation verified |
| MCP connection resilience | Reconnect/discovery and real-socket regressions pass | Prior installed reconnect behavior | 40-minute real-time transport idle and bridge restart/read passed; OS sleep not tested | Real OS sleep remains unverified |
| Performance | Indexed pruning, conditional protected-library guards, reused persistence snapshots | Direct edit paint, stable-page raster cache, fewer forced layouts and DOM writes | Isolated headless 727-layer browser gate: 54.2ms median / 58.4ms p95 | 100ms p95 gate passes; B33 remains open for broader 16.7ms frame objective |
| Regression gates | 3 Rust + 985 JavaScript tests; 100 commands / 51 models / 14 MCP tools | 23 Chromium scenarios including latency and simulated teams pass | Ten reviewed macOS screenshot baselines | Local production build passes; no remote CI result claimed |

Remaining scope includes complete Figma visual/workflow parity, advanced typography
and links, masks/Boolean workflows, broader SVG interoperability, exhaustive set-label placement parity,
slot rich descriptions/bulk authoring/native .fig slot metadata, complex-document
latency and real OS-sleep acceptance. The new Page Styles surface still has menu/group differences; stacked-paint thumbnails are implemented. Existing unresolved
reports remain in [the gap tally](TT-Design-System-Gaps.md). TerritoryIQ application
and design-file changes remain separate.

## Repeating the checks

- `npm run build` then `npm test`, `npm run lint`, `npm run typecheck`,
  `cargo fmt --all --check`, `cargo clippy --all-targets --all-features -- -D warnings`,
  and `node scripts/generate-editor-api.mjs --check`.
- `npx playwright install chromium` then `npm run test:browser` runs isolated local
  projects against a fresh editor build on port 4198. No user profile is used.
  Quota failure is deliberately injected at the browser Storage boundary; the
  application’s actual recovery and unload handlers run unchanged.
- `npm run test:browser:update` is an explicit baseline-maintenance command. Inspect
  every changed image before accepting it. CI never updates baselines.
- Screenshot comparisons run on macOS 15 with pinned Playwright/Chromium, a
  1440×1000 viewport, device scale 1, dark theme and reduced motion. External requests
  are blocked. Linux runs functional checks; its pixels are not compared with Mac
  baselines. [Playwright documents platform-specific snapshots](https://playwright.dev/docs/test-snapshots).
  The visual job uses GitHub's [macos-15 Apple Silicon runner](https://docs.github.com/en/actions/reference/runners/github-hosted-runners).
- `npm run benchmark:editor` creates a public 727-layer fixture. Supply a `.pixl`
  path after `--` for another document. Results are measurements, not universal FPS.
- `npm run test:idle` waits 40 real minutes, reads the connected document, restarts
  the MCP bridge, wakes discovery and verifies another read. It uses the real
  socket transport with a headless editor; it does **not** put the OS to sleep or
  certify the installed browser's background behavior. A separate installed-app
  sleep/wake run is still required for B23.

## Boundaries

Recovery retains unsaved snapshots in sessionStorage and warns on unload. If both
browser stores are unavailable, the user must keep the tab open or download a copy;
this is not an IndexedDB migration or a guarantee against browser/OS process loss.
Visual baselines detect regressions in these states. They are not pixel-diff
certification of the entire Figma product.

Idle acceptance result: started 2026-10-30 14:12:35 UTC, passed after
2,400,113 ms, bridge restart/reconnect read succeeded, `osSleepTested: false`.
Evidence is retained in `.local/evaluation-fixes/mcp-idle.jsonl`. Final local lint:
0 errors, 56 existing warnings; generated editor copies are excluded.

## Alpha.11 installation — 2026-10-30

Both existing local app bundle paths now contain the ad-hoc-signed Apple Silicon
alpha.11 build. About and deep/strict signature checks pass. A real stdio MCP
client connected automatically and read the reopened 724-layer / 10-page user
design, retaining 87 components, 121 variables and 14 effect styles. Comparison
against the pre-update backup found only the app's existing load-time device-
chrome defaults on seven frames; after that explicit migration all document
content matches. The private 727-layer performance fixture is a separate copy.

App/profile backups and proof are under `.local/evaluation-fixes/`. No public
release, merge or remote CI result is claimed. `npm run test:sleep` is now a
read-only installed-app acceptance probe: leave exactly one saved editor open,
start the command, manually sleep the Mac for 40 minutes, then wake/unlock it.
It requires actual macOS Sleep/Wake log events, the same live session, and the
same document digest; it never changes power settings. Ctrl+C cancels it.
The probe reached ready state and was then stopped without a qualifying sleep/wake result. Actual OS sleep acceptance remains unverified; no user action is pending.


## Historical daily-work acceptance status — 2026-10-30

The public complex fixture has five pages and 727 layers, including variants,
slots, variables and shared styles. Its exact import/edit/reopen/export/reimport
round trip passes. Font refresh now preserves default slot children's generated
CSS identity; a dedicated regression covers this defect. Storage conflicts and
quota recovery remain covered by browser tests.

Production build, TypeScript, Rust formatting/Clippy and the generated catalog
pass. Lint has zero errors and 56 warnings. The 16 functional browser tests pass
with nine reviewed baselines. The separate 100ms p95 responsiveness assertion
fails; `npm run test:browser` therefore does not currently pass as a whole.

`PILOT_PLAN.md` and its report calculator are prepared. No pilot has run and no
retention claim is made. Actual operator-driven desktop sleep/wake remains open.
The installed alpha.11 and historical installation proof above predate this
follow-up. No new desktop installation, public release, merge or deployment was
performed for this follow-up.

## Current library acceptance — 2026-10-30

The 20 functional browser checks, isolated responsiveness gate, 3 Rust + 978
JavaScript tests, production build, lint (0 errors / 56 warnings), TypeScript,
formatting/Clippy and generated catalog pass. The new library baseline has been
visually inspected. Updated evidence is under
`.local/acceptance/libraries-followup-2026-10-30/`.

Figma imports are snapshots with a review report, not a synchronized catalog.
Shared-workspace consumers require sources published in that workspace; device
library import does not bypass server permissions. Complete Figma parity, real
OS sleep and participant outcomes remain unverified. See `LIBRARIES.md` for the
exact local and workspace paths.

## Alpha.12 local installation — 2026-10-30

Both existing `releases/desktop/mac-arm64/PixlPrfct.app` and legacy
`mac-universal/PixlPrfct.app` paths now contain this Mac's Apple Silicon alpha.12
build. Native About confirms **0.1.1-alpha.12**; deep/strict signatures pass.
This is a local ad-hoc-signed update, not a universal/notarized public release.

Includes library import/publication/updates, Figma file snapshots, live MCP
library operations, Page Styles, bounded exports, explicit vector strokes,
min/max variable bindings and responsiveness fixes. The browser release gate
passes at 58.4ms p95; full Figma parity and real OS sleep remain unverified.

A fresh real MCP client automatically discovered the installed offline project.
The current one-frame Territory Track project (one page, one variable) matches
its complete pre-update normalized document digest exactly. This is a different
project from the historical 724-layer Design System proof; that historical
verification is not being reused as a new comparison. All four offline project
entries remain visible; the team-server project list also retains its existing
Design System entries. No source design was modified for this installation check.

Both old app bundles, the complete desktop profile and current project backup
are retained under `.local/acceptance/libraries-followup-2026-10-30/`. Evidence
includes `desktop-before-proof.json`, `desktop-after-proof.json` and the native
About screenshot in this task's visualization folder. No public deployment,
merge, remote CI or participant pilot is claimed.

## Alpha.13 team update — 2026-10-30

See [team workflows](TEAM_WORKFLOWS.md) and [simulated acceptance](TEAM_SIMULATION_2026-10-30.md).
Five synthetic accounts include an unauthorized outsider; four isolated browsers
complete the shared workflow. No human participant/adoption results are claimed.
The existing private PostgreSQL schema was backed up and migrated without altering
its design or revision; its local server restarted successfully. The currently
open one-frame desktop project retained its exact normalized digest across the
installed update. Both legacy bundle paths contain this Mac’s arm64 build, not a
new universal/notarized/public release.


### Local 2026-11-01 scope refinement

| Capability | Local state | Limits |
|---|---|---|
| Parent panel windows and icon flyouts | Design and SVG parents collapse to saved icon docks; icons open adjacent in-editor panels, headings tear into windows | Supersedes individual inspector-section windows; grouped docking and named presets remain open |
| SVG gradient motion | Linear/radial fill and stroke rotation, independent object rotation, stop color/position/opacity keyframes, Undo/persistence/native export | Fixed stop count per animator; SVG canvas gradient handles and angular/diamond gradients remain open |

### Alpha.21 release follow-through — 2026-11-01

The completed SVG drawing/editing/import, parent panel workspace and independent gradient animation work is included in [Windows alpha.21](https://github.com/ninefingerwoodshop-ops/pixlprfct/releases/tag/v0.1.1-alpha.21). Earlier local completion entries remain historical evidence; uncompleted child items remain open. [Panel Workspace](wiki/Panel-Workspace.md) documents the final parent-only scope and icon flyouts.

Release source validation: 3 Rust + 1,053 JavaScript tests, 143 browser workflows, 25 final panel/site checks, production build, types, generated API, lint and Rust formatting/Clippy. Native panel acceptance verifies cursor following, stop-on-release, refresh/restart restoration and explicit docking. Package provenance, checksums and Windows verification are recorded with the release. This does not claim full interface parity, real sleep/wake, a participant pilot, or resolution of TerritoryIQ code/design-file work.
