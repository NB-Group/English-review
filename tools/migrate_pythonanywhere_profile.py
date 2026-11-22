#!/usr/bin/env python3
"""Convert PythonAnywhere profile JSON files into unified card-state snapshots.

The converter never copies account metadata or PIN hashes into its output.
It is intended for a dry-run before a Supabase import.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def card_id(content_version: str, subject: str, key: str, skill: str) -> str:
    return f"card:{content_version}:{subject}:{key}:{skill}"


def iso_from_ms(value: Any) -> str:
    return datetime.fromtimestamp(float(value) / 1000, tz=timezone.utc).isoformat().replace("+00:00", "Z")


def state_from_fsrs(content_version: str, key: str, skill: str, state: dict[str, Any], now_ms: int) -> dict[str, Any]:
    state_number = int(state.get("state", 0))
    scheduled_days = int(state.get("scheduled_days", 0))
    due_ms = float(state.get("due", now_ms))
    status = "mastered" if state_number == 2 and scheduled_days > 40 and due_ms > now_ms else "review" if state_number == 2 else "learning"
    return {
        "cardId": card_id(content_version, "english", key, skill),
        "status": status,
        "dueAt": iso_from_ms(due_ms),
        "intervalDays": scheduled_days,
        "lapseCount": int(state.get("lapses", 0)),
        "updatedAt": datetime.fromtimestamp(now_ms / 1000, tz=timezone.utc).isoformat().replace("+00:00", "Z"),
    }


def state_from_chinese(content_version: str, key: str, state: dict[str, Any]) -> dict[str, Any]:
    interval_days = int(state.get("intervalDays", 0))
    return {
        "cardId": card_id(content_version, "chinese", key, "recall"),
        "status": "mastered" if interval_days >= 30 else "review" if interval_days > 0 else "learning",
        "dueAt": str(state["dueAt"]),
        "intervalDays": interval_days,
        "lapseCount": int(state.get("lapseCount", 0)),
        "updatedAt": str(state.get("updatedAt", state["dueAt"])),
    }


def convert_profile(username: str, raw: dict[str, Any], content_version: str, now_ms: int) -> dict[str, Any]:
    profile = raw.get("profile") if isinstance(raw.get("profile"), dict) else raw
    states: list[dict[str, Any]] = []
    for entry_key, entry in (profile.get("progress", {}) or {}).items():
        if entry.get("triage") == "skip":
            continue
        for skill, state in (entry.get("dims", {}) or {}).items():
            if isinstance(state, dict) and skill in {"w1", "w2", "s1", "s2"}:
                states.append(state_from_fsrs(content_version, entry_key, skill, state, now_ms))
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
    now_ms = args.now_ms or int(datetime.now(tz=timezone.utc).timestamp() * 1000)
    snapshots = convert_directory(args.input_dir, args.content_version, now_ms)
    args.output.write_text("\n".join(json.dumps(item, ensure_ascii=False) for item in snapshots) + ("\n" if snapshots else ""), encoding="utf-8")
    print(json.dumps({"users": len(snapshots), "learningStates": sum(len(item["learningStates"]) for item in snapshots)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
