# Set up a team server with an AI assistant

Each team owns its installation, database, domain, and email service. PixlPrfct
has no central SMTP account, required update service, subscription, or license
server. A local SQLite trial needs neither a database provider nor SMTP.
Internet-facing account verification, invitations, and password recovery require
that team's SMTP service. Automatic desktop updates are optional; Mac signing
and notarization belong to the distributor, not each team's administrator.

## Connect the operator tools

Use the installed source checkout and built editor described in [MCP.md](MCP.md).
Add an installation directory to the MCP launch configuration:

```json
{
  "mcpServers": {
    "pixlprfct": {
      "command": "node",
      "args": [
        "/absolute/path/to/pixlprfct/mcp/server.mjs",
        "--workspace", "/absolute/path/to/design-projects",
        "--installation", "/absolute/path/to/team-server"
      ]
    }
  }
}
```

`PIXLPRFCT_INSTALLATION` is the equivalent environment setting. Restart the MCP
host after changing launch settings. Without this option, the setup tools explain
how to enable access and cannot write installation configuration. Enabling it
makes this local stdio process an installation operator: it can access the
configured database using that installation's credentials. Enable it only for a
trusted agent. It does not grant editor users server administration privileges.
The MCP process must run on the machine hosting the installation; this is not a
remote public MCP endpoint or a cloud-account provisioning integration.

Ask the assistant: **“Set up a local PixlPrfct team trial with SQLite, verify it,
and check that its backup can be recovered.”** The `setup-team` MCP prompt is
also available. For a real deployment, describe the team's existing hosting,
domain, provider, administrator email, and chosen runtime.

## Credential handling

Do not paste database or SMTP passwords into chat or tool arguments. Supply them
through your MCP host's private environment settings, for example variables named
`PIXL_SETUP_DATABASE_URL` and `PIXL_SETUP_SMTP_URL`. The assistant passes only
those names as `databaseUrlEnv` and `smtpUrlEnv`. Values use the normal connection
URL formats in [SELF_HOSTING.md](SELF_HOSTING.md), with URL-encoded credentials.
An existing private `.env.selfhost` is also supported. The plan preserves its
credentials and stable authentication secret. A new secret is generated locally.

Plans and status return only credential-presence flags. Configuration files are
0600, newly created installation directories are 0700, and prior configuration
copies remain private. Service output and driver errors are not returned to the
agent because they can contain passwords. The operator exposes fixed actions,
not a shell, arbitrary environment updates, or database queries. Configuration
and backup traversal through symlinks is rejected. A shared operation lock and
configuration revision prevent two MCP processes from silently overwriting each
other. Inspect/remove a stale `.pixl-setup.lock` locally only after confirming its
operation stopped. Plan IDs expire after ten minutes or an MCP restart.

## Setup sequence

1. Read `pixlprfct_reference` with `topic:"installation"`, then call
   `pixlprfct_installation_status`.
2. Call `pixlprfct_installation_plan`. For the simplest trial use `mode:"local"`,
   `deployment:"native"`, `provider:"sqlite"`, and the administrator email.
   The default URL is `http://127.0.0.1:4174`; if changing it, supply the matching
   listener `port`. A team installation uses `mode:"team"`, its HTTPS origin,
   SMTP reference and sender, and usually `deployment:"docker"`.
3. Review the returned settings, missing prerequisites, warnings, and action list.
   When `ready:true`, apply its `planId` and `revision` with
   `pixlprfct_installation_apply`. It writes `.env.selfhost` and `compose.mcp.yaml`;
   it does not contact services, send mail, or create accounts.
4. For native trials, run `database`, `migrate`, `mail`, `start`, then `health`.
   For Docker, run `docker_start`, then `database`, `mail`, and `health`.
   Each `pixlprfct_installation_run` call needs the latest configuration revision.
   It immediately returns a job ID. Poll `pixlprfct_installation_job` until its
   status is `succeeded` or `failed`. A started job is not proof of success.
