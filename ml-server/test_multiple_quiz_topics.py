import json
import urllib.request
from pathlib import Path


API_URL = "http://127.0.0.1:6060/quiz/generate"

OUTPUT_DIR = Path("api_test_results")
OUTPUT_DIR.mkdir(exist_ok=True)


TOPICS = [
    {
        "title": "Типи машинного навчання",
        "questionCount": 5,
        "text": """
Машинне навчання — це напрям штучного інтелекту, який дозволяє комп'ютерним системам навчатися на основі даних.
Навчання з учителем використовує розмічені дані, де для кожного прикладу відома правильна відповідь.
Класифікація є задачею машинного навчання, у якій модель визначає клас об'єкта на основі його ознак.
Регресія використовується для прогнозування числових значень, наприклад ціни, температури або рейтингу.
Навчання без учителя застосовується тоді, коли дані не мають готових правильних відповідей.
Кластеризація дозволяє об'єднувати схожі об'єкти у групи без попередньо заданих міток.
Нейронна мережа складається з шарів нейронів і може знаходити складні закономірності у великих наборах даних.
Якість моделі оцінюється за допомогою метрик, таких як точність, повнота, F1-міра або середня абсолютна помилка.
"""
    },
    {
        "title": "Нейронні мережі",
        "questionCount": 5,
        "text": """
Нейронна мережа — це модель машинного навчання, яка складається з взаємопов'язаних шарів штучних нейронів.
Вхідний шар приймає ознаки об'єкта, які використовуються для подальшої обробки.
Приховані шари виконують перетворення даних і дозволяють моделі знаходити складні закономірності.
Вихідний шар формує результат роботи нейронної мережі, наприклад клас об'єкта або числове значення.
Навчання нейронної мережі полягає в підборі вагових коефіцієнтів на основі навчальних прикладів.
Функція втрат використовується для вимірювання помилки між прогнозом моделі та правильною відповіддю.
Градієнтний спуск дозволяє поступово зменшувати помилку моделі шляхом оновлення ваг.
Перенавчання виникає тоді, коли модель занадто добре запам'ятовує навчальні дані, але погано працює на нових прикладах.
"""
    },
    {
        "title": "Рекомендаційні системи",
        "questionCount": 5,
        "text": """
Рекомендаційна система — це програмний модуль, який підбирає користувачу релевантний контент на основі даних.
Контентна фільтрація використовує характеристики об'єктів, наприклад тему, опис, теги або категорію.
Колаборативна фільтрація аналізує поведінку схожих користувачів і знаходить спільні закономірності у взаємодіях.
Гібридна рекомендаційна система поєднує кілька підходів для підвищення точності рекомендацій.
Профіль користувача може містити інтереси, історію переглядів, пошукові запити та результати тестів.
Cosine similarity використовується для вимірювання схожості між текстовими векторами або профілями користувачів.
TF-IDF дозволяє перетворити текстовий опис контенту у числовий вектор для подальшого аналізу.
Якість рекомендаційної системи можна оцінювати за точністю, повнотою, CTR або рівнем взаємодії користувача з контентом.
"""
    },
    {
        "title": "Метрики якості моделей",
        "questionCount": 5,
        "text": """
Метрики якості використовуються для оцінювання ефективності моделей машинного навчання.
Точність показує частку правильних передбачень серед усіх передбачень моделі.
Повнота показує, яку частину справді позитивних об'єктів модель змогла правильно знайти.
Precision використовується для оцінювання частки правильних позитивних передбачень серед усіх позитивних передбачень.
F1-міра поєднує precision і recall в одну узагальнену метрику якості класифікації.
Середня абсолютна помилка використовується для задач регресії і показує середній розмір помилки прогнозу.
Матриця помилок дозволяє побачити кількість правильних і неправильних класифікацій для кожного класу.
Вибір метрики залежить від типу задачі, структури даних і вимог до результату моделі.
"""
    }
]


def call_api(payload: dict) -> dict:
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")

    request = urllib.request.Request(
        API_URL,
        data=data,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST"
    )

    with urllib.request.urlopen(request) as response:
        response_body = response.read().decode("utf-8")
        return json.loads(response_body)


def save_result(index: int, title: str, result: dict) -> Path:
    safe_title = (
        title.lower()
        .replace(" ", "_")
        .replace("і", "i")
        .replace("ї", "i")
        .replace("є", "e")
        .replace("ґ", "g")
    )

    output_path = OUTPUT_DIR / f"{index}_{safe_title}.json"

    with open(output_path, "w", encoding="utf-8") as file:
        json.dump(result, file, ensure_ascii=False, indent=2)

    return output_path


def print_result(title: str, result: dict):
    print("=" * 90)
    print(f"Тема: {title}")
    print("-" * 90)

    stats = result.get("statistics", {})
    print(
        f"Речень: {stats.get('sentenceCount')} | "
        f"Ключових слів: {stats.get('keywordCount')} | "
        f"Тем: {stats.get('topicCount')} | "
        f"Питань: {stats.get('questionCount')}"
    )

    print("\nПитання:")

    for question in result.get("questions", []):
        print(f'\n{question["questionOrder"]}. {question["questionText"]}')
        print(f'   A: {question["optionA"]}')
        print(f'   B: {question["optionB"]}')
        print(f'   C: {question["optionC"]}')
        print(f'   D: {question["optionD"]}')
        print(f'   Правильна: {question["correctOption"]}')
        print(f'   Складність: {question["difficulty"]}')


def main():
    all_results = []

    for index, topic in enumerate(TOPICS, start=1):
        result = call_api(topic)
        output_path = save_result(index, topic["title"], result)

        all_results.append({
            "title": topic["title"],
            "outputFile": str(output_path),
            "statistics": result.get("statistics", {}),
            "questionCount": len(result.get("questions", [])),
            "error": result.get("error")
        })

        print_result(topic["title"], result)
        print(f"\nФайл результату: {output_path}")

    summary_path = OUTPUT_DIR / "summary.json"

    with open(summary_path, "w", encoding="utf-8") as file:
        json.dump(all_results, file, ensure_ascii=False, indent=2)

    print("\n" + "=" * 90)
    print(f"Загальний звіт збережено у файл: {summary_path}")


if __name__ == "__main__":
    main()
