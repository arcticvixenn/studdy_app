import json
import re
import urllib.request
from pathlib import Path
from typing import Dict, List, Any


DATA_DIR = Path(__file__).resolve().parents[1] / "data"
RAW_DIR = DATA_DIR / "raw"
PREPARED_DATASET_PATH = DATA_DIR / "qa_dataset.json"

UA_SQUAD_URLS = {
    "train": "https://huggingface.co/datasets/FIdo-AI/ua-squad/resolve/main/train.json",
    "val": "https://huggingface.co/datasets/FIdo-AI/ua-squad/resolve/main/val.json",
}


def ensure_dirs() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    RAW_DIR.mkdir(parents=True, exist_ok=True)


def normalize_text(text: str) -> str:
    if not text:
        return ""

    text = str(text)
    text = text.replace("\n", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def download_file(url: str, output_path: Path) -> bool:
    if output_path.exists() and output_path.stat().st_size > 1000:
        return True

    try:
        print(f"Downloading: {url}")
        urllib.request.urlretrieve(url, output_path)
        return True
    except Exception as error:
        print(f"Download failed: {url}")
        print(error)
        return False


def read_json(path: Path) -> Any:
    with open(path, "r", encoding="utf-8") as file:
        return json.load(file)


def extract_answer_text(answers: Any) -> str:
    if not answers:
        return ""

    if isinstance(answers, dict):
        text_value = answers.get("text")

        if isinstance(text_value, list) and text_value:
            return normalize_text(text_value[0])

        if isinstance(text_value, str):
            return normalize_text(text_value)

    if isinstance(answers, list) and answers:
        first = answers[0]

        if isinstance(first, dict):
            return normalize_text(first.get("text", ""))

        if isinstance(first, str):
            return normalize_text(first)

    return ""


def parse_squad_style(data: Any) -> List[Dict]:
    records = []

    if isinstance(data, dict) and "data" in data:
        articles = data.get("data", [])

        for article in articles:
            title = normalize_text(article.get("title", "Без теми"))

            for paragraph in article.get("paragraphs", []):
                context = normalize_text(paragraph.get("context", ""))

                for qa in paragraph.get("qas", []):
                    question = normalize_text(qa.get("question", ""))
                    answer = extract_answer_text(qa.get("answers"))

                    if context and question and answer:
                        records.append({
                            "topic": title,
                            "context": context,
                            "question": question,
                            "answer": answer
                        })

    elif isinstance(data, list):
        for item in data:
            if not isinstance(item, dict):
                continue

            context = normalize_text(item.get("context", ""))
            question = normalize_text(item.get("question", ""))
            answer = extract_answer_text(item.get("answers", item.get("answer", "")))
            topic = normalize_text(item.get("title", item.get("topic", "Без теми")))

            if context and question and answer:
                records.append({
                    "topic": topic,
                    "context": context,
                    "question": question,
                    "answer": answer
                })

    return records


def filter_records(records: List[Dict], limit: int = 3000) -> List[Dict]:
    filtered = []
    seen = set()

    for record in records:
        context = normalize_text(record["context"])
        question = normalize_text(record["question"])
        answer = normalize_text(record["answer"])
        topic = normalize_text(record.get("topic", "Без теми"))

        if len(context) < 80:
            continue

        if len(question) < 8:
            continue

        if len(answer) < 2 or len(answer) > 90:
            continue

        key = (question.lower(), answer.lower())

        if key in seen:
            continue

        seen.add(key)

        filtered.append({
            "topic": topic,
            "context": context,
            "question": question,
            "answer": answer
        })

        if len(filtered) >= limit:
            break

    return filtered


def prepare_qa_dataset(limit: int = 3000) -> List[Dict]:
    ensure_dirs()

    all_records = []

    for split_name, url in UA_SQUAD_URLS.items():
        raw_path = RAW_DIR / f"ua_squad_{split_name}.json"

        if download_file(url, raw_path):
            data = read_json(raw_path)
            records = parse_squad_style(data)
            print(f"{split_name}: parsed {len(records)} records")
            all_records.extend(records)

    prepared = filter_records(all_records, limit=limit)

    with open(PREPARED_DATASET_PATH, "w", encoding="utf-8") as file:
        json.dump(prepared, file, ensure_ascii=False, indent=2)

    print(f"Prepared dataset saved to: {PREPARED_DATASET_PATH}")
    print(f"Prepared records: {len(prepared)}")

    return prepared


def load_prepared_dataset() -> List[Dict]:
    if not PREPARED_DATASET_PATH.exists():
        return prepare_qa_dataset()

    with open(PREPARED_DATASET_PATH, "r", encoding="utf-8") as file:
        return json.load(file)


if __name__ == "__main__":
    prepare_qa_dataset(limit=3000)
