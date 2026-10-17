#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

readonly APP_DIR=/home/max/python-platform
readonly ENV_FILE=/home/max/.config/python-platform/production.env
readonly REPOSITORY="$APP_DIR/repository"
readonly REVISION="${DEPLOY_SHA:?Set DEPLOY_SHA to the commit to deploy}"
[[ "$REVISION" =~ ^[0-9a-f]{40}$ ]] || { echo 'Invalid commit'; exit 1; }
test -f "$ENV_FILE"
test "$(stat -c %a "$ENV_FILE")" = 600
mkdir -p "$APP_DIR/releases" "$APP_DIR/backups"
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
readonly PREVIOUS="$(readlink -f "$APP_DIR/current" || true)"
export RELEASE_ID="$REVISION"
compose() {
  docker compose --project-name python-lab --env-file "$ENV_FILE" \
    -f "$RELEASE/compose.yaml" -f "$RELEASE/compose.production.yaml" --profile sandbox "$@"
}

rollback() {
  local status=$?
  trap - ERR
  if [ -n "$PREVIOUS" ] && [ -f "$PREVIOUS/compose.production.yaml" ]; then
    echo 'Deployment failed; restoring the previous application images.' >&2
    RELEASE_ID="$(basename "$PREVIOUS")" docker compose --project-name python-lab --env-file "$ENV_FILE" \
      -f "$PREVIOUS/compose.yaml" -f "$PREVIOUS/compose.production.yaml" --profile sandbox \
      up -d --no-build --no-deps backend frontend runner || true
  fi
  exit "$status"
}
trap rollback ERR

if compose ps --status running --services | grep -qx postgres; then
  compose exec -T postgres pg_dump -U python -d python_lab \
    > "$APP_DIR/backups/database-$(date -u +%Y%m%dT%H%M%SZ).sql"
fi
compose config --quiet
compose build --pull
compose up -d --wait --wait-timeout 600 backend frontend runner
for attempt in $(seq 1 30); do
  if curl --fail --silent --show-error --max-time 10 http://127.0.0.1:3010/api/health >/dev/null; then
    break
  fi
  if [ "$attempt" = 30 ]; then echo 'API health check failed' >&2; false; fi
  sleep 2
done
curl --fail --silent --show-error --retry 15 --retry-all-errors --retry-delay 2 \
  --max-time 20 http://127.0.0.1:3010/ >/dev/null
compose exec -T sandbox-daemon docker -H tcp://localhost:2375 run --rm --network none python-lab-sandbox:2026-10 \
  python -I -c 'import sqlalchemy, pytest; print("sandbox ready")'
ln -sfn "$RELEASE" "$APP_DIR/current"
trap - ERR
compose ps
echo "Deployed $REVISION"
