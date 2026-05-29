from typing import List, Dict, Optional
import random
import re

from src.text_preprocessor import split_sentences, tokenize
from src.answer_candidate_model import AnswerCandidateModel
from src.distractor_generator import DistractorGenerator


BAD_ANSWERS = {
    "даних", "дані", "основі", "дозволяє", "оцінюється", "використовується",
    "застосовується", "мають", "можуть", "прикладу", "наприклад",
    "значень", "рейтингу", "температури", "ціни", "готових", "правильних",
    "відповідей", "визначає", "складається", "може", "знаходити",
    "таких", "таких як", "коли", "відома", "правильна", "які",
    "використовуються", "формує", "приймає", "виконують"
}


BAD_PHRASE_PARTS = [
    "які використовуються",
    "наприклад клас",
    "наприклад",
    "на основі",
    "у якій",
    "який дозволяє",
]


DOMAIN_TERMS = [
    "середня абсолютна помилка",
    "навчання з учителем",
    "навчання без учителя",
    "машинне навчання",
    "штучний інтелект",
    "нейронна мережа",
    "вхідний шар",
    "вихідний шар",
    "приховані шари",
    "функція втрат",
    "градієнтний спуск",
    "перенавчання",
    "метрики якості",
    "якість моделі",
    "класифікація",
    "кластеризація",
    "регресія",
    "точність",
    "повнота",
    "f1-міра",
    "алгоритм",
    "датасет",
    "модель",
    "ознака",
]


