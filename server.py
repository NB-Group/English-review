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
V2_DIR = ROOT_DIR / "web" / "dist"  # 新版 React 应用的构建产物

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


# ── 账号存储：{_meta:{rev,pin_sha}, profile:{...}}；老格式(裸 profile)自动迁移 ──
import hashlib
import tempfile
import threading
import time

def _hash_pin(user: str, pin: str) -> str:
    return hashlib.sha256((user + ":" + pin).encode("utf-8")).hexdigest()

def _read_account(path: Path):
    """返回 (meta, profile)；老格式文件返回 ({"rev":1,"pin":None}, data)"""
    if not path.exists():
        return None, None
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None, None
    if isinstance(raw, dict) and "_meta" in raw:
        return raw["_meta"], raw.get("profile", {})
    return {"rev": 1, "pin": None}, raw

def _write_account(path: Path, meta: dict, profile: dict):
    raw = json.dumps({"_meta": meta, "profile": profile}, ensure_ascii=False, indent=1)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(raw)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)

# 简易防爆破：每 IP 失败计数，8 次锁 10 分钟（加锁防并发绕过）
_auth_fails: dict[str, list[float]] = {}
_fail_lock = threading.Lock()

def _locked(ip: str) -> bool:
    with _fail_lock:
        fails = [t for t in _auth_fails.get(ip, []) if time.time() - t < 600]
        _auth_fails[ip] = fails
        return len(fails) >= 8

def _fail(ip: str):
    with _fail_lock:
        _auth_fails.setdefault(ip, []).append(time.time())

# 每用户写锁 + 原子写（temp + os.replace），防并发 rev 丢失/半写
_user_locks: dict[str, threading.Lock] = {}
_user_locks_guard = threading.Lock()

def _user_lock(user: str) -> threading.Lock:
    with _user_locks_guard:
        return _user_locks.setdefault(user, threading.Lock())


def _env(name: str) -> str:
    """读 .env（不引入依赖，简单解析）"""
    env_path = ROOT_DIR / ".env"
    if not env_path.exists():
        return ""
    for line in env_path.read_text(encoding="utf-8").splitlines():
        if line.startswith(name + "="):
            return line.split("=", 1)[1].strip()
    return ""


TURNSTILE_SECRET = _env("TURNSTILE_SECRET_KEY")
REGISTER_CODE = _env("REGISTER_CODE")


