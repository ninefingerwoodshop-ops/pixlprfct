# Glossary

Terms used across the code, docs and this wiki, with the page that explains each. **If a term here disagrees with code, the code wins — fix the entry.**

## Engine and document

| Term | Definition | Page |
| --- | --- | --- |
| **Editor** | The WASM-exported Rust struct holding the document, undo/redo stacks and ID counters; the only engine entry point | [Rust Document Engine](Rust-Document-Engine.md) |
| **Commit pipeline** | `commit` → `commit_validated_document`: normalize, validate, resolve styles/variables, lay out, sync components, write-guard, then push history | [Rust Document Engine](Rust-Document-Engine.md) |
| **Snapshot** | `Editor::snapshot()` — JSON of the current document; identical to `.pixl` file content | [Document Model and File Format](Document-Model-and-File-Format.md) |
| **Shape** | The single record type for every layer kind (frame, group, rectangle, ellipse, text, image, line, arrow, polygon, star, pen, pencil) | [Document Model and File Format](Document-Model-and-File-Format.md) |
| **`.pixl`** | Project file: the verbatim `Document` JSON, `version: 2` (v1 migrates by adding Page 1); 5 MB cap | [Document Model and File Format](Document-Model-and-File-Format.md) |
| **`.pixllib`** | Portable library release (`format:"pixlprfct-library"`, v1) wrapping a reduced document | [Teams, Libraries and Collaboration](Teams-Libraries-and-Collaboration.md) |
| **Layer clipboard payload** | `{format:"pixlprfct.layers", version:1, shapes}` (MIME `application/x-pixlprfct-layers`); also the output of SVG import | [Document Model and File Format](Document-Model-and-File-Format.md) |
| **Write guard** | JS callback (`set_write_guard`) the engine calls before commit/undo/redo; non-empty return rejects (team leases, protected libraries) | [Rust Document Engine](Rust-Document-Engine.md) |
| **Text measurer** | JS callback (`set_text_measurer`) returning `[w, h, baseline]` during layout | [Rust Document Engine](Rust-Document-Engine.md) |
| **`layout_class`** | Engine-assigned unique CSS class per layer, used by the CSS renderer and code export | [Rendering and Export](Rendering-and-Export.md) |
| **ID range reservation** | `reserve_ids(start, end)` — confines new IDs to a server-assigned block (100,000 wide) during live team editing | [Teams, Libraries and Collaboration](Teams-Libraries-and-Collaboration.md) |
| **Library maps** | `document.libraries[].maps` — source-ID → local-ID tables for imported library content | [Teams, Libraries and Collaboration](Teams-Libraries-and-Collaboration.md) |

## Components

| Term | Definition | Page |
| --- | --- | --- |
| **Main component** | A frame with `component: {type:"master"}`; the source for linked instances | [Components, Variants and Slots](Components-Variants-and-Slots.md) |
| **Instance / instance root** | A fully materialized copy rebuilt from its main on every commit; the root is the layer where `master == source` — swap, variant switch and reset act there | [Components, Variants and Slots](Components-Variants-and-Slots.md) |
| **Source** | On an instance layer, the ID of the main-component layer it mirrors | [Components, Variants and Slots](Components-Variants-and-Slots.md) |
| **Override path** | String such as `text` or `typography.font_size` in an instance layer's `overrides`, marking values kept instead of inherited | [Components, Variants and Slots](Components-Variants-and-Slots.md) |
| **Instance appearance protection** | Instances may change only content/state fields (name, text, hidden, locked, control state, root position/width); appearance edits fail outside slots | [Components, Variants and Slots](Components-Variants-and-Slots.md) |
| **Push to main** | Applies eligible instance overrides back to the main component | [Components, Variants and Slots](Components-Variants-and-Slots.md) |
| **Component set** | Variant group with properties, value combinations and an optional container frame | [Components, Variants and Slots](Components-Variants-and-Slots.md) |
| **Component property** | Text, boolean (visibility) or slot binding exposed on a main and its instances | [Components, Variants and Slots](Components-Variants-and-Slots.md) |
| **Slot** | Nested frame in a main whose content instances may replace; limits are advisory | [Components, Variants and Slots](Components-Variants-and-Slots.md) |

## Styles, variables and paints

