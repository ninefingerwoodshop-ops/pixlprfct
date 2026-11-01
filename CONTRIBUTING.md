# Contributing to Pixel Perfect

Pixel Perfect is free to use and source-available under the
[Community License](LICENSE). You can use it for commercial design work, study
its code, and maintain a fork. Do not sell the editor, derived software, or
hosted access. Shared versions must include their corresponding source for free
under the same terms. See [the licensing guide](docs/LICENSING.md), including the
unchanged permissions on earlier MIT / Apache 2.0 versions and third-party code.

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

New intentional contributions are offered under the Community License. You must
have authority to grant those permissions; ownership stays with the contributor.
Identify third-party material and retain its separate license and notices.
Previously accepted contributions keep the permissions already granted.

## Product site

The static website lives in `site/`. GitHub Pages deploys it from `main` through
`.github/workflows/pages.yml`. Preview locally with
`python3 -m http.server 4200 --bind 127.0.0.1 --directory site`.

Keep download URLs pinned to published, verified release assets. Update the
visible version, release notes, structured metadata, and platform/signing status
together. Screenshots must come from the actual app with sample artwork and must
distinguish development features from released downloads. Do not publish private
user designs or screenshots of reference products.

## Public writing and assets

Website, wiki, release and roadmap copy should describe PixlPrfct’s actual
capabilities in its own terms. Avoid marketing promises of cloning, identical
appearance, complete equivalence or affiliation with another product. Use
third-party names when needed to identify a file format, dependency or factual
limitation, and retain required copyright, license and attribution notices.

Support feature, performance, compatibility and security claims with recorded
evidence and state its limits. Label proposals separately from shipped work.
Publish only artwork and screenshots cleared for public use; do not publish
private designs, competitor screenshots, credentials or personal information.
Do not make unverified claims that assets are original, infringement-free or
legally cleared. Copy review is not legal clearance of the product, interface,
name or underlying assets; unresolved rights questions require qualified review.
