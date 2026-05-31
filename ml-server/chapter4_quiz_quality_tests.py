import csv
import json
import os
import time
import urllib.error
import urllib.request
from pathlib import Path


BASE_URL = os.environ.get("STUDDY_ML_API", "http://127.0.0.1:6060")
API_URL = f"{BASE_URL}/quiz/generate-strong"

OUTPUT_DIR = Path("chapter4_test_results") / "quiz_quality"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


TOPICS = [
    {
        "title": "Типи машинного навчання",
        "questionCount": 5,
        "text": """
Машинне навчання — це напрям штучного інтелекту, який дозволяє комп'ютерним системам навчатися на основі даних.
Навчання з учителем використовує розмічені дані з правильними відповідями.
Класифікація є задачею машинного навчання, у якій модель визначає клас об'єкта на основі його ознак.
Регресія використовується для прогнозування числових значень, наприклад ціни, температури або рейтингу.
Навчання без учителя застосовується для пошуку закономірностей у нерозмічених даних.
Кластеризація дозволяє об'єднувати схожі об'єкти у групи без попередньо заданих міток.
Метрики якості використовуються для оцінювання ефективності моделі.
""",
    },
    {
        "title": "Нейронні мережі",
        "questionCount": 5,
        "text": """
Нейронна мережа — це модель машинного навчання, яка складається з шарів штучних нейронів.
Вхідний шар приймає ознаки об'єкта для подальшої обробки.
Приховані шари виконують перетворення даних і знаходять складні закономірності.
Вихідний шар формує результат роботи нейронної мережі.
Функція втрат використовується для вимірювання помилки між прогнозом і правильною відповіддю.
Градієнтний спуск дозволяє поступово зменшувати помилку моделі шляхом оновлення ваг.
Перенавчання виникає тоді, коли модель запам'ятовує навчальні дані і погано працює на нових прикладах.
""",
    },
    {
        "title": "Рекомендаційні системи",
        "questionCount": 5,
        "text": """
Рекомендаційна система — це програмний модуль, який підбирає користувачу релевантний контент на основі даних.
Контентна фільтрація використовує характеристики об'єктів: тему, опис, теги або категорію.
Колаборативна фільтрація аналізує поведінку схожих користувачів.
Гібридна рекомендаційна система поєднує контентні ознаки та поведінкові сигнали користувача.
Профіль користувача містить інтереси, історію переглядів, пошукові запити та результати тестів.
Cosine similarity використовується для вимірювання схожості між текстовими векторами.
TF-IDF дозволяє перетворити текстовий опис контенту у числовий вектор.
""",
    },
    {
        "title": "Метрики якості моделей",
        "questionCount": 5,
        "text": """
Метрики якості використовуються для оцінювання ефективності моделей машинного навчання.
Accuracy показує частку правильних передбачень серед усіх передбачень моделі.
Recall показує частку справді позитивних об'єктів, які модель змогла правильно знайти.
Precision показує частку правильних позитивних передбачень серед усіх позитивних передбачень.
F1-міра поєднує precision і recall в одну узагальнену метрику класифікації.
Середня абсолютна помилка використовується для задач регресії.
Матриця помилок дозволяє побачити кількість правильних і неправильних класифікацій.
""",
    },
]


REQUIRED_FIELDS = [
    "questionText",
    "optionA",
    "optionB",
    "optionC",
    "optionD",
    "correctOption",
    "questionOrder",
]


BAD_FRAGMENTS = [
    "єднувати",
    "єкти",
    "дозволяють оцінити",
    "не мають готових",
    "прикладу відома",
    "це напрям",
    "машинне навчання це напрям",
]


def call_quiz_api(payload: dict) -> dict:
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")

    request = urllib.request.Request(
        API_URL,
        data=data,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=120) as response:
        return json.loads(response.read().decode("utf-8"))


