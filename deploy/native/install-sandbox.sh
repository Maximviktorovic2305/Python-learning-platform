#!/usr/bin/env bash
set -Eeuo pipefail
test "$EUID" = 0
readonly HERE="$(dirname "$(readlink -f "$0")")"
readonly BROKER="${SANDBOX_BROKER_USER:-python-runner}"
[[ "$BROKER" =~ ^[a-z_][a-z0-9_-]*$ ]] || exit 1
export DEBIAN_FRONTEND=noninteractive NEEDRESTART_MODE=l
apt-get update -qq
apt-get install -y --no-install-recommends ca-certificates curl autoconf bison flex gcc g++ git libprotobuf-dev libnl-route-3-dev libtool make pkg-config protobuf-compiler libcap-dev
work="$(mktemp -d)"
trap 'rm -rf -- "$work"' EXIT
curl -fsSL https://github.com/astral-sh/uv/releases/download/0.13.5/uv-x86_64-unknown-linux-gnu.tar.gz -o "$work/uv.tar.gz"
echo 'f68d291c75783122dad58ab77def0e13f3233f358731db5d6d7e8715603b928f  '"$work/uv.tar.gz" | sha256sum -c -
tar -xzf "$work/uv.tar.gz" -C "$work"
install -m 755 "$work/uv-x86_64-unknown-linux-gnu/uv" /usr/local/bin/uv
export UV_PYTHON_INSTALL_DIR=/opt/python-platform/python
uv python install 3.14.9
runtime="$(uv python find --managed-python 3.14.9)"
ln -sfn "$(basename "$(dirname "$(dirname "$runtime")")")" /opt/python-platform/python/runtime
if [ ! -x /opt/python-platform/sandbox-env/bin/python ]; then
  uv venv --python "$runtime" /opt/python-platform/sandbox-env
fi
uv pip install --no-cache --compile-bytecode --python /opt/python-platform/sandbox-env/bin/python SQLAlchemy==2.1.4 pytest==9.1.1
chmod -R a+rX /opt/python-platform/python /opt/python-platform/sandbox-env
git clone --no-checkout https://github.com/google/nsjail.git "$work/nsjail"
git -C "$work/nsjail" checkout --detach 4ff54a6e0d5b65a0e1633d6e2fd1425ba6c882ce
git -C "$work/nsjail" submodule update --init --recursive
# Linux UAPI constant absent in Ubuntu 22.04 headers; matches linux/prctl.h.
compat=""
if ! printf '#include <sys/prctl.h>\nint value = PR_SCHED_CORE_SCOPE_THREAD_GROUP;\n' | gcc -x c -c -o /dev/null - 2>/dev/null; then
  compat=-DPR_SCHED_CORE_SCOPE_THREAD_GROUP=1
fi
make -C "$work/nsjail" -j2 USER_DEFINES="$compat"
install -m 755 "$work/nsjail/nsjail" /usr/local/bin/nsjail
id "$BROKER" >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin "$BROKER"
install -d -m 755 /etc/python-platform
install -m 644 "$HERE/python-jail.cfg" /etc/python-platform/python-jail.cfg
install -m 755 "$HERE/jail-helper.py" /usr/local/sbin/python-lab-jail
printf 'Defaults:%s env_reset, !setenv, timestamp_timeout=0\n%s ALL=(root) NOPASSWD: /usr/local/sbin/python-lab-jail\n' "$BROKER" "$BROKER" > /etc/sudoers.d/python-lab-sandbox
chmod 440 /etc/sudoers.d/python-lab-sandbox
visudo -cf /etc/sudoers.d/python-lab-sandbox
apt-get clean
