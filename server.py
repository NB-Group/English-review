#!/usr/bin/env python3
import json
import os
import socketserver
import sys
import urllib.parse
from http.server import SimpleHTTPRequestHandler
from pathlib import Path

PORT = 8080
ROOT_DIR = Path(__file__).resolve().parent
DATA_DIR = ROOT_DIR / "data"
ACCOUNT_DIR = ROOT_DIR / "local_accounts"

GRADE_MAP = {
    "七年级": "7",
    "八年级": "8",
    "九年级": "9",
}

SEMESTER_MAP = {
    "上册": "Up",
    "下册": "Down",
    "Up": "Up",
    "Down": "Down",
}


def scan_units():
    units = {}
    if not DATA_DIR.exists():
        return units

    for grade_dir in DATA_DIR.iterdir():
        if not grade_dir.is_dir():
            continue
        grade_num = GRADE_MAP.get(grade_dir.name)
        if not grade_num:
            continue
        units[grade_num] = {}
        for semester_dir in grade_dir.iterdir():
            if not semester_dir.is_dir():
                continue
            semester_code = SEMESTER_MAP.get(semester_dir.name)
            if not semester_code:
                continue
            unit_list = sorted(path.stem for path in semester_dir.glob("*.js"))
            units[grade_num][semester_code] = unit_list
    return units


def safe_account_name(raw_name: str) -> str:
    cleaned = "".join(ch for ch in raw_name if ch.isalnum() or ch in ("-", "_"))
    return cleaned[:64] or "default"


def account_file(user: str) -> Path:
    ACCOUNT_DIR.mkdir(parents=True, exist_ok=True)
    return ACCOUNT_DIR / f"{safe_account_name(user)}.json"


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/scan-units":
            return self.handle_scan_units()
        if parsed.path == "/api/account-data":
            return self.handle_account_load(parsed)
        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/account-data":
            return self.handle_account_save(parsed)
        self.send_error(404, "Unknown API")

    def read_json_body(self):
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length) if length else b"{}"
        return json.loads(body.decode("utf-8"))

    def write_json(self, payload, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(payload, ensure_ascii=False).encode("utf-8"))

    def handle_scan_units(self):
        try:
            self.write_json(scan_units())
        except Exception as exc:
            self.write_json({"error": str(exc)}, status=500)

    def handle_account_load(self, parsed):
        query = urllib.parse.parse_qs(parsed.query)
        user = query.get("user", ["default"])[0]
        path = account_file(user)
        if not path.exists():
            return self.write_json({"user": safe_account_name(user), "data": {}})
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            self.write_json({"user": safe_account_name(user), "data": data})
        except Exception as exc:
            self.write_json({"error": str(exc)}, status=500)

    def handle_account_save(self, parsed):
        query = urllib.parse.parse_qs(parsed.query)
        user = query.get("user", ["default"])[0]
        try:
            payload = self.read_json_body()
            path = account_file(user)
            path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
            self.write_json({"ok": True, "user": safe_account_name(user)})
        except Exception as exc:
            self.write_json({"error": str(exc)}, status=500)


class ThreadingTCPServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True
    daemon_threads = True


def start_server():
    os.chdir(ROOT_DIR)
    with ThreadingTCPServer(("", PORT), Handler) as httpd:
        print(f"Server running at http://127.0.0.1:{PORT}")
        httpd.serve_forever()


if __name__ == "__main__":
    for port in range(8080, 8090):
        try:
            with ThreadingTCPServer(("", port), Handler):
                PORT = port
                break
        except OSError:
            continue
    start_server()
