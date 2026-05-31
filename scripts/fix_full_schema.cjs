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

  const exists =
    res.status === 409 ||
    data?.type === "attribute_unknown" ||
    data?.type === "index_invalid" ||
    String(data?.message || "").toLowerCase().includes("already") ||
    String(data?.message || "").toLowerCase().includes("same key");

  if (!res.ok && exists) {
    console.log("Already exists:", path);
    return data;
  }

  if (!res.ok) {
    console.log("ERROR", method, path, res.status, data?.message || data);
    throw new Error(`HTTP ${res.status}`);
  }

  return data;
}

async function addString(collectionId, key, size = 255) {
  await request(
    "POST",
    `/databases/${databaseId}/collections/${collectionId}/attributes/string`,
    {
      key,
      size,
      required: false,
      array: false,
      encrypt: false,
    }
  );
}

async function addInt(collectionId, key, defaultValue = 0) {
  await request(
    "POST",
    `/databases/${databaseId}/collections/${collectionId}/attributes/integer`,
    {
      key,
      required: false,
      array: false,
      default: defaultValue,
    }
  );
}

async function waitAttrs(collectionId) {
  for (let i = 0; i < 60; i++) {
    const res = await request(
      "GET",
      `/databases/${databaseId}/collections/${collectionId}/attributes`
    );

    const pending = (res.attributes || []).filter((a) => a.status !== "available");

    if (!pending.length) return;

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function main() {
  // posts
  await addString("posts", "videoType", 32);
  await addInt("posts", "likesCount", 0);
  await addInt("posts", "commentsCount", 0);

  // courses
  await addString("courses", "thumbnailId", 128);
  await addInt("courses", "difficulty", 1);
  await addString("courses", "source", 128);

  // lessons
  await addInt("lessons", "order", 0);
  await addString("lessons", "videoUrl", 1000);
  await addString("lessons", "thumbnailUrl", 1000);
  await addInt("lessons", "difficulty", 1);
  await addString("lessons", "source", 128);

  // quizzes
  await addString("quizzes", "courseId", 128);
  await addString("quizzes", "topic", 128);
  await addInt("quizzes", "difficulty", 1);

  // questions
  await addString("questions", "lessonId", 128);
  await addString("questions", "courseId", 128);
  await addString("questions", "correctAnswer", 64);
  await addString("questions", "category", 128);
  await addInt("questions", "order", 0);
  await addString("questions", "source", 128);

  // answers
  await addString("answers", "accountId", 128);

  // likes
  await addString("likes", "accountId", 128);

  // comments
  await addString("comments", "userId", 128);
  await addString("comments", "accountId", 128);
  await addString("comments", "authorAvatar", 1000);

  // saves
  await addString("saves", "accountId", 128);

  // follows
  await addString("follows", "userId", 128);
  await addString("follows", "targetUserId", 128);

  // view_events
  await addString("view_events", "sourceId", 128);
  await addString("view_events", "sourceType", 128);
  await addString("view_events", "postId", 128);
  await addString("view_events", "lessonId", 128);
  await addString("view_events", "courseId", 128);
  await addString("view_events", "category", 128);
  await addString("view_events", "topic", 128);
  await addString("view_events", "dateKey", 32);

  // search_events
  await addString("search_events", "category", 128);
  await addString("search_events", "topic", 128);
  await addInt("search_events", "resultsCount", 0);
  await addString("search_events", "dateKey", 32);
  await addString("search_events", "source", 128);

  const touched = [
    "posts",
    "courses",
    "lessons",
    "quizzes",
    "questions",
    "answers",
    "likes",
    "comments",
    "saves",
    "follows",
    "view_events",
    "search_events",
  ];

  for (const collectionId of touched) {
    await waitAttrs(collectionId);
  }

  console.log("DONE FULL SCHEMA FIX");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
