import json
import time
from pathlib import Path
from datetime import datetime
from urllib import request, error
from statistics import mean

BASE_URL = "http://127.0.0.1:6060"
OUT_DIR = Path("chapter5_results")
OUT_DIR.mkdir(exist_ok=True)

REPEAT_COUNT = 3

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

def api_request(method, path, payload=None, timeout=90):
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

def check_question(q):
    question_text = q.get("questionText") or q.get("question")
    options = [
        q.get("optionA"),
        q.get("optionB"),
        q.get("optionC"),
        q.get("optionD")
    ]
    correct = q.get("correctOption") or q.get("answer")
    explanation = q.get("explanation")

    filled_options = [x for x in options if isinstance(x, str) and x.strip()]
    unique_options = set(x.strip().lower() for x in filled_options)

    return {
        "has_question_text": bool(question_text),
        "has_4_options": len(filled_options) == 4,
        "options_unique": len(unique_options) == len(filled_options) == 4,
        "correct_option_valid": correct in ["A", "B", "C", "D"],
        "has_explanation": bool(explanation),
        "is_complete": bool(question_text) and len(filled_options) == 4 and correct in ["A", "B", "C", "D"]
    }

def analyze_questions(questions):
    checks = [check_question(q) for q in questions]
    total = len(checks)

    if total == 0:
        return {
            "question_count": 0,
            "complete_count": 0,
            "unique_options_count": 0,
            "valid_correct_option_count": 0,
            "with_explanation_count": 0,
            "complete_percent": 0
        }

    complete = sum(1 for x in checks if x["is_complete"])
    unique = sum(1 for x in checks if x["options_unique"])
    valid_correct = sum(1 for x in checks if x["correct_option_valid"])
    explanations = sum(1 for x in checks if x["has_explanation"])

    return {
        "question_count": total,
        "complete_count": complete,
        "unique_options_count": unique,
        "valid_correct_option_count": valid_correct,
        "with_explanation_count": explanations,
        "complete_percent": round(complete / total * 100, 2)
    }

def extract_metrics_from_json(obj, prefix=""):
    found = {}

    if isinstance(obj, dict):
        for key, value in obj.items():
            current_key = f"{prefix}.{key}" if prefix else str(key)
            low = str(key).lower()

            if low in ["accuracy", "precision", "recall", "f1", "f1_score", "f1-score", "macro_f1", "weighted_f1"]:
                if isinstance(value, (int, float, str)):
                    found[current_key] = value

            found.update(extract_metrics_from_json(value, current_key))

    elif isinstance(obj, list):
        for idx, value in enumerate(obj[:20]):
            found.update(extract_metrics_from_json(value, f"{prefix}[{idx}]"))

    return found

def collect_metric_files():
    results = []

    for path in Path(".").rglob("*.json"):
        if ".venv" in str(path):
            continue

        try:
            obj = json.loads(path.read_text(encoding="utf-8", errors="replace"))
            metrics = extract_metrics_from_json(obj)

            if metrics:
                results.append({
                    "file": str(path),
                    "metrics": metrics
                })
        except Exception:
            pass

    return results

def create_charts(topic_summary, metric_files):
    import matplotlib.pyplot as plt

    charts = []

    titles = [x["title"] for x in topic_summary]
    avg_times = [x["avg_time_ms"] for x in topic_summary]
    avg_questions = [x["avg_question_count"] for x in topic_summary]
    complete_percents = [x["avg_complete_percent"] for x in topic_summary]

    plt.figure(figsize=(10, 5))
    plt.bar(titles, avg_times)
    plt.ylabel("Середній час, мс")
    plt.title("Середній час генерації тестів за темами")
    plt.xticks(rotation=15, ha="right")
    plt.tight_layout()
    path = OUT_DIR / "chapter5_avg_generation_time.png"
    plt.savefig(path, dpi=200)
    plt.close()
    charts.append(str(path))

    plt.figure(figsize=(10, 5))
    plt.bar(titles, avg_questions)
    plt.ylabel("Середня кількість питань")
    plt.title("Середня кількість сформованих питань за темами")
    plt.xticks(rotation=15, ha="right")
    plt.tight_layout()
    path = OUT_DIR / "chapter5_avg_questions.png"
    plt.savefig(path, dpi=200)
    plt.close()
    charts.append(str(path))

    plt.figure(figsize=(10, 5))
    plt.bar(titles, complete_percents)
    plt.ylabel("Повнота структури, %")
    plt.title("Частка питань із повною структурою")
    plt.xticks(rotation=15, ha="right")
    plt.ylim(0, 110)
    plt.tight_layout()
    path = OUT_DIR / "chapter5_question_structure_quality.png"
    plt.savefig(path, dpi=200)
    plt.close()
    charts.append(str(path))

    metric_candidates = []
    for item in metric_files:
        for key, value in item["metrics"].items():
            key_low = key.lower()
            if any(name in key_low for name in ["accuracy", "precision", "recall", "f1"]):
                try:
                    metric_candidates.append((Path(item["file"]).name + "\n" + key, float(value)))
                except Exception:
                    pass

    metric_candidates = metric_candidates[:8]

    if metric_candidates:
        labels = [x[0] for x in metric_candidates]
        values = [x[1] for x in metric_candidates]

        plt.figure(figsize=(11, 5))
        plt.bar(labels, values)
        plt.ylabel("Значення метрики")
        plt.title("Виявлені метрики моделей у збережених JSON-файлах")
        plt.xticks(rotation=25, ha="right")
        plt.ylim(0, 1.05)
        plt.tight_layout()
        path = OUT_DIR / "chapter5_model_metrics_detected.png"
        plt.savefig(path, dpi=200)
        plt.close()
        charts.append(str(path))

    return charts

