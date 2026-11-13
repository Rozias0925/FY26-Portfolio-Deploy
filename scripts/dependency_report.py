"""Record installed package provenance; metadata is not legal clearance."""
import importlib.metadata
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if __name__ == "__main__":
    rows = []
    for distribution in sorted(importlib.metadata.distributions(), key=lambda d: d.metadata["Name"].lower()):
        metadata = distribution.metadata
        if metadata["Name"].lower() in {"pip", "setuptools", "wheel"}:
            continue
        licenses = [str(p) for p in (distribution.files or [])
                    if any(word in p.name.lower() for word in ("license", "copying", "notice"))]
        rows.append({"name": metadata["Name"], "version": distribution.version,
                     "license_expression": metadata.get("License-Expression"),
                     "license_metadata": metadata.get("License", "")[:600],
                     "classifiers": [c for c in metadata.get_all("Classifier", []) if c.startswith("License")],
                     "project_urls": metadata.get_all("Project-URL", []),
                     "installed_license_files": licenses, "review_status": "PENDING REVIEW"})
    destination = ROOT / "docs" / "evidence" / "dependency-licenses.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Recorded {len(rows)} installed distributions; publication licensing still PENDING REVIEW.")
