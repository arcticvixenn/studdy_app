import json
import random
import re
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline


DATASET_PATH = Path("data/question_ml_dataset.jsonl")
MODEL_PATH = Path("models/question_answer_selector.joblib")
METRICS_PATH = Path("chapter4_test_results/question_answer_model_metrics.json")


STOP_BAD_FRAGMENTS = [
    "єднувати",
    "єкти",
    "дозволяють оцінити",
    "метрики якості використовуються",
    "це напрям",
    "використовується для",
    "застосовується для",
]


def normalize(value: str) -> str:
    value = str(value or "").lower()
    value = value.replace("’", "'")
    value = re.sub(r"[^\w\sа-яіїєґА-ЯІЇЄҐ'-]", " ", value, flags=re.UNICODE)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def clean(value: str) -> str:
    value = str(value or "").strip()
    value = value.strip(" .,:;!?«»\"'")
    value = re.sub(r"\s+", " ", value)
    return value


def token_set(value: str) -> set[str]:
    return set(normalize(value).split())


def jaccard(a: str, b: str) -> float:
    ta = token_set(a)
    tb = token_set(b)

    if not ta or not tb:
        return 0.0

    return len(ta & tb) / len(ta | tb)


def is_same_answer(candidate: str, answer: str) -> bool:
    candidate_n = normalize(candidate)
    answer_n = normalize(answer)

    if not candidate_n or not answer_n:
        return False

    if candidate_n == answer_n:
        return True

    if candidate_n in answer_n or answer_n in candidate_n:
        return True

    return jaccard(candidate, answer) >= 0.72


def is_bad_candidate(candidate: str) -> bool:
    candidate = clean(candidate)
    lowered = normalize(candidate)

    if len(candidate) < 5:
        return True

    if len(candidate.split()) > 14:
        return True

    for fragment in STOP_BAD_FRAGMENTS:
        if fragment in lowered:
            return True

    bad_starts = [
        "це ",
        "який ",
        "яка ",
        "яке ",
        "які ",
        "використовується ",
        "застосовується ",
        "дозволяє ",
        "показує ",
    ]

    return any(lowered.startswith(item) for item in bad_starts)


def split_sentences(text: str) -> list[str]:
    text = str(text or "").replace("\n", " ").strip()
    parts = re.split(r"(?<=[.!?])\s+", text)

    return [
        clean(item)
        for item in parts
        if len(clean(item)) >= 25
    ]


def extract_candidates(sentence: str) -> list[str]:
    sentence = clean(sentence)
    candidates = []

    patterns = [
        r"^[А-ЯІЇЄҐA-Z][^—–-]{2,80}\s+[—–-]\s+це\s+(.+)$",
        r"^[А-ЯІЇЄҐA-Z][^,.]{2,80}\s+використовується\s+для\s+(.+)$",
        r"^[А-ЯІЇЄҐA-Z][^,.]{2,80}\s+застосовується\s+для\s+(.+)$",
        r"^[А-ЯІЇЄҐA-Z][^,.]{2,80}\s+дозволяє\s+(.+)$",
        r"^[А-ЯІЇЄҐA-Z][^,.]{2,80}\s+показує\s+(.+)$",
        r"^[А-ЯІЇЄҐA-Z][^,.]{2,80}\s+поєднує\s+(.+)$",
        r"^[А-ЯІЇЄҐA-Z][^,.]{2,80}\s+аналізує\s+(.+)$",
        r"^[А-ЯІЇЄҐA-Z][^,.]{2,80}\s+приймає\s+(.+)$",
        r"^[А-ЯІЇЄҐA-Z][^,.]{2,80}\s+формує\s+(.+)$",
        r"^[А-ЯІЇЄҐA-Z][^,.]{2,80}\s+визначає\s+(.+)$",
    ]

    for pattern in patterns:
        match = re.search(pattern, sentence, flags=re.IGNORECASE)

        if match:
            candidates.append(clean(match.group(1)))

    known_phrases = [
        "розмічені дані з правильними відповідями",
        "пошуку закономірностей у нерозмічених даних",
        "клас об'єкта на основі його ознак",
        "прогнозування числових значень",
        "об'єднувати схожі об'єкти у групи",
        "ознаки об'єкта для подальшої обробки",
        "перетворення даних і знаходять складні закономірності",
        "результат роботи нейронної мережі",
        "вимірювання помилки між прогнозом і правильною відповіддю",
        "поведінку схожих користувачів",
        "контентні ознаки та поведінкові сигнали користувача",
        "перетворити текстовий опис контенту у числовий вектор",
        "вимірювання схожості між текстовими векторами",
        "частку правильних передбачень серед усіх передбачень моделі",
        "precision і recall в одну узагальнену метрику класифікації",
    ]

    sentence_n = normalize(sentence)

    for phrase in known_phrases:
        if normalize(phrase) in sentence_n:
            candidates.append(phrase)

    unique = []
    seen = set()

    for candidate in candidates:
        candidate = clean(candidate)
        key = normalize(candidate)

        if key and key not in seen and not is_bad_candidate(candidate):
            seen.add(key)
            unique.append(candidate)

    return unique


