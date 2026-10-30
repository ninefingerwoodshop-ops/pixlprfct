# Product interface requirements

The user requires a pixel-perfect facsimile of Figma's interface for equivalent tools and workflows. This is a standing product requirement, not a request for a loosely Figma-inspired design.

- Inspect the corresponding live Figma UI before implementing or changing it. Use screenshots and rendered UI measurements to match layout, dimensions, spacing, typography, icon shapes, placement, states, and interactions.
- Do not substitute invented panels or simplified layouts for the Figma reference. In particular, Motion uses a full-width docked timeline with tracks and a time ruler; animation properties belong in the right inspector.
- Distinguish visual matching from feature completeness. Implement working controls; do not represent placeholders as finished functionality or claim exact parity without verification.
- Keep equivalent existing tools visually consistent with Figma. Additional PixlPrfct tools may extend this foundation without redesigning the familiar interface.
- Use the application's shared custom dropdown and input components. Do not introduce browser-native visible select menus.
- Use the Figma dark palette throughout the application, including projects, account/setup, editor chrome, dialogs and popovers. Keep document paint colors independent of the interface theme.
- Use the PixlPrfct logo and branding rather than Figma's branding.

See `docs/FIGMA_UI_REFERENCE.md` for current observations and verification expectations.

# Running gap tally

Keep `docs/TT-Design-System-Gaps.md` current when working its reported gaps.
Preserve completed entries: check/strike them through and append a dated resolution
with verification evidence. Distinguish local fixes from shipped changes and
workarounds from full resolution. Reconcile incoming versions without dropping
new or unresolved items. TerritoryIQ code and design-file work remain tracked
separately from PixlPrfct fixes unless the user expands the scope.