def _verify_turnstile(token: str, ip: str) -> tuple[bool, str]:
    """无 secret → 放行（未配置）；有 secret → 缺 token 拒绝。
    校验服务 5xx/超时等基础设施故障 → 放行并告警（别把所有人锁死）；
    4xx（含无效 token）→ 拒绝。"""
    if not TURNSTILE_SECRET:
        return True, ""
    if not token:
        return False, "请完成人机验证"
    try:
        import urllib.request
        req = urllib.request.Request(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            data=urllib.parse.urlencode({"secret": TURNSTILE_SECRET, "response": token, "remoteip": ip}).encode(),
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=8) as resp:
            r = json.loads(resp.read().decode())
        if r.get("success"):
            return True, ""
        return False, "人机验证未通过，刷新重试"
    except urllib.error.HTTPError as exc:
        if exc.code < 500:
            return False, "人机验证无效，刷新重试"  # 4xx = 请求/令牌问题，拒绝
        print(f"[turnstile] 校验服务 {exc.code}，放行并告警")
        return True, ""
    except Exception as exc:
        print(f"[turnstile] 校验服务不可达，放行并告警: {exc}")
        return True, ""


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
        if parsed.path == "/":
            # 发布入口：根路径直达新版应用（老应用仍在 /index.html）
            self.send_response(302)
            self.send_header("Location", "/v2")
            self.end_headers()
            return
        if parsed.path == "/api/scan-units":
            return self.handle_scan_units()
        if parsed.path == "/api/account-data":
            return self.handle_account_load(parsed)
        # /v2 与 /v2/* → 新版应用（SPA，回退到 index.html）
        if parsed.path == "/v2" or parsed.path.startswith("/v2/"):
            return self.handle_v2(parsed)
        return super().do_GET()

    def handle_v2(self, parsed):
        rel = parsed.path[len("/v2"):].lstrip("/")
        if not rel:
            target = V2_DIR / "index.html"
        else:
            candidate = (V2_DIR / rel).resolve()
            try:
                if os.path.commonpath([str(candidate), str(V2_DIR.resolve())]) != str(V2_DIR.resolve()):
                    return self.send_error(403)
            except ValueError:
                return self.send_error(403)
            target = candidate if candidate.is_file() else V2_DIR / "index.html"
        if not target.exists():
            return self.send_error(404, "web/dist not built")
        self.send_response(200)
        ctype = (
            "text/html; charset=utf-8" if target.suffix == ".html"
            else "application/javascript; charset=utf-8" if target.suffix == ".js"
            else "text/css; charset=utf-8" if target.suffix == ".css"
            else "application/json; charset=utf-8" if target.suffix == ".json"
            else "application/octet-stream"
        )
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(target.stat().st_size))
        # index 每次回源校验（防旧索引指向已删除的哈希资源）；
        # 带哈希的静态资源可永久缓存
        if target.name == "index.html":
            self.send_header("Cache-Control", "no-cache")
        else:
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        self.end_headers()
        self.wfile.write(target.read_bytes())

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
            meta, profile = _read_account(path)
            # 只回传数据，绝不泄漏 _meta（含 PIN 哈希，4 位 PIN 可离线爆破）
            data = profile if isinstance(profile, dict) and profile else {}
            legacy = None
            if isinstance(profile, dict) and "_legacy" in profile:
                legacy = profile.get("_legacy") or {}
            if legacy is not None:
                data = legacy  # 老应用只看到自己的命名空间
            self.write_json({"user": safe_account_name(user), "data": data})
        except Exception as exc:
            self.write_json({"error": str(exc)}, status=500)

    def handle_account_save(self, parsed):
        query = urllib.parse.parse_qs(parsed.query)
        user = query.get("user", ["default"])[0]
        try:
            payload = self.read_json_body()
            # v2 动作协议：带 action 字段走新流程；否则是老应用的裸数据
            if isinstance(payload, dict) and "action" in payload:
                return self.handle_account_action(payload)
            # 老应用裸 payload：写入独立的 _legacy 命名空间，绝不碰 v2 的 profile/PIN/rev。
            # 只接受老应用的键形状，防匿名 POST 滥用此通道写任意内容。
            if not any(str(k).startswith("english_review_") or k == "grade8_migration_completed" for k in payload):
                return self.write_json({"error": "unsupported payload"}, status=400)
            with _user_lock(user):
                path = account_file(user)
                meta, profile = _read_account(path)
                new_profile = dict(profile or {}) if isinstance(profile, dict) else {}
                new_profile["_legacy"] = payload
                new_meta = {"rev": (meta or {}).get("rev", 1), "pin": (meta or {}).get("pin")}
                _write_account(path, new_meta, new_profile)
            self.write_json({"ok": True, "user": safe_account_name(user)})
        except Exception as exc:
            self.write_json({"error": str(exc)}, status=500)

    def handle_account_action(self, body: dict):
        action = body.get("action")
        user = safe_account_name(str(body.get("user", "")))
        pin = str(body.get("pin", ""))
        ip = self.client_address[0]

        if action == "peek":
            meta, _ = _read_account(account_file(user))
            return self.write_json({
                "exists": meta is not None,
                "hasPin": bool(meta and meta.get("pin")),
                "registerCode": bool(REGISTER_CODE),
                "tsKey": _env("TURNSTILE_SITE_KEY"),
            })

        if action in ("claim", "auth", "save"):
            if not user or user == "default":
                return self.write_json({"error": "请输入用户名"}, status=400)
            if not pin or len(pin) < 4:
                return self.write_json({"error": "PIN 至少 4 位"}, status=400)
            if _locked(ip):
                return self.write_json({"error": "尝试过多，请 10 分钟后再试"}, status=429)

            if action == "claim":
                # 注册：人机验证 + 可选注册口令（全校发放的邀请码）
                ok, msg = _verify_turnstile(str(body.get("cfToken", "")), ip)
                if not ok:
                    return self.write_json({"error": msg}, status=403)
                if REGISTER_CODE and REGISTER_CODE not in str(body.get("registerCode", "")).strip():
                    return self.write_json({"error": "注册口令不正确（粘贴班群里发的链接）"}, status=403)
                path = account_file(user)
                if _read_account(path)[0] is not None:
                    return self.write_json({"error": "这个名字已被使用，换一个或直接登录"}, status=409)
                _write_account(path, {"rev": 1, "pin": _hash_pin(user, pin)}, {})
                return self.write_json({"ok": True, "rev": 1, "data": {}})

            path = account_file(user)
            meta, profile = _read_account(path)

            # auth / save 都需要验 PIN（老账号无 PIN：首次验证即认领设置 PIN）
            if meta is None:
                return self.write_json({"error": "账号不存在，先注册"}, status=404)
            if meta.get("pin") is None:
                meta["pin"] = _hash_pin(user, pin)
                _write_account(path, meta, profile)  # 首验即认领，必须落盘
            if meta["pin"] != _hash_pin(user, pin):
                _fail(ip)
                return self.write_json({"error": "PIN 不正确"}, status=403)

            if action == "auth":
                return self.write_json({"ok": True, "rev": meta["rev"], "data": profile})

            # save：rev 落后则拒绝并回传最新（客户端随后以服务器为准）
            rev = int(body.get("rev", 0))
            if rev < meta["rev"]:
                return self.write_json({"conflict": True, "rev": meta["rev"], "data": profile})
            new_meta = {"rev": meta["rev"] + 1, "pin": meta["pin"]}
            _write_account(path, new_meta, body.get("data", {}))
            return self.write_json({"ok": True, "rev": new_meta["rev"]})

        return self.write_json({"error": "unknown action"}, status=400)


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
