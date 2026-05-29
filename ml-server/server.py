from src.quiz_routes import router as quiz_router
import os
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
VIEW_EVENTS_ID = os.getenv("APPWRITE_VIEW_EVENTS_COLLECTION_ID", "view_events")
SEARCH_EVENTS_ID = os.getenv("APPWRITE_SEARCH_EVENTS_COLLECTION_ID", "search_events")


FEATURE_COLUMNS = [
    "similarityToWeakTopics",
    "similarityToKnownTopics",
    "similarityToSearchHistory",
    "userAccuracy",
    "userAnswersCount",
    "userAvgDifficulty",
    "weakTopicsCount",
    "contentTypeValue",
    "mediaTypeValue",
    "popularity",
    "textLength",
    "viewCount",
    "searchMatchScore",
]


def safe_text(value: Any) -> str:
    return str(value or "").lower().strip()


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


def list_all_documents(collection_id: str, limit: int = 500) -> List[Dict[str, Any]]:
    try:
        result = databases.list_documents(
            DATABASE_ID,
            collection_id,
            queries=[Query.limit(limit)],
        )

        if hasattr(result, "documents"):
            return [appwrite_doc_to_dict(document) for document in result.documents]

        if isinstance(result, dict):
            return result.get("documents", [])

        return []
    except Exception as error:
        print(f"Cannot load collection {collection_id}: {error}")
        return []


def is_repetitive_text(text: str) -> bool:
    value = safe_text(text).replace(" ", "")

    if len(value) < 4:
        return True

    unique_chars = set(value)

    if len(unique_chars) <= 2 and len(value) >= 5:
        return True

    if len(value) >= 7 and len(unique_chars) <= 3:
        return True

    vowels = set("Р°РµС”РёС–С—РѕСѓСЋСЏaeiou")
    vowel_count = sum(1 for char in value if char in vowels)

    if len(value) >= 7 and vowel_count <= 1:
        return True

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
        "С‚РµСЃС‚",
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

    if len(words) <= 1 and len(cleaned) < 10:
        return True

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

    if content_type == "lesson":
        if is_repetitive_text(title):
            return False

        if len(combined) < 30:
            return False

    if content_type == "course":
        if is_repetitive_text(title):
            return False

        if len(combined) < 25:
            return False

    return True


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


def compute_text_similarity(content_text: str, topics: List[str]) -> float:
    if not topics:
        return 0.0

    topic_text = " ".join([safe_text(topic) for topic in topics])

    if not content_text.strip() or not topic_text.strip():
        return 0.0

    try:
        vectorizer = TfidfVectorizer()
        matrix = vectorizer.fit_transform([content_text, topic_text])
        return float(cosine_similarity(matrix[0:1], matrix[1:2])[0][0])
    except ValueError:
        return 0.0


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


