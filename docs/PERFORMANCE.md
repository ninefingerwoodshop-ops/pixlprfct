# Editor performance follow-up — 2026-10-30

Measured against the user's Territory Track design: 727 layers, 87 components,
121 variables, 14 effect styles and 10 pages. The source document is private and
is not checked into the repository. Measurements use a separate copy on this Mac.

## Results

| Measured operation | Alpha.6 baseline | Alpha.7 |
| --- | ---: | ---: |
| Button page pan redraw, median | 15.0 ms | 0.4 ms |
| Toggle page pan redraw, median | 22.6 ms | 0.5 ms |
| Table/KPI page pan redraw, median | 11.0 ms | 0.6 ms |
| Single text property update, engine median | 54.0 ms | 33.5 ms |
| Text resize preview, engine median | 56.8 ms | 35.8 ms |
| 20 sequential text updates, atomic MCP runtime batch | 2,804.7 ms | 1,052.3 ms |

Canvas measurements are synchronous draw times during 25 one-pixel pan frames,
not end-to-end latency or a promised frame rate. The first render, a zoom change,
or an edit still repaints the artwork. Engine/MCP timings use the same deterministic
headless text measurer and the same operations for both versions. Final serialized
document SHA-256 was identical: `436b3c8b7e3a16759a2d34cd4f81ac36053ac29ffe0a2d6e87fb01fa897a0815`.

## Changes

- Fill/stroke variable resolution updates fields directly instead of serializing
  and reparsing an entire layer for each binding (900 bindings in this document).
- Instance synchronization avoids JSON conversion when no applicable override exists.
- MCP property updates on the active page avoid an unnecessary second full commit.
  Cross-page updates, revision protection, library guards and one-step undo remain.
- A single bounded viewport raster reuses unchanged artwork during pan/selection
  redraws. It includes 256 device pixels of overscan, uses the actual display density,
  and invalidates for edits, zoom, viewport size, fractional-pixel movement and loaded
  fonts/images/textures. At most 16,777,216 RGBA pixels are cached (64 MiB); oversized
  targets use direct rendering. Export continues to use the uncached renderer.
- Frame labels retain their DOM content until the name/component type changes.
  Hidden device chrome avoids layout measurements. Pointer redraws coalesce into
  animation frames without dropping drawing points or the final committed geometry.
- MCP connection status reads the already loaded document name, avoiding repeated
  full document serialization on its one-second connection timer.

## Verification and remaining work

- 3 Rust and 924 JavaScript tests pass, including real localhost WebSocket tests.
  Cache tests cover invalidation, pan transforms, pixel density and the memory bound;
  MCP tests cover mixed-page rollback, visible-page preservation and single-step undo.
- Editor/desktop builds and generated catalog check pass. Changed-code lint has zero
  errors and the same 13 existing app.js warnings; Rust formatting passes.
- Browser testing on a copy verified frame resize from 672 × 211 to 725 × 285 and
  undo back to 672 × 211. The cached artwork and handles follow the final geometry.
- Direct/cached pixel comparisons covered three pages, integer and fractional pans,
  and 1×/1.5× scales. The button page matched exactly after compositing on the workspace
  background. Other pages showed minor raster antialias differences (mostly 1/255;
  a few rounded-corner samples reached 14/255). This is not an exact pixel-parity claim.
- Private diagnostic scripts and results are under `.local/perf-*` and
  `.local/benchmark-*`; full test/build logs are under `.local/performance-*`.

Large layout previews still exceed a 16.7 ms frame budget in this document. Further
work should profile incremental layout/validation and large CSS-rendered scenes.
The idle/sleep connection acceptance test remains a separate open issue.

## Evaluation follow-up — 2026-10-30 (local source/build)

A fresh run of the same private 727-layer fixture before/after this change:

| Operation | Before | After |
| --- | ---: | ---: |
| Load, median | 21.3 ms | 19.8 ms |
| Snapshot, median | 2.9 ms | 2.8 ms |
| Fixed text name edit, median | 32.4 ms | 30.5 ms |
| Position preview of fixed text, median | 35.3 ms | 33.1 ms |
| 20 name edits through atomic MCP runtime | 1,059.5 ms | 967.7 ms |

These historical benchmark labels originally called the name edit “updateOneText”
and the position preview “previewOneText”; neither measures typing or font layout.
No text-measurer callbacks occurred during the sampled fixed-text edit. The final
snapshot hash remains `436b3c8b7e3a16759a2d34cd4f81ac36053ac29ffe0a2d6e87fb01fa897a0815`.
Temporary phase instrumentation was removed before the final build.

The change caches main-component structural comparisons and sibling-order checks
within a transaction, indexes instance lookups, traverses parent order in linear
time, moves shape payloads during ordering, and moves the previous document into
undo/redo instead of cloning it. Validation, write guards, instance protection,
transaction atomicity and history remain exercised by the full regression suite.

`npm run benchmark:editor` now provides a reproducible public 727-layer fixture
across five pages and measures actual text-content edits and width previews.
On this Mac (Node 24.22.1, deterministic approximate font metrics), medians were
6.85 ms for content edits and 8.65 ms for width previews; p95 values were 7.75 ms
and 9.71 ms. The 20-edit batch took 429.12 ms. This simpler fixture has no linked
component/variable graph and cannot stand in for the private design. Its result
hash was `ae5916d2f490df0fff3d492484068d8fd79f9599c21622bd3bbd8e093467ab22`.

