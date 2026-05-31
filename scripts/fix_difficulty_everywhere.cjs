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
    return data;
  }

  if (!res.ok) {
    console.log("ERROR", method, path, res.status, data?.message || data);
    throw new Error(`HTTP ${res.status}`);
  }

  return data;
}

async function addInt(collectionId, key) {
  await request(
    "POST",
    `/databases/${databaseId}/collections/${collectionId}/attributes/integer`,
    {
      key,
      required: false,
      array: false,
      default: 1,
    }
  );
}

async function waitAvailable(collectionId, key) {
  for (let i = 0; i < 60; i++) {
    const data = await request(
      "GET",
      `/databases/${databaseId}/collections/${collectionId}/attributes`
    );

    const attr = (data.attributes || []).find((a) => a.key === key);

    if (attr?.status === "available") {
      console.log(`${collectionId}.${key}: available`);
      return true;
    }

    console.log(`${collectionId}.${key}:`, attr?.status || "missing");
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return false;
}

async function main() {
  const collections = [
    "questions",
    "quizzes",
    "lessons",
    "courses",
    "quiz_attempts",
    "quiz_answers",
    "answers",
  ];

  for (const collectionId of collections) {
    await addInt(collectionId, "difficulty");
  }

  for (const collectionId of collections) {
    await waitAvailable(collectionId, "difficulty");
  }

  console.log("DONE difficulty schema fix");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
