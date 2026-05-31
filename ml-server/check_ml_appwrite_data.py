import os
import json
import urllib.request
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

endpoint = os.getenv("APPWRITE_ENDPOINT", "")
project_id = os.getenv("APPWRITE_PROJECT_ID", "")
database_id = os.getenv("APPWRITE_DATABASE_ID", "")
api_key = os.getenv("APPWRITE_API_KEY", "")

collections = {
    "users": os.getenv("APPWRITE_USERS_COLLECTION_ID", "users"),
    "posts": os.getenv("APPWRITE_POSTS_COLLECTION_ID", "posts"),
    "courses": os.getenv("APPWRITE_COURSES_COLLECTION_ID", "courses"),
    "lessons": os.getenv("APPWRITE_LESSONS_COLLECTION_ID", "lessons"),
    "quizzes": os.getenv("APPWRITE_QUIZZES_COLLECTION_ID", "quizzes"),
    "questions": os.getenv("APPWRITE_QUESTIONS_COLLECTION_ID", "questions"),
    "answers": os.getenv("APPWRITE_ANSWERS_COLLECTION_ID", "answers"),
    "view_events": os.getenv("APPWRITE_VIEW_EVENTS_COLLECTION_ID", "view_events"),
    "search_events": os.getenv("APPWRITE_SEARCH_EVENTS_COLLECTION_ID", "search_events"),
}

print("=" * 80)
print("APPWRITE CONFIG")
print("endpoint:", endpoint)
print("project_id:", project_id)
print("database_id:", database_id)
print("api_key:", "OK" if api_key else "MISSING")
print("=" * 80)

if not endpoint or not project_id or not database_id or not api_key:
    raise SystemExit("Missing Appwrite config in .env")

headers = {
    "X-Appwrite-Project": project_id,
    "X-Appwrite-Key": api_key,
}

def request(path):
    url = endpoint.rstrip("/") + path
    req = urllib.request.Request(url, headers=headers, method="GET")

    with urllib.request.urlopen(req, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))

for name, collection_id in collections.items():
    try:
        data = request(f"/databases/{database_id}/collections/{collection_id}/documents")
        print(f"{name:15} {collection_id:20} total={data.get('total')} docs={len(data.get('documents', []))}")
    except Exception as error:
        print(f"{name:15} {collection_id:20} ERROR: {error}")
