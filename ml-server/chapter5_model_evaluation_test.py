import json
import time
import subprocess
import sys
from pathlib import Path
from datetime import datetime
from urllib import request, error

BASE_URL = "http://127.0.0.1:6060"
OUT_DIR = Path("chapter5_results")
OUT_DIR.mkdir(exist_ok=True)

TOPICS = [
    {
        "title": "Типи машинного навчання",
        "text": (
            "Машинне навчання поділяється на навчання з учителем, навчання без учителя "
            "та навчання з підкріпленням. У навчанні з учителем модель використовує "
            "приклади з правильними відповідями. У навчанні без учителя система шукає "
            "приховані закономірності в даних. Навчання з підкріпленням базується на "
            "взаємодії агента із середовищем та отриманні винагороди."
        )
    },
    {
        "title": "Нейронні мережі",
        "text": (
            "Нейронна мережа складається з шарів штучних нейронів, які обробляють вхідні "
            "ознаки та формують вихідний результат. Вхідний шар приймає дані, приховані "
            "шари виконують проміжні перетворення, а вихідний шар формує прогноз. "
            "Навчання нейронної мережі полягає в налаштуванні вагових коефіцієнтів."
        )
    },
    {
        "title": "Рекомендаційні системи",
        "text": (
            "Рекомендаційні системи використовуються для добору матеріалів, які можуть "
            "бути корисними конкретному користувачеві. Content-based підхід враховує "
            "зміст об'єктів, collaborative filtering аналізує поведінку користувачів, "
            "а гібридні методи поєднують кілька джерел інформації для підвищення якості."
        )
    },
    {
        "title": "Метрики якості моделей",
        "text": (
            "Для оцінювання моделей машинного навчання використовують різні метрики. "
            "Accuracy показує загальну частку правильних прогнозів. Precision оцінює "
            "частку правильних позитивних відповідей серед усіх позитивних прогнозів. "
            "Recall показує, яку частку всіх релевантних об'єктів модель змогла знайти. "
            "F1-score поєднує precision та recall в одну збалансовану метрику."
        )
    }
]

def api_request(method, path, payload=None, timeout=80):
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

def get_questions(data):
    if not isinstance(data, dict):
        return []
    if isinstance(data.get("questions"), list):
        return data["questions"]
    if isinstance(data.get("data"), dict) and isinstance(data["data"].get("questions"), list):
        return data["data"]["questions"]
    return []

def question_quality_stats(questions):
    total = len(questions)
    if total == 0:
        return {
            "question_count": 0,
            "complete_structure_count": 0,
            "with_explanation_count": 0,
            "with_correct_option_count": 0
        }

    complete = 0
    with_explanation = 0
    with_correct = 0

    for q in questions:
        keys = set(q.keys())

        has_text = "questionText" in keys or "question" in keys
        has_options = all(k in keys for k in ["optionA", "optionB", "optionC", "optionD"])
        has_correct = "correctOption" in keys or "answer" in keys
        has_explanation = bool(q.get("explanation"))

        if has_text and has_options and has_correct:
            complete += 1
        if has_explanation:
            with_explanation += 1
        if has_correct:
            with_correct += 1

    return {
        "question_count": total,
        "complete_structure_count": complete,
        "with_explanation_count": with_explanation,
        "with_correct_option_count": with_correct
    }

