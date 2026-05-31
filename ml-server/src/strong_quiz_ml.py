import json
import random
import re
from pathlib import Path

import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import FeatureUnion, Pipeline


DATASET_PATH = Path("data/strong_quiz_dataset.jsonl")
MODEL_PATH = Path("models/strong_quiz_model.joblib")
METRICS_PATH = Path("chapter4_test_results/strong_quiz_model_metrics.json")


def clean(value: str) -> str:
    value = str(value or "").strip()
    value = value.strip(" .,:;!?«»\"'")
    value = re.sub(r"\s+", " ", value)
    return value


def normalize(value: str) -> str:
    value = str(value or "").lower()
    value = value.replace("’", "'")
    value = re.sub(r"[^\w\sа-яіїєґА-ЯІЇЄҐ'-]", " ", value, flags=re.UNICODE)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def split_sentences(text: str) -> list[str]:
    text = str(text or "").replace("\n", " ").strip()
    parts = re.split(r"(?<=[.!?])\s+", text)
    return [clean(item) for item in parts if len(clean(item)) >= 20]


def load_dataset() -> list[dict]:
    rows = []

    with open(DATASET_PATH, "r", encoding="utf-8") as file:
        for line in file:
            line = line.strip()
            if line:
                rows.append(json.loads(line))

    return rows


def same_text(a: str, b: str) -> bool:
    a = normalize(a)
    b = normalize(b)

    if not a or not b:
        return False

    if a == b:
        return True

    if a in b or b in a:
        return True

    set_a = set(a.split())
    set_b = set(b.split())

    if not set_a or not set_b:
        return False

    return len(set_a & set_b) / len(set_a | set_b) >= 0.72


def make_pair_text(topic: str, sentence: str, candidate: str) -> str:
    return f"Тема: {topic}. Речення: {sentence}. Кандидат відповіді: {candidate}."


def build_negative_pool(rows: list[dict]) -> list[str]:
    pool = []
    seen = set()

    for row in rows:
        answer = clean(row["answer"])
        key = normalize(answer)

        if key and key not in seen:
            seen.add(key)
            pool.append(answer)

    return pool


def find_known_rows(sentence: str, rows: list[dict]) -> list[dict]:
    sentence_n = normalize(sentence)
    found = []

    for row in rows:
        concept_n = normalize(row["concept"])
        answer_n = normalize(row["answer"])

        if concept_n in sentence_n or answer_n in sentence_n:
            found.append(row)

    return found


def extract_rule_candidates(sentence: str) -> list[str]:
    sentence = clean(sentence)

    patterns = [
        r"^[^—–-]{2,80}\s+[—–-]\s+це\s+(.+)$",
        r"^[^,.]{2,80}\s+використовується\s+для\s+(.+)$",
        r"^[^,.]{2,80}\s+застосовується\s+для\s+(.+)$",
        r"^[^,.]{2,80}\s+дозволяє\s+(.+)$",
        r"^[^,.]{2,80}\s+показує\s+(.+)$",
        r"^[^,.]{2,80}\s+поєднує\s+(.+)$",
        r"^[^,.]{2,80}\s+аналізує\s+(.+)$",
        r"^[^,.]{2,80}\s+приймає\s+(.+)$",
        r"^[^,.]{2,80}\s+формує\s+(.+)$",
        r"^[^,.]{2,80}\s+визначає\s+(.+)$",
    ]

    candidates = []

    for pattern in patterns:
        match = re.search(pattern, sentence, flags=re.IGNORECASE)
        if match:
            candidates.append(clean(match.group(1)))

    return candidates


def infer_question(sentence: str, known_row: dict | None) -> str:
    if known_row:
        return known_row["question"]

    sentence = clean(sentence)

    patterns = [
        (r"^(.+?)\s+[—–-]\s+це\s+(.+)$", "Що таке {subject}?"),
        (r"^(.+?)\s+використовується\s+для\s+(.+)$", "Для чого використовується {subject}?"),
        (r"^(.+?)\s+застосовується\s+для\s+(.+)$", "Для чого застосовується {subject}?"),
        (r"^(.+?)\s+дозволяє\s+(.+)$", "Що дозволяє виконувати {subject}?"),
        (r"^(.+?)\s+показує\s+(.+)$", "Що показує {subject}?"),
        (r"^(.+?)\s+поєднує\s+(.+)$", "Що поєднує {subject}?"),
        (r"^(.+?)\s+аналізує\s+(.+)$", "Що аналізує {subject}?"),
        (r"^(.+?)\s+приймає\s+(.+)$", "Що приймає {subject}?"),
        (r"^(.+?)\s+формує\s+(.+)$", "Що формує {subject}?"),
        (r"^(.+?)\s+визначає\s+(.+)$", "Що визначає {subject}?"),
    ]

    for pattern, template in patterns:
        match = re.search(pattern, sentence, flags=re.IGNORECASE)
        if match:
            subject = clean(match.group(1))
            return template.format(subject=subject)

    return f"Яке твердження правильно описує зміст речення: «{sentence}»?"



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


