# Design file import

Pixel Perfect can open editable `.pixl` projects, convert supported `.fig` design
archives, and import SVG artwork. These paths have different purposes and limits.

## Editable projects

Use **Import design** to open a `.pixl` backup or shared project. Native files
preserve the document model. SVG Animation projects open in their dedicated
workspace and retain editable timelines. Keep native backups when you need to
continue editing an animation later.

## Design archives

Use **Import design**, or drop a local `.fig` archive onto Projects or the Design
canvas. The browser and desktop application parse it locally, present a conversion
report, and create a separate editable project. The original file is unchanged.

Supported content includes pages, layers, text, paints, embedded images, vectors
and basic layout. Supported local variables, styles and component variant sets can
also be converted. Review every import: mixed text, complex masks, nested or
external component relationships and other advanced source features can require
rebuilding. An imported project is a snapshot; it does not stay connected to the
source application or its libraries.

The source archive limit is 64 MiB. Conversion also enforces limits on expanded
archive content, pages, nodes and the final native document. Oversized or malformed
files can be rejected before import. Cancelling conversion does not replace the
open design. Keep the original archive and inspect the conversion report before
relying on the result.

## SVG artwork

Design imports supported SVG geometry and paints as editable artwork. SVG
Animation imports artwork into its separate animation model, where you can add
tracks, keyframes and playback settings. It supports common geometry, gradients,
local references, clipping, masks, text, embedded images and selected filters.

Unsupported content is reported or removed during import. Scripts and external
resources are removed. Fonts are not embedded, so text appearance depends on the
fonts available on the device.

In SVG Animation, importing artwork currently replaces the source artwork and
clears its tracks. Same-session Undo is available. Save a native copy first if you
need to retain the current editable animation. Exported SVG is a delivery format;
reimporting it does not restore its original editable timeline.

## Review after importing

- Check the conversion report and page/layer counts.
- Inspect typography, gradients, masks, components and layout.
- Save a `.pixl` copy after reviewing the converted result.
- Keep source files and native backups for future editing.

See the [product evaluation](PRODUCT_EVALUATION_2026-11-01.md) for current gaps and
the [roadmap](https://ninefingerwoodshop-ops.github.io/pixlprfct/roadmap.html) for
proposed improvements.
