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

const ids = {
  users: "users",
  posts: "posts",
  courses: "courses",
  lessons: "lessons",
  quizzes: "quizzes",
  quizQuestions: "quiz_questions",
};

async function request(method, path, body = null) {
  const res = await fetch(`${endpoint}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    console.log("SKIP", method, path, res.status, data?.message || data);
    return null;
  }

  return data;
}

async function getAttrs(collectionId) {
  const data = await request("GET", `/databases/${databaseId}/collections/${collectionId}/attributes`);
  return data?.attributes || [];
}

async function listDocs(collectionId, limit = 20) {
  const query = encodeURIComponent(JSON.stringify({ method: "limit", values: [limit] }));
  const data = await request("GET", `/databases/${databaseId}/collections/${collectionId}/documents?queries[]=${query}`);
  return data?.documents || [];
}

function pickValue(key, item, user, index) {
  const k = key.toLowerCase();

  if (k === "userid" || k === "authorid" || k === "creatorid") return user.$id;
  if (k === "accountid") return user.accountId || user.$id;

  if (k === "courseid") return item.courseId || "";
  if (k === "lessonid") return item.lessonId || "";
  if (k === "quizid") return item.quizId || "";
  if (k === "postid") return item.postId || "";

  if (k === "title" || k === "name") return item.title || `Demo ${index}`;
  if (k === "content" || k === "description" || k === "text") return item.content || item.description || "Демо навчальний матеріал.";
  if (k === "category") return item.category || "Машинне навчання";
  if (k === "topic") return item.topic || item.category || "Машинне навчання";

  if (k === "mediatype") return item.mediaType || "text";
  if (k === "videotype" || k === "videokind") return item.videoType || "";
  if (k === "video" || k === "videourl") return item.videoUrl || "";
  if (k === "thumbnail" || k === "thumbnailurl") return item.thumbnailUrl || item.imageUrl || "";
  if (k === "image" || k === "imageurl") return item.imageUrl || "";
  if (k.includes("url")) return item.url || item.videoUrl || item.imageUrl || "";

  if (k === "questiontext" || k === "question") return item.questionText || "";
  if (k === "optiona") return item.optionA || "";
  if (k === "optionb") return item.optionB || "";
  if (k === "optionc") return item.optionC || "";
  if (k === "optiond") return item.optionD || "";
  if (k === "correctoption" || k === "correctanswer") return item.correctOption || "A";
  if (k === "explanation") return item.explanation || "Пояснення сформовано автоматично.";
  if (k === "questionorder" || k === "order") return item.questionOrder || item.order || index;

  if (k.includes("difficulty")) return item.difficulty || 1;
  if (k.includes("duration")) return item.duration || 0;
  if (k.includes("source")) return "demo_seed";

  return item[key] ?? "";
}

function buildPayload(attrs, item, user, index) {
  const payload = {};

  for (const attr of attrs) {
    if (attr.status && attr.status !== "available") continue;

    let value = pickValue(attr.key, item, user, index);

    if (attr.type === "integer") value = Number(value) || 0;
    if (attr.type === "double") value = Number(value) || 0;
    if (attr.type === "boolean") value = Boolean(value);

    if (value === "" && attr.required) {
      if (attr.type === "integer" || attr.type === "double") value = 0;
      else if (attr.type === "boolean") value = false;
      else value = `demo_${attr.key}_${index}`;
    }

    if (value !== "" || attr.required) payload[attr.key] = value;
  }

  return payload;
}

async function createDocs(collectionId, items, user) {
  const attrs = await getAttrs(collectionId);
  if (!attrs.length) {
    console.log(`Collection skipped: ${collectionId}`);
    return [];
  }

  const created = [];

  for (let i = 0; i < items.length; i++) {
    const data = buildPayload(attrs, items[i], user, i + 1);

    const doc = await request("POST", `/databases/${databaseId}/collections/${collectionId}/documents`, {
      documentId: "unique()",
      data,
    });

    if (doc) {
      created.push(doc);
      console.log("CREATED", collectionId, data.title || data.name || data.questionText || doc.$id);
    }
  }

  return created;
}

const img = (seed) => `https://picsum.photos/seed/${seed}/900/520`;

const videos = {
  short: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
  long: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
};

async function main() {
  const users = await listDocs(ids.users, 5);
  if (!users.length) {
    console.log("Спочатку зареєструйся в додатку.");
    return;
  }

  const user = users[0];

  const courses = await createDocs(ids.courses, [
    {
      title: "Основи машинного навчання",
      description: "Курс про дані, ознаки, типи ML, класифікацію та метрики.",
      category: "Машинне навчання",
      difficulty: 1,
    },
    {
      title: "Рекомендаційні системи",
      description: "Курс про персоналізацію, схожість текстів та поведінкові сигнали.",
      category: "Рекомендації",
      difficulty: 2,
    },
    {
      title: "Адаптивне навчання",
      description: "Курс про аналіз помилок, тести, повторення і персональні поради.",
      category: "Адаптивне навчання",
      difficulty: 2,
    },
  ], user);

  const lessons = await createDocs(ids.lessons, [
    {
      courseId: courses[0]?.$id,
      title: "Типи машинного навчання",
      content: "Навчання з учителем, без учителя та з підкріпленням використовуються для різних задач.",
      category: "Машинне навчання",
      order: 1,
    },
    {
      courseId: courses[0]?.$id,
      title: "Ознаки та датасети",
      content: "Ознаки описують об'єкт, а датасет містить приклади для навчання моделі.",
      category: "Машинне навчання",
      order: 2,
    },
    {
      courseId: courses[1]?.$id,
      title: "Content-based рекомендації",
      content: "Content-based підхід шукає матеріали, схожі за темою, словами та змістом.",
      category: "Рекомендації",
      order: 1,
    },
    {
      courseId: courses[1]?.$id,
      title: "Поведінкові сигнали",
      content: "Лайки, коментарі, збереження, перегляди та пошук показують інтереси користувача.",
      category: "Рекомендації",
      order: 2,
    },
    {
      courseId: courses[2]?.$id,
      title: "Аналіз помилок у тестах",
      content: "Якщо користувач часто помиляється в темі, система радить повторення та схожі матеріали.",
      category: "Адаптивне навчання",
      order: 1,
    },
  ], user);

  const quizzes = await createDocs(ids.quizzes, [
    {
      courseId: courses[0]?.$id,
      lessonId: lessons[0]?.$id,
      title: "Тест: типи машинного навчання",
      topic: "Машинне навчання",
      difficulty: 1,
    },
    {
      courseId: courses[1]?.$id,
      lessonId: lessons[2]?.$id,
      title: "Тест: рекомендаційні системи",
      topic: "Рекомендації",
      difficulty: 2,
    },
    {
      courseId: courses[2]?.$id,
      lessonId: lessons[4]?.$id,
      title: "Тест: адаптивне навчання",
      topic: "Адаптивне навчання",
      difficulty: 2,
    },
  ], user);

  await createDocs(ids.quizQuestions, [
    {
      quizId: quizzes[0]?.$id,
      questionText: "Який тип ML використовує розмічені приклади?",
      optionA: "Навчання з учителем",
      optionB: "Кластеризація",
      optionC: "Випадковий пошук",
      optionD: "Шифрування",
      correctOption: "A",
      explanation: "Навчання з учителем використовує приклади з правильними відповідями.",
      questionOrder: 1,
      topic: "Машинне навчання",
    },
    {
      quizId: quizzes[0]?.$id,
      questionText: "Що таке ознака у ML?",
      optionA: "Пароль користувача",
      optionB: "Характеристика об'єкта",
      optionC: "Колір кнопки",
      optionD: "Назва сервера",
      correctOption: "B",
      explanation: "Ознака описує об'єкт і використовується моделлю.",
      questionOrder: 2,
      topic: "Машинне навчання",
    },
    {
      quizId: quizzes[1]?.$id,
      questionText: "Що аналізує рекомендаційна система?",
      optionA: "Тільки пароль",
      optionB: "Поведінку, контент і схожість матеріалів",
      optionC: "Тільки колір теми",
      optionD: "Тільки розмір екрана",
      correctOption: "B",
      explanation: "Рекомендації враховують зміст матеріалів і дії користувача.",
      questionOrder: 1,
      topic: "Рекомендації",
    },
    {
      quizId: quizzes[2]?.$id,
      questionText: "Навіщо аналізувати помилки в тестах?",
      optionA: "Щоб приховати результат",
      optionB: "Щоб порадити повторення слабких тем",
      optionC: "Щоб видалити курс",
      optionD: "Щоб змінити аватар",
      correctOption: "B",
      explanation: "Помилки показують, яку тему користувачу варто повторити.",
      questionOrder: 1,
      topic: "Адаптивне навчання",
    },
  ], user);

  await createDocs(ids.posts, [
    {
      title: "Shorts: що таке dataset",
      content: "Dataset — це набір даних, на якому модель навчається.",
      category: "Машинне навчання",
      mediaType: "video",
      videoType: "short",
      videoUrl: videos.short,
      thumbnailUrl: img("short-dataset"),
      imageUrl: img("short-dataset"),
      duration: 30,
    },
    {
      title: "Довге відео: вступ до ML",
      content: "Повне пояснення базових понять машинного навчання.",
      category: "Машинне навчання",
      mediaType: "video",
      videoType: "long",
      videoUrl: videos.long,
      thumbnailUrl: img("long-ml"),
      imageUrl: img("long-ml"),
      duration: 600,
    },
    {
      title: "Рекомендації в освітній платформі",
      content: "Система може радити схожі уроки, тести та матеріали на основі поведінки користувача.",
      category: "Рекомендації",
      mediaType: "image",
      imageUrl: img("recsys-post"),
      thumbnailUrl: img("recsys-post"),
    },
  ], user);

  console.log("DONE FULL LEARNING SEED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
