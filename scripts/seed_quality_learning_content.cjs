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

const collections = {
  users: "users",
  courses: "courses",
  lessons: "lessons",
  quizzes: "quizzes",
  quizQuestions: "quiz_questions",
  posts: "posts",
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

async function getAttrs(collectionId) {
  const data = await request(
    "GET",
    `/databases/${databaseId}/collections/${collectionId}/attributes`
  );

  return data?.attributes || [];
}

async function listDocs(collectionId) {
  const data = await request(
    "GET",
    `/databases/${databaseId}/collections/${collectionId}/documents`
  );

  return data?.documents || [];
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

async function findExisting(collectionId, item) {
  const docs = await listDocs(collectionId);
  const wanted =
    normalizeText(item.title) ||
    normalizeText(item.name) ||
    normalizeText(item.questionText);

  if (!wanted) return null;

  return docs.find((doc) => {
    return (
      normalizeText(doc.title) === wanted ||
      normalizeText(doc.name) === wanted ||
      normalizeText(doc.questionText) === wanted
    );
  });
}

function fitString(value, attr) {
  const text = String(value ?? "");
  const max = Number(attr.size) || 1000;

  if (text.length <= max) return text;
  return text.slice(0, Math.max(max - 3, 1)) + "...";
}

function valueForKey(key, item, user, index) {
  const k = key.toLowerCase();

  if (k === "userid" || k === "authorid" || k === "creatorid") return user.$id;
  if (k === "accountid") return user.accountId || user.$id;
  if (k.includes("authorname")) return user.username || "Studdy User";
  if (k.includes("authoravatar")) return user.avatar || "";

  if (k === "courseid") return item.courseId || "";
  if (k === "lessonid") return item.lessonId || "";
  if (k === "quizid") return item.quizId || "";

  if (k === "title" || k === "name") return item.title || `Демо ${index}`;
  if (k === "content" || k === "description" || k === "text" || k === "body") {
    return item.content || item.description || "Демо навчальний матеріал.";
  }

  if (k === "category") return item.category || "Машинне навчання";
  if (k === "topic") return item.topic || item.category || "Машинне навчання";

  if (k === "mediatype") return item.mediaType || "text";
  if (k === "videotype" || k === "videokind") return item.videoType || "";
  if (k === "videourl" || k === "video") return item.videoUrl || "";
  if (k === "thumbnailurl" || k === "thumbnail") return item.thumbnailUrl || item.imageUrl || "";
  if (k === "imageurl" || k === "image") return item.imageUrl || "";
  if (k.includes("url")) return item.url || item.videoUrl || item.imageUrl || "";

  if (k === "questiontext" || k === "question") return item.questionText || "";
  if (k === "optiona") return item.optionA || "";
  if (k === "optionb") return item.optionB || "";
  if (k === "optionc") return item.optionC || "";
  if (k === "optiond") return item.optionD || "";
  if (k === "correctoption" || k === "correctanswer") return item.correctOption || "A";
  if (k === "explanation") return item.explanation || "Правильна відповідь випливає з матеріалу уроку.";

  if (k === "questionorder" || k === "order") return item.questionOrder || item.order || index;
  if (k.includes("difficulty")) return item.difficulty || 1;
  if (k.includes("duration")) return item.duration || 0;
  if (k.includes("count")) return item.count || 0;
  if (k.includes("source")) return "quality_demo_seed";

  return item[key] ?? "";
}

function buildPayload(attrs, item, user, index) {
  const payload = {};

  for (const attr of attrs) {
    if (attr.status && attr.status !== "available") continue;

    let value = valueForKey(attr.key, item, user, index);

    if (attr.type === "string") value = fitString(value, attr);
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

async function createDoc(collectionId, item, user, index) {
  const existing = await findExisting(collectionId, item);

  if (existing) {
    console.log("EXISTS", collectionId, item.title || item.questionText);
    return existing;
  }

  const attrs = await getAttrs(collectionId);

  if (!attrs.length) {
    console.log("NO COLLECTION OR ATTRS:", collectionId);
    return null;
  }

  const data = buildPayload(attrs, item, user, index);

  const created = await request(
    "POST",
    `/databases/${databaseId}/collections/${collectionId}/documents`,
    {
      documentId: "unique()",
      data,
    }
  );

  if (created) {
    console.log("CREATED", collectionId, data.title || data.name || data.questionText || created.$id);
  }

  return created;
}

async function createDocs(collectionId, items, user) {
  const result = [];

  for (let i = 0; i < items.length; i++) {
    const doc = await createDoc(collectionId, items[i], user, i + 1);
    if (doc) result.push(doc);
  }

  return result;
}

const img = (seed) => `https://picsum.photos/seed/${seed}/900/520`;

const videoShort = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4";
const videoLong = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

const courseTemplates = [
  {
    title: "Основи машинного навчання",
    description: "Практичний курс про дані, ознаки, типи машинного навчання, класифікацію, регресію, кластеризацію та метрики якості.",
    category: "Машинне навчання",
    difficulty: 1,
  },
  {
    title: "Рекомендаційні системи в освіті",
    description: "Курс пояснює, як освітня платформа може аналізувати контент, поведінку користувача та підбирати схожі матеріали.",
    category: "Рекомендації",
    difficulty: 2,
  },
  {
    title: "Адаптивне навчання та аналіз помилок",
    description: "Курс про персональні траєкторії навчання, аналіз відповідей, слабкі теми, повторення та гейміфікацію.",
    category: "Адаптивне навчання",
    difficulty: 2,
  },
  {
    title: "Біологія: клітина та тканини",
    description: "Демо-курс для перевірки універсальності ML-модуля на темі, яка не пов'язана з програмуванням.",
    category: "Біологія",
    difficulty: 1,
  },
];

function lessonsFor(courses) {
  const byTitle = Object.fromEntries(courses.map((course) => [course.title, course]));

  return [
    {
      courseId: byTitle["Основи машинного навчання"]?.$id,
      title: "Що таке машинне навчання",
      content: "Машинне навчання — це підхід, за якого система аналізує приклади, знаходить закономірності та використовує їх для прогнозування або прийняття рішень. На відміну від звичайної програми, де всі правила задаються вручну, ML-модель навчається на даних. У освітній платформі така модель може визначати інтереси користувача, пропонувати схожі матеріали та аналізувати результати тестів.",
      category: "Машинне навчання",
      topic: "Вступ до ML",
      order: 1,
      difficulty: 1,
    },
    {
      courseId: byTitle["Основи машинного навчання"]?.$id,
      title: "Датасет, ознаки та мітки",
      content: "Датасет — це набір прикладів для навчання або перевірки моделі. Ознаки описують об'єкт: наприклад, тема уроку, кількість переглядів, ключові слова або результати тестів. Мітка — це правильна відповідь, клас або цільове значення. Якість датасету напряму впливає на якість моделі.",
      category: "Машинне навчання",
      topic: "Дані для ML",
      order: 2,
      difficulty: 1,
    },
    {
      courseId: byTitle["Основи машинного навчання"]?.$id,
      title: "Класифікація, регресія та кластеризація",
      content: "Класифікація визначає категорію об'єкта, регресія прогнозує числове значення, а кластеризація групує схожі об'єкти без готових відповідей. У навчальній платформі класифікація може визначати складність матеріалу, регресія — прогнозувати успішність, а кластеризація — групувати користувачів або теми.",
      category: "Машинне навчання",
      topic: "Типи ML задач",
      order: 3,
      difficulty: 2,
    },
    {
      courseId: byTitle["Основи машинного навчання"]?.$id,
      title: "Метрики якості моделей",
      content: "Метрики показують, наскільки добре працює модель. Accuracy показує частку правильних відповідей. Precision важлива, коли потрібно зменшити кількість хибних позитивних результатів. Recall показує, скільки правильних об'єктів модель змогла знайти. F1-score поєднує Precision і Recall.",
      category: "Метрики",
      topic: "Оцінювання моделей",
      order: 4,
      difficulty: 2,
    },

    {
      courseId: byTitle["Рекомендаційні системи в освіті"]?.$id,
      title: "Content-based рекомендації",
      content: "Content-based рекомендації підбирають матеріали, схожі за змістом. Для цього система аналізує назви, описи, категорії, ключові слова й текст уроків. Якщо користувач читає матеріали про класифікацію, система може рекомендувати уроки про метрики, датасети або алгоритми класифікації.",
      category: "Рекомендації",
      topic: "Content-based підхід",
      order: 1,
      difficulty: 2,
    },
    {
      courseId: byTitle["Рекомендаційні системи в освіті"]?.$id,
      title: "Поведінкові сигнали користувача",
      content: "Поведінкові сигнали — це дії користувача: лайки, коментарі, збереження, перегляди, пошукові запити та результати тестів. Вони допомагають зрозуміти, які теми цікавлять користувача, що він уже вивчав і де виникають труднощі.",
      category: "Рекомендації",
      topic: "Соціальні сигнали",
      order: 2,
      difficulty: 2,
    },
    {
      courseId: byTitle["Рекомендаційні системи в освіті"]?.$id,
      title: "Гібридна рекомендаційна модель",
      content: "Гібридна модель поєднує аналіз контенту та поведінки. Вона не просто шукає однакові слова, а враховує схожість тем, активність користувача, помилки в тестах і соціальні взаємодії. Такий підхід краще підходить для освітньої соціальної платформи.",
      category: "Рекомендації",
      topic: "Гібридна модель",
      order: 3,
      difficulty: 3,
    },

    {
      courseId: byTitle["Адаптивне навчання та аналіз помилок"]?.$id,
      title: "Як система аналізує відповіді",
      content: "Після проходження тесту система може зберігати правильні й неправильні відповіді, тему питання та складність. На основі цього формується профіль знань користувача. Якщо помилки повторюються в одній темі, платформа радить повторити відповідний урок.",
      category: "Адаптивне навчання",
      topic: "Аналіз відповідей",
      order: 1,
      difficulty: 2,
    },
    {
      courseId: byTitle["Адаптивне навчання та аналіз помилок"]?.$id,
      title: "Персональні поради для повторення",
      content: "Персональні поради мають пояснювати користувачу, що саме варто повторити. Наприклад: 'Повтори тему метрик, бо у тесті були помилки з Precision і Recall'. Такий формат корисніший, ніж загальний напис 'детальний ML аналіз'.",
      category: "Адаптивне навчання",
      topic: "Персоналізація",
      order: 2,
      difficulty: 2,
    },
    {
      courseId: byTitle["Адаптивне навчання та аналіз помилок"]?.$id,
      title: "XP, рівні та квест дня",
      content: "Гейміфікація підвищує мотивацію користувача. XP можна давати за проходження тестів, коментарі, збереження матеріалів і щоденні квести. Рівні мають підвищуватися поступово, щоб користувач не міг отримати надто багато рівнів за один день.",
      category: "Гейміфікація",
      topic: "XP та рівні",
      order: 3,
      difficulty: 1,
    },

    {
      courseId: byTitle["Біологія: клітина та тканини"]?.$id,
      title: "Будова клітини",
      content: "Клітина є основною структурною одиницею живих організмів. Вона має плазматичну мембрану, цитоплазму, генетичний матеріал та органели. Кожна органела виконує певну функцію, наприклад рибосоми беруть участь у синтезі білків.",
      category: "Біологія",
      topic: "Клітина",
      order: 1,
      difficulty: 1,
    },
    {
      courseId: byTitle["Біологія: клітина та тканини"]?.$id,
      title: "Тканини організму",
      content: "Тканина — це група клітин, подібних за будовою та функціями. У тварин виділяють епітеліальну, сполучну, м'язову та нервову тканини. Кожен тип тканини має свою роль в організмі.",
      category: "Біологія",
      topic: "Тканини",
      order: 2,
      difficulty: 1,
    },
  ];
}

function quizzesFor(courses, lessons) {
  const course = Object.fromEntries(courses.map((item) => [item.title, item]));
  const lesson = Object.fromEntries(lessons.map((item) => [item.title, item]));

  return [
    {
      courseId: course["Основи машинного навчання"]?.$id,
      lessonId: lesson["Що таке машинне навчання"]?.$id,
      title: "Тест: вступ до машинного навчання",
      topic: "Вступ до ML",
      difficulty: 1,
    },
    {
      courseId: course["Основи машинного навчання"]?.$id,
      lessonId: lesson["Метрики якості моделей"]?.$id,
      title: "Тест: метрики якості ML",
      topic: "Оцінювання моделей",
      difficulty: 2,
    },
    {
      courseId: course["Рекомендаційні системи в освіті"]?.$id,
      lessonId: lesson["Гібридна рекомендаційна модель"]?.$id,
      title: "Тест: рекомендаційні системи",
      topic: "Рекомендації",
      difficulty: 2,
    },
    {
      courseId: course["Адаптивне навчання та аналіз помилок"]?.$id,
      lessonId: lesson["Як система аналізує відповіді"]?.$id,
      title: "Тест: адаптивне навчання",
      topic: "Адаптивне навчання",
      difficulty: 2,
    },
    {
      courseId: course["Біологія: клітина та тканини"]?.$id,
      lessonId: lesson["Будова клітини"]?.$id,
      title: "Тест: будова клітини",
      topic: "Біологія",
      difficulty: 1,
    },
  ];
}

function questionsFor(quizzes) {
  const quiz = Object.fromEntries(quizzes.map((item) => [item.title, item]));

  return [
    {
      quizId: quiz["Тест: вступ до машинного навчання"]?.$id,
      questionText: "Що найкраще описує машинне навчання?",
      optionA: "Ручне прописування кожного правила",
      optionB: "Навчання системи знаходити закономірності в даних",
      optionC: "Збереження файлів у хмарі",
      optionD: "Створення дизайну кнопок",
      correctOption: "B",
      explanation: "ML-модель навчається на даних і використовує закономірності для прогнозування.",
      questionOrder: 1,
      topic: "Вступ до ML",
    },
    {
      quizId: quiz["Тест: вступ до машинного навчання"]?.$id,
      questionText: "Що таке датасет?",
      optionA: "Набір прикладів для навчання або перевірки моделі",
      optionB: "Пароль користувача",
      optionC: "Колір інтерфейсу",
      optionD: "Тип шрифту",
      correctOption: "A",
      explanation: "Датасет містить приклади, які використовуються для навчання або тестування моделі.",
      questionOrder: 2,
      topic: "Дані для ML",
    },
    {
      quizId: quiz["Тест: вступ до машинного навчання"]?.$id,
      questionText: "Яка задача ML визначає категорію об'єкта?",
      optionA: "Регресія",
      optionB: "Класифікація",
      optionC: "Архівація",
      optionD: "Компіляція",
      correctOption: "B",
      explanation: "Класифікація визначає клас або категорію об'єкта.",
      questionOrder: 3,
      topic: "Типи ML задач",
    },

    {
      quizId: quiz["Тест: метрики якості ML"]?.$id,
      questionText: "Що показує Accuracy?",
      optionA: "Частку правильних відповідей",
      optionB: "Кількість кольорів у застосунку",
      optionC: "Розмір відео",
      optionD: "Час запуску телефону",
      correctOption: "A",
      explanation: "Accuracy показує, яку частку прогнозів модель зробила правильно.",
      questionOrder: 1,
      topic: "Оцінювання моделей",
    },
    {
      quizId: quiz["Тест: метрики якості ML"]?.$id,
      questionText: "Коли важлива метрика Recall?",
      optionA: "Коли потрібно знайти якомога більше правильних об'єктів",
      optionB: "Коли потрібно змінити аватар",
      optionC: "Коли треба очистити кеш",
      optionD: "Коли треба відкрити меню",
      correctOption: "A",
      explanation: "Recall показує, скільки потрібних об'єктів модель змогла знайти.",
      questionOrder: 2,
      topic: "Оцінювання моделей",
    },

    {
      quizId: quiz["Тест: рекомендаційні системи"]?.$id,
      questionText: "Що враховує гібридна рекомендаційна модель?",
      optionA: "Лише назву застосунку",
      optionB: "Контент, поведінку користувача і результати навчання",
      optionC: "Тільки пароль",
      optionD: "Тільки розмір екрана",
      correctOption: "B",
      explanation: "Гібридна модель поєднує аналіз змісту матеріалів і поведінкові сигнали користувача.",
      questionOrder: 1,
      topic: "Рекомендації",
    },
    {
      quizId: quiz["Тест: рекомендаційні системи"]?.$id,
      questionText: "Що є поведінковим сигналом?",
      optionA: "Лайк або збереження матеріалу",
      optionB: "Колір іконки",
      optionC: "Назва телефону",
      optionD: "Розмір логотипа",
      correctOption: "A",
      explanation: "Лайки, коментарі, збереження і перегляди показують інтереси користувача.",
      questionOrder: 2,
      topic: "Соціальні сигнали",
    },

    {
      quizId: quiz["Тест: адаптивне навчання"]?.$id,
      questionText: "Навіщо аналізувати помилки в тестах?",
      optionA: "Щоб запропонувати повторення слабких тем",
      optionB: "Щоб видалити всі курси",
      optionC: "Щоб змінити пароль",
      optionD: "Щоб приховати профіль",
      correctOption: "A",
      explanation: "Помилки допомагають визначити теми, які користувачу потрібно повторити.",
      questionOrder: 1,
      topic: "Адаптивне навчання",
    },
    {
      quizId: quiz["Тест: адаптивне навчання"]?.$id,
      questionText: "Що має робити персональна порада?",
      optionA: "Пояснювати, яку тему повторити і чому",
      optionB: "Показувати випадковий текст",
      optionC: "Видаляти відповіді",
      optionD: "Змінювати назву застосунку",
      correctOption: "A",
      explanation: "Порада має бути пов'язана з реальними помилками користувача.",
      questionOrder: 2,
      topic: "Персоналізація",
    },

    {
      quizId: quiz["Тест: будова клітини"]?.$id,
      questionText: "Що таке клітина?",
      optionA: "Основна структурна одиниця живих організмів",
      optionB: "Тип комп'ютерної мережі",
      optionC: "Назва алгоритму",
      optionD: "Елемент інтерфейсу",
      correctOption: "A",
      explanation: "Клітина є основною структурною одиницею живих організмів.",
      questionOrder: 1,
      topic: "Біологія",
    },
    {
      quizId: quiz["Тест: будова клітини"]?.$id,
      questionText: "Яку функцію виконують рибосоми?",
      optionA: "Беруть участь у синтезі білків",
      optionB: "Створюють рекомендації",
      optionC: "Оцінюють тести",
      optionD: "Запускають відео",
      correctOption: "A",
      explanation: "Рибосоми беруть участь у синтезі білків.",
      questionOrder: 2,
      topic: "Біологія",
    },
  ];
}

const posts = [
  {
    title: "Shorts: що таке датасет",
    content: "Коротке пояснення: датасет — це набір прикладів, на яких модель навчається.",
    category: "Машинне навчання",
    mediaType: "video",
    videoType: "short",
    videoUrl: videoShort,
    thumbnailUrl: img("short-dataset"),
    imageUrl: img("short-dataset"),
    duration: 30,
  },
  {
    title: "Довге відео: вступ до машинного навчання",
    content: "Повне демо-відео для перевірки long video у Studdy.",
    category: "Машинне навчання",
    mediaType: "video",
    videoType: "long",
    videoUrl: videoLong,
    thumbnailUrl: img("long-ml"),
    imageUrl: img("long-ml"),
    duration: 600,
  },
  {
    title: "Як працюють рекомендації в Studdy",
    content: "Система аналізує текст матеріалів, лайки, коментарі, збереження, перегляди і результати тестів.",
    category: "Рекомендації",
    mediaType: "image",
    imageUrl: img("recommendations-studdy"),
    thumbnailUrl: img("recommendations-studdy"),
  },
  {
    title: "Чому варто повторювати помилки",
    content: "Якщо у тесті були помилки з певної теми, платформа радить повторити пов'язаний урок.",
    category: "Адаптивне навчання",
    mediaType: "image",
    imageUrl: img("adaptive-learning"),
    thumbnailUrl: img("adaptive-learning"),
  },
];

async function main() {
  const users = await listDocs(collections.users);

  if (!users.length) {
    console.log("Спочатку зареєструйся в додатку.");
    return;
  }

  const user = users[0];
  console.log("DEMO USER:", user.username || user.email || user.$id);

  const courses = await createDocs(collections.courses, courseTemplates, user);
  const lessons = await createDocs(collections.lessons, lessonsFor(courses), user);
  const quizzes = await createDocs(collections.quizzes, quizzesFor(courses, lessons), user);
  await createDocs(collections.quizQuestions, questionsFor(quizzes), user);
  await createDocs(collections.posts, posts, user);

  console.log("DONE QUALITY LEARNING CONTENT");
  console.log({
    courses: courses.length,
    lessons: lessons.length,
    quizzes: quizzes.length,
    posts: posts.length,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
