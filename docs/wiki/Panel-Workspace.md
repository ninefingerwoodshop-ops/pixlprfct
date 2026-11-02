# Panel Workspace

Both Design and SVG Animation support parent panel windows and compact icon docks in [Windows alpha.21](https://github.com/ninefingerwoodshop-ops/pixlprfct/releases/tag/v0.1.1-alpha.21) and the browser editor.

## Panels

| Design | SVG Animation |
| --- | --- |
| Layers (including Pages) | Elements |
| Assets | Inspector |
| Inspector | Pen tools |
| Drawing tools | Drawing tools |
| Timeline | Timeline |

Each parent has an icon, collapse/expand controls, and a tear-out control. Fill, Stroke, Transform and other sections stay inside their parent.

## Arrange the workspace

- **Separate window:** drag the parent heading. After 4 px of movement the window opens and follows the cursor while the mouse button remains down. Release to place it; Escape cancels. The heading’s tear-out button opens it without a drag.
- **Dock again:** close the separate window, click its **Dock panel** control, or use the Dock icon in the original slot.
- **Icon dock:** click **Collapse**. Click the panel icon to show the live panel beside the dock inside the editor. Click again, click outside, or press Escape to close the flyout. **Expand** restores the dock. Clicking an icon does not create a window.
- **Pen tools:** SVG Pen tools can dock on the right or return to a floating palette. Its side is saved.
- **Saved layout:** detached state, window position/size, and collapsed state persist on this device separately for each editor. Refreshing or reopening the editor after an app restart restores the layout. Explicit closing/docking removes that saved window. Browser pop-up permissions may be needed; a blocked restore retains the saved layout and offers reopening.

Collapse/expand arrows depict the next action and follow the dock side. The SVG left drawer keeps the logo first, with the toggle beside it when expanded and below it when compact. Design uses one existing logo and places its expanded toggle after the page-title dropdown. Other parent toggles stay at the top.

Detaching Elements leaves a single column of icons: Projects, Import SVG, Download, Show Elements and Dock Elements, with tooltips. Other remaining sidebar actions, including save recovery, also retain accessible icons. All controls use the same selection and Undo history as their owner editor.

## Implementation

[detachable-panels.js](../../web/detachable-panels.js) moves the original controls between documents. [panel-docks.js](../../web/panel-docks.js) manages compact rails and adjacent flyouts; [panel-icons.js](../../web/panel-icons.js) provides icons. [editor-dom.js](../../web/editor-dom.js) resolves adopted live controls for inspector modules. [design-panels.js](../../web/design-panels.js) registers Design’s parent panels. [panel.html](../../web/panel.html) is the separate window shell.

Electron allows only named, same-workspace panel shells to open as panels. They receive the empty [preload-panel.cjs](../../desktop/preload-panel.cjs), with no native bridge, permission grants, nested windows or navigation beyond the shell. Native menu commands route to the owning editor. See [Desktop App](Desktop-App.md).

## Verification and limits

Browser suites [design-panels.spec.mjs](../../tests/browser/design-panels.spec.mjs) and [svg-animation-panels.spec.mjs](../../tests/browser/svg-animation-panels.spec.mjs) exercise every parent, icons, flyouts, live edits, Undo, restoration and recovery. [panels-desktop.mjs](../../scripts/acceptance/panels-desktop.mjs) checks native cursor following, stop-on-release, refresh and full-restart restoration with exact bounds, and docking removal using a temporary profile.

Grouped docking and named workspace presets remain open. Browser window placement follows browser/OS policies. Detailed dated evidence is retained in [DETACHABLE_PANELS.md](../DETACHABLE_PANELS.md); package verification is recorded in the release notes.
