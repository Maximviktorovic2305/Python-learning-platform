# Production

The production server runs Nginx and Certbot in front of native systemd services,
without Docker. The frontend listens on loopback port 3010, API on 8011 and broker
on 8091. PostgreSQL 18.6 uses its own `18/python` cluster on loopback port 5433;
the other sites' PostgreSQL 14 cluster remains separate.

API, frontend and broker have separate system accounts and bounded resources.
Only the broker may invoke a fixed root-owned sandbox helper. NsJail creates a
fresh mount, PID, user, network, IPC, UTS and cgroup namespace for each case;
host files and secrets are not mounted. The sandbox has read-only runtime mounts,
an 8 MB temporary directory, seccomp restrictions, no capabilities or network,
128 MB memory, no swap, 32 tasks, 50% CPU and bounded lifetime/output. Cancellation
stops the complete transient systemd unit. Student code never runs inside the API.

The production environment lives outside release directories in root-owned
mode-0600 `/etc/python-platform/api.env` and `runner.env`. Systemd supplies only
the relevant values to each service. Generate independent database credentials,
`JWT_SECRET` and `RUNNER_TOKEN`. Set `ENVIRONMENT=production`,
`COOKIE_SECURE=true`, `ALLOWED_ORIGIN=https://python-learning.tech`,
`EXECUTION_RUNNER=remote` and `RUNNER_URL=http://127.0.0.1:8091`. Never copy development secrets
into production or commit this file.

Set `NEXT_PUBLIC_YANDEX_METRIKA_ID=113659993` to enable the project's analytics
counter after user consent. This public identifier is passed as a frontend build
setting; changing it requires rebuilding the frontend. Leave it empty to
disable analytics. It must not contain a secret.

The quality workflow deploys successful pushes to `main` through the Production
environment. Configure its `SSH_HOST`, `SSH_USERNAME`, `SSH_PRIVATE_KEY` and
`SSH_FINGERPRINT` secrets. The account must be able to run Docker. Use a trusted
host fingerprint; the workflow does not disable SSH host verification. The
deploy account uses only the root-owned `/usr/local/sbin/python-platform-admin`
helper for migrations, backup and activation, rather than unrestricted sudo.

`DEPLOY_SHA=<full commit> bash deploy/deploy.sh` creates an immutable worktree,
builds a locked Python environment and Next.js standalone output in
`runtime/<SHA>`, saves a compressed database dump before migrations, checks service
health and updates the `current` symlink. A failed deployment restores previous
services. Database migrations are not automatically reversed: retain
compatible migrations and use the private database backup for manual recovery.
Production deployment runs only Alembic schema migrations. It does not execute
curriculum seed: the published course is already stored in PostgreSQL. Future
content changes require a reviewed data migration. `python -m app.seed` remains
a development/test initializer; in production it exits without changing data,
including when invoked by an older installed deployment helper.
After health checks, deployment rotates `current` and `previous`
and runs `deploy/maintain.py --apply` under the same deployment lock. These two
releases and their native runtimes are protected: one current version and one
rollback. Only older native runtimes, clean Git worktrees and this project's
regenerable build cache are removed. Databases, uploads, secrets and other sites
are never pruned by this script. Initialize both
links to distinct verified releases when upgrading an existing installation;
maintenance refuses cleanup until the links are valid.

Database dumps are gzip compressed and validated before the original is removed.
Keep the newest seven dumps plus the latest dump per day for the last 30 days.
Restore a compressed dump with `gzip -dc backup.sql.gz | psql ...` using the
private database credentials. Build dependencies and temporary npm cache are
removed after successful deployment; the standalone runtime retains its required
production dependencies. Unchanged frontend source reuses the previous build.
Maintenance failures are reported without rolling back a healthy deployment.
For a read-only plan, hold `deploy.lock` and run `python3 deploy/maintain.py`
without `--apply`, using the managed Python 3.14 interpreter. Never run cleanup
concurrently with another deployment.

For rollback, save a database backup and run `sudo -n python-platform-admin activate
<previous-SHA>`. Only verified runtimes with a `ready` marker can be retained.
Rollback does not reverse database migrations.

Provision the native sandbox with `sudo bash deploy/native/install-sandbox.sh`
(Ubuntu amd64, systemd and cgroup v2). It pins NsJail source/submodules, verifies
the uv archive checksum, installs Python 3.14.9 and precompiles teaching libraries.
Install PostgreSQL 18 from its official PGDG repository before running
`sudo /opt/python-platform/python/runtime/bin/python3.14 deploy/native/bootstrap-host.py`.
The bootstrap is for migration from the existing private production configuration:
it preserves the JWT and runner secrets and creates a separate non-superuser
database role. Copy and verify all table fingerprints before switching traffic;
freeze the old API for the final copy. Keep a validated database backup until
native service, authentication, curriculum and sandbox checks pass.

CI tests the actual NsJail sandbox, resource/error/cancellation behavior and all
168 published solutions, plus retention protections. No browser checks run.

Install `python-learning.tech.conf` in Nginx after obtaining the certificate for
the apex and `www` names with Certbot's webroot `/var/www/letsencrypt`.
`certbot.timer` schedules renewal; a deploy hook runs `nginx -t` and reloads Nginx.
Validate renewal with `certbot renew --cert-name python-learning.tech --dry-run`.

Keep Nginx's per-client-IP rate limits enabled. Production deliberately disables
the API's in-memory development limiter: Next.js proxies all requests from a
shared address. The backend must remain private when replacing this gateway.