def train_strong_quiz_model() -> dict:
    rows = load_dataset()
    pool = build_negative_pool(rows)

    x_pairs = []
    y_pairs = []

    rng = random.Random(42)

    for row in rows:
        positive = row["answer"]

        x_pairs.append(make_pair_text(row["topic"], row["context"], positive))
        y_pairs.append(1)

        negatives = [item for item in pool if not same_text(item, positive)]
        rng.shuffle(negatives)

        for negative in negatives[:8]:
            x_pairs.append(make_pair_text(row["topic"], row["context"], negative))
            y_pairs.append(0)

    x_train, x_test, y_train, y_test = train_test_split(
        x_pairs,
        y_pairs,
        test_size=0.25,
        random_state=42,
        stratify=y_pairs,
    )

    answer_ranker = Pipeline([
        ("features", FeatureUnion([
            ("word", TfidfVectorizer(ngram_range=(1, 2), token_pattern=r"(?u)\b\w+\b")),
            ("char", TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5))),
        ])),
        ("clf", LogisticRegression(max_iter=1500, class_weight="balanced")),
    ])

    answer_ranker.fit(x_train, y_train)
    y_pred = answer_ranker.predict(x_test)

    x_diff = [
        f"{row['topic']} {row['concept']} {row['context']} {row['answer']}"
        for row in rows
    ]

    y_diff = [int(row["difficulty"]) for row in rows]

    difficulty_model = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), token_pattern=r"(?u)\b\w+\b")),
        ("clf", RandomForestClassifier(n_estimators=200, random_state=42)),
    ])

    difficulty_model.fit(x_diff, y_diff)

    metrics = {
        "datasetRows": len(rows),
        "pairSamples": len(x_pairs),
        "positiveSamples": int(sum(y_pairs)),
        "negativeSamples": int(len(y_pairs) - sum(y_pairs)),
        "answerRanker": {
            "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
            "precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
            "recall": round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
            "f1": round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
            "testSamples": len(y_test),
        },
        "difficultyPredictor": {
            "classes": sorted(list(set(y_diff))),
            "trainingSamples": len(y_diff),
        },
    }

    bundle = {
        "rows": rows,
        "answerRanker": answer_ranker,
        "difficultyModel": difficulty_model,
        "metrics": metrics,
    }

    MODEL_PATH.parent.mkdir(exist_ok=True)
    joblib.dump(bundle, MODEL_PATH)

    METRICS_PATH.parent.mkdir(parents=True, exist_ok=True)

    with open(METRICS_PATH, "w", encoding="utf-8") as file:
        json.dump(metrics, file, ensure_ascii=False, indent=2)

    return metrics


def load_model() -> dict:
    if not MODEL_PATH.exists():
        raise FileNotFoundError("Не знайдено models/strong_quiz_model.joblib. Спочатку запустіть train_strong_quiz_model.py.")

    return joblib.load(MODEL_PATH)


def generate_strong_quiz(payload: dict) -> dict:
    bundle = load_model()

    rows = bundle["rows"]
    answer_ranker = bundle["answerRanker"]
    difficulty_model = bundle["difficultyModel"]

    title = clean(payload.get("title") or payload.get("topic") or "Навчальна тема")
    text = str(payload.get("text") or "").strip()
    requested_count = int(payload.get("questionCount") or 5)

    if not text:
        raise ValueError("Поле text є обов'язковим.")

    sentences = split_sentences(text)
    questions = []
    used_answers = set()

    for sentence in sentences:
        if len(questions) >= requested_count:
            break

        known_rows = find_known_rows(sentence, rows)
        candidates = []

        for row in known_rows:
            candidates.append(row["answer"])

        candidates.extend(extract_rule_candidates(sentence))

        candidates = [clean(item) for item in candidates if clean(item)]

        unique_candidates = []
        seen = set()

        for candidate in candidates:
            key = normalize(candidate)

            if key and key not in seen:
                seen.add(key)
                unique_candidates.append(candidate)

        if not unique_candidates:
            continue

        pair_texts = [
            make_pair_text(title, sentence, candidate)
            for candidate in unique_candidates
        ]

        probabilities = answer_ranker.predict_proba(pair_texts)

        if probabilities.shape[1] == 2:
            scores = probabilities[:, 1]
        else:
            scores = probabilities[:, 0]

        ranked = sorted(
            zip(unique_candidates, scores),
            key=lambda item: float(item[1]),
            reverse=True,
        )

        correct = clean(ranked[0][0])
        correct_key = normalize(correct)

        if not correct_key or correct_key in used_answers:
            continue

        used_answers.add(correct_key)

        known_row = known_rows[0] if known_rows else None
        question_text = infer_question(sentence, known_row)

        difficulty = int(difficulty_model.predict([f"{title} {sentence} {correct}"])[0])

        option_data = make_options(correct, rows, known_row["topic"] if known_row else title, len(questions) + 1)

        questions.append({
            "questionText": question_text,
            **option_data,
            "correctAnswerText": correct,
            "explanation": f"Правильна відповідь: «{correct}». Вона була вибрана навченою ML-моделлю ранжування відповідей.",
            "topic": title,
            "difficulty": difficulty,
            "questionOrder": len(questions) + 1,
            "sourceSentence": sentence,
            "mlAnswerScore": round(float(ranked[0][1]), 4),
        })

    if not questions:
        raise ValueError("Не вдалося сформувати питання з переданого тексту.")

    keywords = []

    for row in rows:
        if len(keywords) >= 20:
            break

        keywords.append({
            "keyword": row["concept"],
            "score": 1.0,
        })

    return {
        "title": f"Тест: {title}",
        "source": "strong_trained_local_ml_pipeline",
        "modelDescription": {
            "dataset": "data/strong_quiz_dataset.jsonl",
            "answerRanking": "TF-IDF word n-grams + TF-IDF char n-grams + LogisticRegression",
            "difficultyPrediction": "TF-IDF + RandomForestClassifier",
            "questionGeneration": "ML-ranked answer selection + controlled question templates",
        },
        "modelMetrics": bundle["metrics"],
        "statistics": {
            "sentenceCount": len(sentences),
            "keywordCount": len(keywords),
            "topicCount": min(3, max(1, len(sentences) // 3)),
            "questionCount": len(questions),
        },
        "keywords": keywords,
        "topics": [
            {
                "topicId": 0,
                "title": title,
                "sentences": sentences,
            }
        ],
        "questions": questions,
        "error": None,
    }
