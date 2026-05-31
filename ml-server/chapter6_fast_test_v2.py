import json
import time
from pathlib import Path
from datetime import datetime
from urllib import request, error

BASE_URL = "http://127.0.0.1:6060"
OUT_DIR = Path("chapter6_results")
OUT_DIR.mkdir(exist_ok=True)

def api_request(method, path, payload=None, timeout=60):
    url = BASE_URL + path
    headers = {"Content-Type": "application/json; charset=utf-8"}

    data = None
    if payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")

    start = time.perf_counter()

    try:
        req = request.Request(url, data=data, headers=headers, method=method)

        with request.urlopen(req, timeout=timeout) as response:
            raw = response.read().decode("utf-8", errors="replace")
            elapsed = round((time.perf_counter() - start) * 1000, 2)

            try:
                parsed = json.loads(raw)
            except Exception:
                parsed = raw[:3000]

            return {
                "ok": True,
                "status": response.status,
                "time_ms": elapsed,
                "data": parsed
            }

    except error.HTTPError as e:
        elapsed = round((time.perf_counter() - start) * 1000, 2)
        raw = e.read().decode("utf-8", errors="replace")

        return {
            "ok": False,
            "status": e.code,
            "time_ms": elapsed,
            "error": raw[:3000]
        }

    except Exception as e:
        elapsed = round((time.perf_counter() - start) * 1000, 2)

        return {
            "ok": False,
            "status": None,
            "time_ms": elapsed,
            "error": f"{type(e).__name__}: {e}"
        }

def count_questions(response_data):
    if not isinstance(response_data, dict):
        return 0

    if isinstance(response_data.get("questions"), list):
        return len(response_data["questions"])

    if isinstance(response_data.get("data"), dict):
        questions = response_data["data"].get("questions")
        if isinstance(questions, list):
            return len(questions)

    return 0

def get_questions(response_data):
    if not isinstance(response_data, dict):
        return []

    if isinstance(response_data.get("questions"), list):
        return response_data["questions"]

    if isinstance(response_data.get("data"), dict):
        questions = response_data["data"].get("questions")
        if isinstance(questions, list):
            return questions

    return []

def expected_result(name, result):
    status = result.get("status")

    if name in ["quiz_health", "root_health", "debug_data_optional"]:
        return result.get("ok") is True and status == 200

    if name in ["empty_payload", "empty_text", "short_text_generation"]:
        return result.get("ok") is False and status == 422

    if name in ["bad_text_generation", "normal_text_generation", "long_text_generation"]:
        return result.get("ok") is True and status == 200 and count_questions(result.get("data")) > 0

    return False

