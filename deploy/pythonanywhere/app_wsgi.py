#!/usr/bin/env python3
"""PythonAnywhere 部署入口（WSGI，纯标准库零依赖）

目录结构（上传 zip 解压到 PA 家目录 english-review/ 后，Web 指向本文件的上一级）：
  english-review/app_wsgi.py      ← 本文件
  english-review/web/dist/        ← 前端构建产物
  english-review/data/kaogang/    ← 数据集

PA 配置：Web → Add new web app → Manual configuration → Python 3.10+
        WSGI 文件指到 english-review/app_wsgi.py（本文件路径）
        静态文件映射：不用配（全部走 WSGI）
"""
import hashlib
import json
import os
import tempfile
import time
from pathlib import Path

BASE = Path(__file__).resolve().parent
V2_DIR = BASE / "web" / "dist"
DATA_DIR = BASE / "data"
ACCOUNT_DIR = BASE / "local_accounts"
ACCOUNT_DIR.mkdir(parents=True, exist_ok=True)


def _env(name):
    p = BASE / ".env"
    if not p.exists():
        return ""
    for line in p.read_text(encoding="utf-8").splitlines():
        if line.startswith(name + "="):
            return line.split("=", 1)[1].strip()
    return ""


TURNSTILE_SECRET = _env("TURNSTILE_SECRET_KEY")
REGISTER_CODE = _env("REGISTER_CODE")

# ── 账号存储（与本地 server.py 同格式，可互迁）──
import threading

_auth_fails = {}
_fail_lock = threading.Lock()
_user_locks = {}
_locks_guard = threading.Lock()


def safe_account_name(raw):
    cleaned = "".join(ch for ch in str(raw) if ch.isalnum() or ch in ("-", "_"))
    return cleaned[:64] or "default"


def account_file(user):
    return ACCOUNT_DIR / f"{safe_account_name(user)}.json"


def _hash_pin(user, pin):
    return hashlib.sha256((user + ":" + pin).encode("utf-8")).hexdigest()


def _read_account(path):
    if not path.exists():
        return None, None
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None, None
    if isinstance(raw, dict) and "_meta" in raw:
        return raw["_meta"], raw.get("profile", {})
    return {"rev": 1, "pin": None}, raw


def _write_account(path, meta, profile):
    raw = json.dumps({"_meta": meta, "profile": profile}, ensure_ascii=False, indent=1)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(raw)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def _user_lock(user):
    with _locks_guard:
        return _user_locks.setdefault(user, threading.Lock())


def _locked(ip):
    with _fail_lock:
        fails = [t for t in _auth_fails.get(ip, []) if time.time() - t < 600]
        _auth_fails[ip] = fails
        return len(fails) >= 8


def _fail(ip):
    with _fail_lock:
        _auth_fails.setdefault(ip, []).append(time.time())