def run_command(name, command, timeout=240):
    start = time.perf_counter()
    try:
        proc = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=timeout
        )
        elapsed = round((time.perf_counter() - start) * 1000, 2)
        return {
            "name": name,
            "command": command,
            "ok": proc.returncode == 0,
            "returncode": proc.returncode,
            "time_ms": elapsed,
            "stdout": proc.stdout[-8000:],
            "stderr": proc.stderr[-8000:]
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

def find_metric_files():
    metric_files = []
    for path in Path(".").rglob("*.json"):
        try:
            text = path.read_text(encoding="utf-8", errors="replace").lower()
            if any(k in text for k in ["accuracy", "precision", "recall", "f1", "f1_score", "f1-score"]):
                metric_files.append(str(path))
        except Exception:
            pass
    return metric_files[:20]

def extract_debug_summary(debug_data):
    if not isinstance(debug_data, dict):
        return {}
    return {
        "answers": debug_data.get("answers"),
        "courses": debug_data.get("courses"),
        "lessons": debug_data.get("lessons"),
        "posts": debug_data.get("posts"),
        "viewEvents": debug_data.get("viewEvents"),
        "searchEvents": debug_data.get("searchEvents"),
        "usersWithProfiles": debug_data.get("usersWithProfiles"),
        "contentItems": debug_data.get("contentItems"),
        "datasetRows": debug_data.get("datasetRows"),
        "labelCounts": debug_data.get("labelCounts")
    }

def create_charts(topic_results):
    try:
        import matplotlib.pyplot as plt

        titles = [item["title"] for item in topic_results]
        times = [item["time_ms"] for item in topic_results]
        counts = [item["question_count"] for item in topic_results]

        plt.figure(figsize=(10, 5))
        plt.bar(titles, times)
        plt.ylabel("Час генерації, мс")
        plt.title("Час генерації тестових запитань за темами")
        plt.xticks(rotation=15, ha="right")
        plt.tight_layout()
        chart1 = OUT_DIR / "chapter5_generation_time_by_topic.png"
        plt.savefig(chart1, dpi=200)
        plt.close()

        plt.figure(figsize=(10, 5))
        plt.bar(titles, counts)
        plt.ylabel("Кількість питань")
        plt.title("Кількість сформованих питань за темами")
        plt.xticks(rotation=15, ha="right")
        plt.tight_layout()
        chart2 = OUT_DIR / "chapter5_questions_by_topic.png"
        plt.savefig(chart2, dpi=200)
        plt.close()

        return [str(chart1), str(chart2)]
    except Exception as e:
        return [f"charts_failed: {type(e).__name__}: {e}"]

def main():
    print("=== CHAPTER 5 MODEL EVALUATION TEST ===")

    report = {
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "base_url": BASE_URL,
        "health": {},
        "debug_data": {},
        "topic_results": [],
        "script_results": {},
        "metric_files": [],
        "charts": [],
        "summary": {}
    }

    print("1. Перевірка API...")
    report["health"]["quiz_health"] = api_request("GET", "/quiz/health", timeout=10)
    report["health"]["root_health"] = api_request("GET", "/health", timeout=10)

    print("2. Перевірка debug-data...")
    debug = api_request("GET", "/debug-data", timeout=20)
    report["debug_data"]["raw"] = debug
    report["debug_data"]["summary"] = extract_debug_summary(debug.get("data"))

    print("3. Генерація тестів за кількома темами...")
    for item in TOPICS:
        payload = {
            "title": item["title"],
            "text": item["text"],
            "questionCount": 5
        }

        result = api_request("POST", "/quiz/generate", payload, timeout=90)
        questions = get_questions(result.get("data"))
        stats = question_quality_stats(questions)

        topic_result = {
            "title": item["title"],
            "ok": result.get("ok"),
            "status": result.get("status"),
            "time_ms": result.get("time_ms"),
            **stats,
            "first_question": questions[0] if questions else None,
            "error": result.get("error")
        }

        report["topic_results"].append(topic_result)

        print(
            f"- {item['title']}: "
            f"ok={topic_result['ok']}, "
            f"questions={topic_result['question_count']}, "
            f"time={topic_result['time_ms']} ms"
        )

    print("4. Запуск наявних тестових скриптів, якщо вони є...")
    if Path("test_api_quiz.py").exists():
        report["script_results"]["test_api_quiz"] = run_command(
            "test_api_quiz",
            f"{sys.executable} test_api_quiz.py"
        )

    if Path("test_multiple_quiz_topics.py").exists():
        report["script_results"]["test_multiple_quiz_topics"] = run_command(
            "test_multiple_quiz_topics",
            f"{sys.executable} test_multiple_quiz_topics.py"
        )

    print("5. Пошук файлів із метриками моделей...")
    report["metric_files"] = find_metric_files()

    print("6. Побудова графіків...")
    report["charts"] = create_charts(report["topic_results"])

    topic_success = sum(1 for item in report["topic_results"] if item["ok"])
    total_questions = sum(item["question_count"] for item in report["topic_results"])
    complete_questions = sum(item["complete_structure_count"] for item in report["topic_results"])
    avg_time = round(
        sum(item["time_ms"] for item in report["topic_results"] if item["time_ms"] is not None) /
        max(1, len([item for item in report["topic_results"] if item["time_ms"] is not None])),
        2
    )

    report["summary"] = {
        "topic_success_count": topic_success,
        "topic_total_count": len(report["topic_results"]),
        "total_generated_questions": total_questions,
        "complete_structure_questions": complete_questions,
        "average_generation_time_ms": avg_time,
        "metric_files_found": len(report["metric_files"]),
        "debug_dataset_rows": report["debug_data"]["summary"].get("datasetRows"),
        "debug_label_counts": report["debug_data"]["summary"].get("labelCounts")
    }

    json_path = OUT_DIR / "chapter5_model_evaluation_report.json"
    md_path = OUT_DIR / "chapter5_model_evaluation_report.md"

    json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = []
    lines.append("# Результати тестування для 5 розділу\n\n")
    lines.append(f"Дата запуску: {report['created_at']}\n\n")
    lines.append(f"Базова адреса API: `{BASE_URL}`\n\n")

    lines.append("## 1. Загальний підсумок\n\n")
    lines.append(f"- Успішних тематичних генерацій: {topic_success} із {len(report['topic_results'])}\n")
    lines.append(f"- Загальна кількість сформованих питань: {total_questions}\n")
    lines.append(f"- Питань із повною структурою: {complete_questions}\n")
    lines.append(f"- Середній час генерації: {avg_time} мс\n")
    lines.append(f"- Знайдено файлів із метриками моделей: {len(report['metric_files'])}\n")
    lines.append(f"- datasetRows: {report['summary']['debug_dataset_rows']}\n")
    lines.append(f"- labelCounts: {report['summary']['debug_label_counts']}\n\n")

    lines.append("## 2. Стан даних\n\n")
    for key, value in report["debug_data"]["summary"].items():
        lines.append(f"- {key}: {value}\n")

    lines.append("\n## 3. Результати генерації за темами\n\n")
    lines.append("| Тема | HTTP | Питань | Повна структура | Пояснення | Час, мс |\n")
    lines.append("|---|---:|---:|---:|---:|---:|\n")
    for item in report["topic_results"]:
        lines.append(
            f"| {item['title']} | {item['status']} | {item['question_count']} | "
            f"{item['complete_structure_count']} | {item['with_explanation_count']} | {item['time_ms']} |\n"
        )

    lines.append("\n## 4. Приклади перших питань\n\n")
    for item in report["topic_results"]:
        lines.append(f"### {item['title']}\n")
        q = item.get("first_question")
        if q:
            lines.append(f"- Питання: {q.get('questionText') or q.get('question')}\n")
            lines.append(f"- Правильна відповідь: {q.get('correctOption') or q.get('answer')}\n")
            if q.get("explanation"):
                lines.append(f"- Пояснення: {q.get('explanation')}\n")
        else:
            lines.append("- Питання не сформовано.\n")
        lines.append("\n")

    lines.append("## 5. Наявні файли з метриками моделей\n\n")
    if report["metric_files"]:
        for path in report["metric_files"]:
            lines.append(f"- `{path}`\n")
    else:
        lines.append("- Файли з метриками accuracy/precision/recall/F1 не знайдено автоматично.\n")

    lines.append("\n## 6. Побудовані графіки\n\n")
    for chart in report["charts"]:
        lines.append(f"- `{chart}`\n")

    lines.append("\n## 7. Інтерпретація для документації\n\n")
    lines.append("Ці результати використовуються для 5 розділу як експериментальна оцінка ефективності ML-модуля. ")
    lines.append("Основний акцент робиться на кількості сформованих питань, повноті структури тестових завдань, ")
    lines.append("часі генерації за різними темами та наявності даних для рекомендаційного модуля. ")
    lines.append("Якщо для окремої теми сформовано менше питань, ніж запитувалося, це потрібно описати як обмеження алгоритмічного підходу, ")
    lines.append("пов'язане з обсягом і якістю навчального тексту.\n")

    md_path.write_text("".join(lines), encoding="utf-8")

    print("\n=== SUMMARY ===")
    print(json.dumps(report["summary"], ensure_ascii=False, indent=2))
    print(f"\nSaved: {json_path}")
    print(f"Saved: {md_path}")
    for chart in report["charts"]:
        print(f"Chart: {chart}")

if __name__ == "__main__":
    main()