def main():
    print("=== CHAPTER 6 ROBUSTNESS TEST V2 ===")

    short_text = "Машинне навчання — це метод аналізу даних."

    bad_text = (
        "тест тест тест приклад приклад слова слова слова навчання модель дані "
        "тема питання відповідь система алгоритм матеріал користувач текст текст текст"
    )

    normal_text = (
        "Класифікація є задачею машинного навчання з учителем, у якій модель "
        "навчається відносити об'єкти до наперед визначених класів. Для оцінювання "
        "якості класифікаційних моделей використовують accuracy, precision, recall "
        "та F1-score. У рекомендаційних системах такі моделі можуть застосовуватися "
        "для визначення релевантності навчального матеріалу для конкретного користувача."
    )

    long_text = (
        "Рекомендаційна система в освітній платформі використовується для добору "
        "навчальних матеріалів відповідно до інтересів користувача та його попередньої "
        "активності. Для аналізу текстового контенту застосовується TF-IDF-векторизація, "
        "яка перетворює навчальні матеріали на числові вектори. Після цього косинусна "
        "міра схожості дозволяє оцінити змістову близькість між матеріалами. "
        "Кластеризація KMeans може використовуватися для групування тем, а модель "
        "Random Forest — для оцінювання релевантності матеріалу. Такий підхід дозволяє "
        "поєднати контентні ознаки та поведінкові дані користувача."
    )

    tests = {
        "quiz_health": api_request("GET", "/quiz/health", timeout=5),
        "root_health": api_request("GET", "/health", timeout=5),
        "debug_data_optional": api_request("GET", "/debug-data", timeout=8),

        "empty_payload": api_request("POST", "/quiz/generate", {}, timeout=8),

        "empty_text": api_request("POST", "/quiz/generate", {
            "title": "",
            "text": "",
            "questionCount": 5
        }, timeout=8),

        "short_text_generation": api_request("POST", "/quiz/generate", {
            "title": "Короткий текст",
            "text": short_text,
            "questionCount": 5
        }, timeout=10),

        "bad_text_generation": api_request("POST", "/quiz/generate", {
            "title": "Неінформативний текст",
            "text": bad_text,
            "questionCount": 5
        }, timeout=60),

        "normal_text_generation": api_request("POST", "/quiz/generate", {
            "title": "Класифікація в машинному навчанні",
            "text": normal_text,
            "questionCount": 5
        }, timeout=60),

        "long_text_generation": api_request("POST", "/quiz/generate", {
            "title": "Рекомендаційні системи",
            "text": long_text,
            "questionCount": 5
        }, timeout=60),
    }

    passed_expected = sum(1 for name, result in tests.items() if expected_result(name, result))

    summary = {
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "base_url": BASE_URL,
        "expected_passed": passed_expected,
        "total_tests": len(tests),
        "http_success_count": sum(1 for item in tests.values() if item.get("ok")),
        "normal_text_questions": count_questions(tests["normal_text_generation"].get("data")),
        "long_text_questions": count_questions(tests["long_text_generation"].get("data")),
        "bad_text_questions": count_questions(tests["bad_text_generation"].get("data")),
        "quiz_health_time_ms": tests["quiz_health"].get("time_ms"),
        "normal_generation_time_ms": tests["normal_text_generation"].get("time_ms"),
        "long_generation_time_ms": tests["long_text_generation"].get("time_ms"),
        "bad_generation_time_ms": tests["bad_text_generation"].get("time_ms"),
    }

    report = {
        "summary": summary,
        "tests": tests
    }

    json_path = OUT_DIR / "chapter6_fast_report_v2.json"
    md_path = OUT_DIR / "chapter6_fast_report_v2.md"

    json_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    lines = []
    lines.append("# Результати тестування для 6 розділу\n\n")
    lines.append(f"Дата запуску: {summary['created_at']}\n\n")
    lines.append(f"Базова адреса API: `{BASE_URL}`\n\n")

    lines.append("## Підсумок\n\n")
    lines.append(f"- Тестів з очікуваною поведінкою: {summary['expected_passed']} із {summary['total_tests']}\n")
    lines.append(f"- HTTP-успішних запитів: {summary['http_success_count']} із {summary['total_tests']}\n")
    lines.append(f"- Час відповіді `/quiz/health`: {summary['quiz_health_time_ms']} мс\n")
    lines.append(f"- Час генерації для нормального тексту: {summary['normal_generation_time_ms']} мс\n")
    lines.append(f"- Час генерації для довшого тексту: {summary['long_generation_time_ms']} мс\n")
    lines.append(f"- Питань для нормального тексту: {summary['normal_text_questions']}\n")
    lines.append(f"- Питань для довшого тексту: {summary['long_text_questions']}\n")
    lines.append(f"- Питань для неінформативного тексту: {summary['bad_text_questions']}\n\n")

    lines.append("## Деталі тестів\n\n")

    for name, result in tests.items():
        lines.append(f"### {name}\n")
        lines.append(f"- Очікувана поведінка: {expected_result(name, result)}\n")
        lines.append(f"- Успішний HTTP-запит: {result.get('ok')}\n")
        lines.append(f"- HTTP-статус: {result.get('status')}\n")
        lines.append(f"- Час виконання: {result.get('time_ms')} мс\n")

        q_count = count_questions(result.get("data"))
        if q_count:
            lines.append(f"- Кількість сформованих питань: {q_count}\n")

            questions = get_questions(result.get("data"))
            if questions:
                first = questions[0]
                lines.append("- Приклад першого питання:\n")
                lines.append(f"  - Питання: {first.get('questionText') or first.get('question')}\n")
                lines.append(f"  - Правильна відповідь: {first.get('correctOption') or first.get('answer')}\n")

        if result.get("error"):
            lines.append(f"- Помилка або відповідь сервера: `{str(result.get('error'))[:900]}`\n")

        lines.append("\n")

    lines.append("## Інтерпретація для документації\n\n")
    lines.append("Порожній запит, порожній текст і короткий текст використовуються як сценарії перевірки валідації вхідних даних. Для них очікуваною поведінкою є відмова API зі статусом 422.\n")
    lines.append("Нормальний і довший навчальний текст використовуються як контрольні позитивні сценарії. Для них очікуваною поведінкою є успішна генерація тестових запитань.\n")
    lines.append("Неінформативний текст використовується як негативний якісний сценарій. Якщо система генерує питання, їх потрібно додатково оцінювати вручну, оскільки формальна структура може бути коректною, але зміст — слабким.\n")
    lines.append("Різниця між HTTP-успішними запитами та тестами з очікуваною поведінкою пояснюється тим, що частина негативних сценаріїв повинна завершуватися помилкою валідації.\n")

    md_path.write_text("".join(lines), encoding="utf-8")

    print("\n=== SUMMARY V2 ===")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print(f"\nSaved: {json_path}")
    print(f"Saved: {md_path}")

if __name__ == "__main__":
    main()