class QuestionGenerator:
    def __init__(self):
        random.seed(42)
        self.answer_model = AnswerCandidateModel()
        self.answer_model.load()
        self.distractor_generator = DistractorGenerator()

    def clean_text(self, value: str) -> str:
        value = str(value).strip()
        value = re.sub(r"\s+", " ", value)
        value = value.strip(" ,.;:—-")
        return value

    def has_bad_phrase(self, value: str) -> bool:
        lower = value.lower()
        return any(part in lower for part in BAD_PHRASE_PARTS)

    def sentence_has_term(self, sentence: str, term: str) -> bool:
        return term.lower() in sentence.lower()

    def get_best_domain_term(self, sentence: str) -> Optional[str]:
        for term in sorted(DOMAIN_TERMS, key=len, reverse=True):
            if self.sentence_has_term(sentence, term):
                return term
        return None

    def is_good_short_answer(self, answer: str) -> bool:
        answer = self.clean_text(answer)
        lower = answer.lower()

        if len(answer) < 4:
            return False

        if lower in BAD_ANSWERS:
            return False

        if self.has_bad_phrase(answer):
            return False

        words = lower.split()

        if len(words) > 4:
            return False

        if words[0] in BAD_ANSWERS or words[-1] in BAD_ANSWERS:
            return False

        return True

    def is_good_long_answer(self, answer: str) -> bool:
        answer = self.clean_text(answer)
        lower = answer.lower()

        if len(answer) < 6:
            return False

        if self.has_bad_phrase(answer):
            return False

        words = lower.split()

        if len(words) > 16:
            return False

        if words[0] in BAD_ANSWERS or words[-1] in BAD_ANSWERS:
            return False

        return True

    def make_options(
        self,
        correct_answer: str,
        answer_type: str,
        source_sentence: str,
        term: str = ""
    ):
        if answer_type == "long":
            distractors = self.distractor_generator.generate_purpose_distractors(
                correct_answer=correct_answer,
                source_sentence=source_sentence,
                term=term,
            )
        else:
            distractors = self.distractor_generator.generate_term_distractors(
                correct_answer=correct_answer,
                topic=term,
            )

        options = [correct_answer] + distractors
        random.shuffle(options)

        correct_index = options.index(correct_answer)
        correct_option = ["A", "B", "C", "D"][correct_index]

        return options, correct_option

    def try_neural_layer_patterns(self, sentence: str) -> Optional[Dict]:
        s = self.clean_text(sentence)

        match = re.match(r"^Вхідний\s+шар\s+приймає\s+(.+?)(,\s+які\s+.+)?\.?$", s, flags=re.IGNORECASE)
        if match:
            answer = self.clean_text(match.group(1))
            return {
                "questionText": "Що приймає вхідний шар нейронної мережі?",
                "answer": answer,
                "answerType": "long",
                "term": "вхідний шар",
            }

        match = re.match(r"^Вихідний\s+шар\s+формує\s+(.+?)(,\s+наприклад\s+.+)?\.?$", s, flags=re.IGNORECASE)
        if match:
            answer = self.clean_text(match.group(1))
            return {
                "questionText": "Що формує вихідний шар нейронної мережі?",
                "answer": answer,
                "answerType": "long",
                "term": "вихідний шар",
            }

        match = re.match(r"^Приховані\s+шари\s+виконують\s+(.+?)\s+і\s+дозволяють\s+моделі\s+знаходити\s+(.+?)\.?$", s, flags=re.IGNORECASE)
        if match:
            first_part = self.clean_text(match.group(1))
            second_part = self.clean_text(match.group(2))

            if second_part.lower() == "складні закономірності":
                second_part = "складних закономірностей"

            answer = self.clean_text(first_part + " і пошук " + second_part)

            return {
                "questionText": "Яку роль виконують приховані шари нейронної мережі?",
                "answer": answer,
                "answerType": "long",
                "term": "приховані шари",
            }

        return None

    def try_pattern_question(self, sentence: str) -> Optional[Dict]:
        neural_result = self.try_neural_layer_patterns(sentence)
        if neural_result:
            return neural_result

        s = self.clean_text(sentence)

        match = re.match(r"^(.+?)\s+використовується\s+для\s+(.+?)\.?$", s, flags=re.IGNORECASE)
        if match:
            term = self.clean_text(match.group(1))
            answer = self.clean_text("для " + match.group(2))

            if self.is_good_short_answer(term) and self.is_good_long_answer(answer):
                return {
                    "questionText": f"Для чого використовується поняття «{term}»?",
                    "answer": answer,
                    "answerType": "long",
                    "term": term,
                }

        match = re.match(r"^(.+?)\s+застосовується\s+тоді,\s+коли\s+(.+?)\.?$", s, flags=re.IGNORECASE)
        if match:
            term = self.clean_text(match.group(1))
            answer = self.clean_text("коли " + match.group(2))

            if self.is_good_short_answer(term) and self.is_good_long_answer(answer):
                return {
                    "questionText": f"Коли застосовується поняття «{term}»?",
                    "answer": answer,
                    "answerType": "long",
                    "term": term,
                }

        match = re.match(r"^(.+?)\s+дозволяє\s+(.+?)\.?$", s, flags=re.IGNORECASE)
        if match:
            term = self.clean_text(match.group(1))
            answer = self.clean_text(match.group(2))

            if self.is_good_short_answer(term) and self.is_good_long_answer(answer):
                return {
                    "questionText": f"Що дозволяє виконувати поняття «{term}»?",
                    "answer": answer,
                    "answerType": "long",
                    "term": term,
                }

        match = re.match(r"^(.+?)\s+складається\s+з\s+(.+?)\.?$", s, flags=re.IGNORECASE)
        if match:
            term = self.clean_text(match.group(1))
            answer = self.clean_text("з " + match.group(2))

            if self.is_good_short_answer(term) and self.is_good_long_answer(answer):
                return {
                    "questionText": f"З чого складається поняття «{term}»?",
                    "answer": answer,
                    "answerType": "long",
                    "term": term,
                }

        match = re.match(
            r"^Якість\s+(.+?)\s+оцінюється\s+за\s+допомогою\s+метрик,\s+таких\s+як\s+(.+?)\.?$",
            s,
            flags=re.IGNORECASE
        )
        if match:
            answer = self.clean_text(match.group(2))

            if self.is_good_long_answer(answer):
                return {
                    "questionText": "Які метрики можуть використовуватися для оцінювання якості моделі?",
                    "answer": answer,
                    "answerType": "long",
                    "term": "метрики якості",
                }

        match = re.match(r"^(.+?)\s+є\s+задачею\s+(.+?)\.?$", s, flags=re.IGNORECASE)
        if match:
            term = self.clean_text(match.group(1))

            if self.is_good_short_answer(term):
                return {
                    "questionText": "Яке поняття є задачею машинного навчання, описаною в твердженні?",
                    "answer": term,
                    "answerType": "term",
                    "term": term,
                }

        match = re.match(r"^(.+?)\s+—\s+це\s+(.+?)\.?$", s, flags=re.IGNORECASE)
        if match:
            term = self.clean_text(match.group(1))
            answer = self.clean_text(match.group(2))

            if self.is_good_short_answer(term) and self.is_good_long_answer(answer):
                return {
                    "questionText": f"Що таке «{term}»?",
                    "answer": answer,
                    "answerType": "long",
                    "term": term,
                }

        return None

    def find_answer_in_sentence(
        self,
        sentence: str,
        keywords: List[str],
        context: str = ""
    ) -> Optional[str]:
        domain_term = self.get_best_domain_term(sentence)

        if domain_term and self.is_good_short_answer(domain_term):
            return domain_term

        ranked = self.answer_model.rank_candidates(
            sentence=sentence,
            context=context or sentence,
            limit=20
        )

        for item in ranked:
            candidate = self.clean_text(item["candidate"])

            if self.is_good_short_answer(candidate):
                return candidate

        for keyword in sorted(keywords, key=len, reverse=True):
            keyword = self.clean_text(keyword)

            if keyword.lower() in sentence.lower() and self.is_good_short_answer(keyword):
                return keyword

        tokens = tokenize(sentence)
        candidates = [token for token in tokens if self.is_good_short_answer(token)]

        if not candidates:
            return None

        return max(candidates, key=len)

    def make_cloze_question(self, sentence: str, answer: str) -> str:
        pattern = re.compile(re.escape(answer), re.IGNORECASE)
        masked = pattern.sub("__________", sentence, count=1)

        if masked != sentence:
            return f"Яке поняття пропущено в твердженні: «{masked}»?"

        return f"Яке поняття найкраще відповідає твердженню: «{sentence}»?"

    def build_question(
        self,
        question_text: str,
        answer: str,
        topic: str,
        difficulty: int,
        order: int,
        source_sentence: str,
        answer_type: str = "term",
        term: str = ""
    ) -> Dict:
        options, correct_option = self.make_options(
            correct_answer=answer,
            answer_type=answer_type,
            source_sentence=source_sentence,
            term=term,
        )

        return {
            "questionText": question_text,
            "optionA": options[0],
            "optionB": options[1],
            "optionC": options[2],
            "optionD": options[3],
            "correctOption": correct_option,
            "explanation": f"Правильна відповідь: «{answer}», оскільки це випливає з навчального матеріалу.",
            "topic": topic,
            "difficulty": difficulty,
            "questionOrder": order,
            "sourceSentence": source_sentence
        }

    def generate_questions(
        self,
        text: str,
        keywords: List[str],
        difficulty_model,
        topic: str,
        count: int = 5
    ) -> List[Dict]:
        sentences = split_sentences(text)

        if not sentences:
            return []

        questions = []
        used_answers = set()
        used_sentences = set()

        keyword_set = set([k.lower() for k in keywords])

        ranked_sentences = sorted(
            sentences,
            key=lambda s: (
                len(set(tokenize(s)) & keyword_set),
                len(s)
            ),
            reverse=True
        )

        for sentence in ranked_sentences:
            if len(questions) >= count:
                break

            if sentence in used_sentences:
                continue

            pattern_result = self.try_pattern_question(sentence)

            if not pattern_result:
                continue

            answer = self.clean_text(pattern_result["answer"])

            if not self.is_good_long_answer(answer) and pattern_result["answerType"] == "long":
                continue

            if answer.lower() in used_answers:
                continue

            used_answers.add(answer.lower())
            used_sentences.add(sentence)

            difficulty = difficulty_model.predict(sentence)

            questions.append(
                self.build_question(
                    question_text=pattern_result["questionText"],
                    answer=answer,
                    topic=topic,
                    difficulty=difficulty,
                    order=len(questions) + 1,
                    source_sentence=sentence,
                    answer_type=pattern_result["answerType"],
                    term=pattern_result.get("term", ""),
                )
            )

        for sentence in ranked_sentences:
            if len(questions) >= count:
                break

            if sentence in used_sentences:
                continue

            answer = self.find_answer_in_sentence(
                sentence=sentence,
                keywords=keywords,
                context=text
            )

            if not answer:
                continue

            answer = self.clean_text(answer)

            if not self.is_good_short_answer(answer):
                continue

            if answer.lower() in used_answers:
                continue

            used_answers.add(answer.lower())
            used_sentences.add(sentence)

            difficulty = difficulty_model.predict(sentence)
            question_text = self.make_cloze_question(sentence, answer)

            questions.append(
                self.build_question(
                    question_text=question_text,
                    answer=answer,
                    topic=topic,
                    difficulty=difficulty,
                    order=len(questions) + 1,
                    source_sentence=sentence,
                    answer_type="term",
                    term=answer,
                )
            )

        return questions