| Term | Definition | Page |
| --- | --- | --- |
| **Paint stack** | Ordered `appearance.fills` / `strokes` arrays (top first, ≤ 64); legacy scalar fields summarize the top paint | [Styles, Variables and Paints](Styles-Variables-and-Paints.md) |
| **Variable binding** | `variable_bindings` entry mapping a property path to a variable ID | [Styles, Variables and Paints](Styles-Variables-and-Paints.md) |
| **Mode inheritance** | Variable mode comes from the layer → ancestors → page → collection default | [Styles, Variables and Paints](Styles-Variables-and-Paints.md) |
| **Detach** | Removing a style/variable link while keeping the last resolved value; happens automatically on direct edit | [Styles, Variables and Paints](Styles-Variables-and-Paints.md) |
| **Input Base** | Preset variable collection whose tokens style starter controls | [Prototyping, Behaviors and Controls](Prototyping-Behaviors-and-Controls.md) |
| **Shared overrides** | Per-starter list of control style paths that stop inheriting from the source starter | [Prototyping, Behaviors and Controls](Prototyping-Behaviors-and-Controls.md) |

## Layout

| Term | Definition | Page |
| --- | --- | --- |
| **Hug / Fill / Fixed** | Per-axis sizing modes (`auto_layout.hug_*`, `layout_item.fill_*`, or neither) | [Layout, Auto Layout and Grid](Layout-Auto-Layout-and-Grid.md) |
| **Automatic spacing** | `justify` = `between` / `around` / `evenly`; ignores the stored gap | [Layout, Auto Layout and Grid](Layout-Auto-Layout-and-Grid.md) |
| **Strokes included** | `auto_layout.strokes_included` — inside strokes reserve space before padding | [Layout, Auto Layout and Grid](Layout-Auto-Layout-and-Grid.md) |
| **Canvas stacking** | `auto_layout.canvas_stacking` (`first`/`last`) — paint and hit order only | [Layout, Auto Layout and Grid](Layout-Auto-Layout-and-Grid.md) |
| **Absolute child** | `layout_item.absolute` — excluded from flow and hug, positioned by constraints | [Layout, Auto Layout and Grid](Layout-Auto-Layout-and-Grid.md) |
| **Constraints** | Per-axis `min`/`max`/`center`/`stretch`/`scale` rules applied when a parent frame resizes | [Layout, Auto Layout and Grid](Layout-Auto-Layout-and-Grid.md) |
| **Cell container** | Engine-created vertical-flex wrapper frame (`layout_item.grid_container`) occupying a grid cell or named area | [Layout, Auto Layout and Grid](Layout-Auto-Layout-and-Grid.md) |
| **Named area** | `GridArea` binding children to a rectangular span of tracks | [Layout, Auto Layout and Grid](Layout-Auto-Layout-and-Grid.md) |
| **Layout media** | `layout_media` breakpoint overrides from Layout CSS; evaluated against the root frame width; ignored by Canvas 2D | [Layout, Auto Layout and Grid](Layout-Auto-Layout-and-Grid.md) |
| **Frame enclosure** | Drawing *or moving* a frame adopts sibling layers fully inside it (PixlPrfct extension on move) | [Layout, Auto Layout and Grid](Layout-Auto-Layout-and-Grid.md) |

## Editor UI

| Term | Definition | Page |
| --- | --- | --- |
| **`refresh()`** | app.js routine: re-snapshot, re-render panels/inspector, schedule canvas draw, persist | [Web Editor Architecture](Web-Editor-Architecture.md) |
| **Gesture** | app.js object for the active pointer interaction (move, resize, rotate, marquee, node, grid-span…); previews only until pointer-up | [Canvas Tools and Editing](Canvas-Tools-and-Editing.md) |
| **Selection roots** | Selected IDs minus any whose ancestor is also selected | [Canvas Tools and Editing](Canvas-Tools-and-Editing.md) |
| **Drill / deep select** | Double-click enters one nesting level; Ctrl/Cmd-click selects the deepest hit | [Canvas Tools and Editing](Canvas-Tools-and-Editing.md) |
| **Editor marks** | Layers with `editor_meta.role` (section, slice, comment, annotation, measurement, spec); stripped from export by `artworkShapes` | [Rendering and Export](Rendering-and-Export.md) |
| **CSS canvas** | Shadow-DOM HTML/CSS rendering of the page inside the editor, used for controls, grid, breakpoints and custom CSS | [Rendering and Export](Rendering-and-Export.md) |
| **`compileCssScene`** | The single compiler producing both the CSS canvas and HTML/CSS exports | [Rendering and Export](Rendering-and-Export.md) |
| **`compositeGeometry`** | Shared pass computing content and effect bounds for all renderers | [Rendering and Export](Rendering-and-Export.md) |
| **Viewport renderer** | Offscreen raster cache of artwork with 256 px overscan | [Rendering and Export](Rendering-and-Export.md) |
| **Local draft** | Browser-stored project in `localStorage["pixlprfct.drafts.v1"]`, Web-Lock guarded, with a per-tab recovery copy | [Web Editor Architecture](Web-Editor-Architecture.md) |
| **Flow starting point** | Named frame (`flow_name`) offered as a start in the prototype player | [Prototyping, Behaviors and Controls](Prototyping-Behaviors-and-Controls.md) |
| **Behavior** | User JavaScript on a layer (trigger: load/click/hover/view); runs only in sandboxed preview and exports | [Prototyping, Behaviors and Controls](Prototyping-Behaviors-and-Controls.md) |

