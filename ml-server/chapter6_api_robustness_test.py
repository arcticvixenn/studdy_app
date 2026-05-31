import json
import time
import subprocess
import sys
from pathlib import Path
from datetime import datetime
from urllib import request, error

BASE_URL = "http://127.0.0.1:6060"
OUT_DIR = Path("chapter6_results")
OUT_DIR.mkdir(exist_ok=True)

def api_request(method, path, payload=None, timeout=40):
    url = BASE_URL + path
    headers = {"Content-Type": "application/json; charset=utf-8"}

    data = None
    if payload is not None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")

    start = time.perf_counter()

    try:
        req = request.Request(url, data=data, headers=headers, method=method)
        with request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
            elapsed = round((time.perf_counter() - start) * 1000, 2)

            try:
                parsed = json.loads(raw)
            except Exception:
                parsed = raw[:3000]

            return {
                "ok": True,
                "status": resp.status,
                "time_ms": elapsed,
                "data": parsed
            }

    except error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        elapsed = round((time.perf_counter() - start) * 1000, 2)

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

def run_command(name, command):
    start = time.perf_counter()

    try:
        proc = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=180
        )

        elapsed = round((time.perf_counter() - start) * 1000, 2)

        return {
            "name": name,
            "command": command,
            "ok": proc.returncode == 0,
            "returncode": proc.returncode,
            "time_ms": elapsed,
            "stdout": proc.stdout[-6000:],
            "stderr": proc.stderr[-6000:]
        }

    except Exception as e:
        elapsed = round((time.perf_counter() - start) * 1000, 2)

        return {
            "name": name,
            "command": command,
            "ok": False,
            "time_ms": elapsed,
            "error": f"{type(e).__name__}: {e}"
        }

def count_questions(obj):
    if isinstance(obj, dict):
        if isinstance(obj.get("questions"), list):
            return len(obj["questions"])
        if isinstance(obj.get("data"), dict) and isinstance(obj["data"].get("questions"), list):
            return len(obj["data"]["questions"])
    return 0

