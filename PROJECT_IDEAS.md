# PixlPrfct — saved direction and next steps

Saved October 26, 2026. This is a continuation note, not a claim that every historical request is implemented or verified. Check the current code and UI before starting any item below.

## Latest review

See [Grid workflow review](docs/GRID_WORKFLOW_REVIEW.md) for the hands-on walkthrough, fixes, 125 passing focused tests, and broader-suite failures. A separate **Grid walkthrough** page is saved in the local editor document.

## Where we stopped

We were improving CSS Grid named-area resizing and the right-panel feedback experience.

The latest change gives the automatic-scrolling **paused** and **resumed** messages reserved space above the inspector controls. The controls scroll independently underneath, without being covered. Automatic reveal and manual-scroll detection now target the inner `.inspector-content` scroll container.

Relevant files:
- `web/grid-resize-feedback.js` — limits, automatic reveal, pause/resume lifecycle and shortcut.
- `web/editor.css` — reserved notice space and highlighted track controls.
- `web/ui-motion.css` — confirmation fades and reduced-motion handling.
- `web/index.html` — notice markup.
- `tests/grid-resize-feedback.test.mjs` — 16 targeted tests passing after this change.

Served assets were refreshed with `node scripts/prepare-editor.mjs`. The latest change still needs a visual check in the running editor after reload; tests are not a substitute for that check. No commit or deployment is implied by this note.

## Immediate follow-up ideas

1. Verify a real named-area resize that hits a min/max limit: the matching track and inspector control highlight, and the control scrolls into view.
2. Check paused/resumed notices at narrow panel widths and with long text. They must reserve space, remain readable, and never cover controls.
3. Exercise manual scrolling, Resume, and Alt/Option+R during a drag. Manual scrolling should pause automatic scrolling only for the current drag. Resuming should reveal the current limit and use the user's latest scroll position as the restoration point.
4. Verify release, Escape, pointer cancellation, and focus loss clean up notices, timers, listeners, and highlights. Rapid pause/resume must not stack notices or let old timers dismiss a new message.
5. Check reduced motion, keyboard access, focus visibility, and screen-reader announcements. Keep announcements useful rather than repeating on every animation frame.
6. Run an end-to-end Grid usability pass before adding more small interactions: create grid → create named area → place items → resize tracks → edit CSS → preview breakpoints → undo/redo.

## Product direction to preserve

- Build a real design-system authoring tool, initially within one project view; expand to a larger shareable system later.
- Reuse shared inputs, custom dropdowns, color controls, tooltips, icons, typography, spacing, and states. Avoid inventing one-off UI for each feature.
- Progressive disclosure: section labels on the left, enabling checkboxes on the right; hide dependent settings when the feature is off.
- Use PixlPrfct icons by default. Add missing icons to the library instead of substituting unrelated symbols. Blue is the brand accent; main-component identification is purple and instances blue.
- Accessibility is a requirement: visible controls, keyboard support, usable focus, readable contrast, reduced motion, and predictable focus restoration. Do not claim full WCAG compliance from a small test pass.

## Grid and Flex direction

- Keep **Flex Layout** and **Grid Layout** as separate sections with their existing tools. A container uses one layout type, but can nest the other.
- Preserve cell/named-area wrappers. Default their contents to vertical Flex Layout with editable gap; allow switching them to Grid Layout with the existing tools.
- Preserve wrappers when enabling masonry. Automatic placement should use the shortest column and respond to content-height changes.
- Keep explicit row/column placement and spans, visual picker, live canvas preview, insertion indicators, and drag/reorder behavior coherent with the wrapper model.
- Named-area layer names and assigned items should stay synchronized through renaming, moving, resizing, deletion, undo, and redo. Deleting an area should preserve item cell placement.
- Width/height edits on named-area layers should synchronize with parent tracks. Respect minmax constraints rather than replacing them with fixed pixels.
- Keep area track sizes editable without selecting the parent: px, fr, percent, auto, and minmax. Make limiting tracks easy to identify on the canvas and in the inspector.
- Keyboard editing must preserve selection, keep the area visible, and never leak shortcuts from focused text fields or scrollable tooltips into canvas actions.
- Keep handwritten Grid/Flex CSS, autoformatting, live preview, visual controls, unique editable layer-derived class names, and media queries synchronized.
- Responsive previews should show the active query, support jumping to breakpoints, and preserve original widths across pages/reloads with individual and all-frame restore actions.

## Components, starters, and variables

- Starters should be real controls with editable appearance and behavior, suitable for turning into a reusable design system.
- Main-component contents remain editable; instances inherit changes immediately and protect shared appearance while exposing permitted content/state and width options.
- Shared base variables define common control styling and behavior. New starters inherit defaults; one-off changes are explicit overrides with reset-to-default support.
- Deleted variable bindings should revert to inheritance. Required borders inherit default borders unless explicitly overridden. Icon color and label color are independent.
- Keep related variable rows together. Checkbox size is one square-size variable; include label gap. Use appropriate font-family and available font-weight dropdowns.
- Control height should derive from settings/content (Hug); width supports Hug, fixed, full/fill, and permitted min/max settings.
- Dropdown/calendar panels overlay helper and validation text rather than being pushed below it.
- Continue auditing starter coverage: text input, dropdown/multiselect, checkbox, switch, button, radio group, date picker, text area, upload, number input, password, segmented control. Verify actual completeness before choosing the next starter.

## Other retained directions

- Assets should preview actual project components and insert their linked instances, with clear accessible menus.
- Device chrome is optional on selected top-level frames and in prototype preview. Automatic mode can switch phone/tablet/desktop by configurable widths, with Apple/Android families, portrait/landscape, active-device feedback, and reset defaults of 600/1024.
- A Development area should support reusable behavior snippets and custom JavaScript, with honest limits around framework export. Do not promise arbitrary React/Vue/Angular code can be automatically translated between frameworks.
- The separate free icon/font library is at `https://github.com/ninefingerwoodshop-ops/pixlprfct_icons`; its public gallery is `https://ninefingerwoodshop-ops.github.io/pixlprfct_icons/`. Preserve the chosen Unbound brand mark and extend coherent weight variants and website/software icon coverage.

## Working notes for resuming

- Project root: `/Users/jgibbens/pixlprfct`.
- Editor: `http://127.0.0.1:5173/editor/index.html`.
- Source UI is in `web`; refresh served assets with `node scripts/prepare-editor.mjs`.
- Rust/WASM changes require `npm run build:editor` before refreshing assets.
- Preserve existing unrelated working-tree changes. Inspect status/diffs before committing.
- Start with the immediate visual verification above, then prioritize complete user workflows over additional isolated tooltip refinements.
