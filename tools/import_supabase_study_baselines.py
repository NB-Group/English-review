#!/usr/bin/env python3
"""Verify or import PythonAnywhere snapshots under explicitly matched Supabase accounts."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
from uuid import UUID


def prepare_import(snapshots_path: Path, mapping_path: Path) -> list[dict]:
    snapshots = [json.loads(line) for line in snapshots_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    mapping = json.loads(mapping_path.read_text(encoding="utf-8"))
    usernames = {snapshot["username"] for snapshot in snapshots}
    if not snapshots or len(usernames) != len(snapshots):
        raise ValueError("Snapshot must contain at least one account and no duplicate usernames")
    if not isinstance(mapping, dict) or mapping.keys() != usernames:
        raise ValueError("Mapping must identify one Supabase account for every snapshot")
    user_ids = {username: str(UUID(mapping[username])) for username in usernames}
    if len(set(user_ids.values())) != len(user_ids):
        raise ValueError("Multiple source accounts map to the same Supabase account")

    return [{
        "target_user": user_ids[snapshot["username"]],
        "source_preferences": snapshot["preferences"],
        "source_states": snapshot["learningStates"],
    } for snapshot in snapshots]


class RejectRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def send_snapshot(endpoint: str, key: str, snapshot: dict, *, verify_only: bool) -> dict:
    request = Request(
        endpoint,
        data=json.dumps({**snapshot, "verify_only": verify_only}).encode("utf-8"),
        headers={"apikey": key, "Content-Type": "application/json"},
        method="POST",
    )
    if key.startswith("eyJ"):
        request.add_header("Authorization", f"Bearer {key}")
    try:
        with build_opener(RejectRedirects()).open(request, timeout=20) as response:
            report = json.load(response)
    except HTTPError as exc:
        raise RuntimeError(f"Supabase rejected the snapshot (HTTP {exc.code})") from None

    expected = len(snapshot["source_states"])
    if report["expected"] != expected or report["matched"] + report["missing"] != expected:
        raise RuntimeError("Supabase reported a different card count")
    if not verify_only and report["missing"] != 0:
        raise RuntimeError("Supabase import is missing learning states")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("snapshots", type=Path)
    parser.add_argument("account_mapping", type=Path, help="JSON object from legacy username to verified Supabase user UUID")
    parser.add_argument("--apply", action="store_true", help="Import after successful verification of every account")
    args = parser.parse_args()

    project_url = os.environ.get("STUDY_SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("STUDY_SUPABASE_SERVER_KEY", "")
    parsed = urlsplit(project_url)
    if parsed.scheme != "https" or not parsed.hostname or not parsed.hostname.endswith(".supabase.co") or (
        parsed.username or parsed.port or parsed.path or parsed.query or parsed.fragment
    ):
        parser.error("STUDY_SUPABASE_URL must be the HTTPS Supabase project origin")
    if not key.startswith(("sb_secret_", "eyJ")):
        parser.error("STUDY_SUPABASE_SERVER_KEY must contain an authorized server key")

    try:
        batch = prepare_import(args.snapshots, args.account_mapping)
    except (OSError, ValueError, KeyError, TypeError):
        parser.exit(1, "Invalid snapshots or account mapping. Check that source names and target IDs are unique.\n")

    endpoint = project_url + "/rest/v1/rpc/import_study_baseline"
    passes = [True, False] if args.apply else [True]
    for verify_only in passes:
        reports = []
        for index, account in enumerate(batch, start=1):
            try:
                reports.append(send_snapshot(endpoint, key, account, verify_only=verify_only))
            except (OSError, ValueError, KeyError, RuntimeError) as exc:
                detail = str(exc) if isinstance(exc, RuntimeError) else "Connection or response error"
                parser.exit(1, f"Account {index} of {len(batch)}: {detail}\n")
        print(json.dumps({
            "phase": "verify" if verify_only else "import",
            "accounts": len(reports),
            **{field: sum(report[field] for report in reports) for field in ("expected", "matched", "missing")},
        }))


if __name__ == "__main__":
    main()
