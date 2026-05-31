from pathlib import Path
import re

path = Path("src/strong_quiz_ml.py")
content = path.read_text(encoding="utf-8")

backup = Path("src/strong_quiz_ml.py.bak.better_options")
backup.write_text(content, encoding="utf-8")

start = content.index("def make_options(")
end = content.index("def train_strong_quiz_model", start)

new_function = r'''
def make_options(correct: str, rows: list[dict], topic: str, index: int) -> dict:
    correct = clean(correct)
    rng = random.Random(index + 42)

    def add_unique(target: list[str], value: str):
        value = clean(value)

        if not value:
            return

        if same_text(value, correct):
            return

        if any(same_text(value, existing) for existing in target):
            return

        target.append(value)

    same_topic_answers = []
    other_topic_answers = []

    for row in rows:
        answer = clean(row.get("answer", ""))
        row_topic = row.get("topic", "")

        if row_topic == topic:
            add_unique(same_topic_answers, answer)
        else:
            add_unique(other_topic_answers, answer)

    rng.shuffle(same_topic_answers)
    rng.shuffle(other_topic_answers)

    options = [correct]

    # Спочатку беремо неправильні відповіді з тієї самої теми.
    for item in same_topic_answers:
        if len(options) >= 4:
            break
        options.append(item)

    # Якщо у темі не вистачає варіантів, додаємо з інших тем.
    for item in other_topic_answers:
        if len(options) >= 4:
            break
        options.append(item)

    while len(options) < 4:
        options.append(f"інший навчальний варіант {len(options)}")

    rng.shuffle(options)

    correct_index = options.index(correct)
    letters = ["A", "B", "C", "D"]

    return {
        "optionA": options[0],
        "optionB": options[1],
        "optionC": options[2],
        "optionD": options[3],
        "correctOption": letters[correct_index],
    }


'''

content = content[:start] + new_function + content[end:]

path.write_text(content, encoding="utf-8")

print("DONE improved answer options")
print(f"Backup: {backup}")