def build_user_profiles(
    answers: List[Dict[str, Any]],
    search_events: List[Dict[str, Any]] = None,
) -> Dict[str, Dict[str, Any]]:
    profiles: Dict[str, Dict[str, Any]] = {}

    search_events = search_events or []

    for answer in answers:
        user_id = answer.get("userId")
        if not user_id:
            continue

        topic = answer.get("topic") or "Р‘РµР· С‚РµРјРё"
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
                "searchQueries": [],
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

    for event in search_events:
        user_id = event.get("userId")
        query = event.get("query")

        if not user_id or not query:
            continue

        if user_id not in profiles:
            profiles[user_id] = {
                "userId": user_id,
                "totalAnswers": 0,
                "correctAnswers": 0,
                "topicStats": {},
                "avgDifficulty": 1,
                "difficultySum": 0,
                "searchQueries": [],
            }

        profiles[user_id]["searchQueries"].append(query)

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
    view_events: List[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    view_events = view_events or []
    view_counts: Dict[str, int] = {}

    for event in view_events:
        content_id = event.get("contentId")
        if content_id:
            view_counts[content_id] = view_counts.get(content_id, 0) + 1

    items = []

    for course in courses:
        course_id = course.get("$id")

        items.append({
            "id": course_id,
            "type": "course",
            "title": course.get("title"),
            "text": content_to_text(course, "course"),
            "viewCount": view_counts.get(course_id, 0),
            "raw": course,
        })

    for lesson in lessons:
        lesson_id = lesson.get("$id")

        items.append({
            "id": lesson_id,
            "type": "lesson",
            "title": lesson.get("title"),
            "text": content_to_text(lesson, "lesson"),
            "courseId": lesson.get("courseId"),
            "viewCount": view_counts.get(lesson_id, 0),
            "raw": lesson,
        })

    for post in posts:
        post_id = post.get("$id")

        items.append({
            "id": post_id,
            "type": "post",
            "title": post.get("title"),
            "text": content_to_text(post, "post"),
            "mediaType": post.get("mediaType"),
            "likesCount": int(post.get("likesCount") or 0),
            "commentsCount": int(post.get("commentsCount") or 0),
            "viewCount": view_counts.get(post_id, 0),
            "raw": post,
        })

    return [
        item
        for item in items
        if item.get("id") and has_meaningful_content(item)
    ]


def build_dataset(
    profiles: Dict[str, Dict[str, Any]],
    content_items: List[Dict[str, Any]],
) -> pd.DataFrame:
    raw_rows = []

    for user_id, profile in profiles.items():
        weak_topics = profile.get("weakTopics", [])
        all_topics = list(profile.get("topicStats", {}).keys())
        search_queries = profile.get("searchQueries", [])

        if not all_topics and not search_queries:
            continue

        user_rows = []

        for item in content_items:
            similarity_to_weak = compute_text_similarity(item["text"], weak_topics)
            similarity_to_all = compute_text_similarity(item["text"], all_topics)
            similarity_to_search = compute_text_similarity(item["text"], search_queries)

            popularity = (
                int(item.get("likesCount") or 0)
                + int(item.get("commentsCount") or 0)
            )

            text_length = len(item.get("text", ""))
            view_count = int(item.get("viewCount") or 0)

            raw_score = (
                similarity_to_weak * 1.8
                + similarity_to_all * 1.0
                + similarity_to_search * 1.2
                + min(popularity / 20, 1) * 0.15
                + min(view_count / 20, 1) * 0.12
                + min(text_length / 3000, 1) * 0.1
            )

            user_rows.append({
                "userId": user_id,
                "contentId": item["id"],
                "contentType": item["type"],
                "similarityToWeakTopics": similarity_to_weak,
                "similarityToKnownTopics": similarity_to_all,
                "similarityToSearchHistory": similarity_to_search,
                "userAccuracy": profile.get("accuracy", 0),
                "userAnswersCount": profile.get("totalAnswers", 0),
                "userAvgDifficulty": profile.get("avgDifficulty", 1),
                "weakTopicsCount": len(weak_topics),
                "contentTypeValue": content_type_value(item["type"]),
                "mediaTypeValue": media_type_value(item),
                "popularity": popularity,
                "textLength": min(text_length, 5000),
                "viewCount": view_count,
                "searchMatchScore": similarity_to_search,
                "rawScore": raw_score,
            })

        if not user_rows:
            continue

        scores = [row["rawScore"] for row in user_rows]

        if max(scores) == min(scores):
            sorted_rows = sorted(
                user_rows,
                key=lambda row: (
                    row["similarityToWeakTopics"],
                    row["similarityToKnownTopics"],
                    row["similarityToSearchHistory"],
                    row["popularity"],
                    row["viewCount"],
                    row["textLength"],
                ),
                reverse=True,
            )

            split_index = max(1, len(sorted_rows) // 2)

            for index, row in enumerate(sorted_rows):
                row["label"] = 1 if index < split_index else 0
                raw_rows.append(row)
        else:
            threshold = float(np.percentile(scores, 65))

            for row in user_rows:
                row["label"] = 1 if row["rawScore"] >= threshold else 0
                raw_rows.append(row)

    dataset = pd.DataFrame(raw_rows)

    if dataset.empty:
        return dataset

    if dataset["label"].nunique() < 2 and len(dataset) >= 4:
        dataset = dataset.sort_values("rawScore", ascending=False).reset_index(drop=True)
        split_index = max(1, len(dataset) // 2)

        dataset["label"] = 0
        dataset.loc[:split_index - 1, "label"] = 1

    return dataset


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
    view_events = list_all_documents(VIEW_EVENTS_ID, limit=1000)
    search_events = list_all_documents(SEARCH_EVENTS_ID, limit=1000)

    profiles = build_user_profiles(answers, search_events)
    content_items = build_content_items(courses, lessons, posts, view_events)

    dataset = build_dataset(profiles, content_items)

    real_samples = len(dataset)
    synthetic_used = False
    synthetic_samples = 0

    if dataset.empty or len(dataset) < 300 or dataset["label"].nunique() < 2:
        synthetic_dataset = generate_synthetic_dataset(samples=3000)

        for column in FEATURE_COLUMNS:
            if column not in synthetic_dataset.columns:
                synthetic_dataset[column] = 0

        if dataset.empty:
            dataset = synthetic_dataset
        else:
            dataset = pd.concat([dataset, synthetic_dataset], ignore_index=True)

        synthetic_used = True
        synthetic_samples = len(synthetic_dataset)

    if dataset.empty or dataset["label"].nunique() < 2:
        raise HTTPException(
            status_code=400,
            detail="РќРµРґРѕСЃС‚Р°С‚РЅСЊРѕ СЂС–Р·РЅРѕРјР°РЅС–С‚РЅРёС… РґР°РЅРёС… РґР»СЏ РЅР°РІС‡Р°РЅРЅСЏ ML-РјРѕРґРµР»С–.",
        )

    for column in FEATURE_COLUMNS:
        if column not in dataset.columns:
            dataset[column] = 0

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
        n_estimators=250,
        max_depth=10,
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
            "realSamples": real_samples,
            "syntheticUsed": synthetic_used,
            "syntheticSamples": synthetic_samples,
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
        "viewEvents": len(view_events),
        "searchEvents": len(search_events),
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
    view_events = list_all_documents(VIEW_EVENTS_ID, limit=1000)
    search_events = list_all_documents(SEARCH_EVENTS_ID, limit=1000)

    profiles = build_user_profiles(answers, search_events)

    if user_id not in profiles:
        return {
            "trained": False,
            "message": "Р”Р»СЏ РєРѕСЂРёСЃС‚СѓРІР°С‡Р° С‰Рµ РЅРµРґРѕСЃС‚Р°С‚РЅСЊРѕ РЅР°РІС‡Р°Р»СЊРЅРёС… РґР°РЅРёС….",
            "recommendations": [],
        }

    content_items = build_content_items(courses, lessons, posts, view_events)
    dataset = build_dataset({user_id: profiles[user_id]}, content_items)

    if dataset.empty:
        return {
            "trained": False,
            "message": "РќРµРјР°С” РєРѕРЅС‚РµРЅС‚Сѓ РґР»СЏ СЂРµРєРѕРјРµРЅРґР°С†С–Р№.",
            "recommendations": [],
        }

    for column in FEATURE_COLUMNS:
        if column not in dataset.columns:
            dataset[column] = 0

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
            "title": item.get("title") or "РќР°РІС‡Р°Р»СЊРЅРёР№ РјР°С‚РµСЂС–Р°Р»",
            "score": round(float(row["score"]) * 100, 1),
            "courseId": item.get("courseId"),
            "mediaType": item.get("mediaType"),
            "reason": (
                "РњРѕРґРµР»СЊ РїС–РґС–Р±СЂР°Р»Р° С†РµР№ РјР°С‚РµСЂС–Р°Р» РЅР° РѕСЃРЅРѕРІС– СЃР»Р°Р±РєРёС… С‚РµРј, "
                "РїРѕС€СѓРєРѕРІРѕС— Р°РєС‚РёРІРЅРѕСЃС‚С–, РїРµСЂРµРіР»СЏРґС–РІ, РїСЂРѕС„С–Р»СЋ Р·РЅР°РЅСЊ С‚Р° СЃС…РѕР¶РѕСЃС‚С– РєРѕРЅС‚РµРЅС‚Сѓ."
            ),
        })

        if len(recommendations) >= 10:
            break

    return {
        "trained": True,
        "modelType": "RandomForestClassifier",
        "metrics": bundle.get("metrics"),
        "featureImportances": bundle.get("featureImportances"),
        "samples": bundle.get("samples"),
        "realSamples": bundle.get("realSamples"),
        "syntheticUsed": bundle.get("syntheticUsed"),
        "syntheticSamples": bundle.get("syntheticSamples"),
        "recommendations": recommendations,
    }


@app.get("/debug-data")
def debug_data():
    answers = list_all_documents(QUIZ_ANSWERS_ID, limit=1000)
    courses = list_all_documents(COURSES_ID, limit=500)
    lessons = list_all_documents(LESSONS_ID, limit=500)
    posts = list_all_documents(POSTS_ID, limit=500)
    view_events = list_all_documents(VIEW_EVENTS_ID, limit=1000)
    search_events = list_all_documents(SEARCH_EVENTS_ID, limit=1000)

    profiles = build_user_profiles(answers, search_events)
    content_items = build_content_items(courses, lessons, posts, view_events)
    dataset = build_dataset(profiles, content_items)

    label_counts = {}

    if not dataset.empty and "label" in dataset.columns:
        label_counts = dataset["label"].value_counts().to_dict()

    return {
        "answers": len(answers),
        "courses": len(courses),
        "lessons": len(lessons),
        "posts": len(posts),
        "viewEvents": len(view_events),
        "searchEvents": len(search_events),
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
        "view_events": VIEW_EVENTS_ID,
        "search_events": SEARCH_EVENTS_ID,
    }

    result = {}

    for name, collection_id in collections.items():
        try:
            response = databases.list_documents(
                DATABASE_ID,
                collection_id,
                queries=[Query.limit(1)],
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

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "server:app",
        host="127.0.0.1",
        port=6060,
        reload=True
    )


app.include_router(quiz_router)

