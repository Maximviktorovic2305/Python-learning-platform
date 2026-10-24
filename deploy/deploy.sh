#!/usr/bin/env bash
set -Eeuo pipefail
umask 022

readonly APP_DIR=/home/max/python-platform
readonly REPOSITORY="$APP_DIR/repository"
readonly REVISION="${DEPLOY_SHA:?Set DEPLOY_SHA to the commit to deploy}"
[[ "$REVISION" =~ ^[0-9a-f]{40}$ ]] || { echo 'Invalid commit'; exit 1; }
test -f /etc/python-platform/api.env
test -f /etc/python-platform/native-ready
test -L "$APP_DIR/current-runtime"
mkdir -p "$APP_DIR/releases" "$APP_DIR/runtime" "$APP_DIR/backups"
exec 9>"$APP_DIR/deploy.lock"
flock -w 900 9

if [ ! -d "$REPOSITORY/.git" ]; then
  git clone --no-checkout https://github.com/Maximviktorovic2305/Python-learning-platform.git "$REPOSITORY"
fi
git -C "$REPOSITORY" fetch --no-tags origin "$REVISION"
readonly RELEASE="$APP_DIR/releases/$REVISION"
if [ ! -d "$RELEASE" ]; then
  git -C "$REPOSITORY" worktree add --detach "$RELEASE" "$REVISION"
fi
sudo -n /usr/local/sbin/python-platform-admin backup
bash "$RELEASE/deploy/build-native.sh"
sudo -n /usr/local/sbin/python-platform-admin migrate "$REVISION"
# The root-owned helper checks health and restores old links/services on failure.
sudo -n /usr/local/sbin/python-platform-admin activate "$REVISION"
echo "Deployed native release $REVISION"
# Still under deploy.lock. A maintenance error must not roll back a healthy site.
if ! /opt/python-platform/python/runtime/bin/python3.14 "$RELEASE/deploy/maintain.py" --apply; then
  echo 'Deployment is healthy; retention maintenance needs attention.' >&2
fi
