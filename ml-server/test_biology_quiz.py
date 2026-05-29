import json
import urllib.request

payload = {
    "title": "Біологія: клітина",
    "text": """
Клітина є основною структурною і функціональною одиницею живих організмів.
Вона має плазматичну мембрану, цитоплазму та генетичний матеріал.
Плазматична мембрана відмежовує внутрішнє середовище клітини від зовнішнього середовища.
Цитоплазма містить органели, які виконують різні функції.
Ядро зберігає спадкову інформацію у вигляді ДНК.
Мітохондрії забезпечують клітину енергією.
Рибосоми беруть участь у синтезі білків.
Рослинні клітини мають клітинну стінку, хлоропласти та велику вакуолю.
Хлоропласти здійснюють фотосинтез, під час якого утворюються органічні речовини.
Тканина — це група клітин, подібних за будовою та функціями.
""",
    "questionCount": 7
}

data = json.dumps(payload, ensure_ascii=False).encode("utf-8")

request = urllib.request.Request(
    "http://127.0.0.1:6060/quiz/generate",
    data=data,
    headers={"Content-Type": "application/json; charset=utf-8"},
    method="POST",
)

with urllib.request.urlopen(request, timeout=60) as response:
    result = json.loads(response.read().decode("utf-8"))

print(json.dumps({
    "sentenceCount": result.get("statistics", {}).get("sentenceCount"),
    "keywordCount": result.get("statistics", {}).get("keywordCount"),
    "topicCount": result.get("statistics", {}).get("topicCount"),
    "questionCount": len(result.get("questions", [])),
}, ensure_ascii=False, indent=2))

print("\nПитання:")
for index, question in enumerate(result.get("questions", []), start=1):
    print(f"\n{index}. {question.get('questionText')}")
    print(f"A: {question.get('optionA')}")
    print(f"B: {question.get('optionB')}")
    print(f"C: {question.get('optionC')}")
    print(f"D: {question.get('optionD')}")
    print(f"Правильна: {question.get('correctOption')}")
    print(f"Пояснення: {question.get('explanation')}")

with open("biology_quiz_test_result.json", "w", encoding="utf-8") as file:
    json.dump(result, file, ensure_ascii=False, indent=2)

print("\nПовний результат збережено: biology_quiz_test_result.json")
