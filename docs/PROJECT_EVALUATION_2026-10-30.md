# PixlPrfct project evaluation — October 30, 2026

**Assessment: a substantial, functional alpha with a credible editor foundation; not yet a dependable Figma replacement.** The immediate priority is preserving users' work and proving complete workflows. Additional feature breadth should follow those gates.

Reviewed local commit `bf4f6e0` (`0.1.1-alpha.10`). This evaluation changes documentation only. It does not certify a published release, installed desktop package, full security posture, accessibility conformance, or pixel-perfect Figma parity.

1. **P1 — An older local-project tab can silently overwrite newer saved work. Confirmed in the browser and with an isolated storage reproduction.**

   `web/local-drafts.js:30–36` reads the current stored file but accepts any incoming body without comparing it to the version originally opened by that editor. `web/app.js:250–261` saves the in-memory document when returning to Projects; lines 1876–1878 also persist on page lifecycle events. The editor has no corresponding same-file storage-change conflict handling. The cloud path does have revision checks.

   Browser reproduction used only a fresh starter draft on an isolated local preview origin:

   - Open the same draft, “Launch concept,” in tabs A and B.
   - Rename it in A to “Evaluation saved change.” The canvas breadcrumb updates and the status says “Saved on this device.”
   - Leave B unchanged and click **All projects** in B.
   - Projects now lists “Launch concept” again. B's old body replaced A's newer saved body without a conflict warning. This affects the whole document, not just its name.

   An independent `LocalDrafts` reproduction likewise returned `tabAEditsPreserved: false`. Existing tests exercise two tabs editing different files and stale Trash actions; they do not cover this same-file overwrite. Add version-aware local writes, preserve conflicting bodies, and avoid rewriting unchanged stale snapshots during navigation. Verify with two real editor tabs as well as storage tests. Tracked as B36 in the running gap tally.

2. **P2 — Local save failures do not protect unsaved work when the tab closes. Confirmed code path; browser quota exhaustion was not induced.**

   `web/app.js:242–248` catches a failed draft write and changes the status text. Its `beforeunload` handler only finishes text editing; the unload-warning handler in `web/cloud-files.js:48` applies only to active cloud documents. A local user who hits a storage error and closes/reloads the page can therefore lose edits after the last successful save. In-app switching is better protected because it waits for a successful write.

   All local project bodies, including Trash, occupy one serialized localStorage record (`web/local-drafts.js:24–36`). The per-document 5 MB engine limit does not guarantee room for the aggregate collection. Track a successful local-save acknowledgment and dirty state, expose recovery/export prominently after failure, and protect navigation while unsaved data remains. Consider transactional per-document storage for growth. Tracked as B37; no fix is claimed.

3. **Figma fidelity is partial, with specific remaining workflow differences.**

   The current local interface has consistent dark chrome and PixlPrfct branding. At a 1330 × 924 viewport, the navigation rail is 56 px, the file panel and inspector are each 240 px, and Motion is a full-width 1330 × 200 dock starting at y=724. Its animation properties are in the inspector. The inspected Motion state exposed no visible native select menus; the shared dropdown implementation wraps native backing elements with custom controls.

   Live Figma accessibility inspection showed a Pages list above Layers and a text inspector with **Apply styles** and **Letter spacing**. The local editor instead exposes a current-page dropdown inside Layers and lacks those typography controls. The Page paint row still displays static `F5F5F5` (`web/index.html:114`). These are concrete parity gaps, not merely unfinished internal APIs. Existing B27, B31, and B32 remain open.

   Native Figma screenshot capture timed out, so this run did not complete a matched-viewport pixel comparison. Local screenshots and DOM measurements establish structure, not exact visual parity. The existing measured reference remains in `docs/FIGMA_UI_REFERENCE.md`.

