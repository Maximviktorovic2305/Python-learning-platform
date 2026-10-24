# Shared native host administration

These fixed root-owned helpers manage the existing five-site host. They contain no credentials. Private service and migration environments stay under root-only `/etc/python-platform`, `/etc/jslab` and `/etc/native-sites`; the API receives a dedicated DML role and never the migration owner's password.

Install reviewed `sites_admin.py`, `firewall.py` and `maintenance.py` as `/usr/local/sbin/sites-admin`, `/usr/local/sbin/native-sites-firewall` and `/usr/local/sbin/native-sites-maintenance`, owned by root and mode 0755. Only the fixed entry points are authorized in sudoers; deployment code cannot replace them. Firewall installation is a root systemd oneshot after UFW, enabled on boot. Service users have no login shell.

`sites-admin SITE backup|health|migrate SHA|activate SHA|retain` accepts only music, chat and portfolio. Migration runs as the dedicated API account with a separate root-provided environment. Activation checks health and restores the previous runtime on failure. Retention verifies both current and previous complete releases and health before removing older SHA directories; modified source worktrees are preserved.

The portfolio static server needs AF_NETLINK to enumerate interfaces; its IPv4/IPv6 outbound connections are still denied by the per-UID firewall. All application ports bind to loopback. APIs with external integrations may use public HTTPS/mail but cannot reach private networks or another application's local port.

`native-sites-maintenance audit` checks every native service and public HTTPS endpoint. `cleanup-docker` verifies fresh compressed PostgreSQL 18 backups, refuses unknown Docker workloads or volumes, then removes only the retired Python stack and Docker packages/storage. It is deliberately separate from application deployment.

Run `python -m pytest deploy/server/test_sites_admin.py` on Linux before changing retention. No browser tests are used.
