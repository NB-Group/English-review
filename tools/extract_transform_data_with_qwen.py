import argparse
import json
import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from docx import Document
from dotenv import load_dotenv
from openai import OpenAI

# 加载项目根目录 .env
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

MODEL_NAME = "Qwen/Qwen3-8B"
API_KEY = os.environ.get("SILICONFLOW_API_KEY", "")
BASE_URL = "https://api.siliconflow.cn/v1"
SOURCE_DIR = Path("G:/Documents/八年级下 英语词组/2026_06_17_Unit 6 reading(1)")
PROJECT_DIR = Path("F:/Code/Web/English-review")
TXT_DIR = PROJECT_DIR / "tools" / "word_txt"
OUTPUT_DIR = PROJECT_DIR / "data" / "八年级" / "Down" / "transform"


def iter_docx_files() -> list[Path]:
    return [
        SOURCE_DIR / name
        for name in os.listdir(SOURCE_DIR)
        if name.lower().endswith(".docx") and not name.startswith("~$")
    ]


def docx_to_text(docx_path: Path) -> str:
    doc = Document(str(docx_path))
    blocks: list[str] = []

    for paragraph in doc.paragraphs:
        text = paragraph.text.strip()
        if text:
            blocks.append(text)

    for table in doc.tables:
        for row in table.rows:
            cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
            if cells:
                blocks.append(" | ".join(cells))

    return "\n".join(blocks)


def detect_unit_key(filename: str) -> str:
    unit_match = re.search(r"\bU(?:nit)?\s*(\d+)", filename, re.IGNORECASE)
    unit_num = unit_match.group(1) if unit_match else "0"
    lower = filename.lower()

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

    return f"U{unit_num}-{module}"


def write_txt_snapshot(unit_key: str, text: str) -> Path:
    TXT_DIR.mkdir(parents=True, exist_ok=True)
    txt_path = TXT_DIR / f"{unit_key}.txt"
    txt_path.write_text(text, encoding="utf-8")
    return txt_path


def build_prompt(unit_key: str, text: str) -> str:
    return (
        "Please organize the word-form transformation data from the following middle school English vocabulary text into structured JSON.\n"
        "\n"
        "Only extract true word-form/part-of-speech transformations, for example:\n"
        "- light (verb: to ignite) -> past tense lit, past participle lit\n"
        "- happy (adjective) -> noun happiness\n"
        "- able (adjective) -> noun ability, verb enable, negative unable\n"
        "\n"
        "Do NOT extract:\n"
        "- Plain word definitions without derivation\n"
        "- Phrase translations\n"
        "- Sentence translations\n"
        "- Items with only one English word and no transformation relationship\n"
        "\n"
        'Output JSON format (grouped by source word):\n'
        "{\n"
        f'  "unit": "{unit_key}",\n'
        f'  "model": "{MODEL_NAME}",\n'
        '  "transformGroups": [\n'
        "    {\n"
        '      "source": "light",\n'
        '      "sourcePos": "verb",\n'
        '      "sourceMeaning": "to ignite",\n'
        '      "transforms": [\n'
        '        {"type": "past tense", "form": "lit", "meaning": "点燃（过去式）"},\n'
        '        {"type": "past participle", "form": "lit", "meaning": "点燃（过去分词）"}\n'
        "      ]\n"
        "    },\n"
        "    {\n"
        '      "source": "happy",\n'
        '      "sourcePos": "adj",\n'
        '      "sourceMeaning": "开心的",\n'
        '      "transforms": [\n'
        '        {"type": "noun", "form": "happiness", "meaning": "幸福"},\n'
        '        {"type": "adverb", "form": "happily", "meaning": "开心地"}\n'
        "      ]\n"
        "    }\n"
        "  ]\n"
        "}\n"
        "\n"
        "Requirements:\n"
        "1. source/form must be complete English words, no fragments.\n"
        "2. Use Chinese for sourceMeaning and each transform's meaning field.\n"
        "3. type in English (noun, verb, past tense, past participle, adjective, adverb, comparative, superlative, plural, present participle, negative, etc.).\n"
        "4. Group by source word - multiple transforms of the same source go in one transforms array.\n"
        "5. Skip when source and form are identical.\n"
        "6. If unsure, do not fabricate. Return empty transformGroups array if no transformations found.\n"
        "\n"
        "Text:\n"
        f"{text}\n"
    ).strip()


def parse_json_response(content: str) -> dict:
    text = content.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        text = text[start:end + 1]
    return json.loads(text)