def _verify_turnstile(token, ip):
    """PA 免费档外网白名单不含 challenges.cloudflare.com → 此处若启用会全部放行告警。
    免费档请用 REGISTER_CODE 做注册门槛。"""
    if not TURNSTILE_SECRET:
        return True, ""
    if not token:
        return False, "请完成人机验证"
    try:
        import urllib.request
        import urllib.parse as _up
        req = urllib.request.Request(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            data=_up.urlencode({"secret": TURNSTILE_SECRET, "response": token, "remoteip": ip}).encode(),
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            r = json.loads(resp.read().decode())
        return (True, "") if r.get("success") else (False, "人机验证未通过，刷新重试")
    except Exception:
        return True, ""  # 免费档外网受限，放行


def handle_account_action(body, ip):
    action = body.get("action")

    if action == "peek":
        meta, _ = _read_account(account_file(str(body.get("user", ""))))
        return 200, {"exists": meta is not None, "hasPin": bool(meta and meta.get("pin")),
                     "registerCode": bool(REGISTER_CODE), "tsKey": ""}

    if action not in ("claim", "auth", "save"):
        return 400, {"error": "unknown action"}

    user = safe_account_name(body.get("user", ""))
    pin = str(body.get("pin", ""))
    if not user or user == "default":
        return 400, {"error": "请输入用户名"}
    if not pin or len(pin) < 4:
        return 400, {"error": "PIN 至少 4 位"}
    if _locked(ip):
        return 429, {"error": "尝试过多，请 10 分钟后再试"}

    with _user_lock(user):
        path = account_file(user)
        meta, profile = _read_account(path)

        if action == "claim":
            ok, msg = _verify_turnstile(str(body.get("cfToken", "")), ip)
            if not ok:
                return 403, {"error": msg}
            if REGISTER_CODE and str(body.get("registerCode", "")) != REGISTER_CODE:
                return 403, {"error": "注册口令不正确（问老师/同学要）"}
            if meta is not None:
                return 409, {"error": "这个名字已被使用，换一个或直接登录"}
            _write_account(path, {"rev": 1, "pin": _hash_pin(user, pin)}, {})
            return 200, {"ok": True, "rev": 1, "data": {}}

        if meta is None:
            return 404, {"error": "账号不存在，先注册"}
        if meta.get("pin") is None:
            meta["pin"] = _hash_pin(user, pin)
            _write_account(path, meta, profile)
        if meta["pin"] != _hash_pin(user, pin):
            _fail(ip)
            return 403, {"error": "PIN 不正确"}

        if action == "auth":
            data = {k: v for k, v in profile.items() if k != "_legacy"} if isinstance(profile, dict) else {}
            return 200, {"ok": True, "rev": meta["rev"], "data": data}

        rev = int(body.get("rev", 0))
        if rev < meta["rev"]:
            data = {k: v for k, v in profile.items() if k != "_legacy"} if isinstance(profile, dict) else {}
            return 200, {"conflict": True, "rev": meta["rev"], "data": data}
        new_profile = dict(body.get("data", {}) or {})
        if isinstance(profile, dict) and "_legacy" in profile:
            new_profile["_legacy"] = profile["_legacy"]
        _write_account(path, {"rev": meta["rev"] + 1, "pin": meta["pin"]}, new_profile)
        return 200, {"ok": True, "rev": meta["rev"] + 1}


CTYPES = {
    ".html": "text/html; charset=utf-8", ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
    ".woff2": "font/woff2", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon",
}


def _serve_file(target, immutable):
    """immutable: True=长缓存 False=no-cache None=不发缓存头"""
    if not target.exists():
        return 404, b"not found", "text/plain; charset=utf-8", ""
    data = target.read_bytes()
    ctype = CTYPES.get(target.suffix, "application/octet-stream")
    cache = "" if immutable is None else ("public, max-age=31536000, immutable" if immutable else "no-cache")
    return 200, data, ctype, cache


def application(environ, start_response):
    path = environ.get("PATH_INFO", "/")
    method = environ.get("REQUEST_METHOD", "GET")
    ip = environ.get("HTTP_X_FORWARDED_FOR", environ.get("REMOTE_ADDR", ""))

    headers = [
        ("Access-Control-Allow-Origin", "*"),
        ("Access-Control-Allow-Methods", "GET, POST, OPTIONS"),
        ("Access-Control-Allow-Headers", "Content-Type"),
    ]

    if method == "OPTIONS":
        start_response("200 OK", headers)
        return [b""]

    if path == "/api/account-data":
        if method == "POST":
            try:
                length = int(environ.get("CONTENT_LENGTH") or 0)
                body = json.loads(environ["wsgi.input"].read(length) or b"{}")
                if isinstance(body, dict) and "action" in body:
                    status, payload = handle_account_action(body, ip)
                else:
                    status, payload = 400, {"error": "unsupported"}
            except Exception as exc:
                status, payload = 500, {"error": str(exc)}
        else:
            status, payload = 405, {"error": "POST only"}
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        reason = {200: "OK", 400: "Bad Request", 403: "Forbidden", 404: "Not Found",
                  405: "Method Not Allowed", 409: "Conflict", 429: "Too Many Requests",
                  500: "Server Error"}.get(status, "Error")
        start_response(f"{status} {reason}", [("Content-Type", "application/json; charset=utf-8"),
                                              ("Content-Length", str(len(data)))] + headers)
        return [data]

    if path == "/" or path == "":
        start_response("302 Found", [("Location", "/v2")] + headers)
        return [b""]

    if path == "/v2" or path.startswith("/v2/"):
        rel = path[3:].lstrip("/")
        if rel:
            candidate = (V2_DIR / rel).resolve()
            try:
                if os.path.commonpath([str(candidate), str(V2_DIR.resolve())]) != str(V2_DIR.resolve()):
                    start_response("403 Forbidden", headers)
                    return [b""]
            except ValueError:
                start_response("403 Forbidden", headers)
                return [b""]
            target = candidate if candidate.is_file() else V2_DIR / "index.html"
            immutable = target.name != "index.html" and candidate.is_file()
        else:
            target = V2_DIR / "index.html"
            immutable = False
        code, data, ctype, cache = _serve_file(target, immutable)
        start_response(f"{code} {'OK' if code == 200 else 'NF'}",
                       [("Content-Type", ctype), ("Content-Length", str(len(data)))]
                       + ([("Cache-Control", cache)] if cache else []) + headers)
        return [data]

    if path.startswith("/data/"):
        candidate = (BASE / path.lstrip("/")).resolve()
        try:
            if os.path.commonpath([str(candidate), str(DATA_DIR.resolve())]) == str(DATA_DIR.resolve()) and candidate.is_file():
                code, data, ctype, _ = _serve_file(candidate, None)
                start_response(f"{code} OK", [("Content-Type", ctype), ("Content-Length", str(len(data)))] + headers)
                return [data]
        except ValueError:
            pass
        start_response("404 Not Found", headers)
        return [b""]

    start_response("404 Not Found", headers)
    return [b""]
