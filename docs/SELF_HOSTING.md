# Self-hosting PixlPrfct

PixlPrfct is free, with no subscriptions, license server, paid tiers, or dependency on a ChatGPT account for self-hosted installations. Your hosting, database, and email providers may charge for their services.

Open **Admin → Database** from the project home for the configuration builder, including in the local static app. **Host your workspace** remains available on server-backed pages. The [Admin console](ADMIN_CONSOLE.md) also provides people, roles, invitations, teams, project/Trash management, and organization settings. One installation uses one database for accounts, organizations, teams, designs, and version history. The browser never receives database credentials. Large design bodies are content-addressed in the same database, so separate object storage is not required. The builder prepares a template; it does not provision provider accounts or remote databases.

## Quick local trial

Requirements: Node 24 LTS, Rust, and wasm-pack. Existing Node 22.13+ installations are supported by the app; Node 24 is recommended for the built-in SQLite driver.

```sh
npm ci
npm run selfhost:build
npm run selfhost:setup
npm run selfhost:migrate
npm run selfhost:start
```

Choose the local trial and SQLite for the simplest setup. Open `http://127.0.0.1:4174`. Register, then open the verification URL in the newest private `data/outbox/*.json` email. This folder is never exposed through HTTP. Production requires a real SMTP server. The regular `npm run dev` remains the managed Cloudflare preview; use `selfhost:start` for the independent account/database runtime.

The wizard creates `.env.selfhost` with a random secret and restrictive file permissions, without overwriting an existing file. Keep this secret stable: it protects sessions and encrypted two-factor secrets. Never commit `.env.selfhost` or the data directory. The configuration builder is also available before a database is connected at `/editor/setup.html`.

## Supported databases

| Choice | Driver | What to provide |
| --- | --- | --- |
| SQLite | Node SQLite | Persistent `PIXL_SQLITE_PATH`, default `./data/pixlprfct.sqlite` |
| Supabase | PostgreSQL (`pg`) | PostgreSQL connection string, not the browser API key |
| Render Postgres | PostgreSQL (`pg`) | Database connection string |
| Neon | PostgreSQL (`pg`) | PostgreSQL connection string |
| PostgreSQL | PostgreSQL (`pg`) | Connection string for a dedicated database |
| MySQL / MariaDB | `mysql2` | `mysql://USER:PASSWORD@HOST:3306/DATABASE` |

Use a dedicated database/schema and a database user with the table/index creation permissions needed by the initializer. Use an application role with narrower runtime permissions after initialization if your hosting system supports separate migration credentials. PostgreSQL and MySQL connections verify server certificates for every remote database, including when the app itself is running locally. Only a loopback database in local development may use plaintext. For private certificate authorities, configure Node's `NODE_EXTRA_CA_CERTS`; certificate verification is never disabled for public installs. URL-encode special characters in database and SMTP credentials. PostgreSQL hosts must support verified TLS; use the external TLS endpoint when a provider's internal endpoint only supports plaintext.

`selfhost:migrate` connects to the chosen database and creates the account/plugin schema and design tables. Running it again preserves existing rows. Back up before upgrades and review release/migration notes. This first portable schema initializer does not migrate an older Cloudflare D1 deployment, change database engines in place, or transfer browser drafts. Import/export design files to move those designs deliberately. MongoDB, SQL Server, and other engines are not supported by this adapter yet.

## Internet installation

Run `selfhost:setup` and choose the internet option, or complete the builder's template. Required settings:

- `PIXL_APP_URL`: exact public HTTPS origin, without a path.
- `BETTER_AUTH_SECRET`: unique random secret, at least 32 characters; keep it stable.
- `PIXL_ADMIN_EMAIL`: verified account authorized to view the server connection check. Registration never makes the first visitor an installation administrator.
- `PIXL_DATABASE_PROVIDER` and `DATABASE_URL` (or SQLite path).
- `SMTP_URL` and `SMTP_FROM`: verified sender and working SMTP service for registration, password reset, and invitations. SMTP TLS is required outside local development.
- `PIXL_LOCAL_DEVELOPMENT=false`; public HTTP origins and missing email settings are refused.
- `PIXL_REGISTRATION=open` (default) or `closed` to disable new registrations after onboarding. Closed mode also prevents invite recipients from registering; create their accounts before closing registration.

