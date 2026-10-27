# Development behaviors

Select a single layer, frame or group, then open **Development** in the right inspector.
Choose a starter snippet or Custom JavaScript. Every attached behavior has an editable
name, enabled switch, trigger, duration, distance and JavaScript body. Changes save
with the document after a short pause; switching items or running a preview flushes
pending edits. Document undo, duplication and .pixl saves retain behaviors.

**Run preview** renders the selected item and descendants in a sandboxed iframe.
Code runs only there, or in exported applications—not in the authoring canvas.
Preview blocks network access and access to the editor's storage/document. Syntax
errors appear beside the editor; runtime errors appear below the preview. Disabled
behaviors do not execute. Close preview to stop it.

## Portable JavaScript API

The code body receives `element` (this layer's DOM element) and `api`:

- `api.children(element?)`: direct child layers (defaults to this layer).
- `api.find(selector)`: a descendant of this layer.
- `api.on(target, event, callback)`: listener removed on unmount.
- `api.animate(keyframes, options?, target?)`: Web Animation, canceled on unmount.
  Default duration comes from settings, easing is ease-out; respects reduced motion.
- `api.style(target, properties)`: applies styles, restoring them on unmount.
- `api.cleanup(callback)`: register cleanup for your timers/observers/resources.
- `api.duration`, `api.distance`: the behavior's settings.

The body can also return a cleanup function. Use managed helpers rather than global
listeners when possible. Keep DOM mutations inside the target element. Built-ins
include fade, slide, stagger, hover lift, pulse, scroll reveal, toggle children,
accordion, tabs and modal. Container snippets describe the expected child structure
in their code comments.

## Export

HTML exports run behaviors in `script.js`. React uses an effect with cleanup, Vue uses
mounted/before-unmount hooks, and Angular uses after-view-init/on-destroy hooks.
Each framework export includes `behavior-runtime.js`. Select Export and choose the
framework and scope as usual. Invalid enabled JavaScript blocks export with the
layer and behavior name; disable it to export without it.

This is portable browser JavaScript, not a general framework-to-framework compiler.
JSX, imports, Vue templates and Angular decorators are not accepted as behavior
bodies. Add framework-specific application code after exporting. Rust export does
not support JavaScript behaviors and prompts you to choose a supported web target.

## Native component controls

Select a main component or its instance, then open **Design → Control**. Choose a
button, checkbox, radio, select, textarea, or any HTML input type. These render as
actual native HTML controls in **Try native control** and HTML/React/Vue/Angular
exports. The design canvas remains a visual editing surface.

Configure the accessible label, name (shared by radio groups), value, placeholder,
and type-specific attributes. Disabled and supported readonly controls use native
HTML behavior. Checkbox/radio checked state and optional toggle-button pressed
state are interactive in preview. Submit/reset controls require a surrounding form
in the consuming application to submit/reset it; application actions can be added
through Development behaviors.

Edit default, hover, focus, pressed, checked/selected, readonly, and disabled
styles using background, text/accent, border, opacity, and radius overrides. The
state picker previews styles without changing saved runtime state. Definitions
propagate from main components; instance changes are overrides. Control definitions
are included in document saves, duplication, and undo.

Each state appearance property has an explicit source dropdown. Inherit removes
that state's override and binding. Colors offer a native color picker or text
(hex, transparent, currentColor); opacity and radius offer number inputs.
The variable icon to the right of each dropdown opens compatible color/number
variables, with detach and manage actions. Bound variable names appear below the dropdown.
Opacity variables use 0–1; the numeric input displays percentages. Bindings follow
page, ancestor, and component variable modes and persist with the document.
Reset this state clears both its values and bindings.
