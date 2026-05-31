import json
import urllib.request
from pathlib import Path

url = "http://127.0.0.1:6060/quiz/generate-ml"

payload = {
    "title": "Типи машинного навчання",
    "questionCount": 5,
    "text": """
Машинне навчання — це напрям штучного інтелекту, який дозволяє комп'ютерним системам навчатися на основі даних.
Навчання з учителем використовує розмічені дані з правильними відповідями.
Класифікація визначає клас об'єкта на основі його ознак.
Регресія використовується для прогнозування числових значень.
Навчання без учителя застосовується для пошуку закономірностей у нерозмічених даних.
Кластеризація дозволяє об'єднувати схожі об'єкти у групи.
Метрики якості використовуються для оцінювання ефективності моделі.
"""
}

data = json.dumps(payload, ensure_ascii=False).encode("utf-8")

request = urllib.request.Request(
    url,
    data=data,
    headers={"Content-Type": "application/json; charset=utf-8"},
    method="POST",
)

with urllib.request.urlopen(request, timeout=120) as response:
    result = json.loads(response.read().decode("utf-8"))

output_path = Path("chapter4_test_results") / "generate_ml_result.json"
output_path.parent.mkdir(exist_ok=True)

with open(output_path, "w", encoding="utf-8") as file:
    json.dump(result, file, ensure_ascii=False, indent=2)

print("DONE")
print("source:", result.get("source"))
print("questionCount:", result.get("statistics", {}).get("questionCount"))

for question in result.get("questions", []):
    print("-" * 80)
    print(question["questionText"])
    print("A:", question["optionA"])
    print("B:", question["optionB"])
    print("C:", question["optionC"])
    print("D:", question["optionD"])
    print("Correct:", question["correctOption"])
    print("Selected answer:", question.get("selectedAnswer"))
    print("ML score:", question.get("mlAnswerScore"))

print("Saved:", output_path)
