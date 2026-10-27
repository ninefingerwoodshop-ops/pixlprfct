# Accessibility audit — PixlPrfct

Date: October 26, 2026. Target: WCAG 2.1 A and AA.

## Outcome

This is an engineering audit and remediation pass, **not a conformance declaration**. The tested interface states have no remaining automatically detected A/AA violations after fixes. Manual-review flags and the workflow gaps below prevent calling the entire product WCAG-compliant.

Scope: local editor canvas shell, selected input-control Design inspector, Prototype and Development inspectors, Assets (empty collection), Variables (current collection), Tools, Icon Library, searchable page dropdown, keyboard-shortcuts dialog, code export; icon-gallery website and its icon-details dialog. Existing document content was not recolored or modified. Authenticated cloud workflows, all possible control/variable states, every export framework, and the surrounding project-management application were not exhaustively tested.

Method: axe-core with wcag2a, wcag2aa, wcag21aa tags; computed-style contrast measurements; DOM/accessibility-tree inspection; keyboard/modal code review and focus/navigation checks. Temporary audit instrumentation was removed after testing. Raw before/after results are in accessibility-scan-2026-10-26.json. Incomplete axe results require human review and are not passes.

## Findings and changes

| Finding | Criterion | Severity | Result |
|---|---|---|---|
| Muted navigation, page labels, tool descriptions, snippet text and export metadata failed normal-text contrast (3.54–4.47:1 in examples). | 1.4.3 | Major | Darkened editor text; rescans clear in tested states. |
| Gallery count, subtitle, and footer failed contrast (3.39–4.36:1). | 1.4.3 | Major | Darkened text; gallery and details dialog scans clear. |
| Full-screen tool pages left covered editor controls in keyboard and accessibility navigation. | 2.4.3, 2.4.7 | Major | Covered main editor becomes inert while a full-screen page is open; navigation and floating tools remain usable. |
| Global Ctrl/Cmd zoom handlers intercepted browser zoom outside the canvas. | 1.4.4 | Major | Canvas zoom keyboard handling now requires canvas focus; pinch interception requires workspace target. Actual 200%/400% browser reflow remains a manual check. |
| Rename-page, artwork-export and keyboard-help dialogs lacked accessible names. | 4.1.2 | Major | Added explicit names. |
| Search input was inside an ARIA menu, violating its child-role model. | 1.3.1, 4.1.2 | Major | Page popup is a named nonmodal dialog, with separate named menus for pages and actions. Rescan clear. |
| Layers, tool results and icon-grid containers used aria-label without a supporting role. | 1.3.1 | Moderate | Added group roles. |
| Input boundaries were extremely faint. | 1.4.11 | Moderate | Added stronger editor and gallery field borders; manual visual checks still needed for every specialized control. |
| Custom tooltips were not hoverable. | 1.4.13 | Major | Pointer can move onto tooltip; short dismissal grace preserves it across the gap; Escape still dismisses. |
| Gallery lacked a direct bypass link to its icon controls. | 2.4.1 | Moderate | Added keyboard-visible skip link. |

## Remaining work before a compliance claim

1. **Global character shortcuts — major, 2.1.4.** Single-letter tools and punctuation actions still operate outside text fields without a user-facing off/remap setting. Scope them to a focused editor context or offer a persistent disable/remap preference. Do not silently remove shortcuts users rely on.
2. **Complete keyboard parity — major, 2.1.1.** Numeric fields and existing shortcuts cover many edits, and page reordering has keyboard controls, but arbitrary pen/freehand creation, layer reparenting across complex containers, and all drag/drop operations need a documented keyboard workflow audit. Freehand path-dependent actions have a criterion exception; do not assume it covers reparenting or all drawing tools.
3. **Screen readers and authoring semantics — major, 1.1.1 / 1.3.1 / 4.1.2.** The layer list and canvas label expose some structure, but VoiceOver/NVDA end-to-end testing has not been performed. Verify object selection announcements, hierarchy, errors, variable values, and resulting exported native controls. Canvas colors are author-controlled and must be checked per document.
4. **Zoom, text spacing and narrow viewports — manual verification, 1.4.4 / 1.4.10 / 1.4.12.** Check actual browser zoom at 200% and 400%, increased text spacing, every small floating panel, and narrow layouts. Two-dimensional canvas content has a reflow exception; inspector controls do not automatically share it.
5. **Cloud and extended states — not tested.** Sign-in, conflict/recovery states, populated component sets, prototype interactions, generated user scripts, and all input validation variants require additional scenario coverage.

## Evidence and verification

- Blue brand button #2563eb against white: approximately 5.17:1, exceeding 4.5:1 for normal text.
- #595959 against white: approximately 7:1; against #f5f5f5: approximately 6.4:1.
- Assets, Tools and Icon Library final scans: zero violations and no incomplete rules after role fixes.
- Gallery page: zero violations; one decorative-arrow contrast manual flag. Details dialog: zero violations, no incomplete rules.
- Variables: zero violations; five contrast manual flags involving obscured/short/symbol content.
- Canvas-related scans retain incomplete contrast results for authored/shadow-DOM content and overlays. These must not be treated as verified contrast passes.
- Page dropdown and code-export final rescans: zero violations.
- Seven focused automated tests passed for floating-window geometry, variable operations, tooltip positioning and icon SVG exports. Additional page/assets tests run with this change are recorded in the task output.

44×44 target size is WCAG 2.1 **AAA**, not an AA requirement. WCAG 2.2 introduces a different AA minimum-target criterion. Compact editor targets should still be reviewed for usability, without falsely marking every sub-44px target as a 2.1 AA failure.

Reference: https://www.w3.org/WAI/WCAG21/quickref/
