# ATOM Core Migration Guide (jarvis -> atom)

## Migration Order (ห้ามข้าม)

### 1. Stop old service
sudo systemctl stop jarvis-core
sudo systemctl disable jarvis-core

### 2. Move application directory
sudo mv /opt/jarvis-core /opt/atom-core

### 3. Create atom system user
sudo useradd --system --create-home --shell /usr/sbin/nologin atom

### 4. Create directories
sudo mkdir -p /opt/atom-core/data
sudo mkdir -p /opt/atom-core/secrets

### 5. Fix ownership
sudo chown -R atom:atom /opt/atom-core

### 6. Remove old service
sudo rm /etc/systemd/system/jarvis-core.service

### 7. Copy new service
sudo cp /opt/atom-core/atom-core.service /etc/systemd/system/atom-core.service

### 8. Reload systemd
sudo systemctl daemon-reload

### 9. Enable and start
sudo systemctl enable atom-core
sudo systemctl restart atom-core

### 10. Verify
sudo systemctl status atom-core
# Expected: Active: active (running)

### 11. Remove old user (หลังยืนยัน ATOM ทำงาน)
sudo userdel jarvis

## Google Drive Configuration
Service Account ต้องแชร์ Folder:
- GDRIVE_BACKUP_FOLDER_ID
- ATOM_VAULT_FOLDER_ID
Permission: Editor
Credential: /opt/atom-core/secrets/gdrive_sa.json
sudo chmod 600 /opt/atom-core/secrets/gdrive_sa.json
sudo chown atom:atom /opt/atom-core/secrets/gdrive_sa.json

## Environment Rename
- Old: JARVIS_SECRET / X-Jarvis-Secret
- New: ATOM_SECRET / X-Atom-Secret

## Database
- Old: jarvis_master.db
- New: atom_master.db
- Location: /opt/atom-core/data/

## Cloudflare Tunnel
- Tunnel: jarvis-core -> atom-core
- Credential: /etc/cloudflared/atom-core.json
- Domain: assadawut-jarvis.online (คงเดิม)
