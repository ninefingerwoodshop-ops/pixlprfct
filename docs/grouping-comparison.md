# Direct Figma grouping comparison

Reference file: [PixlPrfct grouping comparison](https://www.figma.com/design/AsBSQYyd3KZLGRi0QM1VPg), checked October 25, 2026 using Figma's live Plugin API and editor UI.

## Measured geometry and fixes

| Case | Figma result | PixlPrfct correction |
| --- | --- | --- |
| Hide the right-hand child of a 280×80 group | Bounds shrink to the visible 100×80 child | Exclude hidden children when fitting bounds |
| Hide every child | Group remains, with 0×0 bounds | Permit zero-size groups; guard geometry transforms against division by zero |
| Resize a 300×100 group to 600×200 containing a 200×100 frame | Frame becomes 400×200; its left/top-constrained child stays 40×20 at offset 20,10 | Stop group scaling at nested frame boundaries and use the frame's child constraints |
| Resize a containing frame from 300×200 to 500×400 | A right/bottom-constrained child inside a group moves by 200,200; group fits to 420×310 | Resolve constraints through groups to the enclosing frame |
| Resize a group containing auto-width text | Text box scales; font size stays 12; text sizing becomes fixed | Existing behavior confirmed |
| Ungroup an invisible, 50%-opacity group | Children retain their own visibility and opacity | Existing behavior confirmed |

Regression cases in `tests/groups.test.mjs` include nested groups, component instances, undo, and saving/loading all-hidden groups. Constraint propagation also applies during layout reflow.

## Editor interactions checked

- Enter selects the group's immediate children.
- Shift+Enter selects the parent.
- Escape clears selection.
- Tab selects a sibling.
- Clicking empty space between group children does not select the group.
- Canvas drill-in reaches nested children.

This is a targeted behavior comparison, not certification of every Figma editing feature. Figma's aggregated group fill/stroke controls and its broader transform UI are outside these geometry and selection fixes.
