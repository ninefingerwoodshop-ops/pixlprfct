# Contributing to Pixel Perfect

Pixel Perfect (the `pixlprfct` repository) is free and open source. Fork it,
experiment, and adapt it to your workflow. You may use, modify, and redistribute
your fork, including commercially, under your choice of the [MIT](LICENSE-MIT)
or [Apache 2.0](LICENSE-APACHE) license. Preserve the applicable notices and terms.

## Changes to the official project

1. Fork the repository and create a branch for your change.
2. Follow [AGENTS.md](AGENTS.md), including the interface reference requirements.
3. Explain the problem, the resulting behavior, and how you verified it in a PR.
4. Run the relevant checks locally. The full checks include `npm run build`, `npm test`,
   `npm run lint`, `npm run typecheck`, `npm run test:browser`,
   `node scripts/generate-editor-api.mjs --check`, `cargo fmt --all --check`,
   and `cargo clippy --all-targets --all-features -- -D warnings`.
5. Wait for maintainer review. Submitting a PR does not grant write or merge access.

`@ninefingerwoodshop-ops` owns every path through `.github/CODEOWNERS`. The main
branch requires a pull request, owner review, and resolved conversations.
Automatic CI and required status checks are disabled; GitHub Pages publishing
and manually requested desktop packages remain available. New commits dismiss
stale approvals. Force pushes and deletion of main are blocked. The repository owner retains the existing administrator
override through a pull request for owner-authored changes; there is no direct
push exception. External contributors cannot use that override.

For bugs and feature requests, open a GitHub issue with reproduction steps and
the version you used. Report vulnerabilities privately as described in
[SECURITY.md](SECURITY.md). Do not include credentials or private design files.

Unless explicitly stated otherwise, intentional contributions are dual-licensed
under the project's existing MIT / Apache 2.0 terms, without additional terms.

## Product site

The static website lives in `site/`. GitHub Pages deploys it from `main` through
`.github/workflows/pages.yml`. Preview locally with
`python3 -m http.server 4200 --bind 127.0.0.1 --directory site`.

Keep download URLs pinned to published, verified release assets. Update the
visible version, release notes, structured metadata, and platform/signing status
together. Screenshots must come from the actual app with sample artwork and must
distinguish development features from released downloads. Do not publish private
user designs or screenshots of reference products.
