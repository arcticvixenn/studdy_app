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

  console.log(method, path);
  console.log("STATUS:", res.status);
  console.log(data);

  return { res, data };
}

async function main() {
  console.log("CHECK BEFORE:");
  await request(
    "GET",
    `/databases/${databaseId}/collections/quiz_attempts/attributes`
  );

  console.log("CREATE difficulty:");
  await request(
    "POST",
    `/databases/${databaseId}/collections/quiz_attempts/attributes/integer`,
    {
      key: "difficulty",
      required: false,
      array: false,
      min: 0,
      max: 10,
      default: 1,
    }
  );

  console.log("WAIT:");
  for (let i = 0; i < 60; i++) {
    const { data } = await request(
      "GET",
      `/databases/${databaseId}/collections/quiz_attempts/attributes`
    );

    const attr = (data.attributes || []).find((a) => a.key === "difficulty");

    if (attr?.status === "available") {
      console.log("DONE: quiz_attempts.difficulty available");
      return;
    }

    console.log("difficulty status:", attr?.status || "missing");
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("FAILED: difficulty still not available");
}

main().catch(console.error);
