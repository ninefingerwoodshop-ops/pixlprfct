# CSS editing

Every selected layer has **CSS & responsive layout → Edit CSS**: frames, groups,
text, shapes, images, main components, and all native controls. Protected instances
and library sources expose **View CSS** instead; source permissions still apply.

The editor starts with the layer's generated CSS. Edit declarations or add rules
using its class. Hover/focus selectors, control-part selectors, custom properties,
and `@media`, `@supports`, `@container`, and `@layer` groups are supported. Rules
must stay scoped to the selected layer. Global imports and other global at-rules
are rejected. CSS is limited to 64 KB per layer.

Only changed declarations are saved as overrides. Unchanged declarations keep
following the visual inspector. Removing a generated declaration resets that
property to its CSS initial value. Reset overrides returns to generated styling.
SVG paint and text presentation properties are exposed as additional CSS rules.

Valid edits preview live. Apply saves one undoable document edit; Cancel or close
discards the preview. Invalid CSS disables Apply. Saved styles survive project
reloads, duplication, and main-component updates, and instances receive selectors
for their own IDs. Main-component CSS cannot be overridden on protected instances.

Custom CSS takes precedence over generated styles in the browser canvas and
HTML/CSS/framework exports. It does not rewrite visual inspector fields. The
separate **Layout → Edit Layout CSS** editor supports changes that update the
visual Grid/Flex controls and frame-width breakpoint previews. General CSS media
queries use the browser viewport.

Image/SVG exports currently reject custom CSS rather than silently omitting it;
use HTML/CSS or framework export for those layers.
