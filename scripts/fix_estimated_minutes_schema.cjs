const ENDPOINT = process.env.APPWRITE_ENDPOINT || "http://localhost:8080/v1";
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || "6a1ae727000328f56b72";
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "studdy_db";
const API_KEY = process.env.APPWRITE_API_KEY;

if (!API_KEY) {
  console.error("APPWRITE_API_KEY is missing. Set it first in this PowerShell.");
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  "X-Appwrite-Project": PROJECT_ID,
  "X-Appwrite-Key": API_KEY,
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
    const message = data?.message || String(data || response.statusText);
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

async function waitAttribute(collectionId, key) {
  for (let i = 0; i < 40; i += 1) {
    const attrs = await getAttributes(collectionId);
    const attr = attrs.find((item) => item.key === key);

    if (attr?.status === "available") {
      console.log(`AVAILABLE ${collectionId}.${key}`);
      return;
    }

    if (attr?.status === "failed") {
      throw new Error(`FAILED ${collectionId}.${key}`);
    }

    await sleep(1000);
  }

  console.log(`WAIT TIMEOUT ${collectionId}.${key}`);
}

async function addIntegerAttribute(collectionId, key) {
  const attrs = await getAttributes(collectionId);
  const existing = attrs.find((item) => item.key === key);

  if (existing) {
    console.log(`EXISTS ${collectionId}.${key} (${existing.status})`);

    if (existing.status !== "available") {
      await waitAttribute(collectionId, key);
    }

    return;
  }

  try {
    await request(
      "POST",
      `/databases/${DATABASE_ID}/collections/${collectionId}/attributes/integer`,
      {
        key,
        required: false,
        min: 0,
        max: 100000,
        array: false,
      }
    );

    console.log(`CREATED ${collectionId}.${key}`);
    await waitAttribute(collectionId, key);
  } catch (error) {
    const msg = String(error.message || "");

    if (
      error.status === 409 ||
      msg.includes("already exists") ||
      msg.includes("same attributes")
    ) {
      console.log(`ALREADY EXISTS ${collectionId}.${key}`);
      await waitAttribute(collectionId, key);
      return;
    }

    throw error;
  }
}

async function main() {
  console.log("FIX estimatedMinutes schema");

  const collections = ["lessons", "courses", "quizzes"];

  for (const collectionId of collections) {
    await addIntegerAttribute(collectionId, "estimatedMinutes");
  }

  console.log("DONE estimatedMinutes fixed");
}

main().catch((error) => {
  console.error("FAILED:");
  console.error(error.data || error.message || error);
  process.exit(1);
});
