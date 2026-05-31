# Посилене тестування для 5 розділу

Дата запуску: 2026-05-31 13:39:07

Кількість повторів для кожної теми: 3

## 1. Загальний підсумок

- Успішних запусків генерації: 12 із 12 (100.0%)
- Загальна кількість сформованих питань: 27
- Питань із повною структурою: 27 (100.0%)
- Питань із валідною правильною відповіддю: 27
- Питань із поясненням: 27
- JSON-файлів із метриками моделей: 11
- datasetRows: 0
- labelCounts: {}

## 2. Підсумок за темами

| Тема | Успішно | Середній час, мс | Мін. час | Макс. час | Середня к-сть питань | Повнота структури, % |
|---|---:|---:|---:|---:|---:|---:|
| Типи машинного навчання | 3/3 | 311.47 | 203.38 | 508.77 | 2 | 100.0 |
| Нейронні мережі | 3/3 | 222.29 | 192.08 | 280.97 | 2 | 100.0 |
| Рекомендаційні системи | 3/3 | 225.7 | 156.01 | 268.85 | 2 | 100.0 |
| Метрики якості моделей | 3/3 | 196.03 | 193.29 | 199.75 | 3 | 100.0 |

## 3. Детальні запуски

| Тема | Запуск | HTTP | Час, мс | Питань | Повна структура | Валідна відповідь | Пояснення |
|---|---:|---:|---:|---:|---:|---:|---:|
| Типи машинного навчання | 1 | 200 | 508.77 | 2 | 2 | 2 | 2 |
| Типи машинного навчання | 2 | 200 | 222.27 | 2 | 2 | 2 | 2 |
| Типи машинного навчання | 3 | 200 | 203.38 | 2 | 2 | 2 | 2 |
| Нейронні мережі | 1 | 200 | 193.82 | 2 | 2 | 2 | 2 |
| Нейронні мережі | 2 | 200 | 192.08 | 2 | 2 | 2 | 2 |
| Нейронні мережі | 3 | 200 | 280.97 | 2 | 2 | 2 | 2 |
| Рекомендаційні системи | 1 | 200 | 252.25 | 2 | 2 | 2 | 2 |
| Рекомендаційні системи | 2 | 200 | 268.85 | 2 | 2 | 2 | 2 |
| Рекомендаційні системи | 3 | 200 | 156.01 | 2 | 2 | 2 | 2 |
| Метрики якості моделей | 1 | 200 | 195.04 | 3 | 3 | 3 | 3 |
| Метрики якості моделей | 2 | 200 | 199.75 | 3 | 3 | 3 | 3 |
| Метрики якості моделей | 3 | 200 | 193.29 | 3 | 3 | 3 | 3 |

## 4. Приклади перших питань

### Типи машинного навчання
- Питання: Яке ключове поняття згадується в твердженні: «Машинне навчання поділяється на навчання з учителем, навчання без учителя та навчання з підкріпленням»?
- Правильна відповідь: D
- Пояснення: Правильна відповідь: «навчання без учителя», оскільки це випливає з навчального матеріалу: «Машинне навчання поділяється на навчання з учителем, навчання без учителя та навчання з підкріпленням.».

### Нейронні мережі
- Питання: Яке ключове поняття згадується в твердженні: «Нейронна мережа складається з шарів штучних нейронів, які обробляють вхідні ознаки та формують вихідний результат»?
- Правильна відповідь: C
- Пояснення: Правильна відповідь: «вихідний результат», оскільки це випливає з навчального матеріалу: «Нейронна мережа складається з шарів штучних нейронів, які обробляють вхідні ознаки та формують вихідний результат.».

### Рекомендаційні системи
- Питання: Яке ключове поняття згадується в твердженні: «Рекомендаційні системи використовуються для добору матеріалів, які можуть бути корисними конкретному користувачеві»?
- Правильна відповідь: C
- Пояснення: Правильна відповідь: «конкретному користувачеві», оскільки це випливає з навчального матеріалу: «Рекомендаційні системи використовуються для добору матеріалів, які можуть бути корисними конкретному користувачеві.».

### Метрики якості моделей
- Питання: Яке ключове поняття згадується в твердженні: «Accuracy показує загальну частку правильних прогнозів»?
- Правильна відповідь: D
- Пояснення: Правильна відповідь: «правильних прогнозів», оскільки це випливає з навчального матеріалу: «Accuracy показує загальну частку правильних прогнозів.».

