const endpoint = "http://localhost:8080/v1";
const projectId = "6a1ae727000328f56b72";
const databaseId = "studdy_db";
const apiKey = process.env.APPWRITE_API_KEY;

if (!apiKey) throw new Error("APPWRITE_API_KEY is missing");

const headers = {
  "Content-Type": "application/json",
  "X-Appwrite-Project": projectId,
  "X-Appwrite-Key": apiKey,
};

async function request(method, path, body = null) {
  const res = await fetch(`${endpoint}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    console.log("SKIP/ERROR", method, path, res.status, data?.message || data);
    return null;
  }

  return data;
}

async function attrs(collectionId) {
  const data = await request("GET", `/databases/${databaseId}/collections/${collectionId}/attributes`);
  return data?.attributes || [];
}

async function docs(collectionId) {
  const data = await request("GET", `/databases/${databaseId}/collections/${collectionId}/documents`);
  return data?.documents || [];
}

function findByTitle(list, title) {
  return list.find((item) =>
    String(item.title || item.name || "").trim().toLowerCase() === title.trim().toLowerCase()
  );
}

function valueFor(attr, item, index) {
  const k = attr.key.toLowerCase();

  if (k === "courseid") return item.courseId || "";
  if (k === "lessonid") return item.lessonId || "";
  if (k === "quizid") return item.quizId || "";

  if (k === "title" || k === "name") return item.title || `Демо ${index}`;
  if (k === "content" || k === "description" || k === "text" || k === "body") {
    return item.content || item.description || "Навчальний матеріал.";
  }

  if (k === "category") return item.category || "Машинне навчання";
  if (k === "topic") return item.topic || item.category || "Машинне навчання";

  if (k === "questiontext" || k === "question") return item.questionText || "";
  if (k === "optiona") return item.optionA || "";
  if (k === "optionb") return item.optionB || "";
  if (k === "optionc") return item.optionC || "";
  if (k === "optiond") return item.optionD || "";
  if (k === "correctoption" || k === "correctanswer") return item.correctOption || "A";
  if (k === "explanation") return item.explanation || "Пояснення до правильної відповіді.";

  if (k === "order" || k === "questionorder") return item.order || item.questionOrder || index;
  if (k.includes("difficulty")) return item.difficulty || 1;
  if (k.includes("duration")) return item.duration || 0;
  if (k.includes("source")) return "repair_learning_seed";

  return item[attr.key] ?? "";
}

function buildPayload(attributes, item, index) {
  const payload = {};

  for (const attr of attributes) {
    if (attr.status && attr.status !== "available") continue;

    let value = valueFor(attr, item, index);

    if (attr.type === "string") {
      const max = Number(attr.size) || 1000;
      value = String(value ?? "");
      if (value.length > max) value = value.slice(0, max - 3) + "...";
    }

    if (attr.type === "integer") value = Number(value) || 0;
    if (attr.type === "double") value = Number(value) || 0;
    if (attr.type === "boolean") value = Boolean(value);
    if (attr.array) value = Array.isArray(value) ? value : [];

    if ((value === "" || value === null || value === undefined) && attr.required) {
      if (attr.type === "integer" || attr.type === "double") value = 0;
      else if (attr.type === "boolean") value = false;
      else value = `demo_${attr.key}_${index}`;
    }

    if (value !== "" || attr.required) {
      payload[attr.key] = value;
    }
  }

  return payload;
}

async function createIfMissing(collectionId, item, index) {
  const allDocs = await docs(collectionId);
  const existing = findByTitle(allDocs, item.title || item.questionText || "");

  if (existing) {
    console.log("EXISTS", collectionId, item.title || item.questionText);
    return existing;
  }

  const attributes = await attrs(collectionId);
  const data = buildPayload(attributes, item, index);

  const created = await request("POST", `/databases/${databaseId}/collections/${collectionId}/documents`, {
    documentId: "unique()",
    data,
  });

  if (created) console.log("CREATED", collectionId, item.title || item.questionText);
  return created;
}

async function main() {
  const courses = await docs("courses");

  if (!courses.length) {
    console.log("Немає курсів. Спочатку запусти основний seed курсів.");
    return;
  }

  const courseByTitle = Object.fromEntries(courses.map((c) => [String(c.title || c.name), c]));

  const mlCourse =
    courseByTitle["Основи машинного навчання"] ||
    courses.find((c) => String(c.category || "").includes("Машин"));

  const recCourse =
    courseByTitle["Рекомендаційні системи в освіті"] ||
    courses.find((c) => String(c.category || "").includes("Рекомен"));

  const adaptiveCourse =
    courseByTitle["Адаптивне навчання та аналіз помилок"] ||
    courses.find((c) => String(c.category || "").includes("Адаптив"));

  const bioCourse =
    courseByTitle["Біологія: клітина та тканини"] ||
    courses.find((c) => String(c.category || "").includes("Біолог"));

  const lessonItems = [
    {
      courseId: mlCourse?.$id,
      title: "ML: дані, ознаки та навчальна вибірка",
      content: "Дані є основою машинного навчання. Ознаки описують об'єкти, а навчальна вибірка містить приклади, на яких модель вчиться знаходити закономірності. У Studdy такими ознаками можуть бути тема матеріалу, текст уроку, категорія, результати тестів, лайки, збереження та пошукові запити.",
      category: "Машинне навчання",
      topic: "Дані для ML",
      order: 1,
      difficulty: 1,
    },
    {
      courseId: mlCourse?.$id,
      title: "ML: класифікація, регресія та кластеризація",
      content: "Класифікація визначає категорію об'єкта, регресія прогнозує числове значення, а кластеризація групує схожі об'єкти без наперед заданих правильних відповідей. У освітній платформі це можна використати для оцінки складності, прогнозу успішності та групування матеріалів.",
      category: "Машинне навчання",
      topic: "Типи задач ML",
      order: 2,
      difficulty: 2,
    },
    {
      courseId: mlCourse?.$id,
      title: "ML: метрики Accuracy, Precision, Recall",
      content: "Accuracy показує загальну частку правильних відповідей. Precision важлива, коли потрібно зменшити кількість хибних позитивних результатів. Recall показує, скільки потрібних об'єктів модель змогла знайти. F1-score поєднує Precision і Recall.",
      category: "Машинне навчання",
      topic: "Метрики",
      order: 3,
      difficulty: 2,
    },

    {
      courseId: recCourse?.$id,
      title: "Рекомендації: content-based підхід",
      content: "Content-based рекомендації шукають матеріали, схожі за змістом. Система аналізує назву, опис, категорію, ключові слова та текст уроків. Якщо користувач читає матеріали про класифікацію, можна рекомендувати метрики, датасети та приклади задач класифікації.",
      category: "Рекомендації",
      topic: "Content-based",
      order: 1,
      difficulty: 2,
    },
    {
      courseId: recCourse?.$id,
      title: "Рекомендації: поведінкові сигнали",
      content: "Поведінкові сигнали — це дії користувача: лайки, коментарі, збереження, перегляди, пошук і відповіді в тестах. Вони допомагають зрозуміти, які теми користувачу цікаві та з якими темами є труднощі.",
      category: "Рекомендації",
      topic: "Поведінковий аналіз",
      order: 2,
      difficulty: 2,
    },
    {
      courseId: recCourse?.$id,
      title: "Рекомендації: гібридна модель",
      content: "Гібридна рекомендаційна модель поєднує текстову схожість матеріалів і поведінкові сигнали. Такий підхід стабільніший, бо враховує не тільки ключові слова, а й реальну активність користувача.",
      category: "Рекомендації",
      topic: "Гібридна модель",
      order: 3,
      difficulty: 3,
    },

    {
      courseId: adaptiveCourse?.$id,
      title: "Адаптивність: аналіз неправильних відповідей",
      content: "Якщо користувач помиляється в тесті, система зберігає тему питання та результат. Після кількох помилок можна визначити слабку тему й запропонувати відповідний урок або короткий повтор.",
      category: "Адаптивне навчання",
      topic: "Аналіз помилок",
      order: 1,
      difficulty: 2,
    },
    {
      courseId: adaptiveCourse?.$id,
      title: "Адаптивність: персональні поради",
      content: "Персональна порада має пояснювати, що саме повторити і чому. Наприклад: «Повтори тему метрик, бо були помилки з Precision і Recall». Це краще, ніж загальний напис про ML-аналіз.",
      category: "Адаптивне навчання",
      topic: "Персоналізація",
      order: 2,
      difficulty: 2,
    },

    {
      courseId: bioCourse?.$id,
      title: "Біологія: органели клітини",
      content: "Клітина містить органели, які виконують різні функції. Рибосоми беруть участь у синтезі білків, мітохондрії забезпечують клітину енергією, а ядро зберігає генетичну інформацію.",
      category: "Біологія",
      topic: "Клітина",
      order: 1,
      difficulty: 1,
    },
    {
      courseId: bioCourse?.$id,
      title: "Біологія: типи тканин",
      content: "Тканина — це група клітин, схожих за будовою та функціями. У тварин виділяють епітеліальну, сполучну, м'язову та нервову тканини. Кожна тканина виконує окрему роль в організмі.",
      category: "Біологія",
      topic: "Тканини",
      order: 2,
      difficulty: 1,
    },
  ];

  const createdLessons = [];

  for (let i = 0; i < lessonItems.length; i++) {
    if (!lessonItems[i].courseId) {
      console.log("SKIP LESSON WITHOUT COURSE:", lessonItems[i].title);
      continue;
    }

    const lesson = await createIfMissing("lessons", lessonItems[i], i + 1);
    if (lesson) createdLessons.push(lesson);
  }

  const lessonByTitle = Object.fromEntries(createdLessons.map((l) => [String(l.title || l.name), l]));

  const quizItems = [
    {
      courseId: mlCourse?.$id,
      lessonId: lessonByTitle["ML: дані, ознаки та навчальна вибірка"]?.$id,
      title: "Тест: дані та ознаки в ML",
      topic: "Дані для ML",
      difficulty: 1,
    },
    {
      courseId: mlCourse?.$id,
      lessonId: lessonByTitle["ML: метрики Accuracy, Precision, Recall"]?.$id,
      title: "Тест: метрики якості ML",
      topic: "Метрики",
      difficulty: 2,
    },
    {
      courseId: recCourse?.$id,
      lessonId: lessonByTitle["Рекомендації: гібридна модель"]?.$id,
      title: "Тест: гібридні рекомендації",
      topic: "Гібридна модель",
      difficulty: 2,
    },
    {
      courseId: adaptiveCourse?.$id,
      lessonId: lessonByTitle["Адаптивність: аналіз неправильних відповідей"]?.$id,
      title: "Тест: адаптивне навчання",
      topic: "Аналіз помилок",
      difficulty: 2,
    },
    {
      courseId: bioCourse?.$id,
      lessonId: lessonByTitle["Біологія: органели клітини"]?.$id,
      title: "Тест: органели клітини",
      topic: "Клітина",
      difficulty: 1,
    },
  ];

  const createdQuizzes = [];

  for (let i = 0; i < quizItems.length; i++) {
    if (!quizItems[i].courseId) continue;
    const quiz = await createIfMissing("quizzes", quizItems[i], i + 1);
    if (quiz) createdQuizzes.push(quiz);
  }

  const quizByTitle = Object.fromEntries(createdQuizzes.map((q) => [String(q.title || q.name), q]));

  const questions = [
    {
      quizId: quizByTitle["Тест: дані та ознаки в ML"]?.$id,
      questionText: "Що таке ознака в машинному навчанні?",
      optionA: "Характеристика об'єкта, яку використовує модель",
      optionB: "Колір інтерфейсу",
      optionC: "Назва телефону",
      optionD: "Розмір кнопки",
      correctOption: "A",
      explanation: "Ознака описує об'єкт і допомагає моделі приймати рішення.",
      topic: "Дані для ML",
      questionOrder: 1,
    },
    {
      quizId: quizByTitle["Тест: дані та ознаки в ML"]?.$id,
      questionText: "Що таке датасет?",
      optionA: "Набір прикладів для навчання або перевірки моделі",
      optionB: "Пароль користувача",
      optionC: "Іконка застосунку",
      optionD: "Тип екрана",
      correctOption: "A",
      explanation: "Датасет містить приклади, які використовуються для навчання чи тестування.",
      topic: "Дані для ML",
      questionOrder: 2,
    },
    {
      quizId: quizByTitle["Тест: метрики якості ML"]?.$id,
      questionText: "Що показує Accuracy?",
      optionA: "Частку правильних відповідей",
      optionB: "Кількість лайків",
      optionC: "Розмір відео",
      optionD: "Час завантаження",
      correctOption: "A",
      explanation: "Accuracy показує загальну частку правильних прогнозів.",
      topic: "Метрики",
      questionOrder: 1,
    },
    {
      quizId: quizByTitle["Тест: гібридні рекомендації"]?.$id,
      questionText: "Що поєднує гібридна рекомендаційна модель?",
      optionA: "Тільки пароль і email",
      optionB: "Контент і поведінкові сигнали",
      optionC: "Тільки колір теми",
      optionD: "Тільки розмір файлу",
      correctOption: "B",
      explanation: "Гібридна модель враховує і зміст матеріалів, і дії користувача.",
      topic: "Гібридна модель",
      questionOrder: 1,
    },
    {
      quizId: quizByTitle["Тест: адаптивне навчання"]?.$id,
      questionText: "Навіщо аналізувати неправильні відповіді?",
      optionA: "Щоб радити повторення слабких тем",
      optionB: "Щоб видаляти курси",
      optionC: "Щоб приховати профіль",
      optionD: "Щоб змінити аватар",
      correctOption: "A",
      explanation: "Помилки показують, які теми варто повторити.",
      topic: "Аналіз помилок",
      questionOrder: 1,
    },
    {
      quizId: quizByTitle["Тест: органели клітини"]?.$id,
      questionText: "Яку функцію виконують рибосоми?",
      optionA: "Беруть участь у синтезі білків",
      optionB: "Створюють рекомендації",
      optionC: "Зберігають паролі",
      optionD: "Запускають відео",
      correctOption: "A",
      explanation: "Рибосоми беруть участь у синтезі білків.",
      topic: "Клітина",
      questionOrder: 1,
    },
  ];

  for (let i = 0; i < questions.length; i++) {
    if (!questions[i].quizId) continue;
    await createIfMissing("questions", questions[i], i + 1);
  }

  console.log("DONE REPAIR LESSONS AND QUIZZES");
  console.log({
    createdOrExistingLessons: createdLessons.length,
    createdOrExistingQuizzes: createdQuizzes.length,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

