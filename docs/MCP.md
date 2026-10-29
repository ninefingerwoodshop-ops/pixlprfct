# PixlPrfct MCP

PixlPrfct's MCP server lets an agent build and edit designs in an open editor tab
or in saved `.pixl` projects. Both use the same Rust/WASM engine as the editor.

## Install and connect an agent

Requires Node.js 24+, installed project dependencies, and the built editor engine:

```sh
npm ci
npm run build
```

Add this local stdio server to your MCP client, replacing both absolute paths:

```json
{
  "mcpServers": {
    "pixlprfct": {
      "command": "node",
      "args": [
        "/absolute/path/to/pixlprfct/mcp/server.mjs",
        "--workspace", "/absolute/path/to/design-projects"
      ]
    }
  }
}
```

Use the direct `node` command in clients: npm's startup messages do not belong
on the MCP protocol stream. For a terminal launch, `npm run mcp -- --workspace
/absolute/path/to/design-projects` is available. The server writes diagnostics
to stderr and protocol messages to stdout, as specified by
[MCP's stdio transport](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports).
It uses the [official MCP SDK](https://ts.sdk.modelcontextprotocol.io/server).

For Codex's local configuration, the equivalent is:

```toml
[mcp_servers.pixlprfct]
command = "node"
args = ["/absolute/path/to/pixlprfct/mcp/server.mjs", "--workspace", "/absolute/path/to/design-projects"]
```

This repository does not modify your agent configuration automatically.

## Live editor

In the desktop app, open your project and start the configured PixlPrfct MCP
server in your AI client. The editor discovers the server and connects within a
few seconds, including when the app or server starts first. The agent calls
`pixlprfct_sessions` to select the intended project. Multiple local agent
processes are discovered separately; an occupied default port automatically
falls back to a free loopback port. Explicit `--port` values remain strict.

The same discovery works in desktop team-server windows whose origin is allowed
by the MCP server. Servers publish a private, per-process record under
`~/.pixlprfct/mcp` (directory 0700, files 0600 on POSIX). Only the desktop main
process reads it; renderers receive a token scoped to their own allowed origin.
Records are removed on normal shutdown; records belonging to dead processes are
ignored. This direct-distribution desktop workflow does not claim discovery
across a Mac App Store sandbox boundary.

For an editor in a normal browser:

1. Ask the agent to call `pixlprfct_connection`.
2. In the intended PixlPrfct project, open **Tools → MCP connection**.
3. Enter the returned bridge URL and pairing code, then click **Connect**.
4. The agent calls `pixlprfct_sessions` and chooses that live session.

Browser pairing is saved in session storage for that tab and project, so a reload
or interrupted socket reconnects automatically. A server restart rotates the
code; browser editors require the new code, while desktop editors discover it
automatically. Codes are never placed in URLs. The bridge listens only on
`127.0.0.1` and validates Host, Origin and the pairing code. The default allowed
origins are `pixlprfct://app` and localhost / 127.0.0.1 on ports 4173, 4174, 4176,
and 5173. For another editor origin, pass `--origin https://your-editor.example`
or set `PIXLPRFCT_EDITOR_ORIGIN`. Use `--port 4318` or `PIXLPRFCT_MCP_PORT` for
an explicit bridge port, or `--port 0` for an available port.

The self-hosted editor's CSP permits the loopback WebSocket connection. Restart
an already running self-host server after upgrading its CSP. Browser mixed-content
or local-network policies may restrict an HTTPS editor's connection to loopback;
the browser must permit the connection. No certificate or browser protection is
disabled by this implementation. Hosted MCP over the public internet is not
implemented: the MCP client and bridge run on the same computer as the browser.

Click **Disconnect** to pause agent access to that project. The pause survives
reloads and app restarts until you click **Connect**. Reconnection uses bounded
backoff and heartbeat detection, without replaying requests or edits. A project
change closes the old session before it can receive another request; desktop
discovery creates a fresh session for the new project. Agents must list sessions
and read the current revision after a disconnect, since an interrupted edit may
already have completed.
The server never receives session cookies or account credentials. Editor changes
use normal autosave, and cloud permissions and imported-library protection still
apply. An agent cannot edit while a canvas gesture, inline text edit, or CSS
preview is active. Source permissions are checked on every mutation.

## Saved projects

`pixlprfct_open_project` opens a relative `.pixl` path in the configured workspace,
or creates a new in-memory project. `pixlprfct_save_project` persists it. Unsaved
changes are lost if the process stops or the session is closed. Existing files
are checked for outside changes before an atomic save; a Save As destination
must not already exist. Paths outside the workspace and escaping symlinks are
rejected. Set the workspace through `--workspace` or `PIXLPRFCT_WORKSPACE`;
the default is `.local/mcp-projects` relative to the launch directory.

Pass `--no-live` to disable the browser bridge entirely. Open saved files in the
editor through the existing **Open design** action. Browser-local draft storage
is separate; a filesystem session does not silently overwrite a browser draft.
Headless text uses deterministic approximate metrics. Verify exact typography
in a live editor, where the actual canvas font measurements are used.

## Tools and coverage

| Tool | Purpose |
| --- | --- |
| `pixlprfct_reference` | Search capabilities, commands, models, defaults, icons, frame presets and guides |
| `pixlprfct_sessions` | List paired tabs, open file sessions and workspace project files |
| `pixlprfct_connection` | Get browser pairing details (desktop connects automatically) |
| `pixlprfct_open_project` | Open or create a saved-project session |
| `pixlprfct_read` | Inspect layer summaries, complete properties or the entire document |
| `pixlprfct_build` | Apply an atomic batch as one undo step |
| `pixlprfct_command` | Execute one of the catalogued engine commands |
| `pixlprfct_css` | Read generated and custom CSS for any layer |
| `pixlprfct_history` | Undo/redo using the session's history |
| `pixlprfct_select` | Select layers in a live editor |
| `pixlprfct_export` | Return `.pixl`, SVG, HTML, React, Vue, Angular or Rust files |
| `pixlprfct_save_project` | Save inside the filesystem workspace with conflict checks |
| `pixlprfct_close_project` | Close an in-memory file session without deleting the saved file |

The server also exposes `pixlprfct://reference/<topic>` resources and a
`build-design` prompt. Its catalog currently covers 85 engine commands and 45
model definitions, generated from the compiled API and Rust types. Building the
editor regenerates the catalog; `npm run mcp:check` checks it for drift.

All serialized layer properties are available: text, vectors, embedded images,
all 26 native control kinds and their states, fill/stroke stacks and paint modes,
effects, guides, Flexbox, CSS Grid, constraints, responsive layout rules, custom
CSS, prototypes, motion, and development behaviors. Pages, grouping, stacking,
components, instances, variants, exposed component properties, variables and
guide/effect styles have dedicated engine commands. No arbitrary JavaScript evaluation
or shell execution is exposed. Development behavior code is stored/exported,
not executed by the server.

Accounts, passwords, database setup, team membership, library publication and
permissions, deployment, and project deletion remain app workflows. Already
linked library assets are usable under the same protection rules. This MCP
does not claim features the editor itself does not implement. SVG cannot capture
custom CSS or backdrop blur; use HTML/framework exports. Prototype interactions
are saved in `.pixl` but are not converted to JavaScript by the code exporter.

## Build operations

Always read first and supply the returned `revision`. Use `create` for a layer,
`update` for a deep property patch, `command` for an engine operation, `css` for
CSS overrides, and `rename_project` for the project name. Arrays replace; null
clears optional values. Controls create main-component frames, matching the
Assets starters. Create children first and call `group_many` to form a group.

```json
{
  "session": "file:ID_FROM_OPEN_PROJECT",
  "revision": "1",
  "operations": [
    {"op":"create","kind":"frame","as":"card","properties":{"name":"Card","width":420,"height":240}},
    {"op":"create","kind":"text","parent":{"$ref":"card"},"properties":{"name":"Title","text":"Hello from MCP"}},
    {"op":"create","control":"button","parent":{"$ref":"card"},"properties":{"name":"Continue","width":160,"height":40,"control":{"label":"Continue"}}}
  ]
}
```

`as` names an operation result; `{"$ref":"card"}` resolves it later in the same
batch. IDs are never guessed. Read `commands` for ordered command arguments:
JSON arguments are structured objects/arrays, not strings containing JSON.
Read `defaults`, `models`, and the relevant guide before authoring nested fields.

Model queries accept an array of searches, comma-separated names, or a single
search string. For example, `{"topic":"models","query":["Typography","Value"]}`
returns both the declarations and their accepted values.

### Design-system authoring

- **Variable aliases:** a mode value may be `{"alias":1}`, where `1` is the
  primitive variable's ID. The kinds must match. Cross-collection aliases resolve
  using the target collection's inherited mode and update when primitives change.
  `save_variables` replaces the complete object; read and preserve unrelated values.
- **Text sizing:** `typography.sizing` stores `"width"` (auto width), `"height"`
  (auto height), or `"fixed"`. MCP create/update also accept `"auto_width"` and
  `"auto_height"`. Use auto width for labels and `layout_item.fill_width:false`.
  Fill width intentionally changes a text layer to auto height. Auto-layout
  inference preserves auto-width text; fixed full-width children may become Fill.
- **Hugged buttons:** set the parent `auto_layout.hug_width:true` and keep label
  `fill_width:false`. Creating a component preserves these settings. A Fill child
  prevents its parent from hugging on that axis, regardless of component status.
- **Coordinates:** stored `x/y`, update patches and engine commands use document
  coordinates. Create defaults to `coordinate_space:"world"`; use
  `coordinate_space:"parent"` with a parent ID/ref for offsets from that parent's
  stored origin. Auto layout still controls flow children. This is an offset from
  the unrotated origin, not a transformed screen coordinate.
- **Duplication:** `duplicate` and `duplicate_many` retain the interactive 24px
  offset. `duplicate_many_offset` takes `[ids, xOffset, yOffset]`; `[ids,0,0]`
  duplicates in place. It preserves hierarchy and bindings and returns all copied
  IDs in document order. Auto-layout flow remains in effect.
- **Stroke alpha:** MCP create/update accept `appearance.stroke_color:"#102a4780"`
  and store `#102a47` plus `stroke_opacity:128/255`. Explicit `stroke_opacity` wins.
  Raw engine commands and serialized project files use separate color and opacity.
- **Exported variables:** generic number tokens remain unitless. Length bindings
  add `calc(var(--px-space-3,16) * 1px)` automatically, while opacity and line height
  use unitless values. Manually authored CSS must choose the appropriate unit.
  Solid stroke color bindings survive HTML/framework export, including stacked,
  aligned, and per-side borders. Standalone SVG remains a resolved visual snapshot.

Long unbreakable words in a constrained text box currently break at grapheme
boundaries. Auto-width text avoids this unless a maximum width is set. A separate
word-breaking policy is not yet implemented. Saved text styles remain an open gap.

A batch supports up to 200 operations and commits only if every operation and
permission check succeeds. Errors leave the original document and undo history
unchanged. If the revision changed, re-read and adapt the edit. If a request times
out or disconnects, it may already have completed: read before retrying. Live
undo shares the human user's history; do not undo someone else's unrelated edit.

## Validation

```sh
npm run mcp:check
```

Tests use a standard MCP client over stdio and an in-memory transport, exercise
the live bridge's origin/token/session checks, and build/export through the
same engine. Network tests bind a temporary loopback port.