def clean_groups(data: dict, unit_key: str) -> dict:
    cleaned_groups = []
    seen_sources = {}  # source_lower -> set of form_lower

    for group in data.get("transformGroups", []):
        source = str(group.get("source", "")).strip()
        if not re.fullmatch(r"[A-Za-z][A-Za-z'-]*", source):
            continue

        source_pos = str(group.get("sourcePos", "")).strip()
        source_meaning = str(group.get("sourceMeaning", "")).strip()
        transforms = group.get("transforms", [])

        if not isinstance(transforms, list) or len(transforms) == 0:
            continue

        cleaned_transforms = []
        if source.lower() not in seen_sources:
            seen_sources[source.lower()] = set()

        for t in transforms:
            form = str(t.get("form", "")).strip()
            transform_type = str(t.get("type", "")).strip() or "对应词形"
            meaning = str(t.get("meaning", "")).strip()

            if not re.fullmatch(r"[A-Za-z][A-Za-z'-]*", form):
                continue
            if source.lower() == form.lower():
                continue
            if form.lower() in seen_sources[source.lower()]:
                continue

            seen_sources[source.lower()].add(form.lower())
            cleaned_transforms.append({
                "type": transform_type,
                "form": form,
                "meaning": meaning,
            })

        if cleaned_transforms:
            cleaned_groups.append({
                "source": source,
                "sourcePos": source_pos,
                "sourceMeaning": source_meaning,
                "transforms": cleaned_transforms,
            })

    return {
        "unit": unit_key,
        "model": MODEL_NAME,
        "transformGroups": cleaned_groups,
    }


def call_qwen(unit_key: str, text: str) -> dict:
    client = OpenAI(api_key=API_KEY, base_url=BASE_URL, timeout=45.0, max_retries=0)
    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": "你是数据清洗程序，只输出 JSON object。"},
            {"role": "user", "content": build_prompt(unit_key, text)},
        ],
        temperature=0,
        response_format={"type": "json_object"},
        extra_body={"enable_thinking": False},
    )
    return clean_groups(parse_json_response(response.choices[0].message.content), unit_key)


def process_one_unit(unit_key: str, docx_path: Path, force: bool) -> tuple[str, int, str | None]:
    """Process a single DOCX file: extract text, call Qwen, save JSON.
    Returns (unit_key, question_count, error_message_or_None)."""
    out_path = OUTPUT_DIR / f"{unit_key}.json"

    text = docx_to_text(docx_path)
    txt_path = write_txt_snapshot(unit_key, text)
    print(f"txt {unit_key}: {txt_path}", flush=True)

    if out_path.exists() and not force:
        existing = json.loads(out_path.read_text(encoding="utf-8"))
        groups = existing.get("transformGroups", existing.get("transformQuestions", []))
        total_q = sum(len(g.get("transforms", [])) for g in groups) if isinstance(groups, list) else len(groups)
        print(f"skip {unit_key}: exists", flush=True)
        return (unit_key, total_q, None)

    try:
        data = call_qwen(unit_key, text)
        out_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        count = sum(len(g.get("transforms", [])) for g in data.get("transformGroups", []))
        print(f"done {unit_key}: {count}", flush=True)
        return (unit_key, count, None)
    except Exception as exc:
        msg = str(exc)
        print(f"fail {unit_key}: {msg}", flush=True)
        return (unit_key, 0, msg)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--unit", help="Only process unit keys containing this text, e.g. U1 or U6-reading.")
    parser.add_argument("--force", action="store_true", help="Overwrite existing transform JSON files.")
    parser.add_argument("--txt-only", action="store_true", help="Only convert Word files to txt snapshots.")
    parser.add_argument("--workers", type=int, default=5, help="Number of parallel API workers (default 5).")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"source exists: {SOURCE_DIR.exists()}", flush=True)

    # Collect tasks
    tasks: list[tuple[str, Path]] = []
    for docx_path in sorted(iter_docx_files(), key=lambda item: item.name.lower()):
        unit_key = detect_unit_key(docx_path.name)
        if args.unit and args.unit.lower() not in unit_key.lower():
            continue
        tasks.append((unit_key, docx_path))
        # Always extract txt (fast)
        text = docx_to_text(docx_path)
        write_txt_snapshot(unit_key, text)

    if args.txt_only:
        print(f"txt_only: wrote {len(tasks)} snapshots", flush=True)
        return

    print(f"Processing {len(tasks)} units with {args.workers} parallel workers...", flush=True)

    generated = []
    failures = []

    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {
            executor.submit(process_one_unit, unit_key, path, args.force): unit_key
            for unit_key, path in tasks
        }
        for future in as_completed(futures):
            unit_key, count, error = future.result()
            if error:
                failures.append({"unit": unit_key, "file": unit_key, "error": error})
            else:
                generated.append((unit_key, count))

    # Sort for consistent output
    generated.sort(key=lambda x: x[0].lower())

    print("generated:", flush=True)
    for unit_key, count in generated:
        print(f"{unit_key}: {count}", flush=True)

    if failures:
        print("failures:", flush=True)
        for item in failures:
            print(json.dumps(item, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
