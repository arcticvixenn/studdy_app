const endpoint = "http://localhost:8080/v1";
const projectId = "6a1ae727000328f56b72";
const apiKey = process.env.APPWRITE_API_KEY;
const databaseId = "studdy_db";

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
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  const exists =
    res.status === 409 ||
    data?.type === "index_invalid" ||
    String(data?.message || "").toLowerCase().includes("already");

  if (!res.ok && exists) {
    console.log("Already exists:", path);
    return data;
  }

  if (!res.ok) {
    console.error(data);
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

async function stringAttr(collectionId, key, size = 255, required = false) {
  await request("POST", `/databases/${databaseId}/collections/${collectionId}/attributes/string`, {
    key, size, required, array: false, encrypt: false,
  });
}

async function intAttr(collectionId, key, required = false, defaultValue = 0) {
  await request("POST", `/databases/${databaseId}/collections/${collectionId}/attributes/integer`, {
    key, required, array: false, default: defaultValue,
  });
}

async function boolAttr(collectionId, key, required = false, defaultValue = false) {
  await request("POST", `/databases/${databaseId}/collections/${collectionId}/attributes/boolean`, {
    key, required, array: false, default: defaultValue,
  });
}

async function waitAttrs(collectionId) {
  for (let i = 0; i < 60; i++) {
    const data = await request("GET", `/databases/${databaseId}/collections/${collectionId}/attributes`);
    const pending = (data.attributes || []).filter((a) => a.status !== "available");
    if (!pending.length) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
}

async function index(collectionId, key, attributes, type = "key") {
  await request("POST", `/databases/${databaseId}/collections/${collectionId}/indexes`, {
    key, type, attributes,
  });
}

async function main() {
  await createCollection("user_progress", "User Progress");
  await createCollection("xp_events", "XP Events");

  await stringAttr("user_progress", "userId", 128, true);
  await intAttr("user_progress", "xpTotal", false, 0);
  await intAttr("user_progress", "level", false, 1);
  await intAttr("user_progress", "streak", false, 0);
  await stringAttr("user_progress", "lastActiveDate", 32, false);
  await stringAttr("user_progress", "dailyQuestDate", 32, false);
  await boolAttr("user_progress", "dailyQuestCompleted", false, false);

  await stringAttr("xp_events", "userId", 128, true);
  await intAttr("xp_events", "points", false, 0);
  await stringAttr("xp_events", "source", 128, false);
  await stringAttr("xp_events", "sourceId", 128, false);
  await stringAttr("xp_events", "sourceType", 128, false);
  await stringAttr("xp_events", "reason", 512, false);
  await stringAttr("xp_events", "dateKey", 32, true);
  await stringAttr("xp_events", "topic", 128, false);

  await waitAttrs("user_progress");
  await waitAttrs("xp_events");

  await index("user_progress", "userId_idx", ["userId"]);
  await index("xp_events", "userId_idx", ["userId"]);
  await index("xp_events", "dateKey_idx", ["dateKey"]);
  await index("xp_events", "source_idx", ["source"]);
  await index("xp_events", "sourceId_idx", ["sourceId"]);

  console.log("DONE gamification setup");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


