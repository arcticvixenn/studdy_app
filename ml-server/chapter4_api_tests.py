import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path


BASE_URL = os.environ.get("STUDDY_ML_API", "http://127.0.0.1:6060")
OUTPUT_DIR = Path("chapter4_test_results")
OUTPUT_DIR.mkdir(exist_ok=True)


def save_json(filename: str, data: dict) -> Path:
    path = OUTPUT_DIR / filename

    with open(path, "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)

    return path


def request_json(method: str, path: str, payload: dict | None = None, timeout: int = 60) -> dict:
    url = f"{BASE_URL}{path}"

    data = None
    headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Accept": "application/json",
    }

    if payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")

    request = urllib.request.Request(
        url=url,
        data=data,
        headers=headers,
        method=method,
    )

    with urllib.request.urlopen(request, timeout=timeout) as response:
        body = response.read().decode("utf-8")
        return json.loads(body)


def run_test(name: str, method: str, path: str, payload: dict | None = None, timeout: int = 60) -> dict:
    print("=" * 90)
    print(f"Тест: {name}")
    print(f"Запит: {method} {BASE_URL}{path}")

    started = time.perf_counter()

    try:
        result = request_json(method, path, payload, timeout)
        elapsed_ms = round((time.perf_counter() - started) * 1000, 2)

        record = {
            "testName": name,
            "status": "PASS",
            "method": method,
            "path": path,
            "elapsedMs": elapsed_ms,
            "response": result,
        }

        print("Статус: PASS")
        print(f"Час відповіді: {elapsed_ms} мс")
        print(json.dumps(result, ensure_ascii=False, indent=2)[:3000])

        return record

    except urllib.error.HTTPError as error:
        elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
        error_body = error.read().decode("utf-8", errors="replace")

        record = {
            "testName": name,
            "status": "FAIL",
            "method": method,
            "path": path,
            "elapsedMs": elapsed_ms,
            "httpCode": error.code,
            "error": error_body,
        }

        print("Статус: FAIL")
        print(f"HTTP code: {error.code}")
        print(error_body)

        return record

    except Exception as error:
        elapsed_ms = round((time.perf_counter() - started) * 1000, 2)

        record = {
            "testName": name,
            "status": "FAIL",
            "method": method,
            "path": path,
            "elapsedMs": elapsed_ms,
            "error": str(error),
        }

        print("Статус: FAIL")
        print(str(error))

        return record


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--train", action="store_true", help="Також виконати POST /train")
    parser.add_argument("--user-id", default="", help="ID користувача для перевірки /recommend/{user_id}")
    args = parser.parse_args()

    all_results = []

    all_results.append(run_test(
        name="Перевірка доступності ML-сервера",
        method="GET",
        path="/health",
    ))

    all_results.append(run_test(
        name="Перевірка наявності даних для ML-модуля",
        method="GET",
        path="/debug-data",
    ))

    if args.train:
        all_results.append(run_test(
            name="Навчання рекомендаційної моделі",
            method="POST",
            path="/train",
            timeout=180,
        ))

    if args.user_id:
        all_results.append(run_test(
            name="Отримання рекомендацій для користувача",
            method="GET",
            path=f"/recommend/{args.user_id}",
            timeout=120,
        ))

    passed = sum(1 for item in all_results if item["status"] == "PASS")
    failed = sum(1 for item in all_results if item["status"] == "FAIL")

    summary = {
        "baseUrl": BASE_URL,
        "total": len(all_results),
        "passed": passed,
        "failed": failed,
        "results": all_results,
    }

    output_path = save_json("api_test_summary.json", summary)

    print("=" * 90)
    print("ПІДСУМОК API-ТЕСТУВАННЯ")
    print(f"Усього тестів: {len(all_results)}")
    print(f"Успішно: {passed}")
    print(f"Помилки: {failed}")
    print(f"Файл результатів: {output_path}")

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