4. **Performance has improved, but edit latency remains an acceptance gap.**

   `docs/PERFORMANCE.md` records approximately 33.5 ms for a text update and 35.8 ms for a text resize preview on a 727-layer document, before the complete display pipeline. Those timings exceed the 16.7 ms budget for a 60 Hz frame. Pan caching is a useful improvement, but it does not establish responsive editing. These are prior repository measurements, not new benchmarks from this evaluation.

   The engine commit path still validates, synchronizes, lays out, serializes, and retains document snapshots. The browser refresh path refreshes multiple panels. Profile representative editing operations and reduce work by the affected layer/subtree where measurements justify it. Keep B33 open. B23 also remains open until the actual long-idle/OS-sleep reconnection scenario passes; simulated-sleep tests are valuable but do not complete that acceptance test.

5. **The regression suite is a strength; browser acceptance is the missing release gate.**

   The 175 JavaScript test files cover substantial engine, persistence, import/export, component, layout, authorization, desktop-boundary, and MCP behavior. Many exercise real WebAssembly rather than only mocked business logic. Atomic edits, validation, undo, cloud revision conflicts, and isolated workspace access are sound architectural choices.

   `.github/workflows/check.yml` builds, runs the regression suite, and syntax-checks the editor. CI also runs Rust formatting and Clippy. The checked-in workflows do not run a browser interaction or screenshot-regression suite, nor explicit lint and TypeScript gates. Consequently, 946 passing JavaScript tests did not detect the reproduced two-tab UI failure, and they cannot establish the standing visual requirement.

   Add a compact acceptance suite around create/edit/reopen, same-file concurrent tabs, failed-save recovery, text editing, component/variant/slot editing, and Motion mode transitions. Establish same-theme, same-viewport visual baselines for the agreed Figma surfaces. Keep screenshot evidence separate from functional assertions.

6. **Maintainability and status documentation need consolidation.**

   There are 170 top-level editor JavaScript modules, but `web/app.js` still contains 214,839 bytes across 1,928 densely formatted lines and 105 imports. It coordinates persistence, selection, rendering, inspector refresh, input, and file actions. The Rust core is separated into feature modules, although `src/lib.rs` still contains 3,852 lines. Extract focused responsibilities when changing them; a wholesale rewrite would put the tested behavior at unnecessary risk.

   `roadmap.json` is stale: it still calls desktop deferred and lists component-set containers and multiple paints among remaining work, despite implementations, tests, and newer verification records. `inspector-parity.json` similarly lists features now implemented. Reconcile these files into a dated capability matrix separating engine/MCP, interactive UI, visual verification, local installation, and published release. The running gap tally generally makes those distinctions more carefully. TerritoryIQ application and design-file work remains outside this evaluation's scope.

**Verification performed in this evaluation**

| Check | Result |
| --- | --- |
| Full `npm run build` | Passed; framework bundling warnings remain |
| `npm test` | 3 Rust tests and 946 JavaScript tests passed; none skipped |
| `tsc --noEmit --incremental false` | Passed |
| `npm run lint` | Passed with 0 errors, 228 warnings in the initial scan; 169 came from generated `public` copies |
| `cargo fmt --all --check` | Passed |
| `cargo clippy --all-targets --all-features -- -D warnings` | Passed |
| Generated editor API catalog check | Passed: 96 commands, 48 model definitions |
| Local browser review | Editor, text inspector, Motion dock, Projects, and two-tab overwrite reproduction |

The first sandboxed test run could not bind localhost sockets. Rerunning with socket access passed the complete suite; this was an environment restriction, not a reported product test failure. Build output remained untracked/ignored; no application source was edited.

**Recommended order:** fix B36 and B37; add browser persistence/recovery gates; finish the idle/sleep acceptance test and profile large-document edits; close the most-used inspector and navigation parity gaps; then expand feature scope. Real-time simultaneous collaboration is explicitly not implemented, and full Figma replacement readiness should not be inferred from team storage or MCP access.

Browser evidence is saved in the evaluation chat's artifact folder as `pixlprfct-tab-a.png` and `pixlprfct-stale-tab-projects.png`. Only the fresh local starter document was edited. No existing design or live Figma artwork was modified.


## Implementation follow-up — 2026-10-30

