from typing import List
import numpy as np
from sklearn.ensemble import RandomForestClassifier

from src.text_preprocessor import tokenize


class DifficultyModel:
    def __init__(self):
        self.model = RandomForestClassifier(
            n_estimators=120,
            random_state=42,
            max_depth=6
        )
        self.is_trained = False

    def extract_features(self, sentence: str) -> List[float]:
        tokens = tokenize(sentence)

        word_count = len(tokens)
        char_count = len(sentence)
        avg_word_len = np.mean([len(token) for token in tokens]) if tokens else 0
        long_words = len([token for token in tokens if len(token) >= 8])
        comma_count = sentence.count(",")
        special_terms = len([
            token for token in tokens
            if token in {
                "класифікація", "регресія", "кластеризація",
                "нейронна", "модель", "алгоритм", "датасет",
                "вектор", "ознака", "навчання", "ймовірність",
                "функція", "помилка", "оптимізація"
            }
        ])

        return [
            word_count,
            char_count,
            avg_word_len,
            long_words,
            comma_count,
            special_terms
        ]

    def auto_label(self, sentence: str) -> int:
        features = self.extract_features(sentence)

        word_count = features[0]
        long_words = features[3]
        special_terms = features[5]

        score = 0

        if word_count > 14:
            score += 1

        if long_words >= 3:
            score += 1

        if special_terms >= 2:
            score += 1

        if score <= 1:
            return 1

        if score == 2:
            return 2

        return 3

    def train(self, sentences: List[str]):
        if not sentences:
            return

        x = [self.extract_features(sentence) for sentence in sentences]
        y = [self.auto_label(sentence) for sentence in sentences]

        if len(set(y)) < 2:
            y = [1 if i % 3 == 0 else 2 if i % 3 == 1 else 3 for i in range(len(sentences))]

        self.model.fit(x, y)
        self.is_trained = True

    def predict(self, sentence: str) -> int:
        if not self.is_trained:
            return self.auto_label(sentence)

        features = [self.extract_features(sentence)]
        return int(self.model.predict(features)[0])