def make_training_text(topic: str, sentence: str, candidate: str) -> str:
    candidate = clean(candidate)
    sentence = clean(sentence)

    features = [
        topic,
        sentence,
        "[CANDIDATE]",
        candidate,
        f"candidate_words_{len(candidate.split())}",
        f"sentence_words_{len(sentence.split())}",
    ]

    return " ".join(features)


def load_dataset() -> list[dict]:
    rows = []

    with open(DATASET_PATH, "r", encoding="utf-8") as file:
        for line in file:
            line = line.strip()

            if line:
                rows.append(json.loads(line))

    return rows


def build_answer_pool(rows: list[dict]) -> list[str]:
    pool = []
    seen = set()

    for row in rows:
        answer = clean(row["answer"])
        key = normalize(answer)

        if key and key not in seen and not is_bad_candidate(answer):
            seen.add(key)
            pool.append(answer)

    return pool


def train_question_models() -> dict:
    rows = load_dataset()
    answer_pool = build_answer_pool(rows)

    x_answer = []
    y_answer = []
    x_difficulty = []
    y_difficulty = []

    for row in rows:
        topic = row["topic"]
        sentence = row["context"]
        answer = row["answer"]
        difficulty = int(row.get("difficulty", 1))

        candidates = extract_candidates(sentence)

        if answer not in candidates:
            candidates.append(answer)

        negative_pool = [
            item
            for item in answer_pool
            if not is_same_answer(item, answer)
        ]

        random.Random(42).shuffle(negative_pool)

        candidates.extend(negative_pool[:6])

        seen = set()

        for candidate in candidates:
            candidate = clean(candidate)
            key = normalize(candidate)

            if not key or key in seen:
                continue

            seen.add(key)

            x_answer.append(make_training_text(topic, sentence, candidate))
            y_answer.append(1 if is_same_answer(candidate, answer) else 0)

        x_difficulty.append(f"{topic} {sentence} {answer}")
        y_difficulty.append(difficulty)

    answer_model = Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 2),
            token_pattern=r"(?u)\b\w+\b",
            min_df=1,
        )),
        ("clf", RandomForestClassifier(
            n_estimators=250,
            random_state=42,
            class_weight="balanced",
        )),
    ])

    if len(set(y_answer)) < 2:
        raise RuntimeError("Answer selector needs at least 2 classes.")

    x_train, x_test, y_train, y_test = train_test_split(
        x_answer,
        y_answer,
        test_size=0.25,
        random_state=42,
        stratify=y_answer,
    )

    answer_model.fit(x_train, y_train)
    y_pred = answer_model.predict(x_test)

    difficulty_model = Pipeline([
        ("tfidf", TfidfVectorizer(
            ngram_range=(1, 2),
            token_pattern=r"(?u)\b\w+\b",
            min_df=1,
        )),
        ("clf", RandomForestClassifier(
            n_estimators=160,
            random_state=42,
        )),
    ])

    difficulty_model.fit(x_difficulty, y_difficulty)

    metrics = {
        "datasetRows": len(rows),
        "answerCandidateSamples": len(x_answer),
        "positiveSamples": int(sum(y_answer)),
        "negativeSamples": int(len(y_answer) - sum(y_answer)),
        "answerSelector": {
            "accuracy": round(float(accuracy_score(y_test, y_pred)), 4),
            "precision": round(float(precision_score(y_test, y_pred, zero_division=0)), 4),
            "recall": round(float(recall_score(y_test, y_pred, zero_division=0)), 4),
            "f1": round(float(f1_score(y_test, y_pred, zero_division=0)), 4),
            "testSamples": len(y_test),
        },
        "difficultyPredictor": {
            "classes": sorted(list(set(y_difficulty))),
            "trainingSamples": len(y_difficulty),
        },
    }

    bundle = {
        "answerModel": answer_model,
        "difficultyModel": difficulty_model,
        "answerPool": answer_pool,
        "metrics": metrics,
    }

    MODEL_PATH.parent.mkdir(exist_ok=True)
    joblib.dump(bundle, MODEL_PATH)

    METRICS_PATH.parent.mkdir(exist_ok=True)

    with open(METRICS_PATH, "w", encoding="utf-8") as file:
        json.dump(metrics, file, ensure_ascii=False, indent=2)

    return metrics


