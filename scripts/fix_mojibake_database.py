import json
import os
import urllib.request
import urllib.parse
from copy import deepcopy

ENDPOINT = "http://localhost:8080/v1"
PROJECT_ID = "6a1ae727000328f56b72"
DATABASE_ID = "studdy_db"
API_KEY = os.environ.get("APPWRITE_API_KEY")

if not API_KEY:
    raise RuntimeError("APPWRITE_API_KEY is missing")

HEADERS = {
    "Content-Type": "application/json",
    "X-Appwrite-Project": PROJECT_ID,
    "X-Appwrite-Key": API_KEY,
}

COLLECTIONS = [
    "users",
    "posts",
    "courses",
    "lessons",
    "quizzes",
    "questions",
    "answers",
    "quiz_attempts",
    "quiz_answers",
    "comments",
    "saves",
    "likes",
    "view_events",
    "search_events",
    "xp_events",
    "user_progress",
]

SKIP_KEYS = {
    "$id", "$createdAt", "$updatedAt", "$permissions", "$databaseId", "$collectionId",
    "accountId", "userId", "authorId", "postId", "courseId", "lessonId", "quizId",
    "questionId", "attemptId", "imageId", "videoId", "thumbnailId",
    "imageUrl", "videoUrl", "thumbnailUrl", "avatar", "url",
}

MARKERS = [
    "Р’", "РЎ", "Рџ", "РЋ", "Р В", "РЎ", "Рµ", "Р°", "С–", "С—", "С”",
    "вЂ", "в„", "рџ", "в™", "тА", "╬"
]

def looks_bad(text: str) -> bool:
    return isinstance(text, str) and any(m in text for m in MARKERS)

def bad_score(text: str) -> int:
    return sum(text.count(m) for m in MARKERS) + text.count("�") * 10

def good_score(text: str) -> int:
    alphabet = "абвгґдеєжзиіїйклмнопрстуфхцчшщьюяАБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ"
    return sum(1 for ch in text if ch in alphabet)

def fix_mojibake(text):
    if not isinstance(text, str) or not looks_bad(text):
        return text

    candidates = []

    for enc in ("cp1251",):
        try:
            decoded = text.encode(enc).decode("utf-8")
            candidates.append(decoded)
        except Exception:
            pass

    best = text

    for candidate in candidates:
        if candidate != text and bad_score(candidate) < bad_score(best):
            best = candidate

    return best

def fix_doc_data(data):
    changed = {}
    for key, value in data.items():
        if key in SKIP_KEYS or key.startswith("$"):
            continue

        if isinstance(value, str):
            fixed = fix_mojibake(value)
            if fixed != value:
                changed[key] = fixed

    return changed

def request(method, path, body=None):
    url = ENDPOINT + path
    data = None

    if body is not None:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")

    req = urllib.request.Request(url, data=data, headers=HEADERS, method=method)

    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            raw = response.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        print("ERROR", method, path, e.code, raw)
        return None

def list_documents(collection_id):
    path = f"/databases/{DATABASE_ID}/collections/{collection_id}/documents"
    result = request("GET", path)
    return (result or {}).get("documents", [])

def update_document(collection_id, doc_id, data):
    path = f"/databases/{DATABASE_ID}/collections/{collection_id}/documents/{doc_id}"
    return request("PATCH", path, {"data": data})

def main():
    total_fixed = 0

    for collection_id in COLLECTIONS:
        docs = list_documents(collection_id)

        if not docs:
            continue

        for doc in docs:
            changes = fix_doc_data(doc)

            if changes:
                update_document(collection_id, doc["$id"], changes)
                total_fixed += 1
                print(f"FIXED DB {collection_id}/{doc['$id']}: {list(changes.keys())}")

    print(f"DONE DB MOJIBAKE FIX. Fixed documents: {total_fixed}")

if __name__ == "__main__":
    main()
