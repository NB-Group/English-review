#!/usr/bin/env python3
"""Convert PythonAnywhere profile JSON files into unified card-state snapshots.

The converter never copies account metadata or PIN hashes into its output.
It is intended for a dry-run before a Supabase import.
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ENGLISH_SKILLS = ("w1", "w2", "s1", "s2")
FSRS_FIELDS = ("due", "stability", "difficulty", "elapsed_days", "scheduled_days", "reps", "lapses", "state")
ENTRY_FIELDS = ("triage", "degraded", "lastSeenAt")


def card_id(content_version: str, subject: str, key: str, skill: str) -> str:
    return f"card:{content_version}:{subject}:{key}:{skill}"


def iso_from_ms(value: Any) -> str:
    return datetime.fromtimestamp(float(value) / 1000, tz=timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def state_from_fsrs(content_version: str, key: str, skill: str, state: dict[str, Any], now_ms: int) -> dict[str, Any]:
    state_number = int(state.get("state", 0))
    scheduled_days = int(state.get("scheduled_days", 0))
    status = {0: "new", 2: "review"}.get(state_number, "learning")
    return {
        "cardId": card_id(content_version, "english", key, skill),
        "status": status,
        "dueAt": iso_from_ms(state["due"]),
        "intervalDays": scheduled_days,
        "lapseCount": int(state.get("lapses", 0)),
        "updatedAt": iso_from_ms(now_ms),
        "schedulerState": {field: state[field] for field in FSRS_FIELDS if field in state},
    }


def state_from_chinese(content_version: str, key: str, state: dict[str, Any]) -> dict[str, Any]:
    interval_days = int(state.get("intervalDays", 0))
    return {
        "cardId": card_id(content_version, "chinese", key, "recall"),
        "status": "review" if interval_days > 0 else "learning",
        "dueAt": str(state["dueAt"]),
        "intervalDays": interval_days,
        "lapseCount": int(state.get("lapseCount", 0)),
        "updatedAt": str(state.get("updatedAt", state["dueAt"])),
        **({"lastGrade": state["lastGrade"]} if state.get("lastGrade") in {"again", "hard", "good", "easy"} else {}),
    }


def convert_profile(username: str, raw: dict[str, Any], content_version: str, now_ms: int) -> dict[str, Any]:
    profile = raw.get("profile") if isinstance(raw.get("profile"), dict) else raw
    states: list[dict[str, Any]] = []
    entry_metadata = {}
    for entry_key, entry in (profile.get("progress", {}) or {}).items():
        entry_metadata[entry_key] = {field: entry[field] for field in ENTRY_FIELDS if field in entry}
        for skill in ENGLISH_SKILLS:
            state = (entry.get("dims", {}) or {}).get(skill)
            if state is not None:
                states.append(state_from_fsrs(content_version, entry_key, skill, state, now_ms))
    for sentence_key, dimensions in (profile.get("sentenceProgress", {}) or {}).items():
        for skill in ENGLISH_SKILLS:
            state = dimensions.get(skill)
            if state is not None:
                states.append(state_from_fsrs(content_version, f"sentence:{sentence_key}", skill, state, now_ms))
    for key, state in (profile.get("chineseProgress", {}) or {}).items():
        if isinstance(state, dict) and state.get("dueAt"):
            states.append(state_from_chinese(content_version, key, state))
    return {
        "username": username,
        "source": "pythonanywhere-profile",
        "contentVersion": content_version,
        "preferences": {
            "name": str(profile.get("name", username)),
            "goals": profile.get("goals", []),
            "dailyQuota": profile.get("dailyQuota", {"triage": 15, "spotcheck": 5, "newWords": 20}),
            "entryMetadata": entry_metadata,
            **({"createdAt": profile["createdAt"]} if "createdAt" in profile else {}),
        },
        "learningStates": states,
    }


def convert_directory(input_dir: Path, content_version: str, now_ms: int) -> list[dict[str, Any]]:
    snapshots = []
    for path in sorted(input_dir.glob("*.json")):
        raw = json.loads(path.read_text(encoding="utf-8"))
        snapshots.append(convert_profile(path.stem, raw, content_version, now_ms))
    return snapshots


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input_dir", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--content-version", required=True)
    parser.add_argument("--now-ms", type=int, default=None)
    args = parser.parse_args()
    if not args.input_dir.is_dir():
        parser.error("input_dir must be a directory containing exported profiles")
    now_ms = args.now_ms if args.now_ms is not None else int(datetime.now(tz=timezone.utc).timestamp() * 1000)
    snapshots = convert_directory(args.input_dir, args.content_version, now_ms)
    with open_private_output(args.output) as file:
        for snapshot in snapshots:
            file.write(json.dumps(snapshot, ensure_ascii=False) + "\n")
    print(json.dumps({"users": len(snapshots), "learningStates": sum(len(item["learningStates"]) for item in snapshots)}, ensure_ascii=False))

def open_private_output(path: Path):
    return os.fdopen(os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), "w", encoding="utf-8")


if __name__ == "__main__":
    main()
