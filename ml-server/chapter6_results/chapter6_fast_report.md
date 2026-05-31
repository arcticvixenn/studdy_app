# Результати тестування для 6 розділу

Дата запуску: 2026-05-31 12:55:32

Базова адреса API: `http://127.0.0.1:6060`

## Підсумок

- Успішних тестів: 3 із 8
- Час відповіді `/quiz/health`: 38.75 мс
- Час генерації для нормального тексту: 2.64 мс
- Питань для нормального тексту: 0
- Питань для короткого тексту: 0
- Питань для неінформативного тексту: 0

## Деталі тестів

### quiz_health
- Успішно: True
- HTTP-статус: 200
- Час виконання: 38.75 мс

### root_health
- Успішно: True
- HTTP-статус: 200
- Час виконання: 3.14 мс

### debug_data_optional
- Успішно: True
- HTTP-статус: 200
- Час виконання: 302.09 мс

### empty_payload
- Успішно: False
- HTTP-статус: 422
- Час виконання: 4.75 мс
- Помилка або відповідь сервера: `{"detail":[{"type":"missing","loc":["body","title"],"msg":"Field required","input":{}},{"type":"missing","loc":["body","text"],"msg":"Field required","input":{}}]}`

### empty_text
- Успішно: False
- HTTP-статус: 422
- Час виконання: 4.14 мс
- Помилка або відповідь сервера: `{"detail":[{"type":"missing","loc":["body","title"],"msg":"Field required","input":{"topic":"","text":"","questionCount":5}},{"type":"string_too_short","loc":["body","text"],"msg":"String should have at least 80 characters","input":"","ctx":{"min_length":80}}]}`

### short_text_generation
- Успішно: False
- HTTP-статус: 422
- Час виконання: 2.8 мс
- Помилка або відповідь сервера: `{"detail":[{"type":"missing","loc":["body","title"],"msg":"Field required","input":{"topic":"Короткий текст","text":"Машинне навчання — це метод аналізу даних.","questionCount":5}},{"type":"string_too_short","loc":["body","text"],"msg":"String should have at least 80 characters","input":"Машинне навчання — це метод аналізу даних.","ctx":{"min_length":80}}]}`

### bad_text_generation
- Успішно: False
- HTTP-статус: 422
- Час виконання: 2.6 мс
- Помилка або відповідь сервера: `{"detail":[{"type":"missing","loc":["body","title"],"msg":"Field required","input":{"topic":"Неінформативний текст","text":"тест тест тест приклад приклад слова слова слова","questionCount":5}},{"type":"string_too_short","loc":["body","text"],"msg":"String should have at least 80 characters","input":"тест тест тест приклад приклад слова слова слова","ctx":{"min_length":80}}]}`

### normal_text_generation
- Успішно: False
- HTTP-статус: 422
- Час виконання: 2.64 мс
- Помилка або відповідь сервера: `{"detail":[{"type":"missing","loc":["body","title"],"msg":"Field required","input":{"topic":"Класифікація в машинному навчанні","text":"Класифікація є задачею машинного навчання з учителем. Модель навчається відносити об'єкти до визначених класів. Для оцінювання якості класифікаційних моделей використовують accuracy, precision, recall та F1-score.","questionCount":5}}]}`

## Інтерпретація для документації

Порожній запит та порожній текст використовуються для перевірки валідації вхідних даних.
Короткий текст використовується як граничний сценарій.
Неінформативний текст використовується як негативний сценарій.
Нормальний навчальний текст використовується як контрольний успішний сценарій.
Запит `/debug-data` є допоміжним і не вважається критичним для перевірки надійності, якщо він виконується довше за встановлений timeout.
