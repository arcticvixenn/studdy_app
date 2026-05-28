import random
from typing import List

import numpy as np
import pandas as pd


FEATURE_COLUMNS = [
    "similarityToWeakTopics",
    "similarityToKnownTopics",
    "userAccuracy",
    "userAnswersCount",
    "userAvgDifficulty",
    "weakTopicsCount",
    "contentTypeValue",
    "mediaTypeValue",
    "popularity",
    "textLength",
]


def generate_synthetic_dataset(samples: int = 3000) -> pd.DataFrame:
    """
    Генерує синтетичний датасет для первинного навчання ML-рекомендатора.

    label = 1 означає, що контент потенційно корисний користувачу.
    label = 0 означає, що контент менш релевантний.
    """

    rows: List[dict] = []

    for index in range(samples):
        user_accuracy = round(random.uniform(0.25, 0.95), 3)
        user_answers_count = random.randint(3, 120)
        user_avg_difficulty = round(random.uniform(1.0, 5.0), 2)
        weak_topics_count = random.randint(0, 8)

        content_type_value = random.choice([1, 2, 3])
        media_type_value = random.choice([0, 1, 2])
        popularity = random.randint(0, 150)
        text_length = random.randint(40, 5000)

        similarity_to_weak = round(random.uniform(0.0, 1.0), 3)
        similarity_to_known = round(random.uniform(0.0, 1.0), 3)

        useful_score = (
            similarity_to_weak * 0.42
            + similarity_to_known * 0.24
            + (1 - user_accuracy) * 0.12
            + min(weak_topics_count / 8, 1) * 0.08
            + min(popularity / 150, 1) * 0.06
            + min(text_length / 5000, 1) * 0.04
            + random.uniform(-0.08, 0.08)
        )

        label = 1 if useful_score >= 0.48 else 0

        rows.append(
            {
                "userId": f"synthetic_user_{random.randint(1, 100)}",
                "contentId": f"synthetic_content_{index}",
                "contentType": random.choice(["course", "lesson", "post"]),
                "similarityToWeakTopics": similarity_to_weak,
                "similarityToKnownTopics": similarity_to_known,
                "userAccuracy": user_accuracy,
                "userAnswersCount": user_answers_count,
                "userAvgDifficulty": user_avg_difficulty,
                "weakTopicsCount": weak_topics_count,
                "contentTypeValue": content_type_value,
                "mediaTypeValue": media_type_value,
                "popularity": popularity,
                "textLength": text_length,
                "label": label,
            }
        )

    dataset = pd.DataFrame(rows)

    if dataset["label"].nunique() < 2:
        half = len(dataset) // 2
        dataset.loc[:half, "label"] = 1
        dataset.loc[half:, "label"] = 0

    return dataset