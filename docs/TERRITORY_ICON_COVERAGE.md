# Territory Track icon coverage

Verified against the local application sources on 2026-10-30. The PixlPrfct Icons
0.9.0 catalog contains **679 icons**, including **133 additions**. All original
546 names, drawings and codepoints are preserved.

The source inventory resolves **599 source-name references to 313 symbols**:

| Source | References |
| --- | ---: |
| Web component, template and configuration names | 236 |
| Shared Lucide-compatible names and registry | 92 |
| Selectable avatar names | 44 |
| Dashboard and assistant SVG registries | 46 |
| iOS app, widgets and App Shortcuts | 181 |

Five additional scanner results are explicitly classified as non-icon helper
values. There are no unmapped references or generic fallback mappings. Every
mapping records its source locations in
`web/icon-library-assets/territory-track.json`. The canonical copy belongs to the
separate `pixlprfct_icons` repository and is included in its package and download.

Search the gallery or editor by the Territory Track name, including SF Symbol
names such as `brain.head.profile` or `calendar.badge.clock`. Search aliases point
to actual PixlPrfct artwork in Light, Regular and Bold. Font and SVG output are
available for every target. The stylesheet version is updated during sync so
previously cached fonts do not hide new glyphs.

These are semantic counterparts in the PixlPrfct style. Phosphor and SF Symbols
artwork is not redistributed. SF `.fill` variants use the same symbol in the
selected PixlPrfct weight; this does not assert identical filled silhouettes.
Territory Track's application icon providers remain a separate migration.
Arbitrary user imagery and unnamed illustrations are outside this named-icon
inventory.

## Verification and maintenance

```sh
node scripts/territory-icon-inventory.mjs /path/to/TerritoryIQ /path/to/TerritoryTrackIOS --check
node --test tests/icon-library.test.mjs tests/territory-icon-coverage.test.mjs
node scripts/sync-icon-library.mjs /path/to/pixlprfct_icons
```

Run the live source check after Territory Track icon changes. It fails on new
unmapped references. Package tests validate the saved inventory, all six font
files, searchable aliases, unique codepoints, drawable glyphs, SVG bounds, and
byte-identical font rebuilds. Editor tests cover exports at all three weights and
scanner cases for conditional templates, dynamic maps, avatars, badges and
shortcuts. The 133 additions were visually inspected as font glyphs at 16/24 px
and SVGs; out-of-bounds paths found during inspection were corrected.

Local validation: 3 Rust and 926 JavaScript tests pass; changed JavaScript lint
and editor build pass. Both local desktop app copies were updated to
**0.1.1-alpha.8**, with the previous builds retained for rollback. The installed
bundle contains all 679 icons and the 599-reference manifest and passes strict
macOS signature verification. The running app reopened the saved Territory Track
document and displayed **679 icons**; searching `brain.head.profile` found and
rendered `brain-profile`. Screenshot evidence is retained in
`.local/icon-coverage/desktop-icon-catalog.png` and
`.local/icon-coverage/desktop-icon-coverage.png`.

This records local implementation and installation, not a published icon package
or desktop release.
