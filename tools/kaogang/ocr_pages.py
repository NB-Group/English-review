#!/usr/bin/env python3
"""考纲词汇手册 PDF → 逐页 Qwen OCR 原始转写

用法:
  # 只跑样张验证
  python ocr_pages.py --pages 100,274,391
  # 全书
  python ocr_pages.py --pages 1-402 --workers 12

输出: /tmp/kaogang_ocr/out/p{N:03d}.json  {"page", "model", "text", "usage"}
断点续跑: 已存在的输出文件自动跳过。
"""
import argparse
import base64
import json
import os
import subprocess
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import requests
from dotenv import load_dotenv

REPO = Path(__file__).resolve().parents[2]
load_dotenv(REPO / ".env")

PDF = Path("/mnt/quark/quark1/来自：分享/2027年上海市初中英语考纲词汇用法手册.pdf")
PAGES_DIR = Path("/tmp/kaogang_ocr/pages")
OUT_DIR = Path("/tmp/kaogang_ocr/out")
API = "https://api.siliconflow.cn/v1/chat/completions"

# L0 限额 1000 RPM / 80000 TPM，留安全余量
TPM_BUDGET = 60_000
WORKERS_DEFAULT = 10

PROMPT = """把这张词典页图片逐字精确转写为纯文本。规则：
1. 保持原有顺序与段落结构，词条序号（如 598.）必须保留
2. 特殊标记原样保留：★（数量要准，如★★）、？前缀、G6下U3 这类教材标注
3. 音标精确转写 IPA 符号（如 /ˈfaɪəmən/、/əˈbɪləti/、/ˌmɪsˈteɪkən/）
4. 小节标题（词形拓展、常用词组、谚语、近义、反义、名师点拨、辨析）单独成行
5. 英文例句与中文翻译保持原文；＝ 引出的同义改写句原样保留
6. 忽略页眉页脚页码、"微信扫码"等装饰元素
7. 只输出转写文本，不要解释、不要代码围栏"""


class TokenBucket:
    """按 TPM 限速（滚动窗口内记账）"""

    def __init__(self, budget):
        self.budget = budget
        self.used = 0
        self.window_start = time.time()
        self.lock = threading.Lock()

    def acquire(self, est_tokens):
        while True:
            with self.lock:
                now = time.time()
                if now - self.window_start >= 60:
                    self.used = 0
                    self.window_start = now
                if self.used + est_tokens <= self.budget:
                    self.used += est_tokens
                    return
                sleep_s = 60 - (now - self.window_start) + 0.5
            time.sleep(max(sleep_s, 0.5))

    def refund(self, est_tokens):
        with self.lock:
            self.used = max(0, self.used - est_tokens)


def render_page(page: int, dpi: int) -> Path:
    PAGES_DIR.mkdir(parents=True, exist_ok=True)
    out = PAGES_DIR / f"p{page:03d}.png"
    if out.exists():
        return out
    subprocess.run(
        ["pdftoppm", "-png", "-r", str(dpi), "-f", str(page), "-l", str(page),
         str(PDF), str(PAGES_DIR / f"p{page:03d}")],
        check=True, capture_output=True,
    )
    # pdftoppm 可能生成 p100-100.png 之类的名字
    for cand in PAGES_DIR.glob(f"p{page:03d}*.png"):
        if cand != out:
            cand.rename(out)
    return out


def ocr_page(page: int, model: str, dpi: int, bucket: TokenBucket, retries: int = 3):
    out_path = OUT_DIR / f"p{page:03d}.json"
    if out_path.exists():
        return page, "cached", 0

    img = render_page(page, dpi)
    b64 = base64.b64encode(img.read_bytes()).decode()

    est = 2500  # 保守估计（图 ~2100 + 输出）
    for attempt in range(retries):
        bucket.acquire(est)
        try:
            r = requests.post(
                API,
                headers={"Authorization": f"Bearer {os.environ['QWEN_FREE_API_KEY']}"},
                json={
                    "model": model,
                    "temperature": 0.1,
                    "max_tokens": 6000,
                    "enable_thinking": False,
                    "messages": [{
                        "role": "user",
                        "content": [
                            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
                            {"type": "text", "text": PROMPT},
                        ],
                    }],
                },
                timeout=300,
            )
            if r.status_code == 429:
                time.sleep(5 * (attempt + 1))
                bucket.refund(est)
                continue
            r.raise_for_status()
            data = r.json()
            text = data["choices"][0]["message"]["content"].strip()
            if text.startswith("```"):
                text = text.split("\n", 1)[1].rsplit("```", 1)[0]
            usage = data.get("usage", {})
            # 用真实用量修正估计
            real = usage.get("total_tokens", est)
            if real > est:
                bucket.refund(est)
                bucket.acquire(real)
            out_path.write_text(json.dumps({
                "page": page, "model": model, "text": text, "usage": usage,
            }, ensure_ascii=False, indent=1))
            return page, "ok", real
        except Exception as exc:
            if attempt == retries - 1:
                return page, f"FAIL: {exc}", 0
            time.sleep(3 * (attempt + 1))
    return page, "FAIL: retries exhausted", 0


def parse_pages(spec: str):
    pages = []
    for part in spec.split(","):
        if "-" in part:
            a, b = part.split("-")
            pages.extend(range(int(a), int(b) + 1))
        else:
            pages.append(int(part))
    return pages


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pages", required=True, help="如 100 或 100,274 或 1-402")
    ap.add_argument("--model", default="Qwen/Qwen3.5-4B")
    ap.add_argument("--dpi", type=int, default=150)
    ap.add_argument("--workers", type=int, default=WORKERS_DEFAULT)
    args = ap.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    pages = parse_pages(args.pages)
    bucket = TokenBucket(TPM_BUDGET)
    done = fail = 0
    t0 = time.time()

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futures = {ex.submit(ocr_page, p, args.model, args.dpi, bucket): p for p in pages}
        for fut in as_completed(futures):
            page, status, tokens = fut.result()
            if status.startswith("FAIL"):
                fail += 1
                print(f"[{page}] {status}", flush=True)
            else:
                done += 1
                if status == "ok":
                    print(f"[{page}] ok ({tokens} tok)", flush=True)

    print(f"\n完成 {done} 失败 {fail} 用时 {time.time()-t0:.0f}s")
    if fail:
        sys.exit(1)


if __name__ == "__main__":
    main()
