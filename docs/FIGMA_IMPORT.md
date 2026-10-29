# Import Figma designs

In Figma, save a local `.fig` copy of a **Design** file. In PixlPrfct, use **Import design** on the projects page, **PixlPrfct menu → Import design** in the editor, or drop the file onto the projects page or canvas. Desktop **File → Import design** / Cmd/Ctrl+O accepts `.fig` too.

Parsing runs locally in a cancelable worker. Review the page/layer count and conversion warnings, then choose **Import design**. The import creates a separate editable project; canceling or rejecting a file does not replace the open design. On a shared workspace's projects page, the converted project is saved to that workspace. Importing from the editor creates a local draft. Keep the original Figma file as your source copy.

## Supported content

- Multiple pages; ordered nested frames/groups and layers; positions, sizes, rotation, visibility and locking.
- Rectangles, ellipses, lines and editable vector paths with Bézier handles.
- Editable text with the layer's base font, size, weight, alignment, line height and text sizing. Rendering depends on fonts available to the browser/app.
- Multiple solid and gradient fills/strokes, opacity, blend modes, corner radii, stroke weight/alignment, shadows and blurs.
- Embedded PNG, JPEG, WebP and GIF images. Large images are resized to at most 2048 pixels per axis to fit the editor's media limit.
- Horizontal/vertical auto layout, spacing, padding and common sizing settings.
- Main components become PixlPrfct component masters. Instances expand into editable layers with supported property overrides. They are **detached**: Figma library links, access rules and update relationships do not transfer.

## Conversion limits

This is an initial importer, not full Figma fidelity. Mixed text runs/italics, compound-vector holes, masks, skew/reflection, custom image crops/filters, grid auto layout, layout guides, variable/style bindings, component properties/variants, prototypes and advanced paints may need rebuilding. Unsupported features detected by the converter appear in the review report. Compound paths become separate editable paths; unsupported paints become gray fills. Files referencing absent library components or image bytes cannot recover that missing content.

Only Figma Design `.fig` archives are supported, including `fig-kiwi` data with deflate and Zstandard messages. `.jam`, `.deck`, Figma URLs and REST API JSON are not supported. `.pixl` and existing native project JSON imports keep their previous behavior. This does not add Figma export.

Limits: 64 MiB source file, 128 MiB selected ZIP contents, 64 MiB expanded message, 50,000 source nodes, 100 pages, 10,000 converted layers, and a 5 MB converted project. Parsing stops after 30 seconds. Split larger designs into smaller Figma files. Import compatibility may change with Figma's proprietary format; see [Figma's local-copy documentation](https://help.figma.com/hc/en-us/articles/8403626871063-Save-a-local-copy-of-files).

## Implementation and verification

`web/figma/parse.js` reads each file's embedded Kiwi schema as data; it never evaluates generated code or grants file-supplied scripts access to the app. `web/figma/convert.js` creates the native document model, which is then validated by the Rust editor before saving. ZIP paths, expansion sizes, nesting and node counts are bounded. The desktop keeps its sandbox and existing Content Security Policy.

`npm run build:editor` bundles the worker with esbuild. It ships licenses for fflate, fzstd and kiwi-schema beside the bundle. Format research and binary test fixtures are credited to [OpenFig](https://github.com/OpenFig-org/openfig-core); the parser and converter are implemented here.

Run `node --test tests/figma-import.test.mjs tests/desktop.test.mjs` after building the editor. Tests cover real deflate/Zstandard exports, native-model validation, editing/undo/persistence, text, gradients, images, component expansion, invalid archives and import limits. Browser checks cover import/confirm, cancellation, malformed-file errors and editable canvas controls. Windows packaging requires a Windows runtime smoke test before release.
