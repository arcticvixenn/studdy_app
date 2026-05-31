import json
import math
import random
from pathlib import Path
from datetime import datetime
from collections import defaultdict, Counter

import numpy as np
import matplotlib.pyplot as plt

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score


OUT_DIR = Path("chapter5_results")
OUT_DIR.mkdir(exist_ok=True)

RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

TOP_K = 3


CONTENT_ITEMS = [
    {
        "id": "ml_1",
        "title": "Типи машинного навчання",
        "topic": "machine_learning",
        "difficulty": 1,
        "text": "Машинне навчання поділяється на навчання з учителем, навчання без учителя та навчання з підкріпленням."
    },
    {
        "id": "ml_2",
        "title": "Класифікація в машинному навчанні",
        "topic": "machine_learning",
        "difficulty": 2,
        "text": "Класифікація є задачею навчання з учителем, у якій модель відносить об'єкти до наперед визначених класів."
    },
    {
        "id": "ml_3",
        "title": "Регресія та прогнозування",
        "topic": "machine_learning",
        "difficulty": 2,
        "text": "Регресія використовується для прогнозування числових значень на основі ознак об'єктів."
    },
    {
        "id": "ml_4",
        "title": "Метрики класифікації",
        "topic": "metrics",
        "difficulty": 2,
        "text": "Accuracy, precision, recall та F1-score використовуються для оцінювання якості класифікаційних моделей."
    },
    {
        "id": "ml_5",
        "title": "Матриця помилок",
        "topic": "metrics",
        "difficulty": 2,
        "text": "Матриця помилок показує кількість правильних і неправильних прогнозів для кожного класу."
    },
    {
        "id": "ml_6",
        "title": "MAE та MSE",
        "topic": "metrics",
        "difficulty": 2,
        "text": "MAE і MSE застосовуються для оцінювання якості регресійних моделей."
    },
    {
        "id": "nn_1",
        "title": "Основи нейронних мереж",
        "topic": "neural_networks",
        "difficulty": 2,
        "text": "Нейронна мережа складається з шарів штучних нейронів, які обробляють вхідні ознаки та формують прогноз."
    },
    {
        "id": "nn_2",
        "title": "Вхідний, прихований і вихідний шари",
        "topic": "neural_networks",
        "difficulty": 2,
        "text": "Вхідний шар приймає дані, приховані шари виконують перетворення, а вихідний шар формує результат."
    },
    {
        "id": "nn_3",
        "title": "Функції активації",
        "topic": "neural_networks",
        "difficulty": 3,
        "text": "Функції активації, такі як sigmoid, tanh і ReLU, додають нелінійність у нейронну мережу."
    },
    {
        "id": "rec_1",
        "title": "Content-based рекомендації",
        "topic": "recommendations",
        "difficulty": 2,
        "text": "Content-based підхід рекомендує матеріали, схожі за змістом на ті, з якими користувач уже взаємодіяв."
    },
    {
        "id": "rec_2",
        "title": "Collaborative filtering",
        "topic": "recommendations",
        "difficulty": 3,
        "text": "Collaborative filtering враховує схожість поведінки користувачів і рекомендує матеріали на основі спільних інтересів."
    },
    {
        "id": "rec_3",
        "title": "Гібридні рекомендаційні системи",
        "topic": "recommendations",
        "difficulty": 3,
        "text": "Гібридні рекомендаційні системи поєднують content-based ознаки, поведінкові дані та модель машинного навчання."
    }
]


USER_PROFILES = [
    {
        "id": "u1",
        "interests": ["machine_learning", "metrics"],
        "level": 2
    },
    {
        "id": "u2",
        "interests": ["neural_networks"],
        "level": 2
    },
    {
        "id": "u3",
        "interests": ["recommendations", "machine_learning"],
        "level": 3
    },
    {
        "id": "u4",
        "interests": ["metrics"],
        "level": 2
    },
    {
        "id": "u5",
        "interests": ["recommendations"],
        "level": 3
    },
    {
        "id": "u6",
        "interests": ["machine_learning", "neural_networks"],
        "level": 2
    }
]


def build_interactions():
    interactions = []

    for user in USER_PROFILES:
        for item in CONTENT_ITEMS:
            topic_match = item["topic"] in user["interests"]
            difficulty_match = abs(item["difficulty"] - user["level"]) <= 1

            score = 0
            if topic_match:
                score += 2
            if difficulty_match:
                score += 1

            if topic_match and difficulty_match:
                event_type = "view"
                if random.random() > 0.35:
                    event_type = "complete"
                interactions.append({
                    "userId": user["id"],
                    "itemId": item["id"],
                    "eventType": event_type,
                    "label": 1
                })
            elif topic_match and random.random() > 0.55:
                interactions.append({
                    "userId": user["id"],
                    "itemId": item["id"],
                    "eventType": "view",
                    "label": 1
                })
            elif random.random() > 0.88:
                interactions.append({
                    "userId": user["id"],
                    "itemId": item["id"],
                    "eventType": "skip",
                    "label": 0
                })

    return interactions