Terminate HTTPS with your reverse proxy (for example Caddy) and forward to port 4174. Do not publish the Node port directly to the internet. The server discards client-supplied identity and forwarding headers; rate limiting uses the direct peer IP. Behind a proxy, requests share the proxy's rate-limit bucket. Add independent per-client rate limits at the proxy for larger installations; configure it to preserve request Origin headers. No proxy headers are trusted implicitly.

Example Caddy site:

```caddyfile
 design.example.com {
   reverse_proxy 127.0.0.1:4174
 }
```

Database configuration is changed by the operator in server environment variables, followed by migration/check and restart. It cannot be overwritten through a public setup endpoint. The setup page's **Test server connection** checks the configured database after administrator login; it does not accept arbitrary connection strings from visitors.

## Docker

Build from this repository. Configure `.env.selfhost` for the public HTTPS address before starting.

```sh
docker compose -f compose.selfhost.yaml build
docker compose -f compose.selfhost.yaml run --rm app node scripts/self-host/migrate.mjs
docker compose -f compose.selfhost.yaml up -d
```

The app runs as an unprivileged user with dropped capabilities. The Compose port binds to loopback for a host reverse proxy. SQLite and development email persist in a named volume. Public setups should use the production configuration above; the local trial command binds to loopback within its process and is intended for direct Node execution.

## Accounts and workspaces

Register and verify your email. Account & teams includes profile editing, password changes, sign-out of other devices, authenticator-app two-factor enrollment with QR code and one-time recovery codes, organizations, email invitations, and team membership.

Select a personal, organization, or team workspace in the project-home dropdown. New designs in organization/team workspaces save directly to the server. Personal device drafts remain in the browser; use the editor's cloud-file action to save a server copy. Organization members can edit organization designs. Team members and organization owners/admins can edit team designs. Published library source projects additionally require whole-library or component maintainer grants; owners/admins manage those grants. Imported instance properties remain protected. See [Protected team libraries](TEAM_LIBRARIES.md). Membership is rechecked on every design and version-history request; removed members immediately lose server access. Previously downloaded files cannot be revoked.

Updates use optimistic revisions, automatic checkpoints, and explicit conflict errors. This supports shared saved documents, not simultaneous cursor presence or live merging of two people's edits. Download a recovery copy before replacing conflicting changes. Real-time co-editing is a separate future step.

## Security and operations

Better Auth handles password hashing, email ownership verification, expiring HttpOnly/SameSite cookies, secure cookies on HTTPS, password recovery, fresh-session checks, organization permissions, and two-factor challenges. Auth rate limits are stored in the database. The app checks Origin on mutations, prevents document access through forged host-auth headers, checks workspace membership, bounds request bodies, and serves security headers including CSP and HSTS on production.

Back up the database, the stable auth secret, and any volume before upgrades; verify restoration. SQLite needs its WAL-consistent backup procedure, not an arbitrary copy of a live file. Keep Node, the authentication library, and drivers patched. For public deployments, configure monitoring, SMTP delivery, reverse-proxy rate limiting, database backups, and administrator two-factor authentication. This implementation has automated authentication/access-control tests; it has not undergone an independent security audit or live testing against every managed database provider.

References: [Better Auth database setup](https://better-auth.com/docs/concepts/database), [organizations](https://better-auth.com/docs/plugins/organization), [two-factor authentication](https://better-auth.com/docs/plugins/2fa), [email/password](https://better-auth.com/docs/authentication/email-password).

### Validation for this implementation

The account suite exercises verified registration, tenant isolation, invitations, team access and revocation, forged identity rejection, CSRF rejection, optimistic conflicts, password-reset session revocation, two-factor enrollment and backup-code reuse, persistent login rate limits, and large-design version restoration. SQLite was tested end to end in the browser. The repository tests, TypeScript check, and framework build pass. PostgreSQL/MySQL connections, real SMTP delivery, and the Docker image still need deployment-specific integration testing.

The dedicated production manifest in `server/package.json` is used by the Docker build so editor development tools are not included in the self-hosted runtime. Its dependency audit reported no known advisories on 2026-10-28. The broader repository audit still reports five moderate findings in existing Next/build-tool dependencies (baseline-browser-mapping and esbuild/Drizzle tooling); no high or critical findings. Do not expose a development server publicly. An audit result is not a substitute for an independent security review.
