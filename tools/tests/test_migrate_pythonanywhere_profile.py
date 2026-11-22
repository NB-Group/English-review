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


def test_dry_run_preserves_review_dimensions_and_lifetime_settings(tmp_path: Path):
    source = tmp_path / "accounts"
    source.mkdir()
    fsrs = {
        "due": 1732262400123, "stability": 41.75, "difficulty": 3.1,
        "elapsed_days": 3, "scheduled_days": 41, "reps": 8, "lapses": 2, "state": 2,
    }
    (source / "student.json").write_text(json.dumps({
        "_meta": {"rev": 7, "pin": "private-hash"},
        "profile": {
            "createdAt": 1732200000123,
            "progress": {
                "w:17": {"triage": "fluent", "degraded": True, "lastSeenAt": 1732200000000, "dims": {"w2": fsrs}},
                "p:3": {"triage": "skip", "dims": {}},
            },
            "sentenceProgress": {"s00001": {"s1": fsrs}},
            "chineseProgress": {"card:one": {
                "dueAt": "2026-11-30T00:00:00Z", "updatedAt": "2026-11-22T00:00:00Z",
                "intervalDays": 41, "lapseCount": 2, "lastGrade": "good",
            }},
            "_legacy": {"settings": {"apiKey": "private-key"}},
        },
    }), encoding="utf-8")
    output = tmp_path / "snapshot.jsonl"
    result = subprocess.run([
        sys.executable, str(SCRIPT), str(source), str(output),
        "--content-version", "2026.11.22", "--now-ms", "1732200000123",
    ], check=True, capture_output=True, text=True)
    snapshot = json.loads(output.read_text(encoding="utf-8"))
    assert "private-" not in output.read_text(encoding="utf-8")
    assert snapshot["preferences"]["createdAt"] == 1732200000123
    assert snapshot["preferences"]["entryMetadata"]["p:3"]["triage"] == "skip"
    assert snapshot["preferences"]["entryMetadata"]["w:17"]["lastSeenAt"] == 1732200000000
    states = {state["cardId"]: state for state in snapshot["learningStates"]}
    word = states["card:2026.11.22:english:w:17:w2"]
    assert word["schedulerState"] == fsrs
    assert word["dueAt"] == "2024-11-22T08:00:00.123Z"
    assert word["status"] == "review"
    assert states["card:2026.11.22:english:sentence:s00001:s1"]["schedulerState"] == fsrs
    assert states["card:2026.11.22:chinese:card:one:recall"]["lastGrade"] == "good"
    assert json.loads(result.stdout)["learningStates"] == 3
    assert output.stat().st_mode & 0o777 == 0o600