## 5. Виявлені метрики моделей

### `chapter4_test_results\api_test_summary.json`
- results[2].response.metrics.accuracy: 0.91
- results[2].response.metrics.precision: 0.893
- results[2].response.metrics.recall: 0.913
- results[2].response.metrics.f1: 0.903

### `chapter4_test_results\chapter4_final_report_data.json`
- recommendationTrain.metrics.accuracy: 0.91
- recommendationTrain.metrics.precision: 0.893
- recommendationTrain.metrics.recall: 0.913
- recommendationTrain.metrics.f1: 0.903
- strongQuizModelMetrics.answerRanker.accuracy: 0.9951
- strongQuizModelMetrics.answerRanker.precision: 0.9778
- strongQuizModelMetrics.answerRanker.recall: 0.9778
- strongQuizModelMetrics.answerRanker.f1: 0.9778
- strongQuizExample.modelMetrics.answerRanker.accuracy: 0.9951
- strongQuizExample.modelMetrics.answerRanker.precision: 0.9778
- strongQuizExample.modelMetrics.answerRanker.recall: 0.9778
- strongQuizExample.modelMetrics.answerRanker.f1: 0.9778

### `chapter4_test_results\generate_ml_result.json`
- modelMetrics.answerSelector.accuracy: 0.907
- modelMetrics.answerSelector.precision: 1.0
- modelMetrics.answerSelector.recall: 0.3333
- modelMetrics.answerSelector.f1: 0.5

### `chapter4_test_results\generate_strong_result.json`
- modelMetrics.answerRanker.accuracy: 0.9951
- modelMetrics.answerRanker.precision: 0.9778
- modelMetrics.answerRanker.recall: 0.9778
- modelMetrics.answerRanker.f1: 0.9778

### `chapter4_test_results\question_answer_model_metrics.json`
- answerSelector.accuracy: 0.907
- answerSelector.precision: 1.0
- answerSelector.recall: 0.3333
- answerSelector.f1: 0.5

### `chapter4_test_results\strong_quiz_model_metrics.json`
- answerRanker.accuracy: 0.9951
- answerRanker.precision: 0.9778
- answerRanker.recall: 0.9778
- answerRanker.f1: 0.9778

### `models\training_report.json`
- accuracy: 0.6939

### `chapter4_test_results\quiz_quality\1_типи_машинного_навчання.json`
- modelMetrics.answerRanker.accuracy: 0.9951
- modelMetrics.answerRanker.precision: 0.9778
- modelMetrics.answerRanker.recall: 0.9778
- modelMetrics.answerRanker.f1: 0.9778

### `chapter4_test_results\quiz_quality\2_нейроннi_мережi.json`
- modelMetrics.answerRanker.accuracy: 0.9951
- modelMetrics.answerRanker.precision: 0.9778
- modelMetrics.answerRanker.recall: 0.9778
- modelMetrics.answerRanker.f1: 0.9778

### `chapter4_test_results\quiz_quality\3_рекомендацiйнi_системи.json`
- modelMetrics.answerRanker.accuracy: 0.9951
- modelMetrics.answerRanker.precision: 0.9778
- modelMetrics.answerRanker.recall: 0.9778
- modelMetrics.answerRanker.f1: 0.9778

### `chapter4_test_results\quiz_quality\4_метрики_якостi_моделей.json`
- modelMetrics.answerRanker.accuracy: 0.9951
- modelMetrics.answerRanker.precision: 0.9778
- modelMetrics.answerRanker.recall: 0.9778
- modelMetrics.answerRanker.f1: 0.9778

## 6. Побудовані графіки

- `chapter5_results\chapter5_avg_generation_time.png`
- `chapter5_results\chapter5_avg_questions.png`
- `chapter5_results\chapter5_question_structure_quality.png`
- `chapter5_results\chapter5_model_metrics_detected.png`

## 7. Інтерпретація

Результати показують стабільність тематичної генерації тестових запитань за кількома навчальними темами. Оцінювання виконувалося не лише за фактом HTTP-відповіді, а й за структурною повнотою питань, валідністю правильної відповіді, наявністю пояснення та часом виконання. Якщо кількість питань менша за запитану, це слід трактувати як обмеження алгоритму, пов'язане з обсягом і насиченістю вхідного навчального тексту.
