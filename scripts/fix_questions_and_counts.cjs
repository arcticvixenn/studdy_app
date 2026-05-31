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
    console.log("ERROR", method, path, res.status, data?.message || data);
    return null;
  }

  return data;
}

async function docs(collectionId) {
  const data = await request(
    "GET",
    `/databases/${databaseId}/collections/${collectionId}/documents`
  );

  return data?.documents || [];
}

async function attrs(collectionId) {
  const data = await request(
    "GET",
    `/databases/${databaseId}/collections/${collectionId}/attributes`
  );

  return data?.attributes || [];
}

function valueFor(attr, item, index) {
  const k = attr.key.toLowerCase();

  if (k === "quizid") return item.quizId || "";
  if (k === "lessonid") return item.lessonId || "";
  if (k === "courseid") return item.courseId || "";

  if (k === "questiontext" || k === "question") return item.questionText;
  if (k === "optiona") return item.optionA;
  if (k === "optionb") return item.optionB;
  if (k === "optionc") return item.optionC;
  if (k === "optiond") return item.optionD;
  if (k === "correctoption" || k === "correctanswer") return item.correctOption;
  if (k === "explanation") return item.explanation;

  if (k === "topic") return item.topic || "";
  if (k === "category") return item.category || item.topic || "";
  if (k === "questionorder" || k === "order") return item.questionOrder || index;
  if (k.includes("difficulty")) return item.difficulty || 1;
  if (k.includes("source")) return "repair_questions_seed";

  return item[attr.key] ?? "";
}

function buildPayload(attributes, item, index) {
  const payload = {};

  for (const attr of attributes) {
    let value = valueFor(attr, item, index);

    if (attr.type === "string") {
      value = String(value ?? "");
      const max = Number(attr.size) || 1000;
      if (value.length > max) value = value.slice(0, max - 3) + "...";
    }

    if (attr.type === "integer") value = Number(value) || 0;
    if (attr.type === "double") value = Number(value) || 0;
    if (attr.type === "boolean") value = Boolean(value);

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

const questionBank = {
  "Тест: адаптивне навчання": [
    {
      questionText: "Що показують неправильні відповіді користувача?",
      optionA: "Слабкі теми, які варто повторити",
      optionB: "Колір інтерфейсу",
      optionC: "Назву телефону",
      optionD: "Розмір відео",
      correctOption: "A",
      explanation: "Помилки допомагають визначити теми, які потрібно повторити.",
      topic: "Адаптивне навчання",
    },
    {
      questionText: "Що має робити персональна порада?",
      optionA: "Пояснювати, яку тему повторити і чому",
      optionB: "Показувати випадковий текст",
      optionC: "Видаляти курс",
      optionD: "Змінювати пароль",
      correctOption: "A",
      explanation: "Порада має бути повʼязана з реальними результатами навчання.",
      topic: "Адаптивне навчання",
    },
    {
      questionText: "Навіщо потрібна адаптивність у навчальній платформі?",
      optionA: "Щоб підлаштовувати матеріали під потреби користувача",
      optionB: "Щоб приховувати тести",
      optionC: "Щоб прибирати уроки",
      optionD: "Щоб вимикати профіль",
      correctOption: "A",
      explanation: "Адаптивність допомагає пропонувати корисніші уроки й тести.",
      topic: "Адаптивне навчання",
    },
  ],
  "Тест: дані та ознаки в ML": [
    {
      questionText: "Що таке ознака в машинному навчанні?",
      optionA: "Характеристика обʼєкта, яку використовує модель",
      optionB: "Колір кнопки",
      optionC: "Назва застосунку",
      optionD: "Тип екрана",
      correctOption: "A",
      explanation: "Ознаки описують обʼєкти та використовуються моделлю.",
      topic: "Дані для ML",
    },
    {
      questionText: "Що таке датасет?",
      optionA: "Набір прикладів для навчання або перевірки моделі",
      optionB: "Пароль користувача",
      optionC: "Іконка застосунку",
      optionD: "Розмір кнопки",
      correctOption: "A",
      explanation: "Датасет містить приклади для навчання або тестування.",
      topic: "Дані для ML",
    },
  ],
  "Тест: метрики якості ML": [
    {
      questionText: "Що показує Accuracy?",
      optionA: "Частку правильних відповідей",
      optionB: "Кількість лайків",
      optionC: "Розмір відео",
      optionD: "Назву уроку",
      correctOption: "A",
      explanation: "Accuracy показує загальну частку правильних прогнозів.",
      topic: "Метрики",
    },
    {
      questionText: "Що показує Recall?",
      optionA: "Скільки потрібних обʼєктів модель змогла знайти",
      optionB: "Скільки фото завантажено",
      optionC: "Скільки постів створено",
      optionD: "Скільки курсів видалено",
      correctOption: "A",
      explanation: "Recall важливий, коли треба знайти якомога більше правильних обʼєктів.",
      topic: "Метрики",
    },
  ],
  "Тест: гібридні рекомендації": [
    {
      questionText: "Що поєднує гібридна рекомендаційна модель?",
      optionA: "Контент і поведінкові сигнали",
      optionB: "Тільки пароль",
      optionC: "Тільки колір теми",
      optionD: "Тільки назву додатка",
      correctOption: "A",
      explanation: "Гібридна модель враховує і зміст матеріалів, і дії користувача.",
      topic: "Рекомендації",
    },
    {
      questionText: "Що є поведінковим сигналом?",
      optionA: "Лайк, коментар або збереження",
      optionB: "Колір логотипа",
      optionC: "Тип клавіатури",
      optionD: "Розмір шрифту",
      correctOption: "A",
      explanation: "Дії користувача допомагають зрозуміти його інтереси.",
      topic: "Рекомендації",
    },
  ],
};

async function main() {
  const quizzes = await docs("quizzes");
  const questions = await docs("questions");
  const questionAttrs = await attrs("questions");
  const quizAttrs = await attrs("quizzes");

  const hasQuestionCount = quizAttrs.some((attr) => attr.key === "questionCount");

  for (const quiz of quizzes) {
    const title = quiz.title || quiz.name;
    const bank = questionBank[title];

    if (!bank) continue;

    for (let i = 0; i < bank.length; i++) {
      const existing = questions.find(
        (q) =>
          q.quizId === quiz.$id &&
          String(q.questionText || q.question || "").trim().toLowerCase() ===
            bank[i].questionText.trim().toLowerCase()
      );

      if (existing) {
        console.log("EXISTS question:", bank[i].questionText);
        continue;
      }

      const payload = buildPayload(
        questionAttrs,
        {
          ...bank[i],
          quizId: quiz.$id,
          lessonId: quiz.lessonId,
          courseId: quiz.courseId,
          difficulty: quiz.difficulty || 1,
          questionOrder: i + 1,
        },
        i + 1
      );

      const created = await request(
        "POST",
        `/databases/${databaseId}/collections/questions/documents`,
        {
          documentId: "unique()",
          data: payload,
        }
      );

      if (created) console.log("CREATED question:", bank[i].questionText);
    }
  }

  const updatedQuestions = await docs("questions");

  for (const quiz of quizzes) {
    const count = updatedQuestions.filter((q) => q.quizId === quiz.$id).length;

    if (hasQuestionCount) {
      await request(
        "PATCH",
        `/databases/${databaseId}/collections/quizzes/documents/${quiz.$id}`,
        {
          data: {
            questionCount: count,
          },
        }
      );
    }

    console.log(`QUIZ COUNT: ${quiz.title || quiz.name} = ${count}`);
  }

  console.log("DONE FIX QUESTIONS AND QUESTION COUNT");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
