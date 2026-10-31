# Using libraries in an existing project

Open the destination project, choose **Assets → Add more libraries** (or the
Manage libraries button), then select a library and choose **Add to file**.
The destination's name, pages and existing artwork stay in place. Components
appear in Assets; styles and variables become available in their pickers.
Placed instances remain linked and their library definitions are protected.

## PixlPrfct published libraries

In the source project, choose **Manage libraries → This file → Publish**.
Local projects publish to **On this device** without an account. Shared
workspace projects publish through their existing workspace permissions.
Components, variant sets, styles and variables can be published; styles-only
and variables-only libraries are supported.

Choose **Export library…** for a portable `.pixllib` release. In another local
project choose **Import library…**, preview its contents, then **Add to file**.
Republish changes in the source and use **Updates → Update** in consuming
projects. Importing a newer `.pixllib` retains that library's identity and makes
the update available. Older/conflicting releases are rejected. Removing a
library hides it from Assets while preserving already placed instances.

## Figma libraries

In Figma, open the library's source file and choose **File → Save local copy**.
In the existing local PixlPrfct project, choose **Import library…**, select the
`.fig` file, review the import report, then choose **Import library → Add to file**.
You can also import an ordinary `.pixl` design as a reusable library.

Figma imports are snapshots. There is no Figma account catalog, URL import or
live synchronization. Supported components, named variant sets, variables and
shared styles are converted. The report identifies unsupported content before
acceptance: nested Figma instances are detached, exposed component properties
and slot metadata are omitted, and mixed text/italics use the base style.
The original Figma file is unchanged. Reimporting a raw `.fig`/`.pixl` creates
a separate snapshot; publish a PixlPrfct source to maintain subsequent releases.

## Shared workspaces

Shared projects consume libraries published in the same workspace. To use an
external file there, import it as a source project from the workspace's Projects
screen, publish that source, then add its library to the destination. Existing
workspace roles and maintainer restrictions still apply. Import library in an
open shared project accepts an exported release already published there; it
does not bypass the workspace boundary for arbitrary device libraries.

## Agent access

The live-editor MCP tool `pixlprfct_libraries` lists available releases, linked
libraries and grouped Assets entries, and supports publish/add/update/remove.
Mutations require the current content revision. See [MCP.md](MCP.md).
