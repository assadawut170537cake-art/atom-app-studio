"""Organize loose artifacts while preserving old entry points."""
import json
from pathlib import Path
import os
from organize_project import ROOT, inventory, link

core = ROOT / "services/core"
moves = {
    "mobile-app": "apps/flutter",
    "agents": "config/personas-legacy",
    "ATOM-v1.0.apk": "releases/android/ATOM-v1.0.apk",
    "FRIDAY-v1.0.apk": "archive/releases/FRIDAY-v1.0.apk",
    "ATOM_BLUEPRINT.md": "docs/ATOM_BLUEPRINT.md",
    "MIGRATION_README.md": "docs/MIGRATION_README.md",
    "README_RUNBOOK.md": "docs/README_RUNBOOK.md",
    "REVIEW_SOURCES.txt": "docs/research/REVIEW_SOURCES.txt",
    "atom-core.service": "deployment/linux/atom-core.service",
    "setup_ingress.sh": "deployment/linux/setup_ingress.sh",
    "ollama-hybrid-config.ps1": "deployment/windows/ollama-hybrid-config.ps1",
    "tmp_test.db": "data/legacy/tmp_test.db",
}
report = ROOT / "migration/classification.json"
if report.exists():
    raise RuntimeError("Classification already attempted; inspect report first")
records = []
for name, relative in moves.items():
    source, target = core / name, ROOT / relative
    if target.exists():
        raise RuntimeError(f"Target exists: {target}")
    hashes = inventory(source)
    target.parent.mkdir(parents=True, exist_ok=True)
    source.rename(target)
    try:
        assert inventory(target) == hashes
        link(source, target)
    except Exception:
        target.rename(source)
        raise
    records.append({"source": str(source), "target": str(target), "hashes": hashes})
    report.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Verified: {relative}")

# Git metadata is locked by an external program. Keep it intact and expose it
# at the canonical working tree without copying or altering Git internals.
git_target = ROOT / "apps/kotlin/.git"
if not git_target.exists():
    link(git_target, Path("J:/ATOM_MOBILE/.git"))

workspace = {"folders": [{"path": ".", "name": "ATOM"}], "settings": {
    "files.watcherExclude": {"**/archive/**": True, "**/build/**": True,
                             "**/.gradle/**": True, "**/.dart_tool/**": True},
    "search.exclude": {"**/archive/**": True, "**/build/**": True},
}}
(ROOT / "ATOM.code-workspace").write_text(json.dumps(workspace, indent=2), encoding="utf-8")
print("Workspace created; Git metadata remains at its original locked location.")