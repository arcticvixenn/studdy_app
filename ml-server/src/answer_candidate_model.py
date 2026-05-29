import re
from pathlib import Path
from typing import Dict, List, Tuple

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split


MODEL_DIR = Path(__file__).resolve().parents[1] / "models"
MODEL_PATH = MODEL_DIR / "answer_candidate_model.joblib"


STOPWORDS = {
    "і", "й", "та", "або", "але", "що", "це", "як", "для", "при", "над", "під",
    "в", "у", "на", "до", "з", "із", "від", "за", "про", "між", "через",
    "який", "яка", "яке", "які", "коли", "тоді", "де", "кожного",
    "може", "можуть", "має", "мають", "було", "були", "бути", "без",
    "використовується", "дозволяє", "оцінюється", "застосовується",
    "складається", "визначає", "знаходити", "об'єднувати"
}


def normalize(text: str) -> str:
    text = str(text).lower()
    text = text.replace("’", "'")
    text = re.sub(r"[^a-zа-яіїєґ0-9'\-\s]", " ", text, flags=re.IGNORECASE)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def tokenize(text: str) -> List[str]:
    return re.findall(r"[a-zA-Zа-яА-ЯіїєґІЇЄҐ0-9'\-]+", text)


def generate_candidates(text: str, max_ngram: int = 4) -> List[str]:
    tokens = tokenize(text)
    candidates = []

    for n in range(1, max_ngram + 1):
        for i in range(0, len(tokens) - n + 1):
            phrase_tokens = tokens[i:i + n]

            if not phrase_tokens:
                continue

            first = normalize(phrase_tokens[0])
            last = normalize(phrase_tokens[-1])

            if first in STOPWORDS or last in STOPWORDS:
                continue

            phrase = " ".join(phrase_tokens).strip()
            phrase_norm = normalize(phrase)

            if len(phrase_norm) < 3:
                continue

            if phrase_norm in STOPWORDS:
                continue

            if phrase_norm not in [normalize(x) for x in candidates]:
                candidates.append(phrase)

    return candidates


def answer_match(candidate: str, answer: str) -> int:
    candidate_norm = normalize(candidate)
    answer_norm = normalize(answer)

    if not candidate_norm or not answer_norm:
        return 0

    if candidate_norm == answer_norm:
        return 1

    if answer_norm in candidate_norm and len(answer_norm) >= 4:
        return 1

    if candidate_norm in answer_norm and len(candidate_norm) >= 4:
        return 1

    return 0


class AnswerCandidateModel:
    def __init__(self):
        self.model = RandomForestClassifier(
            n_estimators=160,
            random_state=42,
            max_depth=10,
            class_weight="balanced"
        )
        self.is_trained = False

    def extract_features(self, candidate: str, sentence: str, context: str) -> List[float]:
        candidate_norm = normalize(candidate)
        sentence_norm = normalize(sentence)
        context_norm = normalize(context)

        words = candidate_norm.split()
        word_count = len(words)
        char_count = len(candidate_norm)
        avg_word_len = np.mean([len(w) for w in words]) if words else 0

        starts_upper = 1 if candidate[:1].isupper() else 0
        has_digit = 1 if any(ch.isdigit() for ch in candidate) else 0
        has_hyphen = 1 if "-" in candidate else 0

        stopword_count = len([w for w in words if w in STOPWORDS])
        stopword_ratio = stopword_count / word_count if word_count else 0

        sentence_pos = sentence_norm.find(candidate_norm)
        sentence_pos_norm = sentence_pos / max(len(sentence_norm), 1) if sentence_pos >= 0 else 1

        context_freq = context_norm.count(candidate_norm)
        sentence_freq = sentence_norm.count(candidate_norm)

        return [
            word_count,
            char_count,
            avg_word_len,
            starts_upper,
            has_digit,
            has_hyphen,
            stopword_ratio,
            sentence_pos_norm,
            context_freq,
            sentence_freq,
        ]

    def build_training_rows(self, dataset: List[Dict], max_records: int = 2500) -> Tuple[List[List[float]], List[int]]:
        x = []
        y = []

        for record in dataset[:max_records]:
            context = record["context"]
            answer = record["answer"]

            candidates = generate_candidates(context, max_ngram=4)

            positive_added = False

            for candidate in candidates[:120]:
                label = answer_match(candidate, answer)

                if label == 1:
                    positive_added = True

                x.append(self.extract_features(candidate, context, context))
                y.append(label)

            if not positive_added:
                x.append(self.extract_features(answer, context, context))
                y.append(1)

        return x, y

    def train(self, dataset: List[Dict], max_records: int = 2500) -> Dict:
        x, y = self.build_training_rows(dataset, max_records=max_records)

        if not x or len(set(y)) < 2:
            raise ValueError("Not enough training data for answer candidate model.")

        x_train, x_test, y_train, y_test = train_test_split(
            x,
            y,
            test_size=0.2,
            random_state=42,
            stratify=y
        )

        self.model.fit(x_train, y_train)
        self.is_trained = True

        y_pred = self.model.predict(x_test)

        report = classification_report(
            y_test,
            y_pred,
            output_dict=True,
            zero_division=0
        )

        return {
            "trainRows": len(x_train),
            "testRows": len(x_test),
            "positiveLabels": int(sum(y)),
            "negativeLabels": int(len(y) - sum(y)),
            "accuracy": round(float(report["accuracy"]), 4),
            "positivePrecision": round(float(report.get("1", {}).get("precision", 0)), 4),
            "positiveRecall": round(float(report.get("1", {}).get("recall", 0)), 4),
        }

    def save(self, path: Path = MODEL_PATH) -> None:
        MODEL_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump({
            "model": self.model,
            "is_trained": self.is_trained,
        }, path)

    def load(self, path: Path = MODEL_PATH) -> bool:
        if not path.exists():
            return False

        payload = joblib.load(path)
        self.model = payload["model"]
        self.is_trained = payload["is_trained"]
        return True

    def rank_candidates(self, sentence: str, context: str, limit: int = 10) -> List[Dict]:
        candidates = generate_candidates(sentence, max_ngram=4)

        if not candidates:
            return []

        rows = [
            self.extract_features(candidate, sentence, context)
            for candidate in candidates
        ]

        if self.is_trained and hasattr(self.model, "predict_proba"):
            probabilities = self.model.predict_proba(rows)

            if probabilities.shape[1] > 1:
                scores = probabilities[:, 1]
            else:
                scores = probabilities[:, 0]
        else:
            scores = np.array([0.5] * len(candidates))

        ranked = sorted(
            zip(candidates, scores),
            key=lambda item: item[1],
            reverse=True
        )

        return [
            {
                "candidate": candidate,
                "score": round(float(score), 4)
            }
            for candidate, score in ranked[:limit]
        ]