def split_train_test(interactions):
    positives_by_user = defaultdict(list)

    for row in interactions:
        if row["label"] == 1:
            positives_by_user[row["userId"]].append(row)

    test = []
    test_keys = set()

    for user_id, rows in positives_by_user.items():
        chosen = rows[-1]
        test.append(chosen)
        test_keys.add((chosen["userId"], chosen["itemId"]))

    train = [
        row for row in interactions
        if (row["userId"], row["itemId"]) not in test_keys
    ]

    return train, test


def item_by_id():
    return {item["id"]: item for item in CONTENT_ITEMS}


def user_by_id():
    return {user["id"]: user for user in USER_PROFILES}


def build_text_vectors():
    texts = [item["title"] + " " + item["text"] + " " + item["topic"] for item in CONTENT_ITEMS]
    vectorizer = TfidfVectorizer()
    matrix = vectorizer.fit_transform(texts)
    ids = [item["id"] for item in CONTENT_ITEMS]
    return ids, matrix


def build_user_profile_vector(user_id, train, item_ids, item_matrix):
    index = {item_id: i for i, item_id in enumerate(item_ids)}
    liked = [
        row["itemId"] for row in train
        if row["userId"] == user_id and row["label"] == 1
    ]

    liked_indices = [index[item_id] for item_id in liked if item_id in index]

    if not liked_indices:
        return None

    return item_matrix[liked_indices].mean(axis=0)


def content_score(user_id, item_id, train, item_ids, item_matrix):
    index = {item_id_value: i for i, item_id_value in enumerate(item_ids)}
    profile = build_user_profile_vector(user_id, train, item_ids, item_matrix)

    if profile is None:
        return 0.0

    item_vector = item_matrix[index[item_id]]
    score = cosine_similarity(np.asarray(profile), item_vector)[0][0]
    return float(score)


def popularity_scores(train):
    counter = Counter()

    for row in train:
        if row["label"] == 1:
            weight = 2 if row["eventType"] == "complete" else 1
            counter[row["itemId"]] += weight

    max_value = max(counter.values()) if counter else 1
    return {item_id: value / max_value for item_id, value in counter.items()}


def make_features(user_id, item_id, train, item_ids, item_matrix, pop_scores):
    users = user_by_id()
    items = item_by_id()

    user = users[user_id]
    item = items[item_id]

    sim = content_score(user_id, item_id, train, item_ids, item_matrix)
    pop = pop_scores.get(item_id, 0.0)
    topic_match = 1 if item["topic"] in user["interests"] else 0
    difficulty_distance = abs(item["difficulty"] - user["level"])

    return [sim, pop, topic_match, difficulty_distance]


def build_ml_dataset(train, item_ids, item_matrix, pop_scores):
    positive_pairs = {(row["userId"], row["itemId"]) for row in train if row["label"] == 1}

    X = []
    y = []

    for user in USER_PROFILES:
        user_id = user["id"]

        seen_items = {
            row["itemId"] for row in train
            if row["userId"] == user_id
        }

        for item in CONTENT_ITEMS:
            item_id = item["id"]

            if item_id in seen_items:
                label = 1 if (user_id, item_id) in positive_pairs else 0
                X.append(make_features(user_id, item_id, train, item_ids, item_matrix, pop_scores))
                y.append(label)

        negatives = [
            item["id"] for item in CONTENT_ITEMS
            if item["id"] not in seen_items and item["topic"] not in user["interests"]
        ]

        for item_id in negatives[:3]:
            X.append(make_features(user_id, item_id, train, item_ids, item_matrix, pop_scores))
            y.append(0)

    return np.array(X), np.array(y)


