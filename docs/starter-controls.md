# Starter controls

Implemented and verified 2026-10-26.

## Authoring

Starters inserted from Assets are editable main components. Existing starters migrate on project load. Copy/paste creates linked instances; main edits propagate immediately, while instance position and supported content/state overrides remain independent. Detaching removes the link and stays detached after saving/reloading.

The State dropdown chooses the primary appearance state. **Combine states** adds preview states without a checkbox list. Required, focus, validation, and disabled can coexist. Disabled suppresses hover/focus/pressed preview paint; validation overrides interaction border paint. Main-component previews are temporary; instance state choices persist. Appearance override edits the primary state's styles.

Input icons have independent left/right color, size, weight, spacing and vertical offset controls, each with variable binding. Placement remains inside/outside the input. Add corresponding tokens in Input Base to share these settings. Removing a token restores inheritance. Icon styles do not recolor the label or input text.

Validation rules support Optional/Required, validation on blur/input/submit, text length, patterns, and native type/range constraints. Off disables the custom validation-message runtime; native HTML constraints remain. Form submission requires a surrounding form. Error messages appear below the field, are associated with it for assistive technology, clear after correction, and reset with the form. The error-message editor is shown in the Validation error state; required indicator controls are shown when Required is part of the selected states.

## Verification

- 55 focused tests pass across controls, Input Base, behaviors, clipboard and components.
- Rust tests pass (3).
- Browser checks: blur validation, correction, numeric range validation, submit focus, form reset, keyboard Tab order, and inside/outside icons at 180px and 320px widths without horizontal overflow.
- Actual editor: existing starter displays as Main component; Focus + Required preview opens required settings and retains progressive disclosure.
- HTML, React, Vue and Angular output contains native constraints, accessible error markup, and shared validation runtime. React JSX and Angular TypeScript pass syntax transpilation. Full standalone framework production builds and screen-reader testing were not performed.

## Broader-suite findings

The full JavaScript suite run reported 502 passing / 31 failing tests. Thirty failures expect appearance/layout/prototype overrides on protected instances, conflicting with the current protected-instance behavior. One typography test still expects an arbitrary syntactically valid font family to be rejected, while font families now support Google Fonts. These tests need reconciliation with the established product behavior; this work does not loosen instance protections to satisfy them.