The user authorized the recommendations and explicitly authorized Playwright for
isolated automated browser testing. The original evaluation above remains the
historical baseline; these are the resulting local changes.

- Fixed stale-tab overwrite and failed-save recovery (B36/B37): body preconditions,
  cross-tab Web Locks, unchanged-save avoidance, dirty acknowledgment, session
  recovery, unload guard, retry/copy/download/latest actions. Actual two-tab browser
  checks and a real .pixl download verify preservation of both versions. The quota
  test injects `QuotaExceededError` at the browser Storage boundary, reloads, and
  verifies recovery and successful retry.
- Added live-reference-based inline Pages/Find/resize, letter spacing/text case,
  text style controls, Page paint and shadow-variable picking. B27/B32 are locally
  resolved; B31 remains open for set-label placement. Typography reaches model,
  styles/components, sizing, Canvas/SVG/CSS, editing and Figma attribute conversion.
- Profiled and reduced redundant component structure checks/document copying;
  added a public benchmark. The private fixture's exact final hash is unchanged;
  its 20-edit batch improved from 1059.5 to 967.7ms. Complex edits still exceed the
  frame budget, so B33 remains open. See [PERFORMANCE.md](PERFORMANCE.md).
- Added 11 isolated Chromium workflows and five reviewed screenshot baselines.
  CI now includes lint, TypeScript, generated catalog, Linux functional browser
  checks and macOS 15 visual regression. No remote CI execution is claimed.
- Extracted persistence/recovery, page paint, text-style controls, color-variable
  picking, page resizing and document ordering into focused modules. Reconciled
  roadmap/parity records through [CAPABILITY_MATRIX.md](CAPABILITY_MATRIX.md).

Final local verification: production build; **3 Rust + 957 JavaScript tests**;
**11 Chromium tests** with screenshot comparison (no baseline updating in the final
pass); TypeScript; Rust formatting and Clippy; catalog (97 commands, 49 models);
`git diff --check`; lint **0 errors / 56 warnings**. Existing framework bundling
warnings remain. Logs are retained under `.local/evaluation-fixes/`.

The 40-minute real socket idle test passed after 2,400,113ms, including a bridge
restart, discovery wake and another document read. It runs with a headless editor;
**real installed-app OS sleep/wake was not tested**, so B23 remains open.

These changes are local source/build only. No commit, merge, installation or public
release was performed. The prior alpha.10 desktop installation remains unchanged.
TerritoryIQ application and design-file work remain outside this implementation.


## Installed follow-up — 2026-10-30, alpha.11

The source/build checkpoint above is historical. Alpha.11 is now installed in
both existing local app paths, with prior apps/profile retained for rollback.
Native About, strict signature checks, automatic MCP reconnection and a complete
paged read of the user's saved 724-layer design pass. Its content matches the
pre-update copy after the existing hidden-device-frame default migration.

Indexed component-property pruning roughly halves complex edit/preview time;
name edits are 15.3ms and position previews 17.9ms, preserving the historical
benchmark hash. The reported set-label overlap is suppressed without changing
artwork. These are targeted improvements; end-to-end latency and exhaustive
Figma label-placement parity remain open. Validation: production build, 3 Rust,
958 JavaScript tests, 12 Chromium workflows and six reviewed visual baselines,
typecheck, formatting/Clippy, catalog and zero lint errors. No public release.
The installed-app OS-sleep probe reached ready state and was then stopped without a qualifying sleep/wake result. Actual sleep/wake remains unverified; no user action is pending.

## Product reassessment — 2026-10-30, current alpha.11 workspace

**Verdict: a credible local-first design editor for controlled solo and agent-assisted
use. Broad Figma replacement readiness remains unproven.** The product has enough
implemented capability to make completion quality the next priority. Its strongest
product thesis is a familiar design workspace that humans and agents can edit,
with portable files, local ownership, CSS-aware layout, and optional self hosting.
This is a product judgment from the inspected implementation; customer demand,
willingness to pay, retention, and acquisition were not measured.

