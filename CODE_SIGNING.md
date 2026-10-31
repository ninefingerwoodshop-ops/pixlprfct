# Code signing policy

## Current status

The first Windows desktop prerelease is **unsigned** and intended for early testing. It is not represented as signed, independently audited, or production-ready. Download from this repository's [Releases page](https://github.com/ninefingerwoodshop-ops/pixlprfct/releases), inspect the source commit and build run, and compare SHA-256 checksums. Checksums detect changed files; they do not authenticate a publisher like a trusted signature does.

The earlier MIT / Apache 2.0 project applied to the SignPath Foundation
open-source program. Approval has not been granted and Windows signing is not
active. Current source now uses a custom source-available license; eligibility
must be reassessed with the provider before relying on that program. No
provider endorsement, sponsorship, or signature is claimed.

Signed direct-download Mac builds use James Gibbens's Developer ID Application identity. Signed but unnotarized local Mac packages are excluded from this Windows prerelease. Public Mac distribution requires Apple notarization; the Mac App Store uses a separate submission process.

## Responsibilities

James Gibbens, the project owner, is currently responsible for authoring/committing changes, reviewing external contributions, and approving releases and future signing requests. The repository is maintained under [ninefingerwoodshop-ops](https://github.com/ninefingerwoodshop-ops). These roles do not imply independent second-person review. Additional maintainers and signing responsibilities must be recorded here before they may approve signing.

Maintainers with repository or signing access must use multi-factor authentication. Repository access alone does not grant signing approval. SignPath onboarding, account MFA, approver assignment, and artifact restrictions must be completed and verified before the first SignPath-signed release. This policy does not claim those provider-side controls are already configured.

## Release and signing process

1. Source and build scripts are committed publicly. External contributions are reviewed before inclusion.
2. The Windows prerelease workflow builds a selected commit on a GitHub-hosted Windows runner, runs regression checks, and checks application startup. Its token has read-only repository permissions; it holds no signing credentials and does not publish automatically.
3. The maintainer reviews the source, successful build, and artifacts before publication. Release notes identify the build run, tested platform, and limitations.
4. The release tag points to the build's exact source commit. Packages include checksums and build provenance. This records origin; it does not promise bit-for-bit reproducibility.
5. Future SignPath requests must use verified, manually requested build artifacts, enforce PixlPrfct product/version metadata, and receive manual approval from the designated approver. Keys and passwords must never enter source or release artifacts.

Only PixlPrfct releases built from this repository may be submitted for signing. Bundled upstream open-source components retain their licenses; they must not be presented as independently maintained or independently signed by PixlPrfct.

For a suspected signing incident, stop new requests, investigate, and notify the provider as appropriate. Mark or withdraw affected releases. Report concerns through [SECURITY.md](SECURITY.md).

## Privacy and uninstalling

Read the [Privacy policy](PRIVACY.md) for local storage, optional online fonts, team servers, remote design resources, and MCP. Uninstall on Windows through **Settings → Apps → Installed apps → PixlPrfct → Uninstall**. Local designs are preserved; the privacy policy describes removing the profile separately.
