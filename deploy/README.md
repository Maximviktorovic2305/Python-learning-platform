# Production

The server runs Nginx and Certbot in front of Docker Compose. Only the frontend's
loopback port 3010 is published. PostgreSQL, the API and execution broker are
private. The sandbox uses a separate Docker-in-Docker daemon, without mounting
the host's Docker socket. Student containers have no network, run as an
unprivileged user, and have bounded CPU, memory, processes, output and time.

The production environment lives outside release directories at
`/home/max/.config/python-platform/production.env`, owned by the deploy user with
mode 0600. Generate independent random values for `POSTGRES_PASSWORD`,
`JWT_SECRET` and `RUNNER_TOKEN`. Set `ENVIRONMENT=production`,
`COOKIE_SECURE=true`, `ALLOWED_ORIGIN=https://python-learning.tech`,
`EXECUTION_RUNNER=remote` and `FRONTEND_PORT=3010`. Never copy development secrets
into production or commit this file.

Set `NEXT_PUBLIC_YANDEX_METRIKA_ID=113659993` to enable the project's analytics
counter after user consent. This public identifier is passed as a frontend build
argument; changing it requires rebuilding the frontend image. Leave it empty to
disable analytics. It must not contain a secret.

The quality workflow deploys successful pushes to `main` through the Production
environment. Configure its `SSH_HOST`, `SSH_USERNAME`, `SSH_PRIVATE_KEY` and
`SSH_FINGERPRINT` secrets. The account must be able to run Docker. Use a trusted
host fingerprint; the workflow does not disable SSH host verification.

`DEPLOY_SHA=<full commit> bash deploy/deploy.sh` creates an immutable worktree,
builds versioned images, saves a database dump before migrations, checks service
health and updates the `current` symlink. A failed deployment restores previous
application images. Database migrations are not automatically reversed: retain
compatible migrations and use the private database backup for manual recovery.
Old releases, images and backups are retained for rollback; remove them only
after confirming which releases and backups are still needed.

Install `python-learning.tech.conf` in Nginx after obtaining the certificate for
the apex and `www` names with Certbot's webroot `/var/www/letsencrypt`.
`certbot.timer` schedules renewal; a deploy hook runs `nginx -t` and reloads Nginx.
Validate renewal with `certbot renew --cert-name python-learning.tech --dry-run`.

Keep Nginx's per-client-IP rate limits enabled. Production deliberately disables
the API's in-memory development limiter: Next.js proxies all requests from a
shared address. The backend must remain private when replacing this gateway.