| Dimension | Assessment | Implication |
| --- | --- | --- |
| Core editing | Substantial alpha: document engine, components/variants/slots, variables/styles, layout, Motion and MCP have implementations and regression coverage | Useful work can happen now; feature count alone does not establish complete workflows |
| Interface | Coherent dark chrome, custom controls, recognizable toolbelt, inline Pages and docked Motion | The standing pixel-perfect requirement is still unmet across the product |
| Preservation | Earlier stale-tab overwrite is fixed in this fresh UI check; editable export works | Keep the recovery fixes; storage scale and process-loss resilience still need broader acceptance |
| Responsiveness | Engine timings have improved, with little remaining frame budget on the measured synthetic document | Measure input-to-paint latency, including inspector refresh and real fonts, before declaring the clunkiness resolved |
| Team readiness | Account/team storage exists; simultaneous editing is explicitly absent | Position current use around individuals and controlled workflows; team-wide replacement is premature |

**Fresh observations and evidence**

- Inspected the native Projects/editor interface and the live Figma desktop
  reference. Exercised a separate localhost test project: create Desktop design,
  type text inline, finish editing, add a Position keyframe, switch Design/Motion,
  reopen in another tab, rename, navigate from the stale tab, and download a `.pixl`.
  The stale tab preserved **Evaluation latest saved revision**. The 3,071-byte
  download parsed successfully and contained one page, two layers, and
  **Build something useful**. Existing design artwork was not edited.
- Motion measured **1330 × 200 px at x=0, y=724** in a **1330 × 924 px** viewport.
  Tracks, ruler and a keyframe were visible; animation fields were in the right
  inspector. No browser-native select was visibly rendered in that state.
- **New concrete fidelity gap (B38):** live Figma's unselected inspector exposes
  document Styles, including Text, Color and Effect sections. PixlPrfct's
  unselected inspector exposes Page variable modes, Start designing and Selection
  tips instead. The static content is in `web/index.html:114`. Layer text/effect
  style pickers are implemented; this is specifically a missing page-level
  browsing/management surface, not absence of all style support. It reduces
  discoverability and differs from the required familiar workflow.
- Text controls remain dense: the inspected Layout section repeats **Resizing**
  above two rows, and the default-width font-weight control truncates Semibold.
  Treat these as targeted legibility/organization review items. Full keyboard and
  assistive-technology acceptance was not performed.
- The original B36/B37 findings above are historical. Do not present them as
  unfixed current defects. B23 sleep/wake, B29 large export responses, B31 broader
  label parity, B33 complex-document latency and B35 remaining slot details stay
  open. B28 remains an unreproduced report. TerritoryIQ design-file work remains
  separate from editor capability.

**Checks run again in this reassessment**

| Check | Fresh result |
| --- | --- |
| `npm test` | 3 Rust and 958 JavaScript tests passed; zero skipped |
| `npm run typecheck` | Passed |
| `npm run lint` | Zero errors; 56 warnings |
| Current preview assets | All 239 files under `web/` matched `dist/editor/` by content hash |
| Public 727-layer benchmark | Text edit median 11.13 ms / p95 11.45 ms; width preview median 14.66 ms / p95 16.41 ms; 20-edit batch 635.11 ms |
| Manual browser checks | Creation, inline text, keyframe creation, mode switching, save/reopen, stale-tab navigation and editable download passed |

The first sandboxed test run could not bind localhost; the socket-enabled rerun
passed. Benchmark numbers use approximate headless text metrics and exclude
drawing; they are neither FPS nor a measured regression against prior runs under
different load. The synthetic fixture lacks the private document's component and
variable graph. Its digest matched the previous synthetic result. The existing
12-workflow/six-baseline browser suite was inspected but not rerun here. A new
production build, OS-sleep test, deployment, native package certification, security
audit and exhaustive pixel comparison were not performed. Figma and local captures
have different viewport sizes; their comparison supports the structural finding,
not pixel-diff certification.

**Recommended order:**

