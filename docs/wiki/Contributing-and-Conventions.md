# Contributing and Conventions

How changes get into PixlPrfct and the conventions the codebase follows. **Every change goes through a PR reviewed by the owner; there is no required CI, so you are responsible for running the full local check set and stating your verification evidence in the PR.**

## At a glance

| | |
| --- | --- |
| **Policy docs** | [CONTRIBUTING.md](../../CONTRIBUTING.md), [AGENTS.md](../../AGENTS.md), [SECURITY.md](../../SECURITY.md), [PRIVACY.md](../../PRIVACY.md), [CODE_SIGNING.md](../../CODE_SIGNING.md), [LICENSING.md](../LICENSING.md) |
| **Owner** | `@ninefingerwoodshop-ops` owns every path (`.github/CODEOWNERS`) |
| **Branch rules** | `main` requires a PR, owner review, resolved conversations; new commits dismiss stale approvals; no force-push/deletion |
| **CI** | Automatic CI and required status checks are **disabled**; Pages publishing and manually dispatched desktop packaging remain |
| **License for contributions** | Pixel Perfect Community License 1.0 (source-available) |

## Workflow

1. Fork / branch.
2. Read [AGENTS.md](../../AGENTS.md) and [Interface Design Guidelines](Interface-Design-Guidelines.md) before any UI work.
3. Implement with tests (Rust `#[cfg(test)]`, `tests/*.test.mjs`, and `tests/browser/*.spec.mjs` for UI workflows).
4. Run the full check set (see [Getting Started §4](Getting-Started.md#4-run-the-checks)):
   `npm run build`, `npm test`, `npm run lint`, `npm run typecheck`, `npm run test:browser`, `node scripts/generate-editor-api.mjs --check`, `cargo fmt --all --check`, `cargo clippy --all-targets --all-features -- -D warnings`.
5. PR description: problem → resulting behavior → **how you verified it** (commands, browsers, screenshots, what was *not* verified).
6. Wait for owner review.

Bugs and features: GitHub issues with repro steps and version. Vulnerabilities: private security advisory only. Never attach credentials or private design files.

## Commit and PR naming (observed in history)

| Kind | Pattern | Example |
| --- | --- | --- |
| Feature | Imperative "Add …" | `Add SVG timeline snapping to playhead and keyframes (#46)` |
| Fix | "Fix …" | `Fix SVG Pause button clicks during playback (#49)` |
| Release | "Release Windows alpha.N with …" / "Prepare Windows alpha.N …" | `Release Windows alpha.18 with SVG keyframe duplication and snapping (#47)` |
| Dependencies | Dependabot "Bump …" / "Build(deps): …" | `Bump vite from 8.0.13 to 8.3.5 (#7)` |

PRs are squash-merged with the PR number in the subject.

## Language and evidence conventions

The docs use deliberately careful status language. Match it:

- **"Implemented"** = code exists and the cited local checks pass. It does **not** mean complete workflow coverage, an installed update, a merged branch, or a public release (from [CAPABILITY_MATRIX.md](../CAPABILITY_MATRIX.md)).
- Keep **source**, **packaged build**, **installed** and **published release** evidence separate.
- Say "local" when something was only verified locally; name what was not tested (e.g., "real OS sleep not tested").
- Never invent adoption, retention or participant data; synthetic test actors are labeled synthetic.
- In the gap tally, never delete completed entries — strike/check and append a dated resolution.

## Code conventions

### Rust (`src/`)

- `cargo fmt` and `cargo clippy -D warnings` must be clean.
- Mutations are **atomic**: validate first, then apply, then push one history entry — a failing edit leaves the document unchanged.
- Each feature area gets its own module (`grid.rs`, `slots.rs`, …); `lib.rs` exposes the `#[wasm_bindgen]` surface.
- Keep JSON (serde) shapes backward compatible; add migrations for format changes. See [Document Model and File Format](Document-Model-and-File-Format.md).

### Editor JavaScript (`web/`)

- Plain browser **ES modules**, no framework and no bundler for the editor itself (bundling only for workers).
- Source is written in a **dense, compact style** (long lines, short helpers). Follow the surrounding style rather than reformatting files — large reformat diffs obscure review.
- Feature modules export an **`installX(...)`** function (≈45 of them, e.g. `installCompactInspector`, `installMotion`) that wires DOM + events and returns update callbacks which `app.js` invokes after document changes.
- Use the shared chrome controls — `numberField`, `settingRow`, `settingsMenu`, `colorField` from `inspector-settings.js` and the dropdown layer from `inspector-dropdown.js` — no native visible `<select>`. (Note: `input-base.js`, `number-control.js` and `segmented-control.js` are *document* form controls designers place in designs, not editor chrome.)
- Chrome colors/spacing/radii/type/motion come from `web/ui-*.css` tokens; document paint never uses them.
- Any new editor command intended for agents must flow into `web/editor-api.js` via `npm run mcp:catalog`; `mcp:check` fails if the catalog is stale.

### TypeScript / React (`app/`, `lib/`, `components/`, `db/`, `worker/`)

- Strict TS (`tsconfig.json`), Next core-web-vitals ESLint rules.
- `components/ui/` is shadcn scaffold; only `project-home.tsx` and `connector-error.tsx` are product code.

### Node services (`server/`, `mcp/`, `scripts/`)

- ESM `.mjs`; `desktop/` uses CommonJS `.cjs` (sandboxed preloads).
- Validate all external input (`server/input.mjs`); never log secrets; secrets only in `.env.selfhost` (0600, gitignored).

## Licensing of contributions

New contributions are offered under the Community License; contributors keep ownership and must have authority to grant it. Identify third-party material and keep its license/notices (`web/vendor/figma-import-LICENSES.txt`, `web/icon-library-assets/LICENSE`, `vendor/shadcn-tailwind-4.13.0.LICENSE.md`, `scripts/vite/sites-vite-plugin.LICENSE`). Source through commit `6d9127f` remains available under MIT OR Apache-2.0; see [LICENSING.md](../LICENSING.md).

Summary of the license intent: you may use the editor commercially and sell what you **make with it** (including exported animation runtime helpers); you may not sell the editor, a fork, a paid feature tier, or paid hosted access. The icon library is separately MIT.

## Product site rules

`site/` deploys from `main` via `.github/workflows/pages.yml`. Preview with `python3 -m http.server 4200 --bind 127.0.0.1 --directory site`. Keep download links pinned to verified release assets; update version, notes, metadata and signing status together; screenshots must come from the real app with sample artwork.

## Related pages

[Getting Started](Getting-Started.md) · [Testing and Verification](Testing-and-Verification.md) · [CI/CD and Releases](CI-CD-and-Releases.md) · [Interface Design Guidelines](Interface-Design-Guidelines.md)

## Source of truth

[CONTRIBUTING.md](../../CONTRIBUTING.md), [AGENTS.md](../../AGENTS.md), `.github/CODEOWNERS`, `git log`, [LICENSING.md](../LICENSING.md).