def load_bundle() -> dict:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model file not found: {MODEL_PATH}. Run train_question_answer_model.py first."
        )

    return joblib.load(MODEL_PATH)


def infer_question_type(sentence: str) -> tuple[str, str]:
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
            question = template.format(subject=subject)
            return question, subject

    return f"Яке твердження правильно описує зміст речення: «{sentence}»?", ""


def make_options(correct: str, pool: list[str], order: int) -> dict:
    correct = clean(correct)

    values = [correct]
    rng = random.Random(order + 10)

    candidates = [
        item
        for item in pool
        if not is_same_answer(item, correct) and not is_bad_candidate(item)
    ]

    rng.shuffle(candidates)

    for item in candidates:
        if len(values) >= 4:
            break

        if normalize(item) not in [normalize(value) for value in values]:
            values.append(item)

    while len(values) < 4:
        values.append(f"інший навчальний варіант {len(values)}")

    rng.shuffle(values)

    correct_index = values.index(correct)
    letters = ["A", "B", "C", "D"]

    return {
        "optionA": values[0],
        "optionB": values[1],
        "optionC": values[2],
        "optionD": values[3],
        "correctOption": letters[correct_index],
    }


def generate_quiz_with_ml(payload: dict) -> dict:
    bundle = load_bundle()

    answer_model = bundle["answerModel"]
    difficulty_model = bundle["difficultyModel"]
    answer_pool = bundle["answerPool"]

    title = clean(payload.get("title") or payload.get("topic") or "Навчальна тема")
    text = str(payload.get("text") or "").strip()
    requested_count = int(payload.get("questionCount") or 5)

    if not text:
        raise ValueError("Поле text є обов'язковим.")

    sentences = split_sentences(text)
    questions = []

    for sentence in sentences:
        if len(questions) >= requested_count:
            break

        candidates = extract_candidates(sentence)

        if not candidates:
            continue

        candidate_texts = [
            make_training_text(title, sentence, candidate)
            for candidate in candidates
        ]

        if hasattr(answer_model.named_steps["clf"], "predict_proba"):
            probabilities = answer_model.predict_proba(candidate_texts)

            if probabilities.shape[1] == 2:
                scores = probabilities[:, 1]
            else:
                scores = probabilities[:, 0]
        else:
            scores = answer_model.predict(candidate_texts)

        ranked = sorted(
            zip(candidates, scores),
            key=lambda item: float(item[1]),
            reverse=True,
        )

        correct_answer = clean(ranked[0][0])

        if is_bad_candidate(correct_answer):
            continue

        question_text, subject = infer_question_type(sentence)

        difficulty_prediction = int(
            difficulty_model.predict([f"{title} {sentence} {correct_answer}"])[0]
        )

        option_data = make_options(correct_answer, answer_pool, len(questions) + 1)

        questions.append({
            "questionText": question_text,
            **option_data,
            "explanation": f"Правильна відповідь: «{correct_answer}». Її вибрано ML-моделлю з кандидатів відповіді на основі TF-IDF-ознак речення та навчального датасету.",
            "topic": title,
            "difficulty": difficulty_prediction,
            "questionOrder": len(questions) + 1,
            "sourceSentence": sentence,
            "mlAnswerScore": round(float(ranked[0][1]), 4),
            "selectedAnswer": correct_answer,
        })

    if not questions:
        raise ValueError("ML-модель не змогла сформувати якісні питання з переданого тексту.")

    keywords = []

    for item in answer_pool:
        if len(keywords) >= 20:
            break

        keywords.append({
            "keyword": item,
            "score": 1.0,
        })

    return {
        "title": f"Тест: {title}",
        "source": "trained_local_ml_question_pipeline",
        "modelDescription": {
            "dataset": "data/question_ml_dataset.jsonl",
            "answerSelection": "TF-IDF + RandomForestClassifier",
            "difficultyPrediction": "TF-IDF + RandomForestClassifier",
            "questionGeneration": "Template generation based on ML-selected answer candidate",
        },
        "modelMetrics": bundle.get("metrics", {}),
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
