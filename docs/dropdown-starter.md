# Dropdown starter

Available from Assets → Control starters → Dropdown. New dropdown starters are editable main components, use Input Base variables, and propagate main-component changes to linked instances. Instance selection can vary independently without unlocking their appearance.

## Configuration

- Single select or multi-select.
- Search by item label or category.
- Independently toggle Select all, Deselect all, checkbox indicators, and selected pills.
- Visible-pill limit; remaining selections appear as “+ N more.” Zero shows only the count.
- Menu width independent of the field (0 follows the field), and scrollable maximum height. Live menus fit the viewport and open above the field when necessary.
- Add, remove, reorder, disable, label and categorize items. Each item has a unique submitted value. Adding a category creates its first item. Place items with the same category together for a contiguous group.
- Show menu on canvas for design-time styling. This does not force the exported menu open.

Appearance override reuses the standard property and variable controls for the field, menu, items, hovered/focused items, selected items, category headings, pills, more count, bulk-action buttons and checkbox indicators. Menu dimensions are controlled in Dropdown size. Dropdown-specific appearance tokens are available in Input Base.

## Interaction and export

The custom popup is backed by a visually hidden native select. Submitted form data contains one entry per selected value in multi-select mode. Disabled items cannot be changed by bulk actions. Search filters visibility; Select all and Deselect all act on the full enabled list.

Enter/Space opens the trigger. Up/Down navigate enabled visible items; Home/End reach the ends; Enter/Space toggles an item; Escape closes and restores trigger focus. Typing on items performs prefix matching. Search Enter chooses the first visible enabled item. Required validation uses the common field-message runtime.

The same runtime is included in HTML, React, Vue and Angular exports. Existing native-select controls remain supported; configuring a dropdown converts them to the custom implementation.

## Verification (2026-10-26)

59 focused tests and 3 Rust tests pass. Coverage includes settings validation, persistence, instance selection overrides and appearance protection, variables, generated markup and framework runtime inclusion. Browser checks covered bulk selection, disabled items, category search, pill overflow, keyboard selection, Escape, actual form submission, required errors, and bottom/right viewport positioning. The editor's Assets insertion, category editing, menu sizing, appearance-part selection and canvas menu preview were checked directly. Full framework production builds and assistive-technology audits were not performed.

Bulk selection appearance supports text actions, two buttons, a checkbox toggle (including partial selection), a switch, or one button that changes its label. Labels are editable; the existing Select all / Deselect all appearance part and variables style these controls. Bulk actions affect enabled options and preserve disabled selections. Show dropdown panel controls only the canvas preview; exported dropdowns open interactively. Inspector checkboxes align right, and the trigger uses the PixlPrfct regular chevron-down icon.

The Dropdown panel heading has a right-aligned visibility checkbox. Turning it off hides the canvas panel and its configuration fields while retaining their values. Field selection and placeholder settings remain available.

Starters in the same Input Base collection inherit shared state appearance and required-marker settings from the earliest surviving starter (lowest layer ID). Explicit local edits and variable assignments are tracked as overrides; Reset to shared defaults clears them and resumes live inheritance, including linked instances. Content, field requirements, current state, dropdown options and layout configuration remain component-specific. Reset supports undo/redo.

Dropdown Base is a separate shared variable collection, created with a dropdown starter (or when opening Variables in a project with existing dropdowns). It contains grouped panel, search, bulk-button, checkbox, item, category, pill and more-count tokens, including hover and selected styling. Dropdown starters bind these automatically; explicit component overrides remain local and Reset to shared defaults reconnects them. Removing a token restores CSS inheritance. New tokens can be added through the collection's contextual Create variable menu.