def validate_question(question: dict) -> tuple[int, list[str]]:
    score = 0
    issues = []

    for field in REQUIRED_FIELDS:
        if question.get(field) not in (None, ""):
            score += 1
        else:
            issues.append(f"empty:{field}")

    options = [
        str(question.get("optionA", "")).strip(),
        str(question.get("optionB", "")).strip(),
        str(question.get("optionC", "")).strip(),
        str(question.get("optionD", "")).strip(),
    ]

    if len(set(options)) == 4:
        score += 1
    else:
        issues.append("not_unique_options")

    correct_option = str(question.get("correctOption", "")).strip()

    if correct_option in {"A", "B", "C", "D"}:
        score += 1
        correct_value = str(question.get(f"option{correct_option}", "")).lower()

        for fragment in BAD_FRAGMENTS:
            if fragment in correct_value:
                issues.append(f"bad_answer_fragment:{fragment}")
    else:
        issues.append("invalid_correct_option")

    if len(str(question.get("questionText", "")).strip()) >= 20:
        score += 1
    else:
        issues.append("short_question_text")

    if not any(issue.startswith("bad_answer_fragment") for issue in issues):
        score += 1

    return score, issues


def safe_filename(value: str) -> str:
    result = value.lower()
    result = result.replace(" ", "_")
    result = result.replace("і", "i").replace("ї", "i").replace("є", "e").replace("ґ", "g")
    return "".join(ch for ch in result if ch.isalnum() or ch in "_-")


def main() -> None:
    summary_rows = []

    for index, payload in enumerate(TOPICS, start=1):
        title = payload["title"]

        print("=" * 90)
        print(f"Тест генерації: {title}")

        started = time.perf_counter()

        try:
            result = call_quiz_api(payload)
            elapsed_ms = round((time.perf_counter() - started) * 1000, 2)

            questions = result.get("questions", [])
            statistics = result.get("statistics", {})

            total_score = 0
            all_issues = []

            for question in questions:
                question_score, issues = validate_question(question)
                total_score += question_score
                all_issues.extend(issues)

            max_score = len(questions) * (len(REQUIRED_FIELDS) + 4)
            quality_percent = round((total_score / max_score) * 100, 2) if max_score else 0

            status = "PASS" if len(questions) > 0 and quality_percent >= 80 and not all_issues else "CHECK"

            result_path = OUTPUT_DIR / f"{index}_{safe_filename(title)}.json"

            with open(result_path, "w", encoding="utf-8") as file:
                json.dump(result, file, ensure_ascii=False, indent=2)

            row = {
                "topic": title,
                "status": status,
                "elapsedMs": elapsed_ms,
                "requestedQuestions": payload["questionCount"],
                "actualQuestions": len(questions),
                "sentenceCount": statistics.get("sentenceCount"),
                "keywordCount": statistics.get("keywordCount"),
                "topicCount": statistics.get("topicCount"),
                "qualityPercent": quality_percent,
                "issues": "; ".join(sorted(set(all_issues))) if all_issues else "",
                "resultFile": str(result_path),
            }

            summary_rows.append(row)

            print(f"Статус: {status}")
            print(f"Час відповіді: {elapsed_ms} мс")
            print(f"Кількість питань: {len(questions)}")
            print(f"Оцінка структури: {quality_percent}%")
            print(f"Проблеми: {row['issues'] or 'немає'}")
            print(f"Файл: {result_path}")

        except urllib.error.HTTPError as error:
            elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
            error_text = error.read().decode("utf-8", errors="replace")

            summary_rows.append({
                "topic": title,
                "status": "FAIL",
                "elapsedMs": elapsed_ms,
                "requestedQuestions": payload["questionCount"],
                "actualQuestions": 0,
                "sentenceCount": None,
                "keywordCount": None,
                "topicCount": None,
                "qualityPercent": 0,
                "issues": f"HTTP {error.code}: {error_text}",
                "resultFile": "",
            })

            print("Статус: FAIL")
            print(f"HTTP {error.code}")
            print(error_text)

    summary_json = OUTPUT_DIR / "quiz_quality_summary.json"

    with open(summary_json, "w", encoding="utf-8") as file:
        json.dump(summary_rows, file, ensure_ascii=False, indent=2)

    summary_csv = OUTPUT_DIR / "quiz_quality_summary.csv"

    with open(summary_csv, "w", encoding="utf-8", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=list(summary_rows[0].keys()))
        writer.writeheader()
        writer.writerows(summary_rows)

    print("=" * 90)
    print("ПІДСУМОК ТЕСТУВАННЯ ГЕНЕРАЦІЇ ТЕСТІВ")
    print(f"JSON-звіт: {summary_json}")
    print(f"CSV-звіт: {summary_csv}")


if __name__ == "__main__":
    main()
