# Team release work — 2026-10-30

Authorized scope: all six follow-up priorities. Alpha.14 is a local build, not a
public release. Verification uses synthetic accounts; human participants: **0**.
Existing local work is preserved.

- [x] Review: durable unread inbox, member mentions, notification preferences,
  review requests and revision-bound approval; revoked access hides content.
- [x] Onboarding: recipient-checked invitations/joining, actionable failure states,
  location clarity and first shared project/library guidance.
- [x] Operations: consistent backups, isolated PostgreSQL restore verification,
  daily scheduling enabled, readiness/error status and mail transport verification.
- [x] Libraries: release notes/history, change previews, pins, retirement,
  permission-filtered affected-project lists and rollback as a new release.
- [x] Collaboration: simultaneous independent edits, presence/cursors,
  explicit collisions, session-specific undo and disconnect recovery.
- [x] Release implementation: signing/notarization gates, pinned HTTPS Mac updater,
  feed/checksum generation, strict release verifier, dependency/security review,
  performance/visual regression checks and local packaging.
- [ ] Public release: usable Developer ID signing identity, notarization credentials,
  then signed installer acceptance. Automatic updates are optional; if offered,
  the distributor must validate its HTTPS feed and signed update/rollback flow. Apple paid membership is confirmed;
  this Mac reports zero usable signing identities. No secrets requested or stored.

## Verification

- 3 Rust tests and 994 JavaScript tests pass. The final API catalog check excludes
  the internal ID-range allocator; targeted MCP/desktop checks also pass.
- 26 browser scenarios pass, including preserved editor screenshot baselines,
  mention/read/review, invitation/join, two-editor merge/undo/cursor/conflict and
  handoff/restart/restore. Final avatar geometry is checked in a targeted rerun.
- Full build and TypeScript check pass. ESLint: zero errors, 57 existing-style
  warnings across the working tree. `git diff --check` passes.
- Full npm audit: zero advisories after patched esbuild, sharp, undici, Babel,
  fflate and ws dependency resolutions. This is a registry/dependency check plus
  focused access/fencing tests, not independent penetration-test certification.
- 727-layer browser test: median 56.7 ms, p95 65.8 ms from a trusted width edit to
  the second animation frame (30 measured samples, 5 warmups; 100 ms gate).
  Universal 16.7 ms frames are not claimed.
- Pre-upgrade PostgreSQL backup restored with all 19 table hashes matching.
  Additive migration ran twice; existing document digest remained
  `7f0a829a4b247602f43c5f1c8e6e880e729fb14272875409f4a1287a9a7a89bb`.
  The first scheduled post-upgrade backup restored with all 26 table hashes
  matching. Local server restarted and `/api/health` reports ready.
- Previous desktop app/profile and fresh active-document export are retained in
  `.local/team-next/desktop-backup` and `.local/team-next/desktop-before.pixl`.

Evidence: `.local/team-next/` logs, private backup manifests/restore proofs, and
`evidence/` screenshots/latency report. Public distribution awaits signing.
SMTP setup and delivery verification belong to each team installation. Character-level CRDT merging, canvas comment
pins, public/cross-workspace sharing and broader Figma parity remain separate
features. Live updates poll once per second; undo history resets on reopening.

## Installed-app acceptance

Both existing local app bundle paths now contain alpha.14 (arm64; the legacy
`mac-universal` directory name does not imply a universal binary). Strict ad-hoc
signature checks pass. Native About shows 0.1.1-alpha.14; Help → Check for updates
correctly explains that this test build has no public update configuration.
All four device projects remain visible. The reopened Territory Track file
reconnected through MCP and retains its exact normalized pre-update digest:
`bb6c14ef9eba9863ac57e22aaf0d4d8c2e486e3e99326d318ea2fbfbffb45be8`.
Evidence: `desktop-after-proof.json` and `evidence/desktop-alpha14.png` under
`.local/team-next/`. The original app/profile and both prior bundle paths are
backed up. This installation remains an ad-hoc local test build, not notarized.

## Self-hosted scope correction — 2026-10-30

The user confirmed that teams configure their own services. The earlier request
for publisher SMTP and a mandatory update host was incorrect. These are not
product distribution gates. Optional MCP installation tools now let an AI
assistant plan/apply private configuration, migrate, start, verify services,
and check backups. See MCP_SETUP.md for capabilities and tested boundaries.

Follow-up verification: 49 targeted MCP/self-hosting/operations/update tests pass,
including the real stdio installation lifecycle and simulated Docker command
contract. Targeted ESLint reports zero errors and zero warnings; `git diff --check`
passes. Logs: `.local/team-next/mcp-setup-regression.log` and
`.local/team-next/mcp-setup-lint.log`. These checks exercise source changes; they
do not establish a new signed or installed desktop release.
