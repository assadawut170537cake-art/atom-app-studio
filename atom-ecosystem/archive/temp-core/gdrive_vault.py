import os
import json
from datetime import datetime

from database import backup_db_to_snapshot


GDRIVE_BACKUP_FOLDER_ID = os.getenv("GDRIVE_BACKUP_FOLDER_ID", "")
ATOM_VAULT_FOLDER_ID = os.getenv("ATOM_VAULT_FOLDER_ID", "")
GDRIVE_SA_PATH = os.getenv("GDRIVE_SA_PATH", "/opt/atom-core/secrets/gdrive_sa.json")


def get_drive_session():
    from google.oauth2 import service_account
    from google.auth.transport.requests import AuthorizedSession

    if not os.path.exists(GDRIVE_SA_PATH):
        raise RuntimeError("Google Service Account file not found")

    credentials = service_account.Credentials.from_service_account_file(
        GDRIVE_SA_PATH,
        scopes=["https://www.googleapis.com/auth/drive"]
    )
    return AuthorizedSession(credentials)


def upload_file_to_drive(file_path, folder_id):
    session = get_drive_session()
    filename = os.path.basename(file_path)
    metadata = {"name": filename, "parents": [folder_id]}

    with open(file_path, "rb") as file:
        response = session.post(
            "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
            files={
                "data": ("metadata", json.dumps(metadata), "application/json"),
                "file": (filename, file, "application/octet-stream")
            }
        )
    response.raise_for_status()
    return response.json()


def backup_db_to_gdrive():
    snapshot_path = "/tmp/atom_master_" + datetime.now().strftime("%Y%m%d_%H%M%S") + ".db"
    try:
        backup_db_to_snapshot(snapshot_path)
        return upload_file_to_drive(snapshot_path, GDRIVE_BACKUP_FOLDER_ID)
    finally:
        if os.path.exists(snapshot_path):
            os.remove(snapshot_path)


def cleanup_old_snapshots():
    session = get_drive_session()
    query = f"'{GDRIVE_BACKUP_FOLDER_ID}' in parents and trashed=false"
    response = session.get(
        "https://www.googleapis.com/drive/v3/files",
        params={"q": query, "fields": "files(id,name,createdTime)", "orderBy": "createdTime desc"}
    )
    response.raise_for_status()
    files = response.json().get("files", [])
    for item in files[7:]:
        delete_response = session.patch(
            f"https://www.googleapis.com/drive/v3/files/{item['id']}",
            json={"trashed": True}
        )
        delete_response.raise_for_status()


def query_atom_vault(q, limit=5):
    session = get_drive_session()
    safe = q.replace("'", "\\'")
    query = f"'{ATOM_VAULT_FOLDER_ID}' in parents and name contains '{safe}' and trashed=false"
    response = session.get(
        "https://www.googleapis.com/drive/v3/files",
        params={"q": query, "fields": "files(id,name,mimeType,webViewLink)"}
    )
    response.raise_for_status()
    files = response.json().get("files", [])
    return files[:limit]


def export_google_doc_text(file_id):
    session = get_drive_session()
    response = session.get(
        f"https://www.googleapis.com/drive/v3/files/{file_id}/export",
        params={"mimeType": "text/plain"}
    )
    response.raise_for_status()
    return response.text
