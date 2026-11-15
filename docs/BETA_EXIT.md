# Beta exit criteria

Drafted 2026-11-14. **Draft for the owner's decision; not yet adopted.** Source is
at release candidate `0.1.1-alpha.22` (alpha.21 plus 33 commits on `main`). This page defines what
"beta" promises and the evidence required before the alpha label is dropped. It
does not claim any gate has passed.

## What beta promises

A designer can do routine component-based screen work in PixlPrfct and trust that
the saved result is preserved:

- Local projects with version-aware saves, recovery and `.pixl` export/import.
- Frames, auto layout and grid; pages; components, variants and slots.
- Text, color and effect styles; variables; solid and gradient paints; effects.
- Figma `.fig` import as a file snapshot.
- Prototypes, the SVG Animator and path editing as implemented in the release
  candidate.
- PNG, SVG and PDF (page-image) export.
- Desktop apps for macOS and Windows, and the browser editor.
- Local MCP agent editing.
- Self-hosted team workspaces, each team running its own infrastructure.

## What beta does not promise

Stated in the release notes and on the site, not hidden:

- Complete Figma visual and workflow parity.
- Masks, Boolean operations, advanced corner smoothing and slices.
- Rich text and links; nested instance-swap overrides.
- CRDT-grade real-time collaboration (the self-hosted "Edit together" merge is
  the supported team mode).
- Live Figma account or URL sync.
- Vector PDF export.
- Windows automatic updates.

Whether any item above is a beta blocker is decided by pilot evidence, not by
this list.

## Gates

| # | Gate | Passing evidence | Status 2026-11-14 |
| --- | --- | --- | --- |
| 1 | Scope statement | This page adopted by the owner; README and site carry the same limits | Draft |
| 2 | Release candidate | One build containing everything on `main`; full gates in [RELEASE_ACCEPTANCE.md](RELEASE_ACCEPTANCE.md) recorded against the installed build | Not started |
| 3 | Reliability | `npm run test:sleep` passes with a real OS sleep/wake (B23); 727-layer latency re-measured on the candidate against the 100 ms p95 gate (B33); automated CI runs tests on every PR | Not passed |
| 4 | Human pilot | 3-5 designers named and working on copies of real files under [PILOT_PLAN.md](PILOT_PLAN.md). The beta period is the pilot; its expansion criteria gate leaving beta, not entering it | Not started |
| 5 | Distribution | Notarized Mac build passes `scripts/desktop/release-check.mjs`; Windows build signed or Store-signed; each run interactively on real hardware | Not started |

Gates 3 (sleep/wake) and 5 (signing) are firm. A beta that can lose a connection
across sleep, or that shows an unknown-publisher warning, is not offered.

## Open decisions

- Adopt, change or reject the gates above.
- Pilot participant list (the pilot plan does not authorize invitations).
- B33: the remaining per-edit cost is local persistence. Reducing it changes the
  save or recovery format. Decide after re-measuring on the candidate.
- Beta version scheme (for example `0.2.0-beta.1`) and the permanent desktop
  app identifier, which must be fixed before the first signed distribution.
