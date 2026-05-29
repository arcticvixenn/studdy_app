from typing import List, Dict
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.cluster import KMeans

from src.text_preprocessor import split_sentences, normalize_for_ml


class TopicModel:
    def __init__(self, max_topics: int = 3):
        self.max_topics = max_topics

    def detect_topics(self, text: str) -> List[Dict]:
        sentences = split_sentences(text)

        if len(sentences) < 3:
            return [{
                "topicId": 0,
                "title": "Основна тема",
                "sentences": sentences
            }]

        normalized = [normalize_for_ml(sentence) for sentence in sentences]
        normalized = [item for item in normalized if item.strip()]

        if len(normalized) < 3:
            return [{
                "topicId": 0,
                "title": "Основна тема",
                "sentences": sentences
            }]

        topic_count = min(self.max_topics, len(normalized))

        vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            min_df=1
        )

        matrix = vectorizer.fit_transform(normalized)

        model = KMeans(
            n_clusters=topic_count,
            random_state=42,
            n_init=10
        )

        labels = model.fit_predict(matrix)

        topics = []

        for topic_id in range(topic_count):
            topic_sentences = [
                sentences[i]
                for i, label in enumerate(labels)
                if label == topic_id
            ]

            if not topic_sentences:
                continue

            topics.append({
                "topicId": int(topic_id),
                "title": f"Тема {topic_id + 1}",
                "sentences": topic_sentences
            })

        return topics