## Import

| Term | Definition | Page |
| --- | --- | --- |
| **fig-kiwi** | The binary `.fig` container; deflate/Zstandard chunks decoded with a hand-written Kiwi reader | [Import: Design Files and SVG](Import-Design-Files.md) |
| **Import review report** | Grouped conversion warnings shown before confirming a design-file import | [Import: Design Files and SVG](Import-Design-Files.md) |

## SVG Animator

| Term | Definition | Page |
| --- | --- | --- |
| **SVG Animation (design type)** | Separate document type (`design_type:"svg-animation"`) that animates imported SVG and exports SMIL; bypasses the Rust engine | [SVG Animator](SVG-Animator.md) |
| **Track** | Keyframes for one (element, property) pair in `svg_animation.tracks` | [SVG Animator](SVG-Animator.md) |
| **Keyframe easing** | Preset or cubic-Bézier `[x1,y1,x2,y2]` governing the segment *leaving* a key | [SVG Animator](SVG-Animator.md) |
| **Transform origin** | Per-element pivot in `svg_animation.origins` for rotate/scale | [SVG Animator](SVG-Animator.md) |
| **Motion path** | Route snapshot (`motion.d`) + `motionProgress` track; exported as `animateMotion` | [SVG Animator](SVG-Animator.md) |
| **Morph** | `d` animation between node arrays with the same topology | [SVG Animator](SVG-Animator.md) |
| **Interaction trigger** | Export start mode `load` / `hover` / `click`; hover/click embed a tiny SVG-scoped player | [SVG Animator](SVG-Animator.md) |
| **pxv IDs** | Stable element IDs (`pxv<n>`) assigned by `sanitizeSvg` and referenced by tracks | [SVG Animator](SVG-Animator.md) |

## Teams, hosting and storage

| Term | Definition | Page |
| --- | --- | --- |
| **Workspace** | `?workspace=` scope: `personal`, `org:<id>`, `team:<id>` | [Teams, Libraries and Collaboration](Teams-Libraries-and-Collaboration.md) |
| **Owner key** | `documents.owner` value (`user:`/`org:`/`team:` prefix; raw user ID on Sites) | [Cloud API and Database](Cloud-API-and-Database.md) |
| **File role** | Per-file access: none, viewer, commenter, editor (owner derived) | [Teams, Libraries and Collaboration](Teams-Libraries-and-Collaboration.md) |
| **Editing lease** | 90-second single-editor token (`x-pixl-edit-token`) required to save in handoff mode | [Teams, Libraries and Collaboration](Teams-Libraries-and-Collaboration.md) |
| **Handoff** | Transferring the lease to a teammate who requested it | [Teams, Libraries and Collaboration](Teams-Libraries-and-Collaboration.md) |
| **Edit together (live mode)** | `editing_mode='live'`: ~1 s polling with server-side three-way field merge; no CRDT | [Teams, Libraries and Collaboration](Teams-Libraries-and-Collaboration.md) |
| **Write fence** | SQL `EXISTS` conditions that re-verify lease, policy revision and membership at commit time | [Self-Hosted Server](Self-Hosted-Server.md) |
| **Policy revision** | `document_collaboration.revision`; bumped by sharing changes, invalidating leases and live tokens | [Self-Hosted Server](Self-Hosted-Server.md) |
| **Automatic checkpoint** | `document_versions` row (`kind='automatic'`) of the previous save, at most every 5 minutes | [Cloud API and Database](Cloud-API-and-Database.md) |
| **Content-addressed body** | Document body > 1.5 MB stored once by SHA-256, referenced as `@pixlprfct-r2:<hash>` | [Cloud API and Database](Cloud-API-and-Database.md) |
| **Library link** | Entry in `doc.libraries[]` tying a consumer file to a library release | [Teams, Libraries and Collaboration](Teams-Libraries-and-Collaboration.md) |
| **Author-approved overrides** | `editor_meta.library_overrides` flags (properties, sizing, variants) a library author enables for consumers | [Teams, Libraries and Collaboration](Teams-Libraries-and-Collaboration.md) |
| **Device library** | Library release stored in IndexedDB `pixlprfct.libraries.v1` (workspace `local`) | [Teams, Libraries and Collaboration](Teams-Libraries-and-Collaboration.md) |
| **Installation administrator** | Verified account whose email equals `PIXL_ADMIN_EMAIL`; gates `/api/installation/*` | [Self-Hosted Server](Self-Hosted-Server.md) |
| **vinext** | Vite implementation of the Next.js app router used for the Sites/Cloudflare app | [Build System](Build-System.md) |
| **Execution profile** | `portable` or `managed-linux` (`.sites-runtime/execution-profile.json`) selecting how Sites installs/builds run | [Build System](Build-System.md) |

