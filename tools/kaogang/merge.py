#!/usr/bin/env python3
"""合并分区结构化结果 → 最终数据集 + 文字层确定性修正

输入: data/kaogang/sections/*.json（sub-agent 产出）
输出: data/kaogang/{words,phrases,sentences,units23,unit4,irregular_verbs}.json + index.json

修正规则（出版社文字层为权威，OCR 内容为权威内容）:
- stars: 文字层词条行内 ＊ 数量（OCR 的 * 计数不可靠）
- three_level: 文字层词条号前的 ？（OCR 的 ▶ 漏标）
- textbook_tags: 从文字层独立行 G\d[上下]U\d+ 重取（OCR 会把"上/下"读坏）
"""
import json
import re
import sys
import unicodedata
from datetime import datetime
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SEC = REPO / "data" / "kaogang" / "sections"
OUT = REPO / "data" / "kaogang"
EMBEDDED_DIR = Path("/tmp/kaogang_ocr/embedded")


def to_halfwidth(s: str) -> str:
    out = []
    for ch in s:
        name = unicodedata.name(ch, "")
        if "FULLWIDTH" in name:
            out.append(chr(ord(ch) - 0xFEE0))
        elif ch == "　":
            out.append(" ")
        else:
            out.append(ch)
    return "".join(out)


class EmbeddedPage:
    """一页文字层，懒加载，词条行索引"""

    _cache: dict[int, "EmbeddedPage"] = {}

    def __init__(self, page: int):
        p = EMBEDDED_DIR / f"p{page:03d}.txt"
        self.text = to_halfwidth(p.read_text(encoding="utf-8")) if p.exists() else ""
        self.nospace = re.sub(r"\s+", "", self.text)
        self.lines = [re.sub(r"\s+", "", l) for l in self.text.split("\n")]

    @classmethod
    def get(cls, page: int) -> "EmbeddedPage":
        if page not in cls._cache:
            cls._cache[page] = EmbeddedPage(page)
        return cls._cache[page]

    def find_entry(self, headword: str, no: int) -> dict | None:
        """返回 {stars, three_level, textbook_tags} 或 None(找不到)"""
        hw = to_halfwidth(headword).lower()
        marker = f"{no}."
        for i, line in enumerate(self.lines):
            if marker not line or hw not in line.lower():
                continue
            idx = line.index(marker)
            prefix = line[:idx]
            stars = prefix.count("*")
            three = "？" in prefix or "?" in prefix
            # 星号也可能在号码之后（排版差异）：整行头部 40 字符内计数
            head_zone = line[: line.lower().index(hw) + len(hw)]
            stars = max(stars, head_zone.count("*") - head_zone[:idx].count("*") + prefix.count("*"))
            stars = min(stars, 3)
            # 教材标注：词条行之后 3 行内找 G\d[上下]U\d+
            tags = []
            for follow in self.lines[i : i + 4]:
                tags += re.findall(r"G\d[上下]U\d+", follow)
            return {"stars": stars, "three_level": three, "textbook_tags": tags}
        return None


def load(name: str) -> list:
    path = SEC / name
    if not path.exists():
        print(f"!! 缺少 {path}")
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def fix_word_entry(e: dict, fixes: list) -> dict:
    emb = EmbeddedPage.get(e.get("page", 0))
    found = emb.find_entry(e["headword"], e["no"])
    if found is None:
        # 容错：词条可能起始于上一页
        emb2 = EmbeddedPage.get(e.get("page", 0) - 1)
        found = emb2.find_entry(e["headword"], e["no"])
    if found is not None:
        if e.get("stars") != found["stars"]:
            fixes.append(f"p{e.get('page')} #{e['no']} {e['headword']}: stars {e.get('stars')}→{found['stars']}")
            e["stars"] = found["stars"]
        if bool(e.get("three_level")) != found["three_level"]:
            fixes.append(f"p{e.get('page')} #{e['no']} {e['headword']}: three_level {e.get('three_level')}→{found['three_level']}")
            e["three_level"] = found["three_level"]
        if found["textbook_tags"]:
            if e.get("textbook_tags") != found["textbook_tags"]:
                fixes.append(f"p{e.get('page')} #{e['no']} {e['headword']}: tags {e.get('textbook_tags')}→{found['textbook_tags']}")
            e["textbook_tags"] = found["textbook_tags"]
    return e


def merge_words():
    a, b = load("words_a.json"), load("words_b.json")
    merged, seen = [], set()
    for e in a + b:
        no = e.get("no")
        if no in seen:
            print(f"!! 重复序号 {no} ({e.get('headword')})，保留先者")
            continue
        seen.add(no)
        merged.append(e)
    merged.sort(key=lambda x: (x.get("no") is None, x.get("no") or 0))
    fixes = []
    merged = [fix_word_entry(e, fixes) for e in merged]
    return merged, fixes


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    index = {"built_at": datetime.now().isoformat(timespec="seconds")}

    words, wfixes = merge_words()
    (OUT / "words.json").write_text(json.dumps(words, ensure_ascii=False), encoding="utf-8")
    print(f"words: {len(words)} 条，文字层修正 {len(wfixes)} 处")

    phrases = load("phrases.json")
    pfixes = []
    phrases = [fix_word_entry(p, pfixes) for p in phrases]
    # 词组没有 headword 字段，用 phrase
    for p in phrases:
        p["headword"] = p.pop("phrase", p.get("headword", ""))
    (OUT / "phrases.json").write_text(json.dumps(phrases, ensure_ascii=False), encoding="utf-8")
    print(f"phrases: {len(phrases)} 条，文字层修正 {len(pfixes)} 处")

    # 句子银行：词 + 词组的全部例句
    sentences = []
    sid = 1
    for src, kind in ((words, "word"), (phrases, "phrase")):
        for e in src:
            for ex in e.get("examples") or []:
                if not ex.get("en"):
                    continue
                sentences.append({
                    "id": f"s{sid:05d}", "kind": kind, "entry_no": e.get("no"),
                    "headword": e.get("headword"), "page": e.get("page"),
                    "en": ex["en"], "zh": ex.get("zh", ""),
                    "rewrite": ex.get("rewrite"),
                })
                sid += 1
    (OUT / "sentences.json").write_text(json.dumps(sentences, ensure_ascii=False), encoding="utf-8")
    print(f"sentences: {len(sentences)} 句")

    for name, key in (("units23.json", "units23"), ("unit4.json", "unit4"),
                      ("irregular_verbs.json", "irregular_verbs"), ("appendix_misc.json", "appendix_misc")):
        data = load(name)
        if isinstance(data, list):
            (OUT / name).write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
            index[key] = len(data)
        elif isinstance(data, dict):
            (OUT / name).write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
            index[key] = sum(len(v) for v in data.values() if isinstance(v, list))

    index.update({
        "words": len(words), "phrases": len(phrases), "sentences": len(sentences),
        "word_fixes": len(wfixes), "phrase_fixes": len(pfixes),
    })
    (OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
    (OUT / "merge_fixes.log").write_text("\n".join(wfixes + pfixes), encoding="utf-8")
    print(json.dumps(index, ensure_ascii=False, indent=1))
    print("修正明细 -> data/kaogang/merge_fixes.log")


if __name__ == "__main__":
    main()
