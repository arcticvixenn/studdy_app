import json
from pathlib import Path

path = Path("data/strong_quiz_dataset.jsonl")

rows = []
with open(path, "r", encoding="utf-8") as file:
    for line in file:
        line = line.strip()
        if line:
            rows.append(json.loads(line))

augmented = []
seen = set()

def add_row(row, context):
    item = dict(row)
    item["context"] = context.strip()
    key = (item["topic"], item["concept"], item["answer"], item["context"])

    if key not in seen:
        seen.add(key)
        augmented.append(item)

for row in rows:
    topic = row["topic"]
    concept = row["concept"]
    answer = row["answer"]
    question = row["question"]

    variants = [
        row["context"],
        f"{concept} — це {answer}.",
        f"{concept} означає {answer}.",
        f"Поняття «{concept}» описує {answer}.",
        f"У темі «{topic}» поняття «{concept}» означає {answer}.",
        f"Правильне визначення поняття «{concept}» — {answer}.",
        f"{question} Відповідь: {answer}.",
    ]

    for context in variants:
        add_row(row, context)

backup = Path("data/strong_quiz_dataset.before_augmentation.jsonl")
backup.write_text(path.read_text(encoding="utf-8"), encoding="utf-8")

with open(path, "w", encoding="utf-8") as file:
    for item in augmented:
        file.write(json.dumps(item, ensure_ascii=False) + "\n")

print("DONE augmented dataset")
print("Original rows:", len(rows))
print("Augmented rows:", len(augmented))
print("Backup:", backup)
print("Saved:", path)
