import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "tools" / "migrate_pythonanywhere_profile.py"


def test_converter_drops_metadata_and_maps_both_tracks(tmp_path: Path):
    input_dir = tmp_path / "accounts"
    input_dir.mkdir()
    (input_dir / "student.json").write_text(json.dumps({
        "_meta": {"rev": 4, "pin": "hashed-secret"},
        "profile": {
            "name": "student",
            "goals": [],
            "progress": {
                "w:73": {"triage": "recognize", "dims": {"w1": {"due": 1732262400000, "scheduled_days": 20, "lapses": 0, "state": 2}}},
            },
            "chineseProgress": {"card:one": {"dueAt": "2026-11-23T00:00:00.000Z", "intervalDays": 1, "lapseCount": 0}},
            "dailyQuota": {"triage": 15, "spotcheck": 5, "newWords": 20},
        },
    }), encoding="utf-8")
    output = tmp_path / "snapshot.jsonl"
    subprocess.run([
        sys.executable, str(SCRIPT), str(input_dir), str(output),
        "--content-version", "2026.11.22", "--now-ms", "1732262400000",
    ], check=True, capture_output=True, text=True)
    snapshot = json.loads(output.read_text(encoding="utf-8").splitlines()[0])
    assert snapshot["username"] == "student"
    assert "pin" not in json.dumps(snapshot)
    assert {state["cardId"] for state in snapshot["learningStates"]} == {
        "card:2026.11.22:english:w:73:w1",
        "card:2026.11.22:chinese:card:one:recall",
    }
