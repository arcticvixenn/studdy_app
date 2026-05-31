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
    String(data?.message || "").toLowerCase().includes("already") ||
    String(data?.message || "").toLowerCase().includes("same key");

  if (!res.ok && exists) {
    console.log("Already exists:", path);
    return;
  }

  if (!res.ok) {
    console.log("ERROR", method, path, res.status, data?.message || data);
    throw new Error(`HTTP ${res.status}`);
  }
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

async function addInt(collectionId, key) {
  await request(
    "POST",
    `/databases/${databaseId}/collections/${collectionId}/attributes/integer`,
    {
      key,
      required: false,
      array: false,
      default: 0,
    }
  );
}

async function addBool(collectionId, key) {
  await request(
    "POST",
    `/databases/${databaseId}/collections/${collectionId}/attributes/boolean`,
    {
      key,
      required: false,
      array: false,
      default: false,
    }
  );
}

async function waitAttrs(collectionId) {
  for (let i = 0; i < 60; i++) {
    const res = await fetch(
      `${endpoint}/databases/${databaseId}/collections/${collectionId}/attributes`,
      { headers }
    );

    const data = await res.json();
    const pending = (data.attributes || []).filter((a) => a.status !== "available");

    if (!pending.length) return;

    console.log(`Waiting ${collectionId}:`, pending.map((a) => a.key).join(", "));
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function main() {
  const attemptStrings = [
    "attemptId",
    "userId",
    "accountId",
    "quizId",
    "lessonId",
    "courseId",
    "quizTitle",
    "title",
    "topic",
    "category",
    "status",
    "startedAt",
    "finishedAt",
    "completedAt",
    "submittedAt",
    "source",
    "modelType",
  ];

  const attemptInts = [
    "score",
    "scorePercent",
    "percentage",
    "correctCount",
    "correctAnswers",
    "totalQuestions",
    "total",
    "passingScore",
    "earnedXp",
    "xpEarned",
    "points",
    "attemptNumber",
    "duration",
    "timeSpent",
  ];

  const attemptBools = [
    "passed",
    "completed",
    "isPassed",
  ];

  const answerStrings = [
    "attemptId",
    "userId",
    "accountId",
    "quizId",
    "lessonId",
    "courseId",
    "questionId",
    "questionText",
    "question",
    "selectedOption",
    "selectedAnswer",
    "selectedValue",
    "userAnswer",
    "answer",
    "correctOption",
    "correctAnswer",
    "correctValue",
    "explanation",
    "topic",
    "category",
    "source",
  ];

  const answerInts = [
    "questionOrder",
    "order",
    "score",
    "points",
  ];

  const answerBools = [
    "isCorrect",
    "correct",
  ];

  for (const key of attemptStrings) await addString("quiz_attempts", key, key.includes("At") ? 64 : 255);
  for (const key of attemptInts) await addInt("quiz_attempts", key);
  for (const key of attemptBools) await addBool("quiz_attempts", key);

  for (const key of answerStrings) await addString("quiz_answers", key, key.includes("Text") || key === "question" || key === "explanation" ? 1000 : 255);
  for (const key of answerInts) await addInt("quiz_answers", key);
  for (const key of answerBools) await addBool("quiz_answers", key);

  await waitAttrs("quiz_attempts");
  await waitAttrs("quiz_answers");

  console.log("DONE FULL QUIZ SCHEMA FIX");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
