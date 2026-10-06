#!/bin/bash
set -e

OLD_DIR="/opt/jarvis-core"
NEW_DIR="/opt/atom-core"
OLD_SERVICE="jarvis-core.service"
NEW_SERVICE="atom-core.service"

echo "=== ATOM Migration Start ==="

echo " Stop old jarvis service"
if systemctl list-unit-files | grep -q "$OLD_SERVICE"; then
    systemctl stop jarvis-core || true
    systemctl disable jarvis-core || true
fi

echo " Move application directory"
if [ -d "$OLD_DIR" ] && [ ! -d "$NEW_DIR" ]; then
    mv "$OLD_DIR" "$NEW_DIR"
fi

echo " Create atom system user"
if ! id atom >/dev/null 2>&1; then
    useradd --system --create-home --shell /usr/sbin/nologin atom
fi

echo " Create directories"
mkdir -p "$NEW_DIR/data"
mkdir -p "$NEW_DIR/secrets"

echo " Ownership"
chown -R atom:atom "$NEW_DIR"
if [ -f "$NEW_DIR/secrets/gdrive_sa.json" ]; then
    chmod 600 "$NEW_DIR/secrets/gdrive_sa.json"
    chown atom:atom "$NEW_DIR/secrets/gdrive_sa.json"
fi

echo " Setup Python venv"
if [ ! -d "$NEW_DIR/venv" ]; then
    python3 -m venv "$NEW_DIR/venv"
fi

echo " Install packages"
"$NEW_DIR/venv/bin/pip" install --no-cache-dir -r "$NEW_DIR/requirements.txt"

echo " Remove old systemd service"
if [ -f "/etc/systemd/system/$OLD_SERVICE" ]; then
    rm "/etc/systemd/system/$OLD_SERVICE"
fi

echo " Install new systemd service"
cp "$NEW_DIR/atom-core.service" "/etc/systemd/system/atom-core.service"

echo " Reload systemd"
systemctl daemon-reload

echo " Enable and restart ATOM"
systemctl enable atom-core
systemctl restart atom-core

echo "=== ATOM Core Migration Completed ==="
systemctl status atom-core --no-pager
