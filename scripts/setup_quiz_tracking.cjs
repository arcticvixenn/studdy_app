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
    data?.type === "index_invalid" ||
    String(data?.message || "").toLowerCase().includes("already");

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

async function createCollection(id, name) {
  await request("POST", `/databases/${databaseId}/collections`, {
    collectionId: id,
    name,
    permissions: [
      'read("any")',
      'create("users")',
      'update("users")',
      'delete("users")',
    ],
    documentSecurity: false,
    enabled: true,
  });
}

async function attrString(collectionId, key, size = 255, required = false) {
  await request("POST", `/databases/${databaseId}/collections/${collectionId}/attributes/string`, {
    key,
    size,
    required,
    array: false,
    encrypt: false,
  });
}

async function attrInt(collectionId, key, required = false, defaultValue = 0) {
  const body = { key, required, array: false };

  if (!required) body.default = defaultValue;

  await request("POST", `/databases/${databaseId}/collections/${collectionId}/attributes/integer`, body);
}

async function attrBool(collectionId, key, required = false, defaultValue = false) {
  const body = { key, required, array: false };

  if (!required) body.default = defaultValue;

  await request("POST", `/databases/${databaseId}/collections/${collectionId}/attributes/boolean`, body);
}

async function waitAttrs(collectionId) {
  for (let i = 0; i < 60; i++) {
    const data = await request("GET", `/databases/${databaseId}/collections/${collectionId}/attributes`);
    const pending = (data.attributes || []).filter((a) => a.status !== "available");

    if (!pending.length) return;

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function index(collectionId, key, attributes) {
  await request("POST", `/databases/${databaseId}/collections/${collectionId}/indexes`, {
    key,
    type: "key",
    attributes,
  });
}

async function main() {
  await createCollection("quiz_attempts", "Quiz Attempts");
  await createCollection("quiz_answers", "Quiz Answers");

  await attrString("quiz_attempts", "userId", 128, true);
  await attrString("quiz_attempts", "accountId", 128, false);
  await attrString("quiz_attempts", "quizId", 128, true);
  await attrString("quiz_attempts", "lessonId", 128, false);
  await attrString("quiz_attempts", "courseId", 128, false);
  await attrString("quiz_attempts", "quizTitle", 255, false);
  await attrString("quiz_attempts", "topic", 128, false);
  await attrInt("quiz_attempts", "totalQuestions", false, 0);
  await attrInt("quiz_attempts", "correctCount", false, 0);
  await attrInt("quiz_attempts", "scorePercent", false, 0);

  await attrString("quiz_answers", "userId", 128, true);
  await attrString("quiz_answers", "accountId", 128, false);
  await attrString("quiz_answers", "quizId", 128, true);
  await attrString("quiz_answers", "questionId", 128, true);
  await attrString("quiz_answers", "questionText", 512, false);
  await attrString("quiz_answers", "selectedOption", 32, false);
  await attrString("quiz_answers", "correctOption", 32, false);
  await attrBool("quiz_answers", "isCorrect", false, false);
  await attrString("quiz_answers", "topic", 128, false);

  await waitAttrs("quiz_attempts");
  await waitAttrs("quiz_answers");

  await index("quiz_attempts", "userId_idx", ["userId"]);
  await index("quiz_attempts", "quizId_idx", ["quizId"]);
  await index("quiz_answers", "userId_idx", ["userId"]);
  await index("quiz_answers", "quizId_idx", ["quizId"]);
  await index("quiz_answers", "questionId_idx", ["questionId"]);

  console.log("DONE quiz tracking collections");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
