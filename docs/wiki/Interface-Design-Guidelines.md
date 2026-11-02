# Interface Design Guidelines

PixlPrfct uses shared controls, design tokens and consistent interaction patterns
across its design and animation workspaces. This page documents implementation
quality and public communication standards. It does not claim affiliation with,
certification by, or complete compatibility with another product.

## Working controls and consistent styling

- Use the project's shared custom dropdown, input, color and menu components.
  Do not introduce visible browser-native select menus.
- Use the existing dark interface tokens across projects, editor chrome, dialogs
  and popovers. Keep document paint colors independent of the interface theme.
- Preserve PixlPrfct branding and asset attribution.
- Keep the animation timeline docked with tracks and a time ruler, and animation
  properties in the inspector. New tool palettes follow their approved scope.
- Implement the advertised interaction: selection, pointer and keyboard input,
  focus, cancellation, undo, saving, read-only behavior and error handling.
- Distinguish implemented controls, local test results, packaged features and
  published releases. Do not present placeholders as finished functionality.

## Shared implementation

| Area | Sources |
| --- | --- |
| Interface tokens | `web/ui-colors.css`, `ui-spacing.css`, `ui-radii.css`, `ui-typography.css`, `ui-shadows.css`, `ui-states.css`, `ui-motion.css` |
| Inspector fields | `web/inspector-settings.js`: `numberField`, `settingRow`, `settingsMenu`, `colorField` |
| Dropdowns | `web/inspector-dropdown.js` |
| Evidence and remaining gaps | Capability matrix, dated evaluations and the running gap tally |

Use shared tokens instead of introducing unrelated spacing, colors or interaction
states. Check realistic window sizes, expanded/collapsed sections, hover,
selection, keyboard access, scrolling, zooming and persistence.

## Public writing and assets

Describe actual capabilities in PixlPrfct's own terms. Avoid marketing promises
of cloning, identical appearance, complete equivalence or third-party affiliation.
Public product descriptions should name PixlPrfct, supported file extensions and
concrete behavior without naming or comparing competing design software. Keep
source identifiers accurate in engineering documentation. Preserve required license, copyright and attribution notices.

Support performance, compatibility, security and availability claims with named
checks and their limits. Label proposals separately from shipped functionality.
Use artwork cleared for publication; keep private designs, competitor screenshots,
credentials and personal information out of public pages. Do not make unverified
claims that assets are original, infringement-free or legally cleared.

Content review is not legal clearance of the product name, interface, implementation
or assets. Unresolved rights questions require qualified review.

## Engineering instructions and evidence

Follow the repository's [engineering instructions](../../AGENTS.md) and
[contribution guide](../../CONTRIBUTING.md). Keep completed gap entries with dated
verification, and distinguish local fixes from published changes. Reference
captures stay in ignored local evidence rather than public wiki pages.

[Project Status and Roadmap](Project-Status-and-Roadmap.md) ·
[Testing and Verification](Testing-and-Verification.md) ·
[Contributing and Conventions](Contributing-and-Conventions.md)
