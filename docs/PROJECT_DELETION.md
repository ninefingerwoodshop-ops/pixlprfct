# Project deletion

On Projects, use the project’s **…** button or right-click its card and choose
**Move to trash**. Open **Trash** in the sidebar to restore it. Grid and list
views use the same actions. Moving to Trash preserves document bodies and
history.

## Permanently delete

In **Trash**, a project's menu also offers **Permanently delete**. It asks for
confirmation first; Cancel has focus, so Enter and Escape keep the project.
The same action is in the editor's Cloud files dialog under Show Trash.

- Only a project already in Trash can be permanently deleted. The API refuses an
  active file (`409`), and the request must carry the current revision.
- Cloud: `DELETE /api/documents/:id?permanent=1` removes the file and its
  version history in one transaction. Self-hosted servers also remove its
  sharing settings, edit requests, comments, reviews, notifications and
  simultaneous-editing rows.
- A file that is a published library is refused, because other files may
  depend on it. It stays in Trash.
- The same people who can move a project to Trash can permanently delete it.
- Local: the project is removed from this browser's storage. If it was the
  last one, the list is marked as cleared so an old single-file backup is not
  imported again.
- Storage: inline bodies stop counting at once. Large bodies stored as objects
  are removed by the existing daily cleanup after its 24-hour grace period.

Version history has **Delete** on each version and **Delete automatic backups
older than 30 days**. Named versions are never deleted in bulk. In shared
workspaces only the file's creator or an administrator can delete versions.

Not included: Empty Trash, automatic expiry of Trash, a scheduled retention
policy, or cleanup of rows that belong to files deleted before this change.
The menu item, both confirmation dialogs and their wording were compared
against Figma's Trash on 2026-11-11; see `docs/FIGMA_UI_REFERENCE.md` for what
matches and what still differs. Moving a project to Trash now asks first, as
Figma does.

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