The private document still exceeds a 16.7 ms frame budget before paint. B33 stays
open; affected-subtree layout/synchronization is the next measured optimization
area. No universal 60 fps or new desktop installation is claimed.

## Alpha.11 installed follow-up — 2026-10-30

Phase profiling found that property-binding pruning accounted for about 16.7 ms
per transaction: it rebuilt every component subtree for every property, walking
all layers and repeatedly searching their parents. It now indexes parents once
and checks only bound targets. The transaction also reuses its final serialized
body for the write guard and avoids immediately repeating validation of an
already validated document. Every entry path still validates; size limits, write
guards, instance protection, atomic commits and history remain intact.

| Private 727-layer operation | Previous local build | Alpha.11 |
| --- | ---: | ---: |
| Name edit, median | 30.5 ms | 15.3 ms |
| Position preview, median | 33.1 ms | 17.9 ms |
| 20 name edits, atomic MCP batch | 967.7 ms | 647.3 ms |

The historical benchmark hash remains exactly
`436b3c8b7e3a16759a2d34cd4f81ac36053ac29ffe0a2d6e87fb01fa897a0815`.
The public benchmark command applied to that private document measures actual
text content edits at 14.27 ms median / 16.71 ms p95, width previews at 17.30 /
18.18 ms, and a 20-content-edit batch at 652.85 ms. Its snapshot hash is
`1f0570136ab665aa1e0c2b738a1a9d29b1cb33a4dd24684b7201c1699556a7e2`.
The simpler public synthetic fixture measures 7.39 ms edits / 9.63 ms previews
and 423.13 ms per batch; its hash is unchanged. Timings are engine/transport
measurements with approximate headless text metrics, before drawing.

The large design is substantially faster, but previews still exceed 16.7 ms
before paint. B33 therefore remains open for end-to-end interaction latency.
Evidence: `.local/evaluation-fixes/performance-*alpha11.json` and
`transaction-phases.log`. Temporary profiling hooks are absent from the build.


## Browser daily-work gate — 2026-10-30

`tests/browser/daily-workflow.spec.mjs` imports the public complex fixture (727
layers, five pages, components/variants/slot, styles and variable modes). It
measures a trusted Width change through the second animation frame, after fonts
are ready; five warmups plus 30 reported samples. This includes browser engine,
DOM, drawing and save work, but is a frame-opportunity proxy, not physical display
latency. The explicit release budget is p95 <100ms.

Profiling found forced layout in dropdown visibility checks, repeated layer-row
rebuilding, inspector focus restoration and frame-label geometry reads. Stable
page/layer rows now retain DOM; lock/visibility actions read the current shape.
Closed dropdowns inherit ancestor visibility without measuring every parent.
Focused retained inputs avoid a redundant layout query. Canvas sizing uses
ResizeObserver, frame labels share the canvas inset, and inspector/artwork draws
are coalesced. A browser regression checks cached-row geometry preservation,
rename cancellation and overlay bounds. Raster-reuse and CSS-containment
experiments did not improve the measured result and were removed.

The gate **still fails**. The final visible Chromium comparison measured 141.1ms
median / 199.2ms p95. A preceding headless run measured approximately 197ms p95.
These modes are reported separately; do not infer a clean percentage speedup
from early trace-enabled profiling runs. Remaining costs include canvas raster
work, inspector DOM work, and synchronous recovery/storage. Immediate recovery
protection has not been weakened to improve the benchmark. Evidence is retained
in `.local/acceptance/workflow-2026-10-30/`. B33 remains open.

## Library follow-up browser result — 2026-10-30

The unchanged 100ms p95 browser gate now passes in isolated headless Chromium:
**54.2ms median / 58.4ms p95**, five warmups and 30 measured width edits on the
same public 727-layer fixture. An earlier post-fix run was 79.9ms median /
84.5ms p95; both are retained. Historical visible/headless failures above remain
separate measurements. No hardware input-to-photon or universal 60fps claim.

The renderer paints changed artwork directly, then caches stable artwork for
subsequent pans. Empty vector-mark work exits before font/layout reads. The app
reuses serialized snapshots for durable/recovery saves, avoids redundant DOM
text writes, caches page-shape/parent options, and draws before inspector writes.
Expensive imported-library write guards run only when linked libraries or a
workspace source require them; protected source/instance checks still pass.
Immediate recovery, unload protection, zoom/font invalidation and raster quality
remain covered. Layer rendering copies cached arrays before reversing so paint
and hit-test order stay unchanged.

Evidence: `.local/acceptance/libraries-followup-2026-10-30/final-browser-latency.json`.
B33 remains open for complex-document frame time and broader interaction testing;
the specific release responsiveness assertion is now passing.

### Alpha.14 regression — 2026-10-30

727-layer/five-page real-browser workload: trusted width edit to second animation
frame, 5 warmups + 30 samples, median 56.7 ms, p95 65.8 ms; passes the existing
100 ms acceptance gate. Evidence: `.local/team-next/evidence/browser-latency.json`.
This includes browser rendering; it does not establish universal 60 fps. Shared
presence uses one-second polling and document saves remain bounded to 5 MB.
