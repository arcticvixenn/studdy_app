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

async function attrInt(collectionId, key) {
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

async function attrString(collectionId, key, size = 512) {
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

async function attrBool(collectionId, key) {
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

async function main() {
  await attrInt("quiz_attempts", "score");
  await attrInt("quiz_attempts", "correctAnswers");
  await attrInt("quiz_attempts", "total");
  await attrInt("quiz_attempts", "percentage");
  await attrString("quiz_attempts", "completedAt", 64);

  await attrString("quiz_answers", "selectedAnswer", 64);
  await attrString("quiz_answers", "correctAnswer", 64);
  await attrString("quiz_answers", "answer", 64);
  await attrString("quiz_answers", "explanation", 1000);
  await attrBool("quiz_answers", "correct");

  console.log("DONE quiz missing attributes");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
