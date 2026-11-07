#!/usr/bin/env python3
"""结构化数据三重校验：序号连续性 + 字母序 + 出版社文字层交叉比对

用法:
  python validate.py data/kaogang/words.json          # 校验单词表
  python validate.py data/kaogang/phrases.json        # 校验词组表

输入 JSON 结构: [{"page": 100, "no": 598, "headword": "fireman", "stars": 0,
                  "three_level": true, "textbook_tags": ["G7上U3"], ...}, ...]
输出: 控制台报告 + <input>.report.json（供二次复审的分歧清单）
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

EMBEDDED_DIR = Path("/tmp/kaogang_ocr/embedded")


def to_halfwidth(s: str) -> str:
    """全角→半角；压缩行内空白但保留换行（词条行是校验的基本单位）"""
    out = []
    for ch in s:
        name = unicodedata.name(ch, "")
        if "FULLWIDTH" in name:
            out.append(chr(ord(ch) - 0xFEE0))
        elif ch == "　":
            out.append(" ")
        else:
            out.append(ch)
    text = "".join(out)
    return "\n".join(re.sub(r"[ \t]+", "", ln) for ln in text.split("\n"))


def load_embedded(page: int) -> str:
    p = EMBEDDED_DIR / f"p{page:03d}.txt"
    return to_halfwidth(p.read_text(encoding="utf-8")) if p.exists() else ""


def embedded_entry_line(emb: str, headword: str, no: int | None = None) -> str:
    """在文字层里找词条头部行：优先 序号.+词头 同行；no 为空时退化为词头首现行。
    词头归一：去空白、…→...、弯引号→直引号（斜杠词组/省略号词组的匹配盲区）"""
    def norm(s: str) -> str:
        return (to_halfwidth(s).lower().replace(" ", "")
                .replace("…", "...").replace("’", "'").replace("ˊ", "'"))
    hw = norm(headword)
    lines = emb.split("\n")
    if no is not None:
        marker = f"{no}."
        for line in lines:
            if marker in line and hw and hw in norm(line):
                return line
        return ""
    for line in lines:
        if hw and hw in norm(line):
            return line
    return ""


def check(data: list, name: str, expect_alpha: bool) -> dict:
    issues = []

    # 1) 序号连续性
    nos = [e["no"] for e in data if isinstance(e.get("no"), int)]
    for a, b in zip(nos, nos[1:]):
        if b != a + 1:
            issues.append({"type": "seq", "at": a, "msg": f"序号 {a} -> {b} 不连续"})
    if nos and nos[0] != 1:
        issues.append({"type": "seq", "at": nos[0], "msg": f"起始序号 {nos[0]} ≠ 1"})

    # 2) 字母序
    if expect_alpha:
        hws = [e["headword"].lower() for e in data]
        for i, (a, b) in enumerate(zip(hws, hws[1:])):
            if a > b:
                issues.append({"type": "alpha", "at": data[i].get("no"),
                               "msg": f"'{a}' 之后是 '{b}'，非字母序"})

    # 3) 文字层交叉比对（星级 / ?标记 / 词头存在性 / 教材标注）
    for e in data:
        page = e.get("page")
        if not page:
            continue
        emb_line = embedded_entry_line(load_embedded(page), e["headword"], e.get("no"))
        if not emb_line:
            issues.append({"type": "embed", "at": e.get("no"),
                           "msg": f"p{page} '{e['headword']}' 在文字层找不到"})
            continue
        # 与 merge.find_entry 相同的读法：词条行 = 序号.与词头同一物理行
        # 星级 = 行首到词头之间的 * 数（书里 ★ 印在序号之后）
        # ?标记 = 序号之前的 ? （IPA 里的 ？ 是乱码 ə，不算）
        if not emb_line:
            issues.append({"type": "embed", "at": e.get("no"),
                           "msg": f"p{page} '{e['headword']}' 在文字层找不到"})
            continue
        norm = lambda s: (to_halfwidth(s).lower().replace(" ", "")
                          .replace("…", "...").replace("’", "'").replace("ˊ", "'"))
        hw_pos = norm(emb_line).find(norm(e["headword"]))
        no_pos = emb_line.find(f"{e.get('no')}.")
        if hw_pos >= 0 and no_pos >= 0:
            zone = emb_line[:hw_pos]
            emb_stars = min(zone.count("*"), 3)
            emb_q = "?" in emb_line[:no_pos]
            if emb_stars != (e.get("stars") or 0):
                issues.append({"type": "stars", "at": e.get("no"),
                               "msg": f"'{e['headword']}' 星级: 数据={e.get('stars')} 文字层={emb_stars} (p{page}) | {emb_line[:40]}"})
            if emb_q != bool(e.get("three_level")):
                issues.append({"type": "qmark", "at": e.get("no"),
                               "msg": f"'{e['headword']}' ?标记: 数据={e.get('three_level')} 文字层={emb_q} (p{page}) | {emb_line[:40]}"})

    print(f"[{name}] 条目 {len(data)}，问题 {len(issues)}")
    by_type = {}
    for i in issues:
        by_type[i["type"]] = by_type.get(i["type"], 0) + 1
    for t, c in sorted(by_type.items()):
        print(f"  {t}: {c}")
    return {"name": name, "count": len(data), "issues": issues}


if __name__ == "__main__":
    src = Path(sys.argv[1])
    data = json.loads(src.read_text(encoding="utf-8"))
    report = check(data, src.stem, expect_alpha=("--no-alpha" not in sys.argv))
    Path(str(src) + ".report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"报告已写入 {src}.report.json")