1. Establish a release gate around representative daily work: import, edit
   components/styles/layout, recover/reopen, sleep/wake, and export. Include real
   complex documents and p95 input-to-paint latency with inspector updates.
2. Finish the most-used Figma workflows and states, beginning with page-level
   styles and the recorded unresolved inspector/label gaps. Pair functional
   acceptance with matched-viewport screenshots.
3. Prove the product thesis with a small group completing real solo/agent-assisted
   projects. Measure task completion, recovery incidents, return usage and how
   often users must fall back to another editor. Broader feature expansion should
   follow those results.

Evidence from this reassessment is in
`/Users/jgibbens/.codex/visualizations/2026/10/30/01a18dfd-fcb4-7d92-b7be-e585e0fa9cb8/`:
`pixlprfct-motion-evaluation.png`, `pixlprfct-page-inspector-evaluation.png`, and
`figma-page-inspector-reference.png`. Fresh test/lint logs are in
`/tmp/pixlprfct-evaluation-tests-full.log` and `/tmp/pixlprfct-evaluation-lint.log`.
Only evaluation documentation and the gap tally were changed in this pass; no
product-code fix, commit or public release is claimed.


## Authorized implementation follow-up — 2026-10-30

The follow-up adds Page Styles for Text, Color and Effect, linked color-style
engine/MCP/library support, bounded MCP exports, and a reproducible daily-work
acceptance fixture. The 727-layer/five-page import → edit → reopen → export →
reimport test compares the complete normalized document and passes. It exposed
and fixed a generated CSS-class mismatch in default slot content after font
refresh. A separate regression protects that identity.

Fresh live Figma inspection corrects the earlier observation about duplicate
**Resizing** labels: Figma also shows both labels in the inspected text Layout
state. They were retained. The Semibold label now fits at the default 240px
inspector width after reducing dropdown icon/gap space. Page Styles uses 32px
rows, slash groups, inline type metadata, and 304px creation forms. Reference
screenshots and three new regression baselines document the inspected states;
this is not exhaustive pixel parity. B38 retains the remaining menu/group and
advanced thumbnail differences.

The work is not release-ready. B33's browser gate requires p95 below 100ms; a
visible Chromium run measured **199.2ms p95 / 141.1ms median** over 30 samples after
five warmups. Headless profiling exposed repeated dropdown layout measurements
and layer-tree rebuilding; retaining stable rows and removing redundant layout
reads improves that path, but canvas rasterization, inspector work and local
persistence still leave the gate failing. The broader 16.7ms frame objective is
also open. Do not characterize the complete browser suite as passing.

The pilot has a task protocol, event format, explicit success thresholds and a
validated report calculator in `PILOT_PLAN.md`. It has **no participant evidence**.
Participants and a real project are awaiting selection. Actual OS sleep/wake also
requires an operator; the existing probe checks real power events, stable session
identity and document digest. No simulated or timer-only result substitutes for it.
See `RELEASE_ACCEPTANCE.md` for reproducible commands and current gate boundaries.

## Library follow-up — 2026-10-30

Implemented published-library consumption in existing local projects, device
publication without self hosting, portable release updates, Figma `.fig` library
snapshots, and bounded live MCP discovery/publication/consumption. The native
Figma library was inspected and exported without modifying its source; the
conversion retains 46 masters, 11 variant sets, 15 variables and 12 shared styles.
Unsupported exposed properties/slots, detached nested instances and mixed-text
limits are disclosed before import. `LIBRARIES.md` documents the workspace path.

Fixed explicit vector stroke initialization and min/max variable bindings, and
replaced solid-only style samples with real stacked-paint previews. Local-source
verification now passes 3 Rust + 978 JavaScript tests, 20 functional Chromium
scenarios, ten reviewed baselines, build/type/lint/catalog checks and the isolated
100ms p95 responsiveness gate (58.4ms p95, 54.2ms median). The technical result
supersedes the earlier failed browser gate; no pilot retention, real OS sleep,
complete Figma parity or public-release result is implied.
