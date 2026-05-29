import json
import urllib.request


API_URL = "http://127.0.0.1:6060/quiz/generate"

payload = {
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
}

data = json.dumps(payload, ensure_ascii=False).encode("utf-8")

request = urllib.request.Request(
    API_URL,
    data=data,
    headers={
        "Content-Type": "application/json; charset=utf-8"
    },
    method="POST"
)

with urllib.request.urlopen(request) as response:
    response_body = response.read().decode("utf-8")
    result = json.loads(response_body)

output_path = "api_quiz_result_utf8.json"

with open(output_path, "w", encoding="utf-8") as file:
    json.dump(result, file, ensure_ascii=False, indent=2)

print(json.dumps(result["statistics"], ensure_ascii=False, indent=2))
print()
print("Питання:")
for question in result["questions"]:
    print(f'{question["questionOrder"]}. {question["questionText"]}')
    print(f'   A: {question["optionA"]}')
    print(f'   B: {question["optionB"]}')
    print(f'   C: {question["optionC"]}')
    print(f'   D: {question["optionD"]}')
    print(f'   Правильна: {question["correctOption"]}')
    print()

print(f"Повний результат збережено у файл: {output_path}")
