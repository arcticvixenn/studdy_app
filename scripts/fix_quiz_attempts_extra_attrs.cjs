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

async function main() {
  await addBool("quiz_attempts", "passed");
  await addBool("quiz_attempts", "completed");

  await addInt("quiz_attempts", "passingScore");
  await addInt("quiz_attempts", "earnedXp");
  await addInt("quiz_attempts", "xpEarned");
  await addInt("quiz_attempts", "attemptNumber");
  await addInt("quiz_attempts", "duration");
  await addInt("quiz_attempts", "timeSpent");

  await addString("quiz_attempts", "startedAt", 64);
  await addString("quiz_attempts", "finishedAt", 64);
  await addString("quiz_attempts", "status", 64);

  console.log("DONE quiz attempts extra fields");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
