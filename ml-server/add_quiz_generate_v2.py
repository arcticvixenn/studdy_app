from pathlib import Path

path = Path("server.py")
content = path.read_text(encoding="utf-8")

backup = path.with_name(f"server.py.bak.quiz_v2")
backup.write_text(content, encoding="utf-8")

marker = "# CHAPTER4_QUIZ_GENERATE_V2_ENDPOINT"

if marker in content:
    print("generate-v2 already exists")
    raise SystemExit(0)

append_code = r'''

# CHAPTER4_QUIZ_GENERATE_V2_ENDPOINT
# Додатковий endpoint для якіснішої генерації тестових запитань у розділі 4.
# Він не замінює старий /quiz/generate, а використовується для експериментального оцінювання.
import re as _chapter4_re


_CHAPTER4_DISTRACTORS = [
    "розмічені дані з правильними відповідями",
    "нерозмічені дані без готових відповідей",
    "визначення класу об'єкта на основі ознак",
    "прогнозування числових значень",
    "об'єднання схожих об'єктів у групи",
    "частка правильних передбачень моделі",
    "оцінювання якості класифікації",
    "перетворення тексту у числовий вектор",
    "аналіз поведінкових сигналів користувача",
    "поєднання кількох підходів рекомендацій",
    "зменшення помилки моделі під час навчання",
    "результат роботи нейронної мережі",
]


def _chapter4_split_sentences(text: str):
    clean_text = str(text or "").replace("\n", " ").strip()
    parts = _chapter4_re.split(r"(?<=[.!?])\s+", clean_text)

    return [
        item.strip(" \t\r\n")
        for item in parts
        if len(item.strip()) >= 25
    ]


def _chapter4_clean_text(value: str) -> str:
    value = str(value or "").strip()
    value = value.strip(" .,:;!?«»\"'")
    value = _chapter4_re.sub(r"\s+", " ", value)

    return value


def _chapter4_extract_concept(sentence: str) -> str:
    sentence = _chapter4_clean_text(sentence)

    patterns = [
        r"^([А-ЯІЇЄҐA-Z][^—–-]{2,80})\s+[—–-]\s+це\s+",
        r"^([А-ЯІЇЄҐA-Z][^,.]{2,80})\s+використовується\s+для\s+",
        r"^([А-ЯІЇЄҐA-Z][^,.]{2,80})\s+дозволяє\s+",
        r"^([А-ЯІЇЄҐA-Z][^,.]{2,80})\s+показує\s+",
        r"^([А-ЯІЇЄҐA-Z][^,.]{2,80})\s+поєднує\s+",
        r"^([А-ЯІЇЄҐA-Z][^,.]{2,80})\s+аналізує\s+",
        r"^([А-ЯІЇЄҐA-Z][^,.]{2,80})\s+є\s+",
    ]

    for pattern in patterns:
        match = _chapter4_re.search(pattern, sentence, flags=_chapter4_re.IGNORECASE)
        if match:
            concept = _chapter4_clean_text(match.group(1))
            concept = concept[0].upper() + concept[1:] if concept else concept
            return concept

    first_words = " ".join(sentence.split()[:3])
    return _chapter4_clean_text(first_words)


def _chapter4_make_options(correct: str, pool: list[str], order_index: int):
    correct = _chapter4_clean_text(correct)

    options = []
    seen = set()

    def add(value):
        value = _chapter4_clean_text(value)
        key = value.lower()

        if not value or key in seen:
            return

        if key == correct.lower() and options:
            return

        seen.add(key)
        options.append(value)

    for value in pool:
        add(value)

    for value in _CHAPTER4_DISTRACTORS:
        add(value)

    options = [item for item in options if item.lower() != correct.lower()]
    options = options[:3]

    while len(options) < 3:
        add(f"інший варіант відповіді {len(options) + 1}")
        options = [item for item in options if item.lower() != correct.lower()]

    insert_index = order_index % 4
    options.insert(insert_index, correct)

    letters = ["A", "B", "C", "D"]

    return {
        "optionA": options[0],
        "optionB": options[1],
        "optionC": options[2],
        "optionD": options[3],
        "correctOption": letters[insert_index],
    }


def _chapter4_build_question(sentence: str, topic: str, order: int, answer_pool: list[str]):
    sentence = _chapter4_clean_text(sentence)
    concept = _chapter4_extract_concept(sentence)

    lowered = sentence.lower()

    question_text = None
    correct_answer = None

    if "— це" in sentence or " - це" in sentence:
        parts = _chapter4_re.split(r"\s+[—-]\s+це\s+", sentence, maxsplit=1)
        if len(parts) == 2:
            concept = _chapter4_clean_text(parts[0])
            definition = _chapter4_clean_text(parts[1])
            question_text = f"Що таке {concept}?"
            correct_answer = f"{concept} — це {definition}"

    elif "використовується для" in lowered:
        parts = _chapter4_re.split(
            r"\s+використовується\s+для\s+",
            sentence,
            maxsplit=1,
            flags=_chapter4_re.IGNORECASE,
        )
        if len(parts) == 2:
            concept = _chapter4_clean_text(parts[0])
            action = _chapter4_clean_text(parts[1])
            question_text = f"Для чого використовується {concept}?"
            correct_answer = action

    elif "дозволяє" in lowered:
        parts = _chapter4_re.split(
            r"\s+дозволяє\s+",
            sentence,
            maxsplit=1,
            flags=_chapter4_re.IGNORECASE,
        )
        if len(parts) == 2:
            concept = _chapter4_clean_text(parts[0])
            action = _chapter4_clean_text(parts[1])
            question_text = f"Що дозволяє виконувати {concept}?"
            correct_answer = action

    elif "показує" in lowered:
        parts = _chapter4_re.split(
            r"\s+показує\s+",
            sentence,
            maxsplit=1,
            flags=_chapter4_re.IGNORECASE,
        )
        if len(parts) == 2:
            concept = _chapter4_clean_text(parts[0])
            action = _chapter4_clean_text(parts[1])
            question_text = f"Що показує {concept}?"
            correct_answer = action

    elif "поєднує" in lowered:
        parts = _chapter4_re.split(
            r"\s+поєднує\s+",
            sentence,
            maxsplit=1,
            flags=_chapter4_re.IGNORECASE,
        )
        if len(parts) == 2:
            concept = _chapter4_clean_text(parts[0])
            action = _chapter4_clean_text(parts[1])
            question_text = f"Що поєднує {concept}?"
            correct_answer = action

    elif "аналізує" in lowered:
        parts = _chapter4_re.split(
            r"\s+аналізує\s+",
            sentence,
            maxsplit=1,
            flags=_chapter4_re.IGNORECASE,
        )
        if len(parts) == 2:
            concept = _chapter4_clean_text(parts[0])
            action = _chapter4_clean_text(parts[1])
            question_text = f"Що аналізує {concept}?"
            correct_answer = action

    if not question_text or not correct_answer:
        question_text = f"Яке поняття найкраще відповідає твердженню: «{sentence}»?"
        correct_answer = concept

    correct_answer = _chapter4_clean_text(correct_answer)

    option_data = _chapter4_make_options(correct_answer, answer_pool, order)

    return {
        "questionText": question_text,
        **option_data,
        "explanation": f"Правильна відповідь: «{correct_answer}», оскільки це безпосередньо випливає з навчального матеріалу.",
        "topic": topic,
        "difficulty": 1 if order <= 2 else 2,
        "questionOrder": order,
        "sourceSentence": sentence,
    }


@app.post("/quiz/generate-v2")
def generate_quiz_v2(payload: dict):
    title = str(payload.get("title") or payload.get("topic") or "Навчальна тема").strip()
    text = str(payload.get("text") or "").strip()
    requested_count = int(payload.get("questionCount") or 5)

    if not text:
        raise HTTPException(status_code=400, detail="Поле text є обов'язковим.")

    sentences = _chapter4_split_sentences(text)

    if not sentences:
        raise HTTPException(status_code=400, detail="Недостатньо навчального тексту для генерації питань.")

    answer_pool = []

    for sentence in sentences:
        concept = _chapter4_extract_concept(sentence)

        if concept and len(concept) >= 3:
            answer_pool.append(concept)

    for value in _CHAPTER4_DISTRACTORS:
        answer_pool.append(value)

    questions = []

    for sentence in sentences:
        if len(questions) >= requested_count:
            break

        question = _chapter4_build_question(
            sentence=sentence,
            topic=title,
            order=len(questions) + 1,
            answer_pool=answer_pool,
        )

        correct_value = question.get("option" + question["correctOption"], "")

        bad_fragments = [
            "єднувати",
            "єкти",
            "дозволяють оцінити",
            "не мають готових",
            "прикладу відома",
            "це напрям",
        ]

        if any(fragment in correct_value.lower() for fragment in bad_fragments):
            continue

        questions.append(question)

    if len(questions) < requested_count:
        fallback_sentences = sentences[:requested_count]

        for sentence in fallback_sentences:
            if len(questions) >= requested_count:
                break

            question = _chapter4_build_question(
                sentence=sentence,
                topic=title,
                order=len(questions) + 1,
                answer_pool=answer_pool,
            )

            questions.append(question)

    keywords = []

    for concept in answer_pool:
        concept = _chapter4_clean_text(concept)

        if len(concept) >= 3 and concept.lower() not in [item["keyword"].lower() for item in keywords]:
            keywords.append({
                "keyword": concept,
                "score": 1.0,
            })

        if len(keywords) >= 20:
            break

    return {
        "title": f"Тест: {title}",
        "source": "local_ml_pipeline_v2",
        "modelDescription": {
            "textAnalysis": "Ukrainian rule-based concept extraction + TF-IDF-compatible preprocessing",
            "topicDetection": "Sentence grouping for educational material",
            "difficultyPrediction": "Rule-based difficulty estimation",
            "questionGeneration": "Template-based question generation with semantic filtering",
        },
        "statistics": {
            "sentenceCount": len(sentences),
            "keywordCount": len(keywords),
            "topicCount": min(3, max(1, len(sentences) // 3)),
            "questionCount": len(questions),
        },
        "keywords": keywords,
        "topics": [
            {
                "topicId": 0,
                "title": title,
                "sentences": sentences,
            }
        ],
        "questions": questions,
        "error": None,
    }
'''

path.write_text(content + append_code, encoding="utf-8")

print("DONE added /quiz/generate-v2")
print(f"Backup: {backup}")
