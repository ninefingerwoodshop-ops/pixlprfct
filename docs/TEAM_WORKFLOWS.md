# Team workflow

The current workflow supports one active editor per shared file, with other
teammates reviewing the latest saved revision. Editing handoff, authenticated file
roles, review threads, and author-approved library overrides are implemented.
Simultaneous multiplayer editing is not implemented.

## Set up a team

1. Connect the desktop app to your self-hosted installation, or open it in a
   browser. Create an organization/team and invite members from Admin → People.
2. Create or save the project in that shared workspace. Device drafts and personal
   files do not gain shared access just by copying their address.
3. Open **Share**. Set the workspace default and individual member overrides:
   **Can view**, **Can comment**, **Can edit**, or **No access**. The creator and
   workspace administrators manage file access. Copy link preserves those checks;
   it does not create anonymous access or invite an outsider.
4. An editor clicks **Start editing**. Other editors see the current holder and
   can **Request editing**. The holder saves and clicks **Hand off to …**, or
   **Finish editing**. The recipient loads the current saved revision first.
5. Reviewers open **Comments**, select a page or layer, and post a thread. Replies
   retain authenticated author names. A thread's author or an editor can resolve
   or reopen it. **Show location** returns to its page/layer; removed locations are
   reported. Viewer accounts can read threads. Comments do not alter artwork or
   consume its revision history.

Status refreshes every 20 seconds and when returning to the window. Editing leases
last 90 seconds and renew while connected. A crashed, closed, or reloaded editor
can hold the slot until its lease expires; an explicit handoff is immediate.
Offline editing is paused. Existing unsaved work stays in recovery storage. If
another editor advances the file, **Files** offers saving a separate copy or
opening the latest version while retaining the previous local copy. There is no
automatic merge of conflicting designs.

## Reusable libraries

In a source project, select a main component and use **Library instance
permissions** to allow exposed text/visibility properties, size/layout overrides,
or variants within its component set. Publish a new release and accept it in the
consumer project. Defaults remain protected. Styling, source definitions,
hierarchy, and detach operations remain protected; slot contents retain their
existing author-defined behavior. Size/layout permission includes positions,
dimensions, layout-item settings and constraints within the linked instance.

Source component maintainership and file editing access are both required to edit
a shared library source. Publishing also requires the active editing lease. The
library author decides which properties consumers can change; assigning a file
role does not bypass library protection. See [library import](LIBRARIES.md) for
PixlPrfct releases and Figma file snapshots.

## Operations and acceptance

Run `npm run selfhost:migrate` before starting the updated server. The migration
adds collaboration, edit-request, and comment tables/indexes without replacing
designs. Back up the database and stable authentication secret before upgrades.
For SQLite, take an online `VACUUM INTO` snapshot or use a consistent stopped
backup. Restore into an isolated installation first, with the same auth secret,
then check file content, comments and access roles. PostgreSQL/MySQL installations
should use their provider's backup/restore workflow.

`npx playwright test tests/browser/team.spec.mjs --workers=1` runs a disposable
local HTTP server, real verified accounts and four isolated browser contexts. Mail
is captured in memory; no real invitations or comments are sent to other people.
It tests handoff, roles, review, a network interruption, a persistent database
restart, and restoring a SQLite snapshot. API tests additionally cover outsiders,
expired sessions, membership revocation and a slow upload finishing after handoff.
The UI and MCP bridge share the same edit gate; the server independently fences
the final commit by lease, policy revision and current membership.

This is mechanical acceptance with simulated accounts, not participant research.
There are zero recruited testers and no adoption, retention or satisfaction
results. Review currently has page/layer links rather than canvas pins, mentions,
email notifications or an activity inbox. Cross-workspace/public sharing, live
Figma library synchronization and simultaneous co-editing remain separate work.

## Alpha.14 additions — 2026-10-30

- Notifications: the bell opens All/Unread activity. Mention a member by typing
  `@`, choose their name, and post. Settings offer all activity, mentions/replies,
  or none, plus opt-in email. Read status survives restart. Removed members lose
  access to file activity. Email requires the installation's SMTP configuration.
- Reviews: open Reviews, choose a teammate and request review of the saved
  revision. The assignee can approve or request changes. Editing the artwork
  makes the previous approval visibly stale; it does not approve later edits.
- Edit together: a file owner selects Share → Editing mode → Edit together.
  Editors join automatically. Independent property edits merge. Overlapping
  edits pause saving and offer an explicit choice; independent changes survive
  either choice. Keep a local copy through Files when structural changes cannot
  combine. Undo affects that person's changes and refuses to erase a teammate's
  conflicting edit. Handoff mode remains available.
- Presence and cursor updates use one-second polling while visible. This is
  simultaneous editing with explicit conflicts, not character-level text CRDT
  merging. Large document saves and unstable connections can increase latency.
  Recovery snapshots stay on the device. History is per session; reopening resets
  the undo stack. Server checkpoints and named versions remain available.
- Onboarding explains device, personal cloud and workspace locations; invitation
  details are shown only to the intended signed-in recipient. Shared workspaces
  show first-project and design-system setup actions.

Synthetic acceptance uses separate authenticated browser contexts; there are no
human pilot participants. Canvas comment pins, public/cross-workspace sharing,
voice, spotlight/follow, and character-level co-editing remain separate features.
