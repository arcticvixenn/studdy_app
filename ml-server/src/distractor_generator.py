from typing import List
import random


DOMAIN_TERMS = [
    "машинне навчання",
    "навчання з учителем",
    "навчання без учителя",
    "класифікація",
    "регресія",
    "кластеризація",
    "нейронна мережа",
    "модель",
    "алгоритм",
    "датасет",
    "ознака",
    "метрика якості",
    "точність",
    "повнота",
    "f1-міра",
    "середня абсолютна помилка",
    "штучний інтелект",
]


METRIC_DISTRACTORS = [
    "класифікація, регресія та кластеризація",
    "тренувальна, тестова та валідаційна вибірки",
    "середнє значення, медіана та дисперсія",
    "ознаки, мітки класів та навчальні приклади",
    "градієнтний спуск, функція втрат та оптимізація",
]


PURPOSE_DISTRACTORS = {
    "регресія": [
        "для визначення класу об'єкта на основі його ознак",
        "для об'єднання схожих об'єктів у групи",
        "для роботи з даними без готових правильних відповідей",
        "для оцінювання якості моделі за метриками",
    ],
    "кластеризація": [
        "для прогнозування числових значень",
        "для визначення класу об'єкта на основі його ознак",
        "для навчання на розмічених даних",
        "для оцінювання точності класифікатора",
    ],
    "класифікація": [
        "для прогнозування числових значень",
        "для об'єднання схожих об'єктів у групи",
        "для зменшення розмірності даних",
        "для пошуку пропущених значень у таблиці",
    ],
    "навчання з учителем": [
        "коли дані не мають готових правильних відповідей",
        "коли потрібно лише об'єднати об'єкти у групи",
        "коли модель не використовує навчальні приклади",
        "коли система працює без міток класів",
    ],
    "навчання без учителя": [
        "коли для кожного прикладу відома правильна відповідь",
        "коли модель навчається тільки на розмічених даних",
        "коли потрібно передбачити готову мітку класу",
        "коли кожен об'єкт має наперед заданий клас",
    ],
    "нейронна мережа": [
        "з таблиць, рядків і SQL-запитів",
        "з кластерів, центрів і відстаней між групами",
        "з правил, умов і логічних операторів",
        "з метрик, помилок і звітів оцінювання",
    ],
}


GENERIC_PURPOSE_DISTRACTORS = [
    "для прогнозування числових значень",
    "для визначення класу об'єкта на основі його ознак",
    "для об'єднання схожих об'єктів у групи",
    "для навчання на розмічених даних",
    "для роботи з даними без готових відповідей",
    "для оцінювання якості моделі",
    "для пошуку складних закономірностей у даних",
]


class DistractorGenerator:
    def __init__(self):
        random.seed(42)

    def normalize(self, value: str) -> str:
        return str(value).strip().lower()

    def unique_first_three(self, correct_answer: str, candidates: List[str]) -> List[str]:
        correct_lower = self.normalize(correct_answer)
        result = []

        for candidate in candidates:
            candidate = str(candidate).strip()

            if not candidate:
                continue

            candidate_lower = self.normalize(candidate)

            if candidate_lower == correct_lower:
                continue

            if candidate_lower in correct_lower or correct_lower in candidate_lower:
                continue

            if candidate not in result:
                result.append(candidate)

            if len(result) == 3:
                break

        while len(result) < 3:
            for fallback in DOMAIN_TERMS:
                if self.normalize(fallback) != correct_lower and fallback not in result:
                    result.append(fallback)
                    break

        return result[:3]

    def generate_term_distractors(self, correct_answer: str, topic: str = "") -> List[str]:
        candidates = []

        correct_lower = self.normalize(correct_answer)

        if "навчання" in correct_lower:
            candidates.extend([
                "класифікація",
                "регресія",
                "кластеризація",
                "нейронна мережа",
            ])
        elif correct_lower in {"класифікація", "регресія", "кластеризація"}:
            candidates.extend([
                "класифікація",
                "регресія",
                "кластеризація",
                "нейронна мережа",
            ])
        elif "метрик" in correct_lower or "точність" in correct_lower:
            candidates.extend([
                "класифікація",
                "регресія",
                "кластеризація",
                "датасет",
            ])
        else:
            candidates.extend(DOMAIN_TERMS)

        random.shuffle(candidates)
        return self.unique_first_three(correct_answer, candidates)

    def generate_purpose_distractors(
        self,
        correct_answer: str,
        source_sentence: str = "",
        term: str = ""
    ) -> List[str]:
        sentence_lower = self.normalize(source_sentence)
        term_lower = self.normalize(term)

        candidates = []

        if "метрик" in sentence_lower or "точність" in sentence_lower or "f1" in sentence_lower:
            candidates.extend(METRIC_DISTRACTORS)
            return self.unique_first_three(correct_answer, candidates)

        for known_term, known_distractors in PURPOSE_DISTRACTORS.items():
            if known_term in term_lower or known_term in sentence_lower:
                candidates.extend(known_distractors)
                return self.unique_first_three(correct_answer, candidates)

        candidates.extend(GENERIC_PURPOSE_DISTRACTORS)
        random.shuffle(candidates)

        return self.unique_first_three(correct_answer, candidates)
