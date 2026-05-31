const endpoint = "http://localhost:8080/v1";
const projectId = "6a1ae727000328f56b72";
const databaseId = "studdy_db";
const apiKey = process.env.APPWRITE_API_KEY;

const headers = {
  "X-Appwrite-Project": projectId,
  "X-Appwrite-Key": apiKey,
};

async function show(collectionId) {
  const res = await fetch(`${endpoint}/databases/${databaseId}/collections/${collectionId}/attributes`, { headers });
  const data = await res.json();

  const found = (data.attributes || []).filter((a) =>
    ["attemptId", "passed", "score", "selectedAnswer", "correctAnswer"].includes(a.key)
  );

  console.log(`\n${collectionId}`);
  found.forEach((a) => console.log(`${a.key}: ${a.status}`));
}

async function main() {
  await show("quiz_attempts");
  await show("answers");
  await show("quiz_answers");
}

main().catch(console.error);