5. Open the returned account URL. Create the first account using the configured
   administrator email and complete email verification. In a local trial the
   verification mail is saved privately in `data/outbox`; with SMTP it goes to
   the user's inbox. Create the organization/team through the authenticated
   account flow. An assistant with browser access can assist with that flow;
   the installation tools do not create unverified privileged users, read
   passwords or verification links, disable MFA, or invite people implicitly.
6. Run `backup`, list `installation_backups`, then run `verify_backup` with that
   `backupId`. Verification checks a separate backup; it never replaces the live
   database. For an existing deployment, take a consistent backup **before**
   migrating/upgrading. Native PostgreSQL verification needs matching PostgreSQL
   utilities on PATH (or an existing `PIXL_POSTGRES_BIN` configuration).

The tools are `pixlprfct_installation_status`, `pixlprfct_installation_plan`,
`pixlprfct_installation_apply`, `pixlprfct_installation_run`,
`pixlprfct_installation_job`, and `pixlprfct_installation_backups`.
Read-only reference/status/plan tools do not send email. `mail` verifies SMTP
connection/authentication only; actual inbox delivery still needs a separately
authorized recipient test. Failed jobs return a redacted error and release their
lock. After an interrupted operation, inspect state before retrying migrations
or creating another backup.

## Runtime and deployment boundaries

A native trial runs as a child of the MCP host. `stop` and MCP shutdown stop that
owned process; they do not kill another server on the selected port. Its database
and private outbox persist across restarts. A native production installation can
use the same configuration with an administrator-managed supervisor; the MCP
`start` action deliberately describes and supports the local trial lifetime.

Docker startup uses a generated, validated Compose definition, builds the image,
stops the existing service before migrations, and starts it with
`restart:unless-stopped`. It can take several minutes. `docker_stop` preserves the
named data volume. Credentials are supplied in the child process environment,
not command arguments or the generated Compose file. Use the MCP operations to
run this generated Compose file. Docker status is verified with `health`; a
successful `up` command alone does not establish public HTTPS reachability.

The Compose host port binds to loopback. The team must configure DNS and a trusted
HTTPS reverse proxy for public access. These tools do not buy hosting, register
domains, configure a provider account, or issue public certificates. Teams may
use their existing infrastructure. They do not need to run an app-update server.

Native and Docker installations use different storage. The operator refuses to
switch an existing installation's runtime silently; use a new installation
directory and an explicit data migration. The standard Docker image supports
SQLite backup/verification. PostgreSQL/MySQL containers need consistent provider
snapshots or a separately managed image with suitable backup tools. Host-only
private CA files are not mounted into generated containers. Native PostgreSQL
supports the existing CA and backup-tool settings. MySQL/MariaDB automated backup
is not implemented by the application's portable backup command.

## Local verification — 2026-10-30

A real standard MCP client over stdio created a fresh SQLite installation,
initialized it twice, launched the HTTP server from a separate installation
folder, verified a synthetic administrator through the private local outbox,
created a workspace and project, backed up and checked recovery, restarted the
MCP process/server, and confirmed the same login and project survived. The
server exited when its owning MCP client closed. Additional tests cover private
configuration, credential redaction, failed SMTP checks, competing plans,
symlinks, invalid paths, and preserved authentication secrets.

All accounts are synthetic; no messages were sent to real recipients. Docker is
not installed on the development Mac, so the generated Docker orchestration is
covered by contract tests and has not been exercised against a real daemon.
Public provider setup, DNS/TLS, real email delivery, and public Mac signing remain
deployment-specific acceptance work, not claims established by local tests.

Final focused verification: 49 MCP, self-hosting, operations, and updater tests
pass; targeted lint has zero errors/warnings. Evidence is retained locally in
`.local/team-next/mcp-setup-regression.log` and `mcp-setup-lint.log`.
