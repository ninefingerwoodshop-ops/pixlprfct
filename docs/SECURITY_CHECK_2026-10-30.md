# Focused local security check — 2026-10-30

## Audit follow-up — 2026-10-31

A fresh audit of the integrated lockfile reports zero high/critical advisories
and 30 moderate dependency-chain entries, all originating from the newly published
[minimatch pattern-amplification advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249).
This supersedes the earlier zero-advisory snapshot below. Affected paths are
linting and desktop packaging dependencies; they are not shipped in the static
product website or the prepared desktop application's runtime dependencies.

The advisory's fixed version is minimatch 11.0.1. The tree includes legacy callers
of minimatch 3 and 5, as well as 9 and 10. A global major-version override changes
the legacy callable API; npm's suggested force fix instead downgrades ESLint and
electron-builder to incompatible historical releases. Neither has been applied.
Keep build inputs and glob configuration trusted while upstream compatible fixes
are evaluated. This is a documented build-tool risk, not a clean dependency audit
or a reason to claim that repository approval rules certify software security.

Scope: alpha.14's team server, local desktop packaging, notification delivery and
new library/live-editing routes. This is an engineering check, not an independent
penetration test or a security certification.

- Identity comes from verified BetterAuth sessions; workspace and per-file access
  are checked on routes. Existing cross-origin and spoofed identity tests pass.
- Artwork writes fence membership, policy revision and editing credentials at
  commit time. New live edits use a server-retained base revision, not a client
  asserted base body. Conflicts preserve local recovery; the final transaction
  comparison rolls back related metadata/checkpoint writes on failure.
- Notification inbox and mail recheck visibility; preferences are user-scoped.
  Emails contain links and generic activity types, without artwork/comment text.
  Simulation covers transport failure/retry and revocation before delivery.
- Live presence exposes display names/cursors only to current file members.
  Other sessions' editing tokens are not included. Bodies are size bounded and
  merged artwork is validated by the Rust engine before library permission checks.
- Backups contain sensitive account data and the auth secret: private 0700 folders,
  0600 files. Restore tests create temporary socket-only PostgreSQL clusters and
  compare data hashes, then remove only those temporary clusters.
- Desktop retains sandbox, context isolation, navigation controls, bridge scoping
  and hardened release gates. Update feeds are embedded at build time and must
  use HTTPS. Public Mac update installation requires the correct signing identity.
- Full npm audit after patching reports zero advisories. Patched resolutions:
  esbuild 0.28.1, sharp 0.35.5, undici 7.30.1, Babel core 7.29.7; nested fflate/ws
  resolve to the maintained direct dependency versions. `npm ls --all` succeeds.
  Build, browser, import/export, MCP and server regression checks pass.

Logs: `.local/team-next/dependency-audit-final.json`, `all-tests-final.log`,
`all-browser-final.log`, `live-browser-final.log`, `scheduled-restore.log`.
Public signing/notarization, real SMTP delivery and a signed update/rollback drill
remain blocked by missing local credentials/service settings. Production load,
long-term storage growth/retention and independent external review remain work
for a deployment with actual usage. No production customer data was sent to an
external scanning service.

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
