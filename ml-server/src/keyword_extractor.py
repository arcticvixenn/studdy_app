from typing import List, Dict
from sklearn.feature_extraction.text import TfidfVectorizer

from src.text_preprocessor import normalize_for_ml, split_sentences


BAD_KEYWORDS = {
    "без", "дані", "даних", "основі", "дозволяє", "використовується",
    "застосовується", "оцінюється", "значень", "ціни", "температури",
    "рейтингу", "прикладу", "відома", "правильна", "відповідь",
    "може", "мають", "готових", "визначає", "складається"
}


DOMAIN_TERMS = [
    "машинне навчання",
    "навчання з учителем",
    "навчання без учителя",
    "класифікація",
    "регресія",
    "кластеризація",
    "нейронна мережа",
    "модель",
    "алгоритм",
    "датасет",
    "ознака",
    "метрика",
    "точність",
    "повнота",
    "f1-міра",
    "середня абсолютна помилка",
    "штучний інтелект",
]


class KeywordExtractor:
    def __init__(self, max_keywords: int = 20):
        self.max_keywords = max_keywords

    def is_good_keyword(self, keyword: str) -> bool:
        keyword = keyword.strip().lower()

        if len(keyword) < 4:
            return False

        words = keyword.split()

        if len(words) > 3:
            return False

        if keyword in BAD_KEYWORDS:
            return False

        if words[0] in BAD_KEYWORDS or words[-1] in BAD_KEYWORDS:
            return False

        return True

    def extract_domain_terms(self, text: str) -> List[Dict]:
        lower_text = text.lower()
        result = []

        for term in DOMAIN_TERMS:
            if term in lower_text:
                result.append({
                    "keyword": term,
                    "score": 3.0
                })

        return result

    def extract_keywords(self, text: str) -> List[Dict]:
        sentences = split_sentences(text)

        if not sentences:
            return []

        result_map = {}

        for item in self.extract_domain_terms(text):
            result_map[item["keyword"]] = item["score"]

        normalized_sentences = [normalize_for_ml(sentence) for sentence in sentences]
        normalized_sentences = [s for s in normalized_sentences if s.strip()]

        if normalized_sentences:
            vectorizer = TfidfVectorizer(
                ngram_range=(1, 2),
                min_df=1,
                max_df=0.95
            )

            matrix = vectorizer.fit_transform(normalized_sentences)
            feature_names = vectorizer.get_feature_names_out()
            scores = matrix.sum(axis=0).A1

            ranked = sorted(
                zip(feature_names, scores),
                key=lambda item: item[1],
                reverse=True
            )

            for keyword, score in ranked:
                keyword = keyword.strip().lower()

                if not self.is_good_keyword(keyword):
                    continue

                if keyword not in result_map:
                    result_map[keyword] = float(score)

        ranked_result = sorted(
            result_map.items(),
            key=lambda item: item[1],
            reverse=True
        )

        return [
            {
                "keyword": keyword,
                "score": round(float(score), 4)
            }
            for keyword, score in ranked_result[: self.max_keywords]
        ]
