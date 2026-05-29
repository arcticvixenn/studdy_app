import json
import re
import urllib.request


BAD_SINGLE_ANSWERS = {
    "показує", "відображає", "змушує", "дозволяє", "дозволяють",
    "використовується", "використовуються", "впливає", "впливають",
    "змінює", "змінюють", "формується", "формуються",
    "виробників", "споживачів", "товар", "товару", "функції",
    "управління", "суспільства", "реформи", "реформ",
    "значення", "результат", "умови", "коду",
    "політичні", "економічні", "успішних", "причиною",
    "наслідком", "ефективності", "підвищення", "повернене",
    "містить", "всередину", "готовність", "бажання",
}

ML_DISTRACTORS = {
    "для навчання на розмічених даних",
    "для роботи з даними без готових відповідей",
    "для оцінювання якості моделі",
    "для прогнозування числових значень",
    "для визначення класу об'єкта на основі його ознак",
    "для об'єднання схожих об'єктів у групи",
    "машинне навчання",
    "датасет",
    "точність",
    "регресія",
    "класифікація",
    "кластеризація",
}

TEST_CASES = [
    {
        "title": "Біологія: клітина",
        "domain": "biology",
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
        "questionCount": 7,
    },
    {
        "title": "Економіка: ринок",
        "domain": "economy",
        "text": """
Ринок — це система економічних відносин між покупцями та продавцями.
Попит показує бажання і можливість споживачів купити товар за певною ціною.
Пропозиція відображає готовність виробників продати товар.
Ціна формується під впливом попиту та пропозиції.
Конкуренція змушує виробників покращувати якість товарів і знижувати витрати.
Інфляція — це зростання загального рівня цін в економіці.
Прибуток показує різницю між доходами та витратами підприємства.
""",
        "questionCount": 6,
    },
    {
        "title": "Історія: реформи",
        "domain": "history",
        "text": """
Реформа — це цілеспрямована зміна суспільного або державного устрою.
Економічні реформи впливають на розвиток виробництва, торгівлі та фінансів.
Політичні реформи змінюють систему влади та механізми управління державою.
Причиною реформ часто стає криза або потреба модернізації суспільства.
Наслідком успішних реформ може бути підвищення ефективності управління.
Культура відображає цінності, традиції та спосіб життя суспільства.
""",
        "questionCount": 6,
    },
    {
        "title": "Програмування: функції",
        "domain": "programming",
        "text": """
Функція — це окремий блок коду, який виконує певну задачу.
Параметри дозволяють передавати дані всередину функції.
Повернене значення містить результат роботи функції.
Умовний оператор використовується для виконання різних дій залежно від умови.
Цикл дозволяє повторювати фрагмент коду кілька разів.
Масив зберігає набір елементів одного або подібного типу.
""",
        "questionCount": 6,
    },
]


def normalize(value):
    value = str(value or "").lower().strip()
    value = re.sub(r"\s+", " ", value)
    return value


def call_api(payload):
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")

    request = urllib.request.Request(
        "http://127.0.0.1:6060/quiz/generate",
        data=data,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )

    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode("utf-8"))


def get_correct_answer(question):
    option_key = f"option{question.get('correctOption')}"
    return question.get(option_key, "")


def analyze_question(question, domain):
    issues = []

    question_text = normalize(question.get("questionText"))
    correct = normalize(get_correct_answer(question))

    options = [
        normalize(question.get("optionA")),
        normalize(question.get("optionB")),
        normalize(question.get("optionC")),
        normalize(question.get("optionD")),
    ]

    if not question_text:
        issues.append("empty_question")

    if len(set(options)) < 4:
        issues.append("duplicate_options")

    if len(correct.split()) == 1 and correct in BAD_SINGLE_ANSWERS:
        issues.append(f"bad_single_answer:{correct}")

    if domain != "ml":
        for option in options:
            if option in ML_DISTRACTORS:
                issues.append(f"wrong_domain_ml_distractor:{option}")

    if "найкраще описує це твердження" in question_text:
        if len(correct.split()) <= 1:
            issues.append("weak_fallback_single_word")

    if len(correct) < 4:
        issues.append("too_short_answer")

    return issues


def main():
    report = {
        "cases": [],
        "totalQuestions": 0,
        "totalIssues": 0,
        "qualityScore": 0,
    }

    for case in TEST_CASES:
        result = call_api(case)
        questions = result.get("questions", [])

        case_issues = []

        for index, question in enumerate(questions, start=1):
            issues = analyze_question(question, case["domain"])

            if issues:
                case_issues.append({
                    "index": index,
                    "questionText": question.get("questionText"),
                    "correctAnswer": get_correct_answer(question),
                    "issues": issues,
                })

        created = len(questions)
        requested = case["questionCount"]
        issue_count = sum(len(item["issues"]) for item in case_issues)

        case_score = 100

        if requested:
            case_score -= max(0, requested - created) * 10

        case_score -= issue_count * 12
        case_score = max(0, case_score)

        report["cases"].append({
            "title": case["title"],
            "requested": requested,
            "created": created,
            "issues": case_issues,
            "issueCount": issue_count,
            "qualityScore": case_score,
        })

        report["totalQuestions"] += created
        report["totalIssues"] += issue_count

    if report["cases"]:
        report["qualityScore"] = round(
            sum(item["qualityScore"] for item in report["cases"]) / len(report["cases"]),
            2
        )

    print(json.dumps(report, ensure_ascii=False, indent=2))

    with open("quiz_quality_report.json", "w", encoding="utf-8") as file:
        json.dump(report, file, ensure_ascii=False, indent=2)

    print("\nSaved: quiz_quality_report.json")


if __name__ == "__main__":
    main()
