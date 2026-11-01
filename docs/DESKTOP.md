# PixlPrfct desktop

The Electron app packages the existing editor and Rust/WASM engine for macOS and Windows. The editor works offline, with local projects in its own persistent app profile. **File → Connect to a team server** opens a self-hosted workspace in a separate window/session. Registration, login, teams, library permissions and shared project storage remain on that server. The desktop package does not start a database or an HTTP server.

After a team server loads successfully, Desktop remembers its validated address and opens that workspace on the next launch. **File → All local projects** continues to open your offline projects. If you run the server on this Mac, keep its background service running; the desktop connection address is the local PixlPrfct server address, not the database provider's API URL.

## Windows SVG animator preview — v0.1.1-alpha.18

The [Windows preview](https://github.com/ninefingerwoodshop-ops/pixlprfct/releases/tag/v0.1.1-alpha.18)
packages the separate SVG Animation workspace and grouped timeline editing from
PR #37, group easing from PR #39, precise selection timing from PR #40,
animation reuse from PR #42, keyframe reversal from PR #43, duplication from
PR #45, and playhead/keyframe snapping from PR #46.
Create an SVG Animation design from Projects, import artwork, animate
properties, motion paths or shape nodes, and export an on-load, hover or click
animation. Multi-select keys across tracks to move, copy/paste and delete them
with undo/redo. Apply a preset or custom easing curve to the selected keys, or
set their exact start and proportional duration without changing values.
Copy transform or appearance keys to another element while retaining its own
origin, or reverse a selection and its easing to create a return animation.
Duplicate selected keys at the playhead with Cmd/Ctrl+D. Hold Shift while
dragging to align a group with the playhead or other keys; the group keeps its
relative spacing. Away from targets, Shift uses 100 ms intervals. Alt bypasses
snapping, and ordinary dragging stays free.
Each edit is one undo step. Editable animation projects use `.pixl` files.

Both the x64 installer and ZIP are unsigned early-testing packages. The release
page includes checksums, the exact source commit and the Windows build record.
This version uses the Pixel Perfect Community License; earlier v0.1.0-alpha.1
downloads keep their original MIT / Apache 2.0 terms. The packaged license and
legacy notices explain the distinction. Public Mac installers still await
notarization; local Mac test bundles are not part of this Windows release.

Install the new preview to update; Windows automatic updates are not provided.
Existing local projects use the same application profile. Export `.pixl` backups
before updating. The ZIP must be extracted in full before opening `PixlPrfct.exe`.
Native Windows install/startup/uninstall validation is recorded by the manually
dispatched packaging workflow. This does not claim interactive Windows coverage
of every editor feature. SVG workflow checks run in Chromium; cloud tests use a
mocked API rather than a deployed multi-user server.

The SVG export preview uses a bundled player in a dedicated opaque sandbox. This
fixes the inline-player restriction found during release preparation. The main
editor retains its existing content security policy; only the preview document
can be framed by the app. Its policy blocks network requests and inline scripts,
and the sandbox denies access to the parent document and application storage.
During alpha.15 preparation, click playback was also inspected through the actual
`pixlprfct://app` desktop protocol in an isolated Mac test profile. This is source-runtime verification,
not a claim of a notarized Mac download.

## Run and build

Use Node.js 24+, Rust and the `wasm32-unknown-unknown` target. Run `npm ci`; if your npm installation blocks lifecycle scripts, run `node node_modules/electron/install.js` to download the official Electron runtime.

| Command | Result |
| --- | --- |
| `npm run desktop:dev` | Build the editor and launch the development desktop app |
| `npm run desktop:pack` | Package a Mac `.app` for the current machine |
| `npm run desktop:mac` | Universal Apple Silicon + Intel Mac DMG and ZIP |
| `npm run desktop:win` | Windows x64 NSIS installer and ZIP |
| `npm run desktop:win -- --arm64` | Windows ARM64 installer and ZIP |
| `npm run desktop:check` | Desktop URL, storage isolation and file routing checks |

Test outputs go to `releases/desktop/`. Signed Mac builds awaiting notarization go to `releases/desktop/signed/`, public releases to `releases/desktop/release/`, and App Store builds to `releases/desktop/app-store/`. Generated `.desktop/` staging contains only the editor, shell and generated icons, using the white-on-black PixlPrfct logo. Desktop packaging does not include the web server, database drivers or application secrets.

Default packages are for testing: Mac builds use an ad-hoc signature; Windows builds are unsigned. The manually dispatched **Desktop test packages** workflow builds on Mac and Windows runners and stores workflow artifacts. It does not publish a release. Windows packages can be cross-built on a Mac, but must still be tested on Windows before release.

A development-only `PIXL_DESKTOP_TEST_PROFILE=/absolute/test/folder` environment variable isolates a test run from the normal desktop profile.

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

## 0.1.1-alpha.11 evaluation update

Installed locally in both existing `mac-arm64` and legacy `mac-universal` bundle
paths on 2026-10-30. Both paths contain this Mac's Apple Silicon build; this is
not a newly verified universal or public release. Native About reports alpha.11
and both bundles pass deep/strict signature verification. App and profile
backups are retained in `.local/evaluation-fixes/desktop-backup/`.

Includes conflict-safe local saves/recovery, inline Pages, page paint, typography
and text-style controls, shadow-variable pickers, label collision suppression,
and indexed component-property pruning. The full production build, 3 Rust +
958 JavaScript tests and 12 browser scenarios pass. See CAPABILITY_MATRIX.md
and PERFORMANCE.md for evidence and remaining parity/latency scope.

A real MCP client reconnects automatically and reads the saved 724-layer design.
The before/after comparison preserves all artwork and metadata after the app's
existing hidden-device-chrome default migration on seven frames. The real
40-minute transport-idle test passed earlier; installed-app OS sleep remains
pending. `npm run test:sleep` waits for manual sleep/wake and verifies actual
macOS power events, stable session identity, and unchanged document content.
It does not schedule wakeups or put the computer to sleep.

## 0.1.1-alpha.7 performance update

This local update reduces redundant color/instance resolution, MCP commits and
connection-status serialization, retains frame-label DOM, coalesces pointer redraws,
and caches unchanged canvas artwork within a fixed memory budget. See
`docs/PERFORMANCE.md` for measured results and remaining large-layout costs.
The Apple Silicon package passes deep/strict signature verification. The previous
alpha.6 app and app profile are retained in `.local/alpha-7-update-backup/`.
Native About confirms alpha.7, the saved project reopened, and a new real MCP
client automatically connected and read all 727 layers / 10 pages with the
original 87 components, 121 variables and 14 effect styles. The open browser
editor was also reloaded. Proof: `.local/ui-audit-2026-10-30/live-mcp-alpha7-proof.json`.
This is a local ad-hoc-signed build, not a public release.

## 0.1.1-alpha.6 desktop update

Adds complete line-height text alignment, paged MCP reads, page-scoped writes,
named variant parsing and visible directly saved sibling sets, core/MCP text
styles, and variable-bound shadow colors. Renderer background throttling is
disabled, stalled discovery no longer blocks reconnect work, and reconnecting
the same tab/project to a running server retains its session ID.

The Apple Silicon test app is installed at the existing local path; About
confirms alpha.6, and the Territory Track project reopens with Saved on this
device and Rust engine connected. The alpha.5 app and profile are preserved in
`.local/alpha-6-update-backup/`; the replacement passes deep/strict signature
verification. This is a local ad-hoc-signed installation, not a public release.
The full suite passes (3 Rust / 919 JavaScript). Simulated sleep and real socket
recovery are covered; a long real OS-sleep soak is still pending. Text-style and
shadow-variable inspector pickers remain pending.

Live verification used a real stdio client: all 727 layers arrived over 15 paged
reads, with the original 87 components, 121 variables, 14 effect styles and 10
pages. Page navigation preserved revisions; editor reload preserved the session
ID and invalidated old revision/cursor tokens. Claude was fully restarted and
its old MCP processes exited. Its original conversation was restored without
sending a prompt; acceptance from that conversation remains a separate check.

## 0.1.1-alpha.5 desktop update

Adds direct Add variant and Combine as variants workflows, editable variant
properties, component-set containers and grouped Assets. The Apple Silicon test
build and matching local editor assets are installed; native About and inspector
checks pass, and the existing 8-page, 613-layer design remains intact. The alpha.4
app and profile were retained for rollback.

MCP upgrade verification requires fully quitting and reopening Claude Desktop.
A window reload left a pre-update server alive alongside the new server, giving
Claude an empty session list despite the app showing Connected. Full relaunch
removed the old processes; both new processes were discovered and connected
automatically. A read-only check from the original Claude conversation then confirmed
one live session and 613 layers, with no edits. See [MCP.md](MCP.md).

## 0.1.1-alpha.4 desktop update

This local prerelease includes the MCP design-system authoring fixes and automatic
MCP discovery/reconnection. The Apple Silicon build was installed on the development
Mac at the existing app path, with the previous app and profile retained for rollback.
The local team-server editor assets and configured MCP runtime were updated together.

Native verification: the existing 8-page, 613-layer design reopened; Claude connected
without entering pairing details; editor reload restored the connection; two fresh
stdio MCP server launches independently discovered and read that same live design.
The bundle passed deep/strict signature verification. This is an ad-hoc-signed local
test build, not a notarized public release. The changes remain in draft PR #29.

## 0.1.1-alpha.2 desktop update

This build includes the animated logo preloader, expanded file-type and rich-text
icons, recoverable project Trash, and the Admin console. Open **Projects → Admin**
for local Content/Trash and database setup. **Open a team server** uses the desktop
connection window, preserving isolated local and remote sessions; people, roles,
invitations, and teams are managed on the connected server.
This update also restores the last successfully loaded team server on launch.

To update a direct-distribution build, quit PixlPrfct after the editor reports
**Saved on this device**, keep a backup of the previous app, and replace the app
bundle with the new build. Keep the bundle identifier and application name the
same. Replacing the application must not remove its Application Support profile,
which contains local projects and workspace sessions. The new version appears in
**About PixlPrfct**. This remains a prerelease; no automatic updater is included.

The universal Mac bundle was verified on Apple Silicon: the updated version is
shown in About, existing projects survive replacement and reopen with the Rust
engine connected, Admin loads from the packaged origin, and its connection button
opens the native server dialog with HTTPS validation. The bundle signature was
verified. Windows and Intel Mac execution were not repeated for this update.

## Privacy

Online fonts are off by default in local desktop designs. Enable **View → Allow online fonts in local designs** and reopen designs to load Google Fonts; disable it to stop new font requests. Team servers use their own settings. Read [Privacy](../PRIVACY.md) and [Code signing policy](../CODE_SIGNING.md) before distributing builds. Both are included in the app package and linked from Help.

## Projects and files

- All local projects are saved in the app's profile, independently from browser drafts. Storage currently uses the editor's existing local-storage format and quota; use `.pixl` backups for portable storage.
- Import a `.pixl` file through **Import design**, **File → Import design**, or its OS file association. Import makes a local copy; it does not overwrite the original file.
- **File → Save a copy** / Cmd/Ctrl+S and exports show the native Save dialog. Existing browser file upload controls use the native Open dialog.
- Transfer browser projects by saving `.pixl` files in the browser and importing them in the desktop app. Browser local storage is not automatically migrated.
- A team connection opens the server's own editor and account pages. HTTPS is required except for localhost / loopback development servers. Each origin receives its own persistent browser session. External links open in the default browser; cross-origin redirects are blocked. External OAuth/deep-link sign-in is not integrated; use the self-hosted email/password flow.
- Live MCP connects automatically to separately running local servers, including after reloads and restarts. Allowed team-server windows also use automatic discovery; normal browsers use manual pairing. See [MCP.md](MCP.md).

## Security boundaries

The renderer has sandboxing and context isolation enabled, with Node integration and webviews disabled. A standard secure `pixlprfct://app` protocol serves only bundled assets with a Content Security Policy; no broad `file://` privileges or network listener is needed. The local bridge exposes only selected-file import, pending OS file opens, native menu events and the connection dialog. IPC checks the sender window, main frame and packaged origin. Remote workspaces receive menu commands and MCP discovery limited to the current main frame and allowed workspace origin. Discovery exposes only an origin-scoped loopback credential, never filesystem access or the master pairing code. Other device permissions are denied; local clipboard access supports editor copy/paste.

Packaged Electron fuses disable Run-as-Node, Node environment options, inspector arguments and extra file-protocol privileges, and require the bundled ASAR with integrity validation. Public builds require platform signing; self-hosted team security still depends on the server's authentication and permission checks.

## Mac App Store

This is a separate MAS build, not the normal DMG. [Electron's Mac App Store guide](https://www.electronjs.org/docs/latest/tutorial/mac-app-store-submission-guide) requires the MAS runtime, App Sandbox, Apple signing identities and a provisioning profile. A distribution-signed MAS app is tested through Apple's distribution flow; use `mas-dev` for local testing.

Before signing, register your chosen bundle identifier in Apple Developer and App Store Connect. `app.pixlprfct.desktop` is the provisional development identifier; set the final identifier consistently **before distributing** an app. Keep it stable afterward.

Provide these in the build environment (never commit certificate files or credentials):

```sh
export PIXL_DESKTOP_APP_ID="your.registered.bundle.identifier"
export APPLE_TEAM_ID="YOURTEAMID"
export PIXL_MAS_PROFILE="/absolute/path/PixlPrfct.provisionprofile"
# Import the appropriate Apple certificate into the build machine's keychain,
# or configure electron-builder CSC_LINK / CSC_KEY_PASSWORD securely.
npm run desktop:mas:dev
# Use the distribution profile and Apple Distribution / Installer identities:
npm run desktop:mas
```

The build fails early without the App ID, Team ID and provisioning profile. MAS entitlements enable App Sandbox, outgoing network connections and user-selected file read/write; helper processes inherit the sandbox. Electron's signing tooling sets the team/application group identifiers. No local network server or broad filesystem entitlement is requested.

## Direct-download signing

For direct Mac distribution, import a **Developer ID Application** certificate and its private key into the build machine's keychain. `npm run desktop:mac -- --sign-only` produces a signed universal app, signed DMG and ZIP with Hardened Runtime enabled. These builds still need notarization before public distribution; the separate `signed/` output directory keeps them distinct from release packages.

To configure notarization, create an [Apple app-specific password](https://support.apple.com/en-us/102654), then store it in Keychain with Apple's interactive prompt:

```sh
xcrun notarytool store-credentials pixlprfct-notary --team-id YOURTEAMID
```

Enter your Apple Account email and app-specific password when prompted. Do not put the password in a shell command, source file or chat. Then build the signed, notarized release:

```sh
APPLE_KEYCHAIN_PROFILE=pixlprfct-notary APPLE_TEAM_ID=YOURTEAMID npm run desktop:mac -- --release
```

An App Store Connect API key (`APPLE_API_KEY`, `APPLE_API_KEY_ID`, `APPLE_API_ISSUER`) or the supported Apple Account environment variables are alternatives. The release command rejects missing notarization credentials before packaging. Signing and notarization failures stop the build. `--sign-only` cannot be combined with `--release` or used for Windows or App Store builds.

Windows public builds need a trusted Authenticode signing provider. For a provider that supplies an exportable certificate, configure `WIN_CSC_LINK` / `WIN_CSC_KEY_PASSWORD` securely and run `npm run desktop:win -- --release`. Hardware-backed and hosted services need their provider's signing integration; a SignPath Foundation application alone does not configure or sign the Windows build. See [electron-builder signing](https://www.electron.build/code-signing).

Signing, notarization, MAS testing and App Store submission require the owner's credentials and are not performed by a default build. App Store metadata, privacy disclosures, review and final acceptance remain release tasks. Automatic updates are not implemented; use the Mac App Store update channel for MAS releases and manually replace direct-distribution test builds.

## Initial verification

The universal Mac test app was exercised on Apple Silicon: project creation, frame editing, native Undo/Redo, native Save and Import dialogs, `.pixl` round trips, saved edits after relaunch, connection validation and opening the self-hosted login page. The desktop security-policy tests and local-draft/MCP regression tests pass. Windows x64 installer and ZIP packaging was verified on the Mac build host; execution on Windows, Intel Mac execution and signed MAS behavior still need their respective platform checks.

The `Windows prerelease` workflow additionally checks silent installation, creation of an application window, and silent uninstallation on a Windows runner before artifacts are published. This is a basic native-platform check, not full interactive coverage of every editor feature. Published release notes link the specific successful run.

On October 29, 2026 the full development dependency audit reported four high-severity findings in sharp and the Cloudflare local-development dependency tree (miniflare, undici, and ws). These Node dependencies are not included in the desktop app package. Do not expose a development server to the internet. This prerelease is not an independent security audit or a claim that all development dependencies are advisory-free.

Figma `.fig` files can also be opened through **File → Import design** (Cmd/Ctrl+O), the projects page, or drag-and-drop. They use the same local parser and conversion report as the browser. See [Figma import](FIGMA_IMPORT.md).

### Mac update delivery (local implementation, 2026-10-30)

`Help → Check for updates…` uses Electron's signed macOS updater. The HTTPS JSON
feed is embedded in the app at build time; workspace content cannot change it.
Unsigned test builds and App Store builds do not use this feed. Downloads are
verified by Squirrel.Mac against the app's signing identity. The app asks users
to save and restart after a download; it does not force-quit a working session.

For a standalone release, configure the Developer ID identity and notarization
credentials described above, then build with `--release`. `PIXL_UPDATE_URL` is
optional: set it only if the distributor offers automatic updates. Without it,
users install newer signed versions manually. Team administrators do not need to
host an update service, and team pages cannot redirect the binary update feed.
Validate the resulting app with:

```sh
node scripts/desktop/release-check.mjs /absolute/path/PixlPrfct.app
node scripts/desktop/update-feed.mjs /absolute/path/signed.zip https://your-host/signed.zip /absolute/path/feed.json release-notes.txt
```

The feed generator includes ZIP size and SHA-256. Upload the **verified** ZIP
before atomically replacing the feed. Use a separate feed per architecture or a
universal ZIP. Roll back code by shipping a higher version containing the reverted
code, retaining compatibility with the current additive database schema. Keep the
previous installer available. Publishing and a real signed update/rollback drill
remain release acceptance steps, not implied by local updater tests.

Reference: [Electron autoUpdater](https://www.electronjs.org/docs/latest/api/auto-updater)
and [Squirrel.Mac feed format](https://github.com/Squirrel/Squirrel.Mac#update-file-json-format).
