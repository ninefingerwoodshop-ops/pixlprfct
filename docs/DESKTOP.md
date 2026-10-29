# PixlPrfct desktop

The Electron app packages the existing editor and Rust/WASM engine for macOS and Windows. The editor works offline, with local projects in its own persistent app profile. **File → Connect to a team server** opens a self-hosted workspace in a separate window/session. Registration, login, teams, library permissions and shared project storage remain on that server. The desktop package does not start a database or an HTTP server.

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

## 0.1.1-alpha.1 desktop update

This build includes the animated logo preloader, expanded file-type and rich-text
icons, recoverable project Trash, and the Admin console. Open **Projects → Admin**
for local Content/Trash and database setup. **Open a team server** uses the desktop
connection window, preserving isolated local and remote sessions; people, roles,
invitations, and teams are managed on the connected server.

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
- Live MCP pairing uses `pixlprfct://app` as the desktop origin. Run the MCP server separately as described in [MCP.md](MCP.md).

## Security boundaries

The renderer has sandboxing and context isolation enabled, with Node integration and webviews disabled. A standard secure `pixlprfct://app` protocol serves only bundled assets with a Content Security Policy; no broad `file://` privileges or network listener is needed. The local bridge exposes only selected-file import, pending OS file opens, native menu events and the connection dialog. IPC checks the sender window, main frame and packaged origin. Remote workspaces receive menu commands only, with no exposed native bridge. Other device permissions are denied; local clipboard access supports editor copy/paste.

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
