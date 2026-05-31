import json
import urllib.request
from pathlib import Path

url = "http://127.0.0.1:6060/quiz/generate-strong"

payload = {
    "title": "Типи машинного навчання",
    "questionCount": 5,
    "text": """
Машинне навчання — це напрям штучного інтелекту, який дозволяє системам навчатися на основі даних.
Навчання з учителем — це підхід, який використовує розмічені дані з правильними відповідями.
Класифікація — це задача визначення класу об'єкта на основі його ознак.
Регресія — це задача прогнозування числових значень.
Навчання без учителя — це підхід, який шукає закономірності у нерозмічених даних.
Кластеризація — це метод об'єднання схожих об'єктів у групи.
Accuracy — це частка правильних передбачень серед усіх передбачень моделі.
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

output_path = Path("chapter4_test_results") / "generate_strong_result.json"

with open(output_path, "w", encoding="utf-8") as file:
    json.dump(result, file, ensure_ascii=False, indent=2)

print("SOURCE:", result.get("source"))
print("QUESTIONS:", result.get("statistics", {}).get("questionCount"))
print("MODEL:", result.get("modelDescription"))

for question in result.get("questions", []):
    print("=" * 80)
    print(question["questionText"])
    print("A:", question["optionA"])
    print("B:", question["optionB"])
    print("C:", question["optionC"])
    print("D:", question["optionD"])
    print("Correct:", question["correctOption"])
    print("Answer:", question.get("correctAnswerText"))
    print("ML score:", question.get("mlAnswerScore"))

print("Saved:", output_path)
