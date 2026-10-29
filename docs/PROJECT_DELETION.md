# Project deletion

On Projects, use the project’s **…** button or right-click its card and choose
**Move to trash**. Open **Trash** in the sidebar to restore it. Grid and list
views use the same actions. Moving to Trash preserves document bodies and
history; this change adds no permanent-delete operation.

Shared projects can be deleted and restored only by their original creator, a
workspace owner/admin, or the installation administrator. Installation admins
must still have access to the selected workspace. Ordinary editing or library
maintainership does not grant deletion rights. The API derives identity and
roles from the verified session and current membership on every request; its
`can_delete` result controls the UI. Revisions protect against stale deletions.

Creator metadata is assigned at creation, outside the design JSON, and does not
change on editing or history restoration. Existing personal projects have a
known owner. Historical shared projects without creator records remain
admin-only, since the last editor is not reliable evidence of origin.

Local projects belong to the current browser/desktop storage, which has no
separate account identity. Their Trash stays on that device. Deleting a local
project blocks stale autosaves from another tab and prevents legacy recovery
from silently recreating the last deleted project.

Before upgrading a server, apply the additive database migration:

- Self-hosted installations: `npm run selfhost:migrate`.
- Cloudflare D1: apply `drizzle/0003_project_creators.sql` through the existing
  migration process. The D1 host has personal documents only.

The live Figma file browser was inspected on 2026-10-29. Its context menu places
**Move to trash** at the bottom and provides sidebar Trash. The measured menu
uses 144px width and 24px rows at the observed scale. PixlPrfct reuses its shared
menu behavior and dark tokens; a visible **…** button adds touch/keyboard access.
This does not claim parity for the entire project browser.
