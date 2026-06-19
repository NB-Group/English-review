import json
import re
from pathlib import Path

from docx import Document


SOURCE_DIR = Path(r"G:\Documents\八年级下 英语词组\2026_06_17_Unit 6 reading(1)")
TARGET_DIR = Path(r"F:\Code\Web\English-review\data\八年级\Down")


def read_lines(docx_path: Path):
    doc = Document(str(docx_path))
    lines = []
    for p in doc.paragraphs:
        text = p.text.strip()
        if text:
            lines.append(text)
    return lines


def parse_phrase(line: str):
    if "---" in line or "：" in line:
        return None
    match = re.match(r"^(?P<en>[A-Za-z].*?)(?P<zh>[\u4e00-\u9fff].*)$", line)
    if not match:
        return None
    english = match.group("en").strip(" /")
    chinese = match.group("zh").strip()
    return {"english": [part.strip() for part in english.split("/") if part.strip()], "chinese": chinese}


def parse_word_form(line: str):
    match = re.match(r"^(?P<base>[A-Za-z]+)\s*---\s*(?P<past>[A-Za-z]+)\s*---\s*(?P<pp>[A-Za-z]+)\s+(?P<zh>.*)$", line)
    if not match:
        return None
    base = match.group("base")
    zh = match.group("zh").strip()
    return {
        "word": base,
        "forms": [
            {"type": "verb", "chinese": f"{zh}（过去式）", "form": match.group("past")},
            {"type": "verb", "chinese": f"{zh}（过去分词）", "form": match.group("pp")},
        ],
    }


def parse_pos_form(line: str):
    match = re.match(r"^(?P<word>[A-Za-z]+)\s+\((?P<t1>[a-z])\.\)\s+(?P<m1>[^()]+)\s+\((?P<t2>[a-z])\.\)\s+(?P<m2>.+)$", line)
    if not match:
        return None
    type_map = {"n": "noun", "v": "verb", "adj": "adjective", "adv": "adverb"}
    t1 = match.group("t1")
    t2 = match.group("t2")
    return {
        "word": match.group("word"),
        "forms": [
            {"type": type_map.get(t1, t1), "chinese": match.group("m1").strip(), "form": match.group("word")},
            {"type": type_map.get(t2, t2), "chinese": match.group("m2").strip(), "form": match.group("word")},
        ],
    }


def detect_target_name(filename: str):
    lower = filename.lower()
    unit_match = re.search(r"\bU(?:nit)?\s*(\d+)", filename, re.IGNORECASE)
    unit_num = unit_match.group(1) if unit_match else "0"
    if "viewing and listening" in lower:
        module = "viewing-listening"
    elif "reading" in lower:
        module = "reading"
    elif "speaking" in lower:
        module = "speaking"
    elif "writing" in lower:
        module = "writing"
    elif "discovery" in lower:
        module = "discovery"
    else:
        module = Path(filename).stem.replace(" ", "-").lower()
    return f"U{unit_num}-{module}.js"


def build_unit_data(docx_path: Path):
    lines = read_lines(docx_path)
    title = Path(docx_path).stem
    vocabulary = []
    word_forms = []

    for line in lines[1:]:
        wf = parse_word_form(line)
        if wf:
            word_forms.append(wf)
            continue
        pf = parse_pos_form(line)
        if pf:
            word_forms.append(pf)
            continue
        phrase = parse_phrase(line)
        if phrase:
            vocabulary.append(phrase)

    return {
        "title": f"八年级下册 {title}",
        "vocabulary": vocabulary,
        "wordForms": word_forms,
    }


def write_js(target_path: Path, unit_data: dict):
    content = "const unitData = " + json.dumps(unit_data, ensure_ascii=False, indent=2) + ";\n\n"
    content += "if (typeof module !== 'undefined' && module.exports) {\n  module.exports = { unitData };\n}\n"
    content += "if (typeof window !== 'undefined') {\n  window.unitData = unitData;\n}\n"
    target_path.write_text(content, encoding="utf-8")


def main():
    TARGET_DIR.mkdir(parents=True, exist_ok=True)
    generated = []
    for docx_path in sorted(SOURCE_DIR.glob("*.docx")):
        unit_data = build_unit_data(docx_path)
        target_name = detect_target_name(docx_path.name)
        target_path = TARGET_DIR / target_name
        write_js(target_path, unit_data)
        generated.append(target_path.name)
    print("Generated:")
    for name in generated:
        print(name)


if __name__ == "__main__":
    main()