## Desktop

| Term | Definition | Page |
| --- | --- | --- |
| **`pixlprfct://app`** | Privileged custom protocol serving bundled editor assets with a CSP | [Desktop App](Desktop-App.md) |
| **Workspace partition** | Per-origin persistent Electron session (`persist:pixlprfct-local`, `persist:workspace-<hash>`) | [Desktop App](Desktop-App.md) |
| **Team server connection** | Desktop window on a validated HTTPS/loopback self-hosted origin, with no native bridge | [Desktop App](Desktop-App.md) |
| **Update feed** | Squirrel.Mac JSON feed URL embedded at build time (`PIXL_UPDATE_URL`); Mac release builds only | [Desktop App](Desktop-App.md) |
| **Signing modes** | `test`, `signed`, `release`, `app-store` in `scripts/desktop/signing.mjs` | [CI/CD and Releases](CI-CD-and-Releases.md) |
| **BUILD-PROVENANCE.json** | Windows prerelease record of repo, commit, run URL, platform and signing status | [CI/CD and Releases](CI-CD-and-Releases.md) |

## MCP and agents

| Term | Definition | Page |
| --- | --- | --- |
| **Live session (`live:<uuid>`)** | MCP session routed over the loopback bridge to an open editor | [MCP Server](MCP-Server.md) |
| **File session (`file:<uuid>`)** | Saved `.pixl` loaded into a headless WASM engine inside the MCP process | [MCP Server](MCP-Server.md) |
| **Editor bridge** | WebSocket server `ws://127.0.0.1:<port>/bridge` (default 4317) pairing editors with an MCP server | [MCP Server](MCP-Server.md) |
| **Pairing code** | 43-character random token entered in a browser editor; rotates each server restart | [MCP Server](MCP-Server.md) |
| **Scoped token** | HMAC-SHA256(origin) keyed by the pairing code, given to desktop renderers via discovery | [MCP Server](MCP-Server.md) |
| **Discovery record** | Private `~/.pixlprfct/mcp/<uuid>.json` announcing a running bridge | [MCP Server](MCP-Server.md) |
| **Revision (MCP)** | Opaque `epoch:counter` string every mutation must supply; changes on content edits only | [MCP Server](MCP-Server.md) |
| **Build batch** | Atomic list of 1–200 operations applied on a scratch `Editor` as one undo step | [MCP Server](MCP-Server.md) |
| **`$ref` / `as`** | Names a batch operation's result (`as`) and references it later (`{"$ref":"name"}`) | [MCP Server](MCP-Server.md) |
| **Engine command catalog** | `web/editor-api.js` — generated `engineCommands` + `modelReference` (100 commands, 51 models) | [MCP Server](MCP-Server.md) |
| **Installation operator** | Opt-in MCP tools (`--installation`) that configure, migrate, start and back up a self-hosted server | [MCP Server](MCP-Server.md) |

## Icons and testing

| Term | Definition | Page |
| --- | --- | --- |
| **PixlPrfct Icons / `pxi`** | MIT icon font and CSS prefix (`pxi pxi-<name> pxi-<weight>`); weights map to stroke widths 1 / 1.5 / 2.5 | [Icon Library](Icon-Library.md) |
| **Territory Track icon manifest** | `territory-track.json` mapping Territory Track web/iOS icon references to PixlPrfct icons | [Icon Library](Icon-Library.md) |
| **cloudDatabase shim** | `tests/cloud-db.mjs` — `node:sqlite` presented as a D1 binding with Drizzle migrations applied | [Testing and Verification](Testing-and-Verification.md) |
| **Responsiveness gate** | Playwright 727-layer test requiring p95 < 100 ms edit-to-second-frame | [Testing and Verification](Testing-and-Verification.md) |
| **B-items** | Numbered PixlPrfct limitations (B1–B39) in the gap tally | [Project Status and Roadmap](Project-Status-and-Roadmap.md) |

## Related pages

[Home](Home.md) · [Architecture Overview](Architecture-Overview.md) · [Repository Map](Repository-Map.md)
