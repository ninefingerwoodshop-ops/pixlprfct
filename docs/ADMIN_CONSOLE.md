# Admin console

Open **Admin** in the Projects sidebar, or `/editor/admin.html` (`/admin` on the
self-hosted server). Choose an organization from the upper-left dropdown.

- **Dashboard:** live member/team totals and pending invitations.
- **People:** name/email search, role filters, pagination, invitations and
  cancellation, member removal, and owner/admin/member role changes. Owners
  control ownership changes; the underlying auth service protects the last owner.
- **Teams:** create and rename teams, add existing organization members by email,
  remove team members, and open their projects.
- **Content:** choose an organization or team workspace, search projects, open
  designs, move them to Trash, and restore them. Existing creator/admin and
  revision checks apply. Local mode manages this browser's drafts.
- **Settings:** organization display name, account security, membership controls,
  registration status, and database/hosting access.
- **Database:** provider configuration templates and setup instructions for SQLite,
  PostgreSQL, Supabase, Render, Neon, MySQL, and MariaDB. The installation admin
  can test the configured server connection. Credentials stay in the server's
  environment; the browser does not write connection strings to a running server.

The static build includes Admin and the database setup builder. Before connecting
a server it explicitly shows local storage, offers local Content/Trash, and
explains that people and teams require a server. **Open a team server** navigates
to an existing installation; it does not transfer browser drafts. See
[Self-hosting](SELF_HOSTING.md) for initialization and migration steps.

## Authorization

The new summary and people endpoints require a verified session and current
organization owner/admin membership on every request. Installation-admin status
does not grant access to unrelated organizations. Searches, team filters, and
pagination stay inside the selected organization. Role and membership mutations
use the existing Better Auth organization endpoints. Database checks require the
configured installation administrator. No database credentials are returned.

## Verification

The live Figma Admin dashboard, People, Content, Settings, and invitation dialog
were inspected on 2026-10-29. The console uses its 240px sidebar, 32px navigation
rows, 40px top navigation, 72px page heading, 32px content insets, 24px search
field, 48px table rows, and 680px centered settings column. It uses PixlPrfct's
logo and shared dark tokens, inputs, and custom dropdowns. Database and team
management extend that structure. This is not a claim of complete Figma parity:
paid seats, billing, AI credits, SSO/SCIM, and Figma-specific services are absent.

Automated coverage includes authorization, tenant isolation, identity spoofing,
role promotion/revocation, last-owner protection, literal search, pagination,
team scoping, and static setup availability. Browser checks use isolated test
accounts and a local mail sink, with no real invitations sent.
