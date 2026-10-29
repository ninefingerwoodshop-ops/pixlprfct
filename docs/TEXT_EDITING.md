# Canvas text editing

Text editing follows the entry and creation behavior described in [Figma’s text guide](https://help.figma.com/hc/en-us/articles/360039956434-Guide-to-text-in-Figma-Design).

| Action | Behavior |
| --- | --- |
| Double-click text | Edit on the canvas, selecting the word under the pointer. |
| Enter with a text layer selected | Edit with all of its text selected. |
| T, then click | Start an empty Auto width text layer. |
| T, then drag | Start an empty Fixed size text box. |
| T, then click existing text | Put the caret at the clicked location. |
| Click another text layer while editing | Finish the first edit and edit the clicked layer. |
| Enter / Shift+Enter while editing | Insert a line break. |
| Escape / Command+Enter / Control+Enter | Finish editing, keeping the layer selected. |
| Command/Control+A, C, X, V, Z | Use native text selection, clipboard and undo while editing. |
| Command/Control + / − / 0 | Zoom the canvas while retaining the caret. |
| Clear all text, then finish | Remove the empty layer; document Undo restores it. |

The plain-text editing surface supplies the browser’s caret, selection and input method support. The existing scene renderer paints the text, so effects, clipping and paint remain consistent. Text previews run through the engine’s layout solver, including hugged parents and responsive CSS geometry. Finishing an edit commits one document history entry; unfinished previews do not clear document redo history.

Edits finish before clicking other controls, changing pages/tools, navigating away, or hiding the page. Validation failures keep the editing surface open with the entered text available to shorten or undo.

## Validation

- `tests/text-editing.test.mjs`: preview/history isolation, Unicode/blank lines, empty-layer deletion and undo, fixed sizing, auto-height parent reflow, and creation geometry at different zoom levels.
- Browser checks: click/drag creation; double-click word replacement; Enter selection; typing, native undo, document undo/redo; switching text layers; changing inspector sizing after typing; rotated text; CSS canvas; zoom while editing; nested text in Launch concept; saving and reloading.

## Scope

Typography still applies to a whole layer. Mixed font/color runs, text lists, links and other rich-text formatting are not implemented by this change. Actual OS input-method composition is supported through native editing and composition guards, but was not exercised with a live IME during these checks. The engine’s existing 10,000-byte text limit remains in place with a readable validation message.