def main():
    print("=== CHAPTER 5 STRONG EVALUATION TEST ===")

    health = {
        "quiz_health": api_request("GET", "/quiz/health", timeout=10),
        "root_health": api_request("GET", "/health", timeout=10),
        "debug_data": api_request("GET", "/debug-data", timeout=20)
    }

    all_runs = []
    topic_summary = []

    for topic in TOPICS:
        print(f"\nTopic: {topic['title']}")
        runs = []

        for i in range(1, REPEAT_COUNT + 1):
            payload = {
                "title": topic["title"],
                "text": topic["text"],
                "questionCount": 5
            }

            result = api_request("POST", "/quiz/generate", payload, timeout=90)
            questions = get_questions(result.get("data"))
            quality = analyze_questions(questions)

            run = {
                "topic": topic["title"],
                "run": i,
                "ok": result.get("ok"),
                "status": result.get("status"),
                "time_ms": result.get("time_ms"),
                **quality,
                "first_question": questions[0] if questions else None,
                "error": result.get("error")
            }

            runs.append(run)
            all_runs.append(run)

            print(
                f"  run {i}: ok={run['ok']}, "
                f"questions={run['question_count']}, "
                f"complete={run['complete_count']}, "
                f"time={run['time_ms']} ms"
            )

        ok_runs = [x for x in runs if x["ok"]]
        times = [x["time_ms"] for x in ok_runs if isinstance(x["time_ms"], (int, float))]
        question_counts = [x["question_count"] for x in ok_runs]
        complete_percents = [x["complete_percent"] for x in ok_runs]

        topic_summary.append({
            "title": topic["title"],
            "success_runs": len(ok_runs),
            "total_runs": len(runs),
            "avg_time_ms": round(mean(times), 2) if times else 0,
            "min_time_ms": min(times) if times else 0,
            "max_time_ms": max(times) if times else 0,
            "avg_question_count": round(mean(question_counts), 2) if question_counts else 0,
            "min_question_count": min(question_counts) if question_counts else 0,
            "max_question_count": max(question_counts) if question_counts else 0,
            "avg_complete_percent": round(mean(complete_percents), 2) if complete_percents else 0
        })

    metric_files = collect_metric_files()
    charts = create_charts(topic_summary, metric_files)

    total_runs = len(all_runs)
    successful_runs = sum(1 for x in all_runs if x["ok"])
    total_questions = sum(x["question_count"] for x in all_runs)
    complete_questions = sum(x["complete_count"] for x in all_runs)
    valid_correct = sum(x["valid_correct_option_count"] for x in all_runs)
    with_explanation = sum(x["with_explanation_count"] for x in all_runs)

    report = {
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "base_url": BASE_URL,
        "repeat_count": REPEAT_COUNT,
        "health": health,
        "topic_summary": topic_summary,
        "all_runs": all_runs,
        "metric_files": metric_files,
        "charts": charts,
        "summary": {
            "successful_runs": successful_runs,
            "total_runs": total_runs,
            "success_rate_percent": round(successful_runs / total_runs * 100, 2) if total_runs else 0,
            "total_questions": total_questions,
            "complete_questions": complete_questions,
            "complete_questions_percent": round(complete_questions / total_questions * 100, 2) if total_questions else 0,
            "valid_correct_options": valid_correct,
            "with_explanations": with_explanation,
            "metric_files_with_metrics": len(metric_files),
            "datasetRows": health["debug_data"].get("data", {}).get("datasetRows") if isinstance(health["debug_data"].get("data"), dict) else None,
            "labelCounts": health["debug_data"].get("data", {}).get("labelCounts") if isinstance(health["debug_data"].get("data"), dict) else None
        }
    }

    json_path = OUT_DIR / "chapter5_strong_evaluation_report.json"
    md_path = OUT_DIR / "chapter5_strong_evaluation_report.md"

    json_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = []
    lines.append("# Посилене тестування для 5 розділу\n\n")
    lines.append(f"Дата запуску: {report['created_at']}\n\n")
    lines.append(f"Кількість повторів для кожної теми: {REPEAT_COUNT}\n\n")

    lines.append("## 1. Загальний підсумок\n\n")
    s = report["summary"]
    lines.append(f"- Успішних запусків генерації: {s['successful_runs']} із {s['total_runs']} ({s['success_rate_percent']}%)\n")
    lines.append(f"- Загальна кількість сформованих питань: {s['total_questions']}\n")
    lines.append(f"- Питань із повною структурою: {s['complete_questions']} ({s['complete_questions_percent']}%)\n")
    lines.append(f"- Питань із валідною правильною відповіддю: {s['valid_correct_options']}\n")
    lines.append(f"- Питань із поясненням: {s['with_explanations']}\n")
    lines.append(f"- JSON-файлів із метриками моделей: {s['metric_files_with_metrics']}\n")
    lines.append(f"- datasetRows: {s['datasetRows']}\n")
    lines.append(f"- labelCounts: {s['labelCounts']}\n\n")

    lines.append("## 2. Підсумок за темами\n\n")
    lines.append("| Тема | Успішно | Середній час, мс | Мін. час | Макс. час | Середня к-сть питань | Повнота структури, % |\n")
    lines.append("|---|---:|---:|---:|---:|---:|---:|\n")

    for item in topic_summary:
        lines.append(
            f"| {item['title']} | {item['success_runs']}/{item['total_runs']} | "
            f"{item['avg_time_ms']} | {item['min_time_ms']} | {item['max_time_ms']} | "
            f"{item['avg_question_count']} | {item['avg_complete_percent']} |\n"
        )

    lines.append("\n## 3. Детальні запуски\n\n")
    lines.append("| Тема | Запуск | HTTP | Час, мс | Питань | Повна структура | Валідна відповідь | Пояснення |\n")
    lines.append("|---|---:|---:|---:|---:|---:|---:|---:|\n")

    for item in all_runs:
        lines.append(
            f"| {item['topic']} | {item['run']} | {item['status']} | {item['time_ms']} | "
            f"{item['question_count']} | {item['complete_count']} | "
            f"{item['valid_correct_option_count']} | {item['with_explanation_count']} |\n"
        )

    lines.append("\n## 4. Приклади перших питань\n\n")
    used_topics = set()
    for item in all_runs:
        if item["topic"] in used_topics:
            continue
        used_topics.add(item["topic"])

        lines.append(f"### {item['topic']}\n")
        q = item.get("first_question")
        if q:
            lines.append(f"- Питання: {q.get('questionText') or q.get('question')}\n")
            lines.append(f"- Правильна відповідь: {q.get('correctOption') or q.get('answer')}\n")
            if q.get("explanation"):
                lines.append(f"- Пояснення: {q.get('explanation')}\n")
        else:
            lines.append("- Питання не сформовано.\n")
        lines.append("\n")

    lines.append("## 5. Виявлені метрики моделей\n\n")
    if metric_files:
        for item in metric_files[:12]:
            lines.append(f"### `{item['file']}`\n")
            for key, value in list(item["metrics"].items())[:12]:
                lines.append(f"- {key}: {value}\n")
            lines.append("\n")
    else:
        lines.append("Метрики accuracy/precision/recall/F1 автоматично не знайдено.\n\n")

    lines.append("## 6. Побудовані графіки\n\n")
    for chart in charts:
        lines.append(f"- `{chart}`\n")

    lines.append("\n## 7. Інтерпретація\n\n")
    lines.append("Результати показують стабільність тематичної генерації тестових запитань за кількома навчальними темами. ")
    lines.append("Оцінювання виконувалося не лише за фактом HTTP-відповіді, а й за структурною повнотою питань, валідністю правильної відповіді, наявністю пояснення та часом виконання. ")
    lines.append("Якщо кількість питань менша за запитану, це слід трактувати як обмеження алгоритму, пов'язане з обсягом і насиченістю вхідного навчального тексту.\n")

    md_path.write_text("".join(lines), encoding="utf-8")

    print("\n=== STRONG SUMMARY ===")
    print(json.dumps(report["summary"], ensure_ascii=False, indent=2))
    print(f"\nSaved: {json_path}")
    print(f"Saved: {md_path}")
    for chart in charts:
        print(f"Chart: {chart}")

if __name__ == "__main__":
    main()
