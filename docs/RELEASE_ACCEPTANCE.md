# Daily-work release acceptance

These checks validate a particular build. They do not establish complete Figma
parity or customer retention. Keep source, packaged-build and shipped evidence
separate in `TT-Design-System-Gaps.md`.

1. Run `npm run build:editor`, `npm test`, `npm run lint`, `npm run typecheck`,
   `node scripts/generate-editor-api.mjs --check`, and `npm run test:browser`.
2. The browser suite includes a public 727-layer, five-page component/variant/slot
   document. It imports through Projects, edits styles and typography, saves,
   reopens, exports and reimports the whole document. Exact JSON equality after
   the first normalized import is the preservation criterion.
3. Recovery checks simulate quota failure, conflicting tabs and reload. Keep the
   failure messages, download route and unload guard working. These tests do not
   substitute for operating-system crash or disk-failure testing.
4. The browser latency test measures trusted width changes to the second animation
   frame after five warmups. It includes browser-side engine/DOM/render/save work
   and records Event Timing entries, fonts, user agent and all samples. Its p95
   budget is 100 ms. Run it alone with one worker for comparable local results:
   `npm run test:browser -- tests/browser/daily-workflow.spec.mjs --grep responsiveness --workers=1`.
   This is a frame-opportunity proxy; it is not a hardware input-to-photon test.
   Use `PIXL_PROFILE=1` for a CPU profile attached to the test result.
5. Inspect the changed UI against the corresponding live Figma state, at the same
   CSS panel width and scale. Screenshot regression baselines detect later
   changes; they are not proof that the baseline matches Figma. Record the
   reference, dimensions, typography and remaining differences.
6. Package the intended desktop build. Open a disposable acceptance file in that
   build, then run `npm run test:sleep -- 40`. After the probe says ready, the
   operator sleeps the Mac for at least 40 minutes and wakes it. The probe reads
   real OS Sleep/Wake events, reconnects to the same session, and compares complete
   document digests. A timer-only idle run or a cancelled probe is not a pass.
7. After the technical gates pass, use `PILOT_PLAN.md`. Record real participant
   results before deciding whether to broaden access.

Large MCP exports now return a bounded manifest when their combined content
exceeds the response limit. For each manifest file, call `pixlprfct_export` with
its cursor and the same target/scope/page/IDs; concatenate returned text until
`pagination.nextCursor` is null. Cursors reject revision or scope changes. The
limit defaults to 64,000 UTF-16 code units (256–64,000 allowed), and chunks never
split surrogate pairs. Small exports retain their complete `files[].text` form.


## Historical daily-work result — 2026-10-30

- PASS: production build; 3 Rust + 966 JavaScript tests; TypeScript; Rust
  formatting/Clippy; generated catalog (100 commands, 50 models). Lint: 0 errors,
  56 warnings.
- PASS: all 16 functional Chromium scenarios, including the complete complex
  round trip, conflict/quota recovery, Styles and nine reviewed visual baselines.
  Reproduce with `npm run test:browser -- --grep-invert responsiveness --workers=1`.
- FAIL: responsiveness p95 <100ms. Visible Chromium: 199.2ms p95 / 141.1ms median.
  A preceding headless run was approximately 197ms p95. The entire browser suite
  is not green; the budget has not been relaxed or disabled.
- NOT RUN: actual desktop OS sleep/wake for this follow-up; participant pilot.
- NOT CERTIFIED: complete Figma pixel/workflow parity, Windows behavior or public
  release readiness. No new installation or deployment is claimed.

Raw logs and the visible-browser latency JSON are retained locally in
`.local/acceptance/workflow-2026-10-30/`. The gap tally preserves the historical
alpha.11 installation and earlier results separately.

## Current library follow-up result — 2026-10-30

- PASS: production build; 3 Rust + 978 JavaScript tests; TypeScript; Rust
  formatting/Clippy; generated catalog (100 commands, 50 models, 14 MCP tools).
  Lint: 0 errors, 56 existing warnings.
- PASS: all 20 functional Chromium scenarios and ten reviewed visual baselines.
  Includes published-library add/update/reopen, portable release import and
  invalid-file preservation, native Figma worker import, and real WebSocket MCP
  library discovery/publish/add/remove with protected sources.
- PASS: isolated browser responsiveness, 54.2ms median / 58.4ms p95 against the
  unchanged 100ms budget. Complete functional and latency gates pass separately.
- PASS: real Figma file converts 46 component masters, 11 variant sets, 15
  variables and 12 styles; manual existing-project add and placement verified.
- NOT RUN: actual desktop OS sleep/wake; participant pilot. Complete Figma parity,
  Windows behavior and public release readiness remain uncertified.

Evidence is retained in `.local/acceptance/libraries-followup-2026-10-30/`.
Desktop installation is recorded separately in `DESKTOP.md`.

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

## Alpha.13 local installation — 2026-10-30

Implemented file-level roles, editing ownership/handoff, attributed review and
author-approved library overrides. Both existing Mac bundle paths contain the
local arm64 alpha.13 build; native About and strict signatures verified. The
original one-frame Territory Track document matches its pre-update normalized
digest exactly through a fresh automatically discovered MCP connection. Four
local project entries remain visible. This is a local ad-hoc-signed update, not
a published, notarized, or actual universal release.

Validation: 3 Rust + 985 JavaScript tests; 23 Chromium scenarios across the full
suite and final targeted runs, including a real local HTTP server with four
isolated signed-in browsers. Typecheck, production build, formatting, clippy and
MCP catalog pass (100 commands / 51 models / 14 tools). Existing lint warnings
remain; new collaboration modules have no lint errors or warnings. The simulated
team test covers offline recovery, server restart and restoring a SQLite backup.
The configured PostgreSQL schema was separately backed up and migrated, with its
existing design/revision unchanged, then the local server was restarted.

Backups, document digests, logs and screenshots are in
`.local/team-pilot-2026-10-30/`; the private database snapshot is restricted to its
owner and excluded from Git. No real invitations or participant feedback were
created. See [TEAM_SIMULATION_2026-10-30.md](TEAM_SIMULATION_2026-10-30.md) for limits.

## Alpha.14 local checkpoint — 2026-10-30

Review/inbox/mentions, invitation onboarding, library lifecycle, simultaneous
field-level editing with explicit conflicts and per-user undo, private daily
backups and release/update tooling are implemented. See `TEAM_RELEASE_WORK.md`
for acceptance and known limits. Tests: 3 Rust + 994 JS; full 26-browser suite
passes, plus the final presence geometry rerun. Production build, typecheck and
format/catalog checks pass; lint has zero errors and 57 warnings. Full npm audit
reports zero advisories. Current 727-layer browser p95 is 65.8 ms (100 ms gate).

The configured database was backed up, restored in isolation, additively migrated
and restarted with unchanged existing document content/revision. The scheduled
post-upgrade backup verifies all 26 table hashes. Both local desktop paths are
alpha.14, strict ad-hoc signatures pass, native About/update-menu behavior is
verified, and all four device projects remain. The active Territory Track design
matches its pre-update normalized digest exactly after automatic MCP reconnect.

Public release remains unaccepted: this Mac lacks a Developer ID identity and
notarization credentials; SMTP and HTTPS update hosting are unconfigured. Paid
Apple membership alone does not supply those local credentials. No public binary,
real email delivery, signed update drill or human research is claimed.

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