def main():
    report = {
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "base_url": BASE_URL,
        "api_tests": {},
        "script_tests": {},
        "summary": {}
    }

    print("=== 1. Перевірка доступності API ===")
    report["api_tests"]["quiz_health"] = api_request("GET", "/quiz/health")
    report["api_tests"]["root_health"] = api_request("GET", "/health")
    report["api_tests"]["debug_data"] = api_request("GET", "/debug-data")

    print("=== 2. Перевірка некоректних запитів ===")
    report["api_tests"]["empty_payload"] = api_request("POST", "/quiz/generate", {})
    report["api_tests"]["empty_text"] = api_request("POST", "/quiz/generate", {
        "topic": "",
        "text": "",
        "questionCount": 5
    })

    print("=== 3. Перевірка граничних текстів ===")
    short_text = "Машинне навчання — це метод аналізу даних."

    bad_text = "тест тест тест приклад приклад слова слова слова"

    normal_text = (
        "Класифікація є задачею машинного навчання з учителем, у якій модель "
        "навчається відносити об'єкти до визначених класів. Для оцінювання якості "
        "класифікаційних моделей використовують accuracy, precision, recall та F1-score. "
        "У рекомендаційних системах такі моделі можуть застосовуватися для визначення "
        "релевантності навчального матеріалу для конкретного користувача."
    )

    report["api_tests"]["short_text_generation"] = api_request("POST", "/quiz/generate", {
        "topic": "Машинне навчання",
        "text": short_text,
        "questionCount": 5
    })

    report["api_tests"]["bad_text_generation"] = api_request("POST", "/quiz/generate", {
        "topic": "Некоректний текст",
        "text": bad_text,
        "questionCount": 5
    })

    report["api_tests"]["normal_text_generation"] = api_request("POST", "/quiz/generate", {
        "topic": "Класифікація в машинному навчанні",
        "text": normal_text,
        "questionCount": 5
    })

    print("=== 4. Запуск наявних тестових скриптів проєкту ===")
    if Path("test_api_quiz.py").exists():
        report["script_tests"]["test_api_quiz_once"] = run_command(
            "test_api_quiz_once",
            f"{sys.executable} test_api_quiz.py"
        )

        report["script_tests"]["test_api_quiz_three_times"] = run_command(
            "test_api_quiz_three_times",
            f"{sys.executable} test_api_quiz.py && {sys.executable} test_api_quiz.py && {sys.executable} test_api_quiz.py"
        )
    else:
        report["script_tests"]["test_api_quiz_once"] = {
            "ok": False,
            "error": "Файл test_api_quiz.py не знайдено"
        }

    if Path("test_multiple_quiz_topics.py").exists():
        report["script_tests"]["test_multiple_quiz_topics"] = run_command(
            "test_multiple_quiz_topics",
            f"{sys.executable} test_multiple_quiz_topics.py"
        )
    else:
        report["script_tests"]["test_multiple_quiz_topics"] = {
            "ok": False,
            "error": "Файл test_multiple_quiz_topics.py не знайдено"
        }

    print("=== 5. Формування підсумку ===")
    api_ok = sum(1 for item in report["api_tests"].values() if item.get("ok"))
    api_total = len(report["api_tests"])

    normal_questions = count_questions(report["api_tests"]["normal_text_generation"].get("data"))
    short_questions = count_questions(report["api_tests"]["short_text_generation"].get("data"))
    bad_questions = count_questions(report["api_tests"]["bad_text_generation"].get("data"))

    report["summary"] = {
        "api_success_count": api_ok,
        "api_total_count": api_total,
        "normal_text_questions": normal_questions,
        "short_text_questions": short_questions,
        "bad_text_questions": bad_questions,
        "health_time_ms": report["api_tests"]["quiz_health"].get("time_ms"),
        "normal_generation_time_ms": report["api_tests"]["normal_text_generation"].get("time_ms"),
        "short_generation_time_ms": report["api_tests"]["short_text_generation"].get("time_ms"),
        "bad_generation_time_ms": report["api_tests"]["bad_text_generation"].get("time_ms")
    }

    json_path = OUT_DIR / "chapter6_api_robustness_report.json"
    md_path = OUT_DIR / "chapter6_api_robustness_report.md"

    json_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    md = []
    md.append("# Результати перевірки для 6 розділу\n")
    md.append(f"Дата запуску: {report['created_at']}\n")
    md.append(f"Базова адреса API: `{BASE_URL}`\n")

    md.append("\n## 1. Підсумок API-перевірок\n")
    md.append(f"- Успішних API-перевірок: {api_ok} із {api_total}\n")
    md.append(f"- Час відповіді `/quiz/health`: {report['summary']['health_time_ms']} мс\n")
    md.append(f"- Час генерації для нормального тексту: {report['summary']['normal_generation_time_ms']} мс\n")
    md.append(f"- Питань для нормального тексту: {normal_questions}\n")
    md.append(f"- Питань для короткого тексту: {short_questions}\n")
    md.append(f"- Питань для неінформативного тексту: {bad_questions}\n")

    md.append("\n## 2. Деталі API-запитів\n")
    for name, result in report["api_tests"].items():
        md.append(f"\n### {name}\n")
        md.append(f"- Статус: {result.get('status')}\n")
        md.append(f"- Успішно: {result.get('ok')}\n")
        md.append(f"- Час: {result.get('time_ms')} мс\n")
        if "error" in result:
            md.append(f"- Помилка/відповідь: `{str(result.get('error'))[:500]}`\n")

    md.append("\n## 3. Запуск скриптів\n")
    for name, result in report["script_tests"].items():
        md.append(f"\n### {name}\n")
        md.append(f"- Успішно: {result.get('ok')}\n")
        md.append(f"- Час: {result.get('time_ms')} мс\n")
        if result.get("stdout"):
            md.append("\nФрагмент stdout:\n\n```text\n")
            md.append(result["stdout"][-1500:])
            md.append("\n```\n")
        if result.get("stderr"):
            md.append("\nФрагмент stderr:\n\n```text\n")
            md.append(result["stderr"][-1500:])
            md.append("\n```\n")

    md.append("\n## 4. Що використати в 6 розділі\n")
    md.append("- Перевірку порожнього запиту використати як тест валідації.\n")
    md.append("- Короткий текст використати як граничний сценарій.\n")
    md.append("- Неінформативний текст використати як негативний сценарій.\n")
    md.append("- Нормальний навчальний текст використати як контрольний успішний сценарій.\n")
    md.append("- Три повторні запуски `test_api_quiz.py` використати як перевірку стабільності.\n")

    md_path.write_text("".join(md), encoding="utf-8")

    print(f"Готово: {json_path}")
    print(f"Готово: {md_path}")

if __name__ == "__main__":
    main()
