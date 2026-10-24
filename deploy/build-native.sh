#!/usr/bin/env bash
set -Eeuo pipefail
umask 022
readonly APP=/home/max/python-platform
readonly REVISION="${DEPLOY_SHA:?Set DEPLOY_SHA}"
[[ "$REVISION" =~ ^[0-9a-f]{40}$ ]] || exit 1
readonly RELEASE="$APP/releases/$REVISION"
readonly RUNTIME="$APP/runtime/$REVISION"
test -f "$RELEASE/frontend/package-lock.json"
test "$(readlink -f "$RELEASE")" = "$RELEASE"
test ! -L "$RUNTIME"
mkdir -p "$RUNTIME"
export PATH="$APP/node/bin:/usr/local/bin:/usr/bin:/bin"
if [ -f "$RUNTIME/ready" ]; then echo "Native runtime already built: $REVISION"; exit 0; fi
if [ ! -x "$RUNTIME/api/bin/python" ]; then
  uv venv --python /opt/python-platform/python/runtime/bin/python3.14 "$RUNTIME/api"
fi
uv pip install --no-cache --compile-bytecode --python "$RUNTIME/api/bin/python" -r "$RELEASE/backend/requirements.lock"
mkdir -p "$RUNTIME/runner"
cp "$RELEASE/runner/main.py" "$RUNTIME/runner/main.py"
previous="$(readlink -f "$APP/current" || true)"
previous_runtime="$(readlink -f "$APP/current-runtime" || true)"
rm -rf -- "$RUNTIME/web"
if [ -n "$previous" ] && [ -f "$previous_runtime/web/server.js" ] && \
   [ "$(git -C "$RELEASE" rev-parse HEAD:frontend)" = "$(git -C "$previous" rev-parse HEAD:frontend)" ]; then
  cp -a "$previous_runtime/web" "$RUNTIME/web"
else
  cd "$RELEASE/frontend"
  API_URL=http://127.0.0.1:8011 WEB_ORIGIN=https://python-learning.tech \
    NEXT_PUBLIC_YANDEX_METRIKA_ID=113659993 npm ci --cache "$APP/build-cache/npm" --no-audit --no-fund
  API_URL=http://127.0.0.1:8011 WEB_ORIGIN=https://python-learning.tech \
    NEXT_PUBLIC_YANDEX_METRIKA_ID=113659993 NEXT_TELEMETRY_DISABLED=1 npm run build
  mkdir -p "$RUNTIME/web/.next"
  cp -a .next/standalone/. "$RUNTIME/web/"
  cp -a .next/static "$RUNTIME/web/.next/static"
  cp -a public "$RUNTIME/web/public"
  # Only regenerable files inside this verified immutable release are removed.
  rm -rf -- "$RELEASE/frontend/node_modules" "$RELEASE/frontend/.next" "$RELEASE/frontend/public/python-runtime"
fi
mkdir -p "$RUNTIME/web/.next"
rm -rf -- "$RUNTIME/web/.next/cache"
ln -s /var/cache/python-platform-web "$RUNTIME/web/.next/cache"
if find "$RELEASE" "$RUNTIME" -type f -name '.env*' ! -name '.env.example' -print -quit | grep -q .; then
  echo 'Private environment files must stay outside release/runtime directories.' >&2
  exit 1
fi
chmod -R a+rX "$RUNTIME" "$RELEASE"
touch "$RUNTIME/ready"
echo "Native runtime ready: $REVISION"
