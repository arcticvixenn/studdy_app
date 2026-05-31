import json
import urllib.parse
import urllib.request
import urllib.error
from pathlib import Path


ENV_PATH = Path(".env")


COLLECTION_VARS = [
    "APPWRITE_COURSES_COLLECTION_ID",
    "APPWRITE_LESSONS_COLLECTION_ID",
    "APPWRITE_POSTS_COLLECTION_ID",
    "APPWRITE_QUIZ_ANSWERS_COLLECTION_ID",
    "APPWRITE_QUIZ_ATTEMPTS_COLLECTION_ID",
    "APPWRITE_SAVES_COLLECTION_ID",
    "APPWRITE_LIKES_COLLECTION_ID",
    "APPWRITE_VIEW_EVENTS_COLLECTION_ID",
    "APPWRITE_SEARCH_EVENTS_COLLECTION_ID",
]


def load_env(path: Path) -> dict:
    env = {}

    if not path.exists():
        raise FileNotFoundError(".env file not found")

    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()

        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        value = value.strip().strip('"').strip("'")
        env[key.strip()] = value

    return env


def mask(value: str, visible: int = 5) -> str:
    if not value:
        return "<EMPTY>"
    if len(value) <= visible * 2:
        return value[0:2] + "***"
    return value[:visible] + "***" + value[-visible:]


def appwrite_get(url: str, project_id: str, api_key: str) -> dict:
    request = urllib.request.Request(
        url,
        headers={
            "X-Appwrite-Project": project_id,
            "X-Appwrite-Key": api_key,
            "Content-Type": "application/json",
        },
        method="GET",
    )

    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def main() -> None:
    env = load_env(ENV_PATH)

    endpoint = env.get("APPWRITE_ENDPOINT", "").rstrip("/")
    project_id = env.get("APPWRITE_PROJECT_ID", "")
    database_id = env.get("APPWRITE_DATABASE_ID", "")
    api_key = env.get("APPWRITE_API_KEY", "")

    print("=" * 80)
    print("APPWRITE CONFIG CHECK")
    print(f"endpoint: {endpoint}")
    print(f"project_id: {mask(project_id)}")
    print(f"database_id: {mask(database_id)}")
    print(f"api_key: {mask(api_key)}")
    print("=" * 80)

    if not endpoint or not project_id or not database_id or not api_key:
        print("ERROR: One of the main Appwrite variables is empty.")
        return

    print("COLLECTION CHECK")
    print("=" * 80)

    for var_name in COLLECTION_VARS:
        collection_id = env.get(var_name, "")

        if not collection_id:
            print(f"{var_name}: EMPTY")
            continue

        encoded_database = urllib.parse.quote(database_id, safe="")
        encoded_collection = urllib.parse.quote(collection_id, safe="")

        url = (
            f"{endpoint}/databases/{encoded_database}"
            f"/collections/{encoded_collection}/documents?limit=1"
        )

        try:
            result = appwrite_get(url, project_id, api_key)
            total = result.get("total", "unknown")
            print(f"{var_name}: OK, documents={total}")

        except urllib.error.HTTPError as error:
            body = error.read().decode("utf-8", errors="replace")
            print(f"{var_name}: HTTP ERROR {error.code}")
            print(body[:500])

        except Exception as error:
            print(f"{var_name}: ERROR")
            print(str(error))

    print("=" * 80)
    print("DONE")


if __name__ == "__main__":
    main()
