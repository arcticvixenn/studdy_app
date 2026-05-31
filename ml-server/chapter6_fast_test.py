import json
import time
from pathlib import Path
from datetime import datetime
from urllib import request, error

BASE_URL = "http://127.0.0.1:6060"
OUT_DIR = Path("chapter6_results")
OUT_DIR.mkdir(exist_ok=True)

def api_request(method, path, payload=None, timeout=8):
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
                parsed = raw[:2000]

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
            "error": raw[:2000]
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

def main():
    print("=== CHAPTER 6 FAST ROBUSTNESS TEST ===")

    normal_text = (
        "Класифікація є задачею машинного навчання з учителем. "
        "Модель навчається відносити об'єкти до визначених класів. "
        "Для оцінювання якості класифікаційних моделей використовують "
        "accuracy, precision, recall та F1-score."
    )

    short_text = "Машинне навчання — це метод аналізу даних."

    bad_text = "тест тест тест приклад приклад слова слова слова"

    tests = {
        "quiz_health": api_request("GET", "/quiz/health", timeout=5),
        "root_health": api_request("GET", "/health", timeout=5),

        # debug-data не є критичним для 6 розділу, тому має короткий timeout
        "debug_data_optional": api_request("GET", "/debug-data", timeout=6),

        "empty_payload": api_request("POST", "/quiz/generate", {}, timeout=8),

        "empty_text": api_request("POST", "/quiz/generate", {
            "topic": "",
            "text": "",
            "questionCount": 5
        }, timeout=8),

        "short_text_generation": api_request("POST", "/quiz/generate", {
            "topic": "Короткий текст",
            "text": short_text,
            "questionCount": 5
        }, timeout=25),

        "bad_text_generation": api_request("POST", "/quiz/generate", {
            "topic": "Неінформативний текст",
            "text": bad_text,
            "questionCount": 5
        }, timeout=25),

        "normal_text_generation": api_request("POST", "/quiz/generate", {
            "topic": "Класифікація в машинному навчанні",
            "text": normal_text,
            "questionCount": 5
        }, timeout=35),
    }

    summary = {
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "base_url": BASE_URL,
        "successful_tests": sum(1 for item in tests.values() if item.get("ok")),
        "total_tests": len(tests),
        "normal_text_questions": count_questions(tests["normal_text_generation"].get("data")),
        "short_text_questions": count_questions(tests["short_text_generation"].get("data")),
        "bad_text_questions": count_questions(tests["bad_text_generation"].get("data")),
        "quiz_health_time_ms": tests["quiz_health"].get("time_ms"),
        "normal_generation_time_ms": tests["normal_text_generation"].get("time_ms"),
        "short_generation_time_ms": tests["short_text_generation"].get("time_ms"),
        "bad_generation_time_ms": tests["bad_text_generation"].get("time_ms"),
    }

    report = {
        "summary": summary,
        "tests": tests
    }

    json_path = OUT_DIR / "chapter6_fast_report.json"
    md_path = OUT_DIR / "chapter6_fast_report.md"

    json_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    lines = []
    lines.append("# Результати тестування для 6 розділу\n\n")
    lines.append(f"Дата запуску: {summary['created_at']}\n\n")
    lines.append(f"Базова адреса API: `{BASE_URL}`\n\n")

    lines.append("## Підсумок\n\n")
    lines.append(f"- Успішних тестів: {summary['successful_tests']} із {summary['total_tests']}\n")
    lines.append(f"- Час відповіді `/quiz/health`: {summary['quiz_health_time_ms']} мс\n")
    lines.append(f"- Час генерації для нормального тексту: {summary['normal_generation_time_ms']} мс\n")
    lines.append(f"- Питань для нормального тексту: {summary['normal_text_questions']}\n")
    lines.append(f"- Питань для короткого тексту: {summary['short_text_questions']}\n")
    lines.append(f"- Питань для неінформативного тексту: {summary['bad_text_questions']}\n\n")

    lines.append("## Деталі тестів\n\n")

    for name, result in tests.items():
        lines.append(f"### {name}\n")
        lines.append(f"- Успішно: {result.get('ok')}\n")
        lines.append(f"- HTTP-статус: {result.get('status')}\n")
        lines.append(f"- Час виконання: {result.get('time_ms')} мс\n")

        if result.get("error"):
            lines.append(f"- Помилка або відповідь сервера: `{str(result.get('error'))[:700]}`\n")

        q_count = count_questions(result.get("data"))
        if q_count:
            lines.append(f"- Кількість сформованих питань: {q_count}\n")

        lines.append("\n")

    lines.append("## Інтерпретація для документації\n\n")
    lines.append("Порожній запит та порожній текст використовуються для перевірки валідації вхідних даних.\n")
    lines.append("Короткий текст використовується як граничний сценарій.\n")
    lines.append("Неінформативний текст використовується як негативний сценарій.\n")
    lines.append("Нормальний навчальний текст використовується як контрольний успішний сценарій.\n")
    lines.append("Запит `/debug-data` є допоміжним і не вважається критичним для перевірки надійності, якщо він виконується довше за встановлений timeout.\n")

    md_path.write_text("".join(lines), encoding="utf-8")

    print("\n=== SUMMARY ===")
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    print(f"\nSaved: {json_path}")
    print(f"Saved: {md_path}")

if __name__ == "__main__":
    main()
