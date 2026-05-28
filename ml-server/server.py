import os
import math
from typing import Any, Dict, List

import numpy as np
import pandas as pd
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from appwrite.client import Client
from appwrite.services.databases import Databases
from appwrite.query import Query
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import joblib
from synthetic_data import generate_synthetic_dataset

load_dotenv()

app = FastAPI(title="Studdy ML Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = "hybrid_recommender.pkl"

client = Client()
client.set_endpoint(os.getenv("APPWRITE_ENDPOINT"))
client.set_project(os.getenv("APPWRITE_PROJECT_ID"))
client.set_key(os.getenv("APPWRITE_API_KEY"))

databases = Databases(client)

DATABASE_ID = os.getenv("APPWRITE_DATABASE_ID")

COURSES_ID = os.getenv("APPWRITE_COURSES_COLLECTION_ID", "courses")
LESSONS_ID = os.getenv("APPWRITE_LESSONS_COLLECTION_ID", "lessons")
POSTS_ID = os.getenv("APPWRITE_POSTS_COLLECTION_ID", "posts")
QUIZ_ANSWERS_ID = os.getenv("APPWRITE_QUIZ_ANSWERS_COLLECTION_ID", "quiz_answers")
QUIZ_ATTEMPTS_ID = os.getenv("APPWRITE_QUIZ_ATTEMPTS_COLLECTION_ID", "quiz_attempts")
SAVES_ID = os.getenv("APPWRITE_SAVES_COLLECTION_ID", "saves")
LIKES_ID = os.getenv("APPWRITE_LIKES_COLLECTION_ID", "likes")


def list_all_documents(collection_id: str, limit: int = 500) -> List[Dict[str, Any]]:
    try:
        result = databases.list_documents(
            DATABASE_ID,
            collection_id,
            queries=[Query.limit(limit)]
        )

        if hasattr(result, "documents"):
            return [appwrite_doc_to_dict(document) for document in result.documents]

        if isinstance(result, dict):
            return result.get("documents", [])

        return []
    except Exception as error:
        print(f"Cannot load collection {collection_id}: {error}")
        return []


def safe_text(value: Any) -> str:
    return str(value or "").lower().strip()

def is_repetitive_text(text: str) -> bool:
    value = safe_text(text).replace(" ", "")

    if len(value) < 4:
        return True

    unique_chars = set(value)

    # aaaaaaaa, fffff, 111111
    if len(unique_chars) <= 2 and len(value) >= 5:
        return True

    # Дуже мало різних символів для довгого слова
    if len(value) >= 7 and len(unique_chars) <= 3:
        return True

    # Багато приголосних підряд без нормальної структури слова
    vowels = set("аеєиіїоуюяaeiou")
    vowel_count = sum(1 for char in value if char in vowels)

    if len(value) >= 7 and vowel_count <= 1:
        return True

    # asasasasas / fgfgfgfg
    if len(value) >= 8:
        chunk = value[:2]
        repeated = chunk * (len(value) // 2)

        if value.startswith(repeated[: len(value) - 1]):
            return True

    return False

def is_bad_title(title: str) -> bool:
    value = safe_text(title)

    if not value:
        return True

    cleaned = value.replace(" ", "")

    blocked_test_titles = {
        "kapec",
        "aaaaa",
        "asaaaaaaaa",
        "fgdfgfdg",
        "test",
        "тест",
    }

    if cleaned in blocked_test_titles:
        return True

    if is_repetitive_text(cleaned):
        return True

    words = value.split()

    meaningful_words = [
        word for word in words
        if len(word) >= 4
    ]

    # Якщо назва складається з одного короткого/сумнівного слова
    if len(words) <= 1 and len(cleaned) < 10:
        return True

    # Якщо немає жодного нормального слова
    if len(meaningful_words) == 0:
        return True

    return False



def has_meaningful_content(item: Dict[str, Any]) -> bool:
    title = safe_text(item.get("title"))
    text = safe_text(item.get("text"))
    content_type = item.get("type")

    combined = f"{title} {text}".strip()

    if not combined:
        return False

    # Для постів фільтр суворий, бо там часто тестове сміття
    if content_type == "post":
        if is_bad_title(title):
            return False

        if is_repetitive_text(combined):
            return False

        if len(combined) < 60:
            return False

        meaningful_words = [
            word for word in combined.split()
            if len(word) >= 4
        ]

        if len(meaningful_words) < 6:
            return False

    # Для уроків фільтр м'якший:
    # урок може мати коротку назву, але важливо, щоб був хоч якийсь матеріал
    if content_type == "lesson":
        if is_repetitive_text(title):
            return False

        if len(combined) < 30:
            return False

    # Для курсів фільтр теж м'якший:
    # курс може мати коротку назву, але не має бути повним сміттям
    if content_type == "course":
        if is_repetitive_text(title):
            return False

        if len(combined) < 25:
            return False

    return True



def appwrite_doc_to_dict(document: Any) -> Dict[str, Any]:
    result = {}

    if isinstance(document, dict):
        result.update(document)

    if hasattr(document, "model_dump"):
        try:
            result.update(document.model_dump(by_alias=True))
        except TypeError:
            result.update(document.model_dump())

    if hasattr(document, "dict"):
        try:
            result.update(document.dict(by_alias=True))
        except TypeError:
            result.update(document.dict())

    if hasattr(document, "__dict__"):
        result.update(dict(document.__dict__))

    # Appwrite SDK може зберігати користувацькі поля тут
    possible_data_sources = [
        result.get("data"),
        getattr(document, "data", None),
        result.get("_data"),
        getattr(document, "_data", None),
    ]

    for source in possible_data_sources:
        if isinstance(source, dict):
            result.update(source)

    result.pop("data", None)
    result.pop("_data", None)

    return result


def content_to_text(item: Dict[str, Any], content_type: str) -> str:
    if content_type == "course":
        return " ".join([
            safe_text(item.get("title")),
            safe_text(item.get("description")),
            safe_text(item.get("category")),
            safe_text(item.get("level")),
        ])

    if content_type == "lesson":
        return " ".join([
            safe_text(item.get("title")),
            safe_text(item.get("description")),
            safe_text(item.get("content")),
            safe_text(item.get("mediaType")),
        ])

    return " ".join([
        safe_text(item.get("title")),
        safe_text(item.get("content")),
        safe_text(item.get("category")),
        safe_text(item.get("mediaType")),
    ])


def build_user_profiles(answers: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    profiles: Dict[str, Dict[str, Any]] = {}

    for answer in answers:
        user_id = answer.get("userId")
        if not user_id:
            continue

        topic = answer.get("topic") or "Без теми"
        is_correct = bool(answer.get("isCorrect"))
        difficulty = int(answer.get("difficulty") or 1)

        if user_id not in profiles:
            profiles[user_id] = {
                "userId": user_id,
                "totalAnswers": 0,
                "correctAnswers": 0,
                "topicStats": {},
                "avgDifficulty": 0,
                "difficultySum": 0,
            }

        profile = profiles[user_id]
        profile["totalAnswers"] += 1
        profile["difficultySum"] += difficulty

        if is_correct:
            profile["correctAnswers"] += 1

        if topic not in profile["topicStats"]:
            profile["topicStats"][topic] = {
                "topic": topic,
                "total": 0,
                "correct": 0,
                "incorrect": 0,
                "difficultySum": 0,
            }

        topic_stat = profile["topicStats"][topic]
        topic_stat["total"] += 1
        topic_stat["difficultySum"] += difficulty

        if is_correct:
            topic_stat["correct"] += 1
        else:
            topic_stat["incorrect"] += 1

    for profile in profiles.values():
        total = profile["totalAnswers"]
        profile["accuracy"] = profile["correctAnswers"] / total if total else 0
        profile["avgDifficulty"] = profile["difficultySum"] / total if total else 1

        weak_topics = []

        for topic_stat in profile["topicStats"].values():
            total_topic = topic_stat["total"]
            accuracy = topic_stat["correct"] / total_topic if total_topic else 0
            avg_difficulty = topic_stat["difficultySum"] / total_topic if total_topic else 1

            topic_stat["accuracy"] = accuracy
            topic_stat["avgDifficulty"] = avg_difficulty

            if accuracy < 0.75 or topic_stat["incorrect"] > 0:
                weak_topics.append(topic_stat["topic"])

        profile["weakTopics"] = weak_topics

    return profiles


def build_content_items(
    courses: List[Dict[str, Any]],
    lessons: List[Dict[str, Any]],
    posts: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    items = []

    for course in courses:
        items.append({
            "id": course.get("$id"),
            "type": "course",
            "title": course.get("title"),
            "text": content_to_text(course, "course"),
            "raw": course,
        })

    for lesson in lessons:
        items.append({
            "id": lesson.get("$id"),
            "type": "lesson",
            "title": lesson.get("title"),
            "text": content_to_text(lesson, "lesson"),
            "courseId": lesson.get("courseId"),
            "raw": lesson,
        })

    for post in posts:
        items.append({
            "id": post.get("$id"),
            "type": "post",
            "title": post.get("title"),
            "text": content_to_text(post, "post"),
            "mediaType": post.get("mediaType"),
            "likesCount": int(post.get("likesCount") or 0),
            "commentsCount": int(post.get("commentsCount") or 0),
            "raw": post,
        })

    return [
        item
        for item in items
        if item.get("id") and has_meaningful_content(item)
    ]


def compute_text_similarity(content_text: str, topics: List[str]) -> float:
    if not topics:
        return 0.0

    topic_text = " ".join(topics)

    if not content_text.strip() or not topic_text.strip():
        return 0.0

    vectorizer = TfidfVectorizer()
    matrix = vectorizer.fit_transform([content_text, topic_text])
    return float(cosine_similarity(matrix[0:1], matrix[1:2])[0][0])


def content_type_value(content_type: str) -> int:
    if content_type == "course":
        return 1
    if content_type == "lesson":
        return 2
    if content_type == "post":
        return 3
    return 0


def media_type_value(item: Dict[str, Any]) -> int:
    media_type = item.get("mediaType") or item.get("raw", {}).get("mediaType")

    if media_type == "video":
        return 2
    if media_type == "image":
        return 1
    return 0


def build_dataset(
    profiles: Dict[str, Dict[str, Any]],
    content_items: List[Dict[str, Any]],
) -> pd.DataFrame:
    raw_rows = []

    for user_id, profile in profiles.items():
        weak_topics = profile.get("weakTopics", [])
        all_topics = list(profile.get("topicStats", {}).keys())

        if not all_topics:
            continue

        user_rows = []

        for item in content_items:
            similarity_to_weak = compute_text_similarity(item["text"], weak_topics)
            similarity_to_all = compute_text_similarity(item["text"], all_topics)

            popularity = (
                int(item.get("likesCount") or 0) +
                int(item.get("commentsCount") or 0)
            )

            text_length = len(item.get("text", ""))

            # Сирий score: наскільки контент потенційно корисний користувачу
            raw_score = (
                similarity_to_weak * 1.8 +
                similarity_to_all * 1.0 +
                min(popularity / 20, 1) * 0.15 +
                min(text_length / 3000, 1) * 0.1
            )

            user_rows.append({
                "userId": user_id,
                "contentId": item["id"],
                "contentType": item["type"],
                "similarityToWeakTopics": similarity_to_weak,
                "similarityToKnownTopics": similarity_to_all,
                "userAccuracy": profile.get("accuracy", 0),
                "userAnswersCount": profile.get("totalAnswers", 0),
                "userAvgDifficulty": profile.get("avgDifficulty", 1),
                "weakTopicsCount": len(weak_topics),
                "contentTypeValue": content_type_value(item["type"]),
                "mediaTypeValue": media_type_value(item),
                "popularity": popularity,
                "textLength": min(text_length, 5000),
                "rawScore": raw_score,
            })

        if not user_rows:
            continue

        scores = [row["rawScore"] for row in user_rows]

        if max(scores) == min(scores):
            # Якщо всі score однакові, робимо просте розділення:
            # перша половина — позитивний клас, друга — негативний.
            sorted_rows = sorted(
                user_rows,
                key=lambda row: (
                    row["similarityToWeakTopics"],
                    row["similarityToKnownTopics"],
                    row["popularity"],
                    row["textLength"],
                ),
                reverse=True,
            )

            split_index = max(1, len(sorted_rows) // 2)

            for index, row in enumerate(sorted_rows):
                row["label"] = 1 if index < split_index else 0
                raw_rows.append(row)
        else:
            # Адаптивний поріг: найкращі матеріали для користувача — клас 1,
            # слабші за релевантністю — клас 0.
            threshold = float(np.percentile(scores, 65))

            for row in user_rows:
                row["label"] = 1 if row["rawScore"] >= threshold else 0
                raw_rows.append(row)

    dataset = pd.DataFrame(raw_rows)

    if dataset.empty:
      return dataset

    # Якщо все одно вийшов один клас, примусово створюємо баланс:
    # топ за rawScore = 1, нижня частина = 0.
    if dataset["label"].nunique() < 2 and len(dataset) >= 4:
        dataset = dataset.sort_values("rawScore", ascending=False).reset_index(drop=True)
        split_index = max(1, len(dataset) // 2)

        dataset["label"] = 0
        dataset.loc[:split_index - 1, "label"] = 1

    return dataset


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


@app.get("/health")
def health():
    return {
        "ok": True,
        "service": "studdy-ml-server",
    }


@app.post("/train")
def train_model():
    answers = list_all_documents(QUIZ_ANSWERS_ID, limit=1000)
    courses = list_all_documents(COURSES_ID, limit=500)
    lessons = list_all_documents(LESSONS_ID, limit=500)
    posts = list_all_documents(POSTS_ID, limit=500)

    profiles = build_user_profiles(answers)
    content_items = build_content_items(courses, lessons, posts)

    dataset = build_dataset(profiles, content_items)

    real_samples = len(dataset)
    synthetic_used = False
    synthetic_samples = 0

    if dataset.empty or len(dataset) < 300 or dataset["label"].nunique() < 2:
       synthetic_dataset = generate_synthetic_dataset(samples=3000)

       if dataset.empty:
        dataset = synthetic_dataset
       else:
        dataset = pd.concat([dataset, synthetic_dataset], ignore_index=True)

    synthetic_used = True
    synthetic_samples = len(synthetic_dataset)

    if dataset.empty or dataset["label"].nunique() < 2:
      raise HTTPException(
        status_code=400,
        detail="Недостатньо різноманітних даних для навчання ML-моделі."
    )

    X = dataset[FEATURE_COLUMNS]
    y = dataset["label"]

    test_size = 0.25 if len(dataset) >= 20 else 0.4

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=test_size,
        random_state=42,
        stratify=y if y.nunique() > 1 and y.value_counts().min() >= 2 else None,
    )

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=8,
        min_samples_split=2,
        min_samples_leaf=1,
        random_state=42,
        class_weight="balanced",
    )

    model.fit(X_train, y_train)

    predictions = model.predict(X_test)

    metrics = {
        "accuracy": round(float(accuracy_score(y_test, predictions)), 3),
        "precision": round(float(precision_score(y_test, predictions, zero_division=0)), 3),
        "recall": round(float(recall_score(y_test, predictions, zero_division=0)), 3),
        "f1": round(float(f1_score(y_test, predictions, zero_division=0)), 3),
    }

    importances = [
        {
            "feature": feature,
            "importance": round(float(value), 4),
        }
        for feature, value in zip(FEATURE_COLUMNS, model.feature_importances_)
    ]

    importances = sorted(importances, key=lambda item: item["importance"], reverse=True)

    joblib.dump(
        {
            "model": model,
            "features": FEATURE_COLUMNS,
            "metrics": metrics,
            "featureImportances": importances,
            "samples": len(dataset),
        },
        MODEL_PATH,
    )

    return {
        "trained": True,
        "modelType": "RandomForestClassifier",
        "samples": len(dataset),
        "realSamples": real_samples,
        "syntheticUsed": synthetic_used,
        "syntheticSamples": synthetic_samples,
        "users": len(profiles),
        "contentItems": len(content_items),
        "metrics": metrics,
        "featureImportances": importances,
    }


@app.get("/recommend/{user_id}")
def recommend_for_user(user_id: str):
    if not os.path.exists(MODEL_PATH):
        train_model()

    bundle = joblib.load(MODEL_PATH)
    model = bundle["model"]

    answers = list_all_documents(QUIZ_ANSWERS_ID, limit=1000)
    courses = list_all_documents(COURSES_ID, limit=500)
    lessons = list_all_documents(LESSONS_ID, limit=500)
    posts = list_all_documents(POSTS_ID, limit=500)

    profiles = build_user_profiles(answers)

    if user_id not in profiles:
        return {
            "trained": False,
            "message": "Для користувача ще недостатньо навчальних даних.",
            "recommendations": [],
        }

    content_items = build_content_items(courses, lessons, posts)
    dataset = build_dataset({user_id: profiles[user_id]}, content_items)

    if dataset.empty:
        return {
            "trained": False,
            "message": "Немає контенту для рекомендацій.",
            "recommendations": [],
        }

    probabilities = model.predict_proba(dataset[FEATURE_COLUMNS])[:, 1]
    dataset = dataset.copy()
    dataset["score"] = probabilities

  
    recommendations = []

    for _, row in dataset.sort_values("score", ascending=False).head(20).iterrows():
        item = next(
            (content for content in content_items if content["id"] == row["contentId"]),
            None,
        )

        if not item:
            continue

        if not has_meaningful_content(item):
            continue

        recommendations.append({
            "id": item["id"],
            "type": item["type"],
            "title": item.get("title") or "Навчальний матеріал",
            "score": round(float(row["score"]) * 100, 1),
            "courseId": item.get("courseId"),
            "mediaType": item.get("mediaType"),
            "reason": "Модель підібрала цей матеріал на основі слабких тем, профілю знань та схожості контенту.",
        })

        if len(recommendations) >= 10:
            break

    return {
        "trained": True,
        "modelType": "RandomForestClassifier",
        "metrics": bundle.get("metrics"),
        "featureImportances": bundle.get("featureImportances"),
        "recommendations": recommendations,
    }


@app.get("/debug-data")
def debug_data():
    answers = list_all_documents(QUIZ_ANSWERS_ID, limit=1000)
    courses = list_all_documents(COURSES_ID, limit=500)
    lessons = list_all_documents(LESSONS_ID, limit=500)
    posts = list_all_documents(POSTS_ID, limit=500)

    profiles = build_user_profiles(answers)
    content_items = build_content_items(courses, lessons, posts)
    dataset = build_dataset(profiles, content_items)

    label_counts = {}

    if not dataset.empty and "label" in dataset.columns:
        label_counts = dataset["label"].value_counts().to_dict()

    return {
        "answers": len(answers),
        "courses": len(courses),
        "lessons": len(lessons),
        "posts": len(posts),
        "usersWithProfiles": len(profiles),
        "contentItems": len(content_items),
        "datasetRows": len(dataset),
        "labelCounts": label_counts,
    }


@app.get("/debug-collections")
def debug_collections():
    collections = {
        "courses": COURSES_ID,
        "lessons": LESSONS_ID,
        "posts": POSTS_ID,
        "quiz_answers": QUIZ_ANSWERS_ID,
        "quiz_attempts": QUIZ_ATTEMPTS_ID,
        "saves": SAVES_ID,
        "likes": LIKES_ID,
    }

    result = {}

    for name, collection_id in collections.items():
        try:
            response = databases.list_documents(
                DATABASE_ID,
                collection_id,
                queries=[Query.limit(1)]
            )
            documents = response.documents if hasattr(response, "documents") else []
            result[name] = {
                "collectionId": collection_id,
                "ok": True,
                "count": len(documents),
            }
        except Exception as error:
            result[name] = {
                "collectionId": collection_id,
                "ok": False,
                "error": str(error),
            }

    return {
        "databaseId": DATABASE_ID,
        "projectId": os.getenv("APPWRITE_PROJECT_ID"),
        "collections": result,
    }


@app.get("/debug-answer-sample")
def debug_answer_sample():
    answers = list_all_documents(QUIZ_ANSWERS_ID, limit=3)

    return {
        "count": len(answers),
        "samples": answers,
    }