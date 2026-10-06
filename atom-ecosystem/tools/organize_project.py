"""One-time, same-drive relocation with SHA-256 verification and compatibility links."""
import hashlib
import json
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
LOG = ROOT / "migration"
OLD_CORE = Path("J:/อะตอม")
MOVES = [
    (Path("J:/ATOM_MOBILE"), ROOT / "apps/kotlin"),
    (Path("J:/ATOM_PC_WORKER"), ROOT / "workers/pc"),
    (Path("J:/ATOM_SYSTEM"), ROOT / "archive/system-bundle"),
    (Path("J:/ATOM_FRIDAY_MOBILE"), ROOT / "archive/friday-mobile"),
    (Path("J:/ATOM_ULTRON_MOBILE"), ROOT / "archive/ultron-mobile"),
    (Path("J:/Temp/atomcore"), ROOT / "archive/temp-core"),
    (Path("J:/Temp/atomcore_b64.txt"), ROOT / "archive/transfer/atomcore_b64.txt"),
    (Path("J:/Temp/atomcore_err.txt"), ROOT / "archive/transfer/atomcore_err.txt"),
    (Path("J:/typesafe/atom_gateway.py"), ROOT / "integrations/hermes/atom_gateway.py"),
    (OLD_CORE, ROOT / "services/core"),
]


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def inventory(path):
    if path.is_file():
        return {".": digest(path)}
    result = {}
    for base, dirs, files in os.walk(path):
        for name in dirs[:]:
            item = Path(base) / name
            if item.is_symlink() or os.path.isjunction(item):
                if not item.exists():
                    raise RuntimeError(f"Broken link before migration: {item}")
                result[str(item.relative_to(path))] = "LINK:" + os.readlink(item)
                dirs.remove(name)
        for name in files:
            item = Path(base) / name
            if item.is_symlink():
                raise RuntimeError(f"Review existing file link: {item}")
            result[str(item.relative_to(path))] = digest(item)
    return result


def link(source, target):
    if target.is_dir():
        subprocess.run(["cmd", "/c", "mklink", "/J", str(source), str(target)],
                       check=True, capture_output=True)
    else:
        os.link(target, source)


def move_contents(source, target, record, save):
    """Retain an open root directory as a compatibility shell, not a copy."""
    target.mkdir(parents=True, exist_ok=True)
    children = record.setdefault("children", {})
    for item in list(source.iterdir()):
        if children.get(item.name) == "verified":
            continue
        destination = target / item.name
        if destination.exists():
            raise RuntimeError(f"Destination already exists: {destination}")
        before = inventory(item)
        try:
            item.rename(destination)
        except PermissionError:
            children[item.name] = "locked"
            save()
            continue
        try:
            if inventory(destination) != before:
                raise RuntimeError(f"Content mismatch: {destination}")
            link(item, destination)
        except Exception:
            destination.rename(item)
            raise
        children[item.name] = "verified"
        save()
    record["status"] = ("verified_with_compatibility_shell"
                        if all(value == "verified" for value in children.values())
                        else "partially_moved_open_handles")
    save()
    print(f"Compatibility shell: {source.name}: {record['status']}", flush=True)


def main():
    LOG.mkdir(parents=True, exist_ok=True)
    manifest_path = LOG / "manifest.json"
    records = []
    if manifest_path.exists():
        records = json.loads(manifest_path.read_text(encoding="utf-8"))
    else:
        for source, target in MOVES:
            if not source.exists() or target.exists() or os.path.isjunction(source):
                raise RuntimeError(f"Invalid migration source/destination: {source} -> {target}")
            records.append({"source": str(source), "target": str(target),
                            "hashes": inventory(source), "status": "planned"})
    def save():
        manifest_path.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    save()
    for record in records:
        if record["status"] in {"verified_with_compatibility_link", "verified_with_compatibility_shell"}:
            continue
        source, target = Path(record["source"]), Path(record["target"])
        if record["status"] == "partially_moved_open_handles":
            move_contents(source, target, record, save)
            continue
        if inventory(source) != record["hashes"]:
            raise RuntimeError(f"Source changed since inventory: {source}")
        target.parent.mkdir(parents=True, exist_ok=True)
        try:
            source.rename(target)
        except PermissionError:
            record["status"] = "blocked_by_open_handle"
            save()
            move_contents(source, target, record, save)
            continue
        record["status"] = "moved"
        save()
        try:
            if inventory(target) != record["hashes"]:
                raise RuntimeError(f"Content mismatch: {target}")
            link(source, target)
        except Exception:
            target.rename(source)
            record["status"] = "rolled_back"
            save()
            raise
        record["status"] = "verified_with_compatibility_link"
        save()
        print(f"Verified {len(record['hashes'])} files: {target.name}", flush=True)


if __name__ == "__main__":
    main()