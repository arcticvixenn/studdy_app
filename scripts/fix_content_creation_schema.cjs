const ENDPOINT = process.env.APPWRITE_ENDPOINT || "http://localhost:8080/v1";
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || "6a1ae727000328f56b72";
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "studdy_db";
const API_KEY = process.env.APPWRITE_API_KEY;

if (!API_KEY) {
  console.error("APPWRITE_API_KEY is missing");
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  "X-Appwrite-Project": PROJECT_ID,
  "X-Appwrite-Key": API_KEY,
};

const schema = {
  courses: [
    { type: "string", key: "level", size: 64 },
    { type: "integer", key: "difficulty" },
    { type: "string", key: "thumbnailId", size: 128 },
    { type: "string", key: "thumbnailUrl", size: 2048 },
    { type: "string", key: "source", size: 64 },
  ],

  quizzes: [
    { type: "integer", key: "passingScore" },
    { type: "string", key: "courseId", size: 128 },
    { type: "string", key: "topic", size: 128 },
    { type: "integer", key: "difficulty" },
  ],

  lessons: [
    { type: "integer", key: "order" },
    { type: "string", key: "videoUrl", size: 2048 },
    { type: "string", key: "thumbnailUrl", size: 2048 },
    { type: "integer", key: "difficulty" },
    { type: "string", key: "source", size: 64 },
  ],

  questions: [
    { type: "string", key: "lessonId", size: 128 },
    { type: "string", key: "courseId", size: 128 },
    { type: "string", key: "correctAnswer", size: 2048 },
    { type: "string", key: "category", size: 128 },
    { type: "integer", key: "order" },
    { type: "string", key: "source", size: 64 },
  ],
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(method, path, body = null) {
  const response = await fetch(`${ENDPOINT}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      typeof data === "object" && data?.message
        ? data.message
        : String(data || response.statusText);

    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

async function getAttributes(collectionId) {
  const result = await request(
    "GET",
    `/databases/${DATABASE_ID}/collections/${collectionId}/attributes`
  );

  return result.attributes || [];
}

async function attributeExists(collectionId, key) {
  const attrs = await getAttributes(collectionId);
  return attrs.find((item) => item.key === key);
}

async function waitAttribute(collectionId, key) {
  for (let i = 0; i < 40; i += 1) {
    const attr = await attributeExists(collectionId, key);

    if (attr?.status === "available") {
      console.log(`AVAILABLE ${collectionId}.${key}`);
      return;
    }

    if (attr?.status === "failed") {
      throw new Error(`Attribute failed: ${collectionId}.${key}`);
    }

    await sleep(1000);
  }

  console.log(`WAIT TIMEOUT ${collectionId}.${key}`);
}

async function createAttribute(collectionId, spec) {
  const existing = await attributeExists(collectionId, spec.key);

  if (existing) {
    console.log(`EXISTS ${collectionId}.${spec.key} (${existing.type}, ${existing.status})`);

    if (existing.status !== "available") {
      await waitAttribute(collectionId, spec.key);
    }

    return;
  }

  let path = "";
  let body = {
    key: spec.key,
    required: false,
    array: false,
  };

  if (spec.type === "string") {
    path = `/databases/${DATABASE_ID}/collections/${collectionId}/attributes/string`;
    body.size = spec.size || 255;
  }

  if (spec.type === "integer") {
    path = `/databases/${DATABASE_ID}/collections/${collectionId}/attributes/integer`;
    body.min = -2147483648;
    body.max = 2147483647;
  }

  if (!path) {
    throw new Error(`Unknown type: ${spec.type}`);
  }

  try {
    await request("POST", path, body);
    console.log(`CREATED ${collectionId}.${spec.key}`);
  } catch (error) {
    const msg = String(error.message || "");

    if (
      error.status === 409 ||
      msg.includes("already exists") ||
      msg.includes("same attributes")
    ) {
      console.log(`ALREADY EXISTS ${collectionId}.${spec.key}`);
    } else {
      throw error;
    }
  }

  await waitAttribute(collectionId, spec.key);
}

async function main() {
  console.log("FIX CONTENT CREATION SCHEMA");
  console.log("Endpoint:", ENDPOINT);
  console.log("Project:", PROJECT_ID);
  console.log("Database:", DATABASE_ID);

  for (const [collectionId, specs] of Object.entries(schema)) {
    console.log("");
    console.log(`=== ${collectionId} ===`);

    for (const spec of specs) {
      await createAttribute(collectionId, spec);
    }
  }

  console.log("");
  console.log("DONE schema fixed");
}

main().catch((error) => {
  console.error("FAILED:");
  console.error(error.data || error.message || error);
  process.exit(1);
});
