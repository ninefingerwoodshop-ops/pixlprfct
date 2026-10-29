# Protected team libraries

PixlPrfct projects can publish reusable component libraries into their personal,
organization, or team workspace. Other projects in that same workspace add the
library from **Assets → Manage libraries → Teams**. This first workflow links
PixlPrfct projects; it does not import Figma files.

## Publish and use a library

1. Save the design-system project in a self-hosted workspace and create its main
   components. Workspace owners and administrators can publish the first release.
2. Open **Assets → Manage libraries → This file → Publish**.
3. Open **Permissions** to assign maintainers to the entire library or individual
   main components. Only owners and administrators can change these assignments.
4. In another project in the same workspace, open **Teams → Add to file**.
5. Click or drag a component from Assets to place a protected instance. Its
   **Open source** action opens the original design-system project.
6. Source edits remain drafts until a library maintainer publishes another
   release. Consumer projects accept it through **Updates → Update**. Existing
   instance identities and placement are preserved.

Removing a library from Assets hides its cards. Already placed instances keep
their source links, appearance, and protection. Re-adding the library restores
the cards. An update that removes a component still used by a consumer is refused
until those instances are removed.

## Permissions

| Action | Workspace member | Component maintainer | Library maintainer | Owner/admin |
| --- | --- | --- | --- | --- |
| Add a published library and place its instances | Yes | Yes | Yes | Yes |
| Move, duplicate, or remove a whole placed instance | Yes | Yes | Yes | Yes |
| Override instance text, style, dimensions, or internal structure | No | No | No | No |
| Edit an assigned source component and its children | No | Yes | Yes | Yes |
| Edit other source components or shared definitions | No | No | Yes | Yes |
| Publish a new release | No | No | Yes | Yes |
| Publish a new library or assign maintainers | No | No | No | Yes |

Maintainers change the source and publish releases instead of overriding consumer
instances. Component grants apply to an entire main-component subtree. They do
not grant changes to other components, project-wide variables/settings, or the
ability to delete or reparent the assigned main component. Existing ordinary
components retain their normal editable-instance behavior.

Same-project clipboard operations preserve protected links, including paste into
frames and paste to replace. Cross-project protected pastes direct the user to
add the library through Assets instead of silently producing detached copies.

## Enforcement and persistence

The editor checks committed mutations, undo, and redo. The self-hosted server
independently checks document creation, updates, deletion/restoration, and version
restoration. It verifies workspace membership, source grants, imported definitions
against the published release, and the complete protected instance hierarchy.
Permission changes and publication advance the source revision, preventing an
in-flight save authorized under an older policy from overwriting the source.

Library snapshots contain main-component trees, local nested components, variables
and aliases/modes, component properties/variants, and guide styles. Imports remap
identifiers without colliding with existing project content. Cached source pages
are hidden from page navigation, prototype destinations, and generated code
exports. Editable `.pixl` files retain the linked definitions.

Publishing a component containing an instance imported from another library is
currently refused. Add the original libraries separately. The UI refreshes
permissions when a project or library manager opens; the server rechecks them on
every save, including after membership or maintainer revocation.

Run `npm run selfhost:migrate` when upgrading. The additive migration creates
`component_libraries` and `component_library_versions` for SQLite, PostgreSQL, and
MySQL. Release snapshots remain stored in the selected app database. This feature
requires the self-hosted account runtime; the managed Cloudflare runtime and
device-only drafts do not provide the library service.

This is shared saved-document collaboration with explicit releases, not live
cursor presence or simultaneous editing. Access controls protect server documents
and linked instances in the app; they cannot revoke previously downloaded data or
prevent someone from independently recreating artwork. PostgreSQL and MySQL still
need deployment-specific integration testing.

## Verification — 2026-10-29

- Inspected the live Figma Assets and Manage libraries interface before building:
  760 × 640 dialog, 40px header, 200px navigation, 16px content inset, 24px navigation
  controls, 74px library rows, and 102 × 58 thumbnails. The Permissions tab is a
  PixlPrfct extension. Full Figma feature or pixel parity is not claimed.
- Browser checks used an isolated SQLite workspace with an owner, component
  maintainer, and designer: publish, assign a component grant, add a library, place
  and move an instance, reload, publish a changed label, explicitly accept the
  update, remove/re-add availability, and confirm source and instance restrictions.
- Automated tests cover nested components and variable modes, ID remapping,
  protected mutations and detach attempts, clipboard/history, omitted internal
  pages in exports/prototypes, tenant isolation, permission escalation/revocation,
  stale saves, immutable releases, and version restoration.
- Focused library/component/clipboard/export/prototype/account checks: 36 passed.
  TypeScript and the three Rust tests passed. Full JavaScript suite: 807 tests,
  805 passed, with the same two pre-existing failures in `css-renderer.test.mjs`
  and `icon-library.test.mjs` observed before these changes.
