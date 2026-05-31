from pathlib import Path

env_path = Path(".env")
old_text = env_path.read_text(encoding="utf-8", errors="replace")

values = {}

for line in old_text.splitlines():
    line = line.strip()

    if not line or line.startswith("#") or "=" not in line:
        continue

    key, value = line.split("=", 1)
    key = key.strip().replace("\ufeff", "")
    value = value.strip()
    values[key] = value

api_key = values.get("APPWRITE_API_KEY", "")

if not api_key:
    raise SystemExit("APPWRITE_API_KEY not found in old .env")

clean_env = f"""APPWRITE_ENDPOINT=http://localhost:8080/v1
APPWRITE_PROJECT_ID=6a1ae727000328f56b72
APPWRITE_DATABASE_ID=studdy_db
APPWRITE_API_KEY={api_key}

APPWRITE_USERS_COLLECTION_ID=users
APPWRITE_COURSES_COLLECTION_ID=courses
APPWRITE_LESSONS_COLLECTION_ID=lessons
APPWRITE_POSTS_COLLECTION_ID=posts
APPWRITE_QUIZZES_COLLECTION_ID=quizzes
APPWRITE_QUESTIONS_COLLECTION_ID=questions
APPWRITE_ANSWERS_COLLECTION_ID=answers
APPWRITE_QUIZ_ANSWERS_COLLECTION_ID=quiz_answers
APPWRITE_QUIZ_ATTEMPTS_COLLECTION_ID=quiz_attempts
APPWRITE_SAVES_COLLECTION_ID=saves
APPWRITE_LIKES_COLLECTION_ID=likes
APPWRITE_VIEW_EVENTS_COLLECTION_ID=view_events
APPWRITE_SEARCH_EVENTS_COLLECTION_ID=search_events
"""

env_path.write_text(clean_env, encoding="utf-8")

print("DONE clean .env")
print("APPWRITE_ENDPOINT=http://localhost:8080/v1")
print("APPWRITE_PROJECT_ID=6a1ae727000328f56b72")
print("APPWRITE_DATABASE_ID=studdy_db")
print("APPWRITE_API_KEY=***")
