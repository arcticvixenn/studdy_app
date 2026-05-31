const endpoint = "http://localhost:8080/v1";
const projectId = "6a1ae727000328f56b72";
const databaseId = "studdy_db";
const apiKey = process.env.APPWRITE_API_KEY;

if (!apiKey) {
  throw new Error("APPWRITE_API_KEY is missing");
}

const headers = {
  "Content-Type": "application/json",
  "X-Appwrite-Project": projectId,
  "X-Appwrite-Key": apiKey,
};

const collections = {
  users: "users",
  posts: "posts",
  courses: "courses",
  lessons: "lessons",
  comments: "comments",
  likes: "likes",
  saves: "saves",
  viewEvents: "view_events",
  searchEvents: "search_events",
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

async function getAttributes(collectionId) {
  const data = await request(
    "GET",
    `/databases/${databaseId}/collections/${collectionId}/attributes`
  );

  return data?.attributes || [];
}

async function listDocs(collectionId, limit = 25) {
  const data = await request(
    "GET",
    `/databases/${databaseId}/collections/${collectionId}/documents?queries[]=${encodeURIComponent(JSON.stringify({ method: "limit", values: [limit] }))}`
  );

  return data?.documents || [];
}

function valueForKey(key, item, user, index) {
  const lower = key.toLowerCase();

  if (lower === "authorid" || lower === "userid" || lower === "creatorid") return user.$id;
  if (lower === "accountid") return user.accountId || user.$id;
  if (lower.includes("authorname") || lower.includes("username")) return user.username || "Studdy User";
  if (lower.includes("avatar")) return user.avatar || "";
  if (lower.includes("email")) return user.email || "demo@studdy.local";

  if (lower.includes("title") || lower.includes("name")) return item.title || `Демо матеріал ${index}`;
  if (lower.includes("content") || lower.includes("description") || lower === "text") return item.content || item.description || "Демо навчальний текст.";
  if (lower.includes("category")) return item.category || "Машинне навчання";
  if (lower.includes("topic")) return item.topic || item.category || "Машинне навчання";

  if (lower === "mediatype") return item.mediaType || "text";
  if (lower.includes("videotype") || lower.includes("videokind") || lower.includes("format")) return item.videoType || "";
  if (lower.includes("type")) return item.type || item.mediaType || "text";

  if (lower.includes("image") && lower.includes("url")) return item.imageUrl || "";
  if (lower.includes("thumbnail") && lower.includes("url")) return item.thumbnailUrl || item.imageUrl || "";
  if (lower.includes("video") && lower.includes("url")) return item.videoUrl || "";
  if (lower.includes("url")) return item.url || item.videoUrl || item.imageUrl || "";

  if (lower.includes("image") && lower.includes("id")) return item.imageId || "";
  if (lower.includes("video") && lower.includes("id")) return item.videoId || "";
  if (lower.includes("thumbnail") && lower.includes("id")) return item.thumbnailId || "";

  if (lower.includes("duration")) return item.duration || 0;
  if (lower.includes("order")) return item.order || index;
  if (lower.includes("difficulty")) return item.difficulty || 1;
  if (lower.includes("rating")) return item.rating || 0;
  if (lower.includes("count")) return item.count || 0;

  if (lower.includes("source")) return item.source || "demo_seed";
  if (lower.includes("search")) return item.query || "машинне навчання";
  if (lower.includes("date")) return new Date().toISOString().slice(0, 10);

  return item[key] ?? "";
}

function buildPayload(attrs, item, user, index) {
  const payload = {};

  for (const attr of attrs) {
    if (attr.status && attr.status !== "available") continue;

    const key = attr.key;
    let value = valueForKey(key, item, user, index);

    if (attr.type === "integer") value = Number(value) || 0;
    if (attr.type === "double") value = Number(value) || 0;
    if (attr.type === "boolean") value = Boolean(value);
    if (attr.array) value = Array.isArray(value) ? value : [];

    if (value === "" && attr.required) {
      if (attr.type === "integer" || attr.type === "double") value = 0;
      else if (attr.type === "boolean") value = false;
      else value = `demo_${key}_${index}`;
    }

    if (value !== "" || attr.required) payload[key] = value;
  }

  return payload;
}

async function createDemoDocs(collectionId, items, user) {
  const attrs = await getAttributes(collectionId);

  if (!attrs.length) {
    console.log(`No attrs or missing collection: ${collectionId}`);
    return [];
  }

  const created = [];

  for (let i = 0; i < items.length; i++) {
    const payload = buildPayload(attrs, items[i], user, i + 1);

    const doc = await request(
      "POST",
      `/databases/${databaseId}/collections/${collectionId}/documents`,
      {
        documentId: "unique()",
        data: payload,
      }
    );

    if (doc) {
      created.push(doc);
      console.log(`CREATED ${collectionId}:`, payload.title || payload.name || doc.$id);
    }
  }

  return created;
}

const image = (seed) => `https://picsum.photos/seed/${seed}/900/520`;

const posts = [
  {
    title: "Що таке машинне навчання простими словами",
    content: "Машинне навчання дозволяє системі знаходити закономірності у даних і робити прогноз без ручного прописування кожного правила.",
    category: "Машинне навчання",
    mediaType: "image",
    imageUrl: image("studdy-ml-1"),
    thumbnailUrl: image("studdy-ml-1"),
  },
  {
    title: "Класифікація: як модель розпізнає категорії",
    content: "Класифікація використовується для визначення класу об'єкта: наприклад, складність тесту, тема уроку або тип навчального матеріалу.",
    category: "Класифікація",
    mediaType: "image",
    imageUrl: image("studdy-classification"),
    thumbnailUrl: image("studdy-classification"),
  },
  {
    title: "Рекомендаційна система в освітній платформі",
    content: "Рекомендаційна модель аналізує теми, взаємодії, лайки, коментарі, збереження та результати тестів, щоб пропонувати корисний контент.",
    category: "Рекомендації",
    mediaType: "text",
  },
  {
    title: "Чому важливо повторювати помилки",
    content: "Якщо студент помиляється в певній темі, система може запропонувати повторити урок або пройти короткий тест.",
    category: "Адаптивне навчання",
    mediaType: "text",
  },
  {
    title: "Метрики якості моделей",
    content: "Accuracy, Precision, Recall та F1-score допомагають оцінити якість класифікаційної моделі.",
    category: "Метрики",
    mediaType: "image",
    imageUrl: image("studdy-metrics"),
    thumbnailUrl: image("studdy-metrics"),
  },
  {
    title: "Коротке відео: що таке dataset",
    content: "Dataset — це набір даних, на основі якого модель навчається знаходити закономірності.",
    category: "Машинне навчання",
    mediaType: "video",
    videoType: "short",
    videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    thumbnailUrl: image("studdy-short-1"),
    duration: 18,
  },
  {
    title: "Shorts: кластеризація за 30 секунд",
    content: "Кластеризація групує об'єкти без готових правильних відповідей.",
    category: "Кластеризація",
    mediaType: "video",
    videoType: "short",
    videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    thumbnailUrl: image("studdy-short-2"),
    duration: 28,
  },
  {
    title: "Довге відео: вступ до рекомендаційних систем",
    content: "У цьому відео пояснюється, як освітня платформа може рекомендувати користувачу схожі уроки та тести.",
    category: "Рекомендації",
    mediaType: "video",
    videoType: "long",
    videoUrl: "https://media.w3.org/2010/05/sintel/trailer.mp4",
    thumbnailUrl: image("studdy-long-video"),
    duration: 180,
  },
];

const courses = [
  {
    title: "Основи машинного навчання",
    description: "Курс про типи ML, ознаки, датасети, навчання моделей та оцінювання результатів.",
    category: "Машинне навчання",
    difficulty: 1,
  },
  {
    title: "Рекомендаційні системи",
    description: "Курс про content-based рекомендації, поведінкові сигнали та персоналізацію навчання.",
    category: "Рекомендації",
    difficulty: 2,
  },
  {
    title: "Адаптивне навчання і тести",
    description: "Курс про аналіз відповідей, пошук слабких тем і генерацію персональних завдань.",
    category: "Адаптивне навчання",
    difficulty: 2,
  },
];

const lessons = [
  {
    title: "Типи машинного навчання",
    content: "Навчання з учителем, без учителя та з підкріпленням використовуються для різних типів задач.",
    category: "Машинне навчання",
    order: 1,
    difficulty: 1,
  },
  {
    title: "Що таке ознаки у ML",
    content: "Ознаки описують об'єкт і допомагають моделі приймати рішення.",
    category: "Машинне навчання",
    order: 2,
    difficulty: 1,
  },
  {
    title: "Content-based рекомендації",
    content: "Content-based підхід шукає матеріали, схожі за текстом, темою або ключовими словами.",
    category: "Рекомендації",
    order: 1,
    difficulty: 2,
  },
  {
    title: "Поведінкові сигнали користувача",
    content: "Лайки, коментарі, збереження, перегляди та пошук показують інтереси користувача.",
    category: "Рекомендації",
    order: 2,
    difficulty: 2,
  },
  {
    title: "Як аналізувати помилки в тестах",
    content: "Якщо користувач часто помиляється у певній темі, система має запропонувати повторення.",
    category: "Адаптивне навчання",
    order: 1,
    difficulty: 2,
  },
];

const searchEvents = [
  { query: "машинне навчання", source: "demo_seed" },
  { query: "рекомендаційні системи", source: "demo_seed" },
  { query: "метрики accuracy precision recall", source: "demo_seed" },
];

async function main() {
  const users = await listDocs(collections.users, 5);

  if (!users.length) {
    console.log("No users found. Спочатку зареєструйся в додатку.");
    process.exit(1);
  }

  const user = users[0];

  console.log("Using demo user:", user.username || user.email || user.$id);

  const createdPosts = await createDemoDocs(collections.posts, posts, user);
  const createdCourses = await createDemoDocs(collections.courses, courses, user);
  const createdLessons = await createDemoDocs(collections.lessons, lessons, user);

  await createDemoDocs(collections.searchEvents, searchEvents, user);

  const viewItems = [...createdPosts, ...createdCourses, ...createdLessons].slice(0, 12).map((item, index) => ({
    title: item.title || item.name || "Demo view",
    sourceId: item.$id,
    sourceType: index < createdPosts.length ? "post" : "lesson",
    category: item.category || "Машинне навчання",
    topic: item.topic || item.category || "Машинне навчання",
    duration: 30 + index * 10,
    source: "demo_seed",
  }));

  await createDemoDocs(collections.viewEvents, viewItems, user);

  console.log("DONE DEMO SEED");
  console.log({
    posts: createdPosts.length,
    courses: createdCourses.length,
    lessons: createdLessons.length,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
