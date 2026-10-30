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
