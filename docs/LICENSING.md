# Pixel Perfect licensing

The [Pixel Perfect Community License 1.0](../LICENSE) applies to new versions
expressly offered under it beginning with the commit introducing that license
on 2026-10-31. It is a custom **source-available** license, not an OSI-approved
open-source license. The full license governs; this page explains the intent.

## Use the editor for commercial work

You may use Pixel Perfect at work or for paid clients. You may build and sell
websites, apps, artwork, animations, and other work created with the editor.
Your output can have any price or license you choose, subject to rights in any
third-party content you include. You do not have to publish your output's source.
The output exception explicitly covers the animation player and other runtime
helpers included by normal exports, when used as part of your exported work.

## Do not sell the editor or products made from its implementation

You may study the code, modify it, and keep a private fork. You may distribute
free forks or provide free hosted access if you include the corresponding source
and preserve the same license and notices. Recipients and hosted users must have
free access to that version's source, including modifications and build scripts.

You may not sell Pixel Perfect, a renamed or modified fork, a paid version of
its features, a product incorporating its implementation, or paid hosted access.
The restriction applies even if you add features or change the name. Creating a
website *with* the editor is different from copying the editor's code into a
product. Paying an infrastructure provider for your own internal deployment is
allowed; charging other people for access to the editor is not.

The official project's policy is to keep its software free, publish its source,
and offer no paid tier or commercial relicensing program. This policy is not a
claim that the licenses on already published code can be revoked.

## Earlier versions retain their terms

The source through commit
[`6d9127f0250e9e24bc2f6dd0cc7720ded7a8148d`](https://github.com/ninefingerwoodshop-ops/pixlprfct/tree/6d9127f0250e9e24bc2f6dd0cc7720ded7a8148d)
was published under **MIT OR Apache-2.0**. Those permissions remain available for
that material, including commercial use and redistribution. The new license is
not retroactive and cannot stop someone from using that historical version under
its original terms. Its notices are preserved in [licenses/legacy](licenses/legacy).

The existing Windows **v0.1.0-alpha.1** downloads retain their original
MIT / Apache 2.0 license choice. They have not been rebuilt or relicensed.
New packages must identify their actual source revision and include its license.

Windows **v0.1.1-alpha.15**, **v0.1.1-alpha.16**, and **v0.1.1-alpha.17** are offered
under the Community License, including the SVG animator. The installers and ZIPs
bundle the license, this guide and the legacy notices. Each release page provides
its exact source revision and build provenance.

## Dependencies and bundled material

Third-party dependencies, fonts, icons, importer libraries, and other separately
licensed assets keep their own terms. This license does not relicense them.
Preserve the notices in `web/vendor/figma-import-LICENSES.txt`,
`web/icon-library-assets/LICENSE`, `vendor/shadcn-tailwind-4.13.0.LICENSE.md`,
`scripts/vite/sites-vite-plugin.LICENSE`, and dependencies' own distributions.
Historical notices are retained for code first distributed under the earlier terms.

## Contributions

Submit only contributions you have the authority to license under the current
Community License. Contributors retain ownership. Third-party code must be
identified and its compatible license and notices preserved. Existing
contributions are not retroactively reassigned by this policy.

## Review and terminology

This custom license has not received legal review. Have qualified counsel review
its scope and enforceability before relying on it for a dispute or enforcement.
It cannot guarantee that every future copyright holder will make the same
licensing choices for material they independently own.

The [Open Source Definition](https://opensource.org/osd) allows commercial
redistribution; a no-sale restriction is why current versions are called
source-available. [Apache 2.0 section 2](https://www.apache.org/licenses/LICENSE-2.0)
grants irrevocable copyright permissions for material already licensed under it.
