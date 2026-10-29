# Startup loading screen

The PixlPrfct mark traces its outline, fills, separates into dots, and reforms in
a 4.8-second loop. The screen uses the existing Figma dark workspace color
(`#1e1e1e`), white mark, and muted status text. The animation is a custom brand
extension requested by the user, not a claim of Figma loading-screen parity.
The live dark Figma editor was inspected before implementation.

`web/loading-screen.js` owns the mark, markup, and lifecycle. Its CSS animates
without the editor, WASM, icon library, or fonts being ready. Reduced-motion
preferences show the static mark. `scripts/generate-preloader.mjs` inlines the
critical CSS and markup into both static entry pages; `npm run build:editor`
regenerates these blocks. A test checks for drift.

The small entry modules catch failures while importing the application. The
editor dismisses the screen after the engine, document, libraries, and font
layout are ready. The project home waits for its initial workspace and project
list. The React home server-renders the same mark and loads its runtime after
hydration. Background controls are inert while initialization is pending.

After 15 seconds, recovery links appear while loading continues. Startup
failures stop the animation and offer retry or return to projects without
redirecting away from the original project URL. No minimum loading duration or
simulated percentage is used.

Verified locally: static home, compiled React home, a 25-second module delay,
successful editor readiness, failed module import, recovery to projects, and
the existing responsive-device controls. Tests cover loading/failure/retry
lifecycle, inert-state restoration, timer cleanup, and generated-page parity.