def recommend(user_id, train, method, item_ids, item_matrix, pop_scores, model=None):
    seen = {
        row["itemId"] for row in train
        if row["userId"] == user_id
    }

    candidates = [
        item["id"] for item in CONTENT_ITEMS
        if item["id"] not in seen
    ]

    scored = []

    for item_id in candidates:
        if method == "popularity":
            score = pop_scores.get(item_id, 0.0)

        elif method == "content_based":
            score = content_score(user_id, item_id, train, item_ids, item_matrix)

        elif method == "hybrid_ml":
            features = np.array([make_features(user_id, item_id, train, item_ids, item_matrix, pop_scores)])
            if model is not None and len(getattr(model, "classes_", [])) > 1:
                score = float(model.predict_proba(features)[0][1])
            else:
                score = 0.0

        else:
            score = 0.0

        scored.append({
            "itemId": item_id,
            "score": score
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:TOP_K]


def precision_at_k(recommended, relevant):
    if not recommended:
        return 0.0
    hits = sum(1 for item in recommended if item["itemId"] in relevant)
    return hits / len(recommended)


def recall_at_k(recommended, relevant):
    if not relevant:
        return 0.0
    hits = sum(1 for item in recommended if item["itemId"] in relevant)
    return hits / len(relevant)


def hit_rate_at_k(recommended, relevant):
    return 1.0 if any(item["itemId"] in relevant for item in recommended) else 0.0


def ndcg_at_k(recommended, relevant):
    dcg = 0.0

    for index, item in enumerate(recommended):
        if item["itemId"] in relevant:
            dcg += 1 / math.log2(index + 2)

    ideal_hits = min(len(relevant), len(recommended))
    idcg = sum(1 / math.log2(i + 2) for i in range(ideal_hits))

    return dcg / idcg if idcg > 0 else 0.0


def average_precision_at_k(recommended, relevant):
    if not relevant:
        return 0.0

    hits = 0
    score = 0.0

    for index, item in enumerate(recommended, start=1):
        if item["itemId"] in relevant:
            hits += 1
            score += hits / index

    return score / min(len(relevant), len(recommended)) if recommended else 0.0


def evaluate_method(method, train, test, item_ids, item_matrix, pop_scores, model=None):
    relevant_by_user = defaultdict(set)

    for row in test:
        if row["label"] == 1:
            relevant_by_user[row["userId"]].add(row["itemId"])

    rows = []

    for user in USER_PROFILES:
        user_id = user["id"]
        relevant = relevant_by_user[user_id]
        recs = recommend(user_id, train, method, item_ids, item_matrix, pop_scores, model=model)

        rows.append({
            "userId": user_id,
            "recommended": recs,
            "relevant": list(relevant),
            "precision_at_3": precision_at_k(recs, relevant),
            "recall_at_3": recall_at_k(recs, relevant),
            "hit_rate_at_3": hit_rate_at_k(recs, relevant),
            "ndcg_at_3": ndcg_at_k(recs, relevant),
            "map_at_3": average_precision_at_k(recs, relevant)
        })

    summary = {
        "method": method,
        "precision_at_3": round(float(np.mean([r["precision_at_3"] for r in rows])), 4),
        "recall_at_3": round(float(np.mean([r["recall_at_3"] for r in rows])), 4),
        "hit_rate_at_3": round(float(np.mean([r["hit_rate_at_3"] for r in rows])), 4),
        "ndcg_at_3": round(float(np.mean([r["ndcg_at_3"] for r in rows])), 4),
        "map_at_3": round(float(np.mean([r["map_at_3"] for r in rows])), 4)
    }

    return summary, rows


def create_charts(method_summaries):
    methods = [item["method"] for item in method_summaries]

    labels = {
        "popularity": "Popularity",
        "content_based": "Content-based",
        "hybrid_ml": "Hybrid ML"
    }

    x = np.arange(len(methods))
    width = 0.18

    metrics = ["precision_at_3", "recall_at_3", "hit_rate_at_3", "ndcg_at_3", "map_at_3"]

    plt.figure(figsize=(12, 6))

    for i, metric in enumerate(metrics):
        values = [item[metric] for item in method_summaries]
        plt.bar(x + (i - 2) * width, values, width, label=metric)

    plt.xticks(x, [labels.get(method, method) for method in methods])
    plt.ylabel("Значення метрики")
    plt.title("Порівняння підходів до формування рекомендацій")
    plt.ylim(0, 1.1)
    plt.legend()
    plt.tight_layout()

    path = OUT_DIR / "chapter5_recommendation_methods_comparison.png"
    plt.savefig(path, dpi=200)
    plt.close()

    return str(path)


def main():
    interactions = build_interactions()
    train, test = split_train_test(interactions)

    item_ids, item_matrix = build_text_vectors()
    pop_scores = popularity_scores(train)

    X, y = build_ml_dataset(train, item_ids, item_matrix, pop_scores)

    model = RandomForestClassifier(
        n_estimators=100,
        random_state=RANDOM_SEED,
        class_weight="balanced"
    )

    model.fit(X, y)
    train_pred = model.predict(X)

    classifier_metrics = {
        "accuracy": round(float(accuracy_score(y, train_pred)), 4),
        "precision": round(float(precision_score(y, train_pred, zero_division=0)), 4),
        "recall": round(float(recall_score(y, train_pred, zero_division=0)), 4),
        "f1": round(float(f1_score(y, train_pred, zero_division=0)), 4),
        "samples": int(len(y)),
        "positiveSamples": int(sum(y)),
        "negativeSamples": int(len(y) - sum(y))
    }

    method_summaries = []
    method_details = {}

    for method in ["popularity", "content_based", "hybrid_ml"]:
        summary, details = evaluate_method(
            method,
            train,
            test,
            item_ids,
            item_matrix,
            pop_scores,
            model=model if method == "hybrid_ml" else None
        )
        method_summaries.append(summary)
        method_details[method] = details

    chart_path = create_charts(method_summaries)

    report = {
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "dataset": {
            "contentItems": len(CONTENT_ITEMS),
            "users": len(USER_PROFILES),
            "interactions": len(interactions),
            "trainInteractions": len(train),
            "testInteractions": len(test),
            "topics": sorted(list(set(item["topic"] for item in CONTENT_ITEMS)))
        },
        "classifierMetrics": classifier_metrics,
        "methodSummaries": method_summaries,
        "methodDetails": method_details,
        "chart": chart_path
    }

    json_path = OUT_DIR / "chapter5_recommendation_evaluation_report.json"
    md_path = OUT_DIR / "chapter5_recommendation_evaluation_report.md"

    json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = []
    lines.append("# Оцінювання рекомендаційної системи для 5 розділу\n\n")
    lines.append(f"Дата запуску: {report['created_at']}\n\n")

    lines.append("## 1. Контрольний набір даних\n\n")
    lines.append(f"- Навчальних матеріалів: {report['dataset']['contentItems']}\n")
    lines.append(f"- Користувачів: {report['dataset']['users']}\n")
    lines.append(f"- Взаємодій усього: {report['dataset']['interactions']}\n")
    lines.append(f"- Train-взаємодій: {report['dataset']['trainInteractions']}\n")
    lines.append(f"- Test-взаємодій: {report['dataset']['testInteractions']}\n")
    lines.append(f"- Теми: {', '.join(report['dataset']['topics'])}\n\n")

    lines.append("## 2. Метрики класифікаційної моделі Random Forest\n\n")
    lines.append("| Метрика | Значення |\n")
    lines.append("|---|---:|\n")
    for key, value in classifier_metrics.items():
        lines.append(f"| {key} | {value} |\n")

    lines.append("\n## 3. Порівняння підходів до рекомендацій\n\n")
    lines.append("| Підхід | Precision@3 | Recall@3 | HitRate@3 | NDCG@3 | MAP@3 |\n")
    lines.append("|---|---:|---:|---:|---:|---:|\n")

    title_map = {
        "popularity": "Popularity baseline",
        "content_based": "Content-based TF-IDF",
        "hybrid_ml": "Hybrid ML / Random Forest"
    }

    for item in method_summaries:
        lines.append(
            f"| {title_map.get(item['method'], item['method'])} | "
            f"{item['precision_at_3']} | {item['recall_at_3']} | "
            f"{item['hit_rate_at_3']} | {item['ndcg_at_3']} | {item['map_at_3']} |\n"
        )

    lines.append("\n## 4. Приклади рекомендацій для користувачів\n\n")

    items = item_by_id()

    for method in ["popularity", "content_based", "hybrid_ml"]:
        lines.append(f"### {title_map.get(method, method)}\n")
        for row in method_details[method][:3]:
            rec_titles = [items[x["itemId"]]["title"] for x in row["recommended"]]
            rel_titles = [items[x]["title"] for x in row["relevant"]]
            lines.append(f"- Користувач {row['userId']}: рекомендовано: {', '.join(rec_titles)}; релевантно: {', '.join(rel_titles)}\n")
        lines.append("\n")

    lines.append("## 5. Побудований графік\n\n")
    lines.append(f"- `{chart_path}`\n\n")

    lines.append("## 6. Інтерпретація\n\n")
    lines.append("Оцінювання рекомендаційної системи виконано на контрольному наборі навчальних матеріалів і змодельованих взаємодій користувачів. ")
    lines.append("Popularity baseline використовується як найпростіший варіант порівняння, content-based підхід враховує текстову схожість матеріалів, ")
    lines.append("а hybrid ML підхід поєднує схожість контенту, популярність, збіг теми та складність матеріалу. ")
    lines.append("Порівняння цих підходів дозволяє показати, чи дає ML-логіка кращий результат порівняно з простими правилами.\n")

    md_path.write_text("".join(lines), encoding="utf-8")

    print("=== RECOMMENDATION EVALUATION SUMMARY ===")
    print(json.dumps({
        "dataset": report["dataset"],
        "classifierMetrics": classifier_metrics,
        "methodSummaries": method_summaries,
        "chart": chart_path
    }, ensure_ascii=False, indent=2))

    print(f"\nSaved: {json_path}")
    print(f"Saved: {md_path}")
    print(f"Chart: {chart_path}")


if __name__ == "__main__":
    main()
