# Design and SVG Animation evaluation

Evaluated November 1, 2026 against `ffbea1a` (Windows alpha.20 source).
This is a planning assessment, not a feature release or a parity certification.
The [public roadmap](https://ninefingerwoodshop-ops.github.io/pixlprfct/roadmap.html)
is the discussion view; the [Pen workspace proposal](PEN_WORKSPACE_PROPOSAL.md)
records the requested cursor and movable tool palette.

## Assessment

Design has a substantial editing foundation. SVG Animation has useful motion
tools, but is still primarily an imported-artwork animator. The strongest next
step is to bring genuine path authoring and everyday object editing into SVG,
while improving performance and consistency in Design. A shared editing model
and clear handoff should prevent the two workspaces from drifting further apart.

No editor features were implemented during this evaluation. The product owner
asked to discuss tools and scope before starting further feature development.
Proposed order below is not a delivery commitment.

## What already works

| Area | Design | SVG Animation |
| --- | --- | --- |
| Drawing | Pen, Pencil, Bézier handles, anchor insertion/deletion, corner/smooth conversion, path splitting/joining | SVG import plus rectangle and ellipse creation; morph-node editing is animation-specific |
| Organization | Pages, layers, groups, frames, components, variants and slots | Imported SVG hierarchy; single element selection in the workspace |
| Appearance | Stacked paints/strokes, gradients, shadows/blur, styles and variables | Imported gradients, clipping/masks, text, embedded images and selected filters; animated solid paints |
| Motion | Design Motion and prototype workflows | Docked tracks, keyframe groups, retiming, easing, reuse/reversal/duplication/snapping/navigation, morphing and motion paths |
| Direct manipulation | Selection, movement, sizing and vector editing | Canvas resize/rotation handles in alpha.20; X/Y property controls |
| Persistence | Local recovery, editable files, optional revisioned team workspaces and simultaneous editing | Shared persistence/recovery and cloud editing leases; editable `.pixl` timelines |
| Delivery | SVG/PNG/JPEG and HTML/framework export workflows | Animated SVG or static first-frame SVG |

Existing Design Pen, gradients, alignment and snapping must not be described as
entirely missing. Similarly, Design team coediting exists; SVG timelines do not
participate in that protocol. Earlier broad roadmap summaries predate these
features. B36/B37 save-conflict/recovery fixes and implemented portions of B38/B39
remain credited in the running gap tally.

## SVG gaps and evidence

| Priority | Gap | Evidence and boundary |
| --- | --- | --- |
| First | No ordinary Pen/Pencil or base-path authoring | `web/svg-animation.js` exposes Select, Rectangle and Ellipse. Morph nodes edit timed shape keys, not the original static geometry. |
| First | Dragging an object's body does not translate it | Reproduced on the sample Core at 1280 × 720: interior drag from (647,242) to (727,267), then reselection left X/Y at 0 with no undo entry. Source click handler selects; transform handlers resize/rotate. Numeric X/Y controls remain available. |
| First | Import replaces existing artwork and clears its timeline | `importSvg` in `web/svg-animation.js` replaces `svg`, empties `tracks` and `origins`, and resets selection/time. Add vs Replace is not offered. Code-inspected, not a file-upload reproduction. Same-session Undo exists; this is not an irreversible-loss claim. |
| Next | No complete multi-object construction workflow | Single selected-element state; no workspace authoring controls for multi-select, group/ungroup, duplication, hierarchy reparenting, Boolean operations or masks. Imported groups/masks can render. |
| Next | No dedicated motion-route drawing tool | Existing artwork can become a route. Pen and ordinary path editing would support creating routes in place. |
| Explore | Limited output choices | Static export uses the first frame; selected-current-frame, GIF/video and Lottie are not available. Reimporting exported SVG does not restore editable tracks; keep `.pixl`. |
| Explore | Motion and paint limits | Easing controls are clamped to 0–1; no overshoot/spring/bounce curves, gradient-stop animation or general effect animation. Cross-element morph/motion-path key reuse is excluded. |
| Explore | Separate automation and team model | SVG documents bypass the Rust design serializer and do not expose engine/MCP editing, comments, libraries or live coediting. Shared SVG files use an exclusive editing lease. |

Source: [SVG guide](SVG_ANIMATION.md), `web/svg-animation.js`,
`web/svg-animation-transform.js`, `web/svg-animation-model.js`, and related model
tests. Security sanitization of scripts and external resources is intentional
and must not be removed to claim import parity. Size/duration limits and font
embedding are scope decisions, not automatically defects.

Reduced-motion behavior for generated SVG remains a proposal: the SVG export
path did not expose a `prefers-reduced-motion` fallback in this inspection. Design
Motion's CSS output has separate behavior. A full animation accessibility audit
was not performed.

## Design gaps retained

- **Performance (B33):** the latest recorded cross-environment p95 interaction
  times are 142–148.7 ms on Linux and 219.3–221.4 ms on macOS, above the 100 ms
  target. An earlier local serial run passed at 83.6 ms; that does not close the
  broader gap. No fresh benchmark was run for this evaluation.
- **Vector construction:** Boolean/Pathfinder operations, Shape Builder, compound
  paths, mask authoring and richer stroke/brush workflows need scoped work.
- **Typography and components:** mixed styled text/text links, slot description
  formatting, bulk variant authoring and native `.fig` slot metadata remain
  incomplete. Ordinary typography and functional slots already exist.
- **Interface consistency (B31/B38):** page Styles exist, including stacked-paint
  thumbnails. Folder/group operations, additional style categories, set-label
  placement and exhaustive visual parity remain unverified or incomplete.
- **Import/prototypes:** `.fig` import is a snapshot conversion with advanced
  mixed-text, mask and nested/external component caveats. Supported styles,
  variables and variant sets do import. Smart Animate, advanced conditional
  interactions and broader prototype parity remain separate scope.
- **Delivery and access:** PDF export, broader keyboard/screen-reader and zoom
  verification, real OS sleep/reconnect, real team installation/provider checks,
  and a signed/notarized public Mac release remain open. Team SMTP/TLS is the
  team's deployment responsibility, not a universal publisher release gate.

The existing [gap tally](TT-Design-System-Gaps.md), [capability matrix](CAPABILITY_MATRIX.md),
[Figma import guide](FIGMA_IMPORT.md), [team release work](TEAM_RELEASE_WORK.md),
and [desktop guide](DESKTOP.md) contain the detailed boundaries and earlier
verification. TerritoryIQ implementation and private design-file work remain
separate from these PixlPrfct proposals.

## Proposed order for discussion

1. **Drawing foundation:** Pen cursor, movable right-side Pen/Pencil toolbar,
   stroke/fill pickers synchronized with the inspector, Direct Selection and
   anchor tools; ordinary object movement and explicit Add/Replace SVG import.
2. **Precision and construction:** multi-object organization, alignment/snapping,
   Pathfinder/Boolean operations, Shape Builder, compound paths and clipping masks.
3. **Expression:** Pencil/smoothing scope (possibly in the first release), Brush,
   text on a path and SVG gradient authoring. Pressure, brush presets and animated
   gradient stops need separate decisions.
4. **Connection and delivery:** Design ↔ SVG handoff, current-frame export,
   accessible motion, additional formats, and SVG team/AI workflows.

The owner accepted Pen, Direct Selection/anchor editing, Pathfinder/Shape Builder,
Pencil/Brush, clipping masks, text on a path, gradients and alignment/snapping as
roadmap candidates. The movable tool palette and icon cursor are explicit
requirements. Release grouping, dates, Brush behavior and print/prepress scope
are not approved. Future controls must follow the project’s interface requirements
and use shared components; added capabilities do not authorize unrelated redesign.

## Verification performed

- Inspected source/docs and exercised separate synthetic Design and SVG projects
  in the browser. Compared relevant live Figma UI without editing reference
  artwork. Built editor JS assets matched the corresponding source files.
- Full `npm test`: **3 Rust tests and 1,040 JavaScript tests passed**. A separate
  targeted run passed **36 SVG model/controller tests**. These establish unit
  coverage, not complete feature or visual parity.
- Local evidence is in `.local/product-evaluation-2026-11-01/`: Design and SVG
  workspace screenshots, the unchanged-position drag result, and a private
  Figma reference capture. Test output is retained locally. Reference-product
  screenshots and private artwork are not published with this report.
- No fresh full browser regression suite, performance benchmark, native Windows
  certification, accessibility audit or user study was conducted for this pass.

The website and planning documents are the only deliverables of this change.
