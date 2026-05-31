const endpoint = "http://localhost:8080/v1";
const projectId = "6a1ae727000328f56b72";
const databaseId = "studdy_db";
const apiKey = process.env.APPWRITE_API_KEY;

const headers = {
  "X-Appwrite-Project": projectId,
  "X-Appwrite-Key": apiKey,
};

async function main() {
  const res = await fetch(`${endpoint}/databases/${databaseId}/collections`, {
    headers,
  });

  const data = await res.json();

  console.log("COLLECTIONS:");
  for (const c of data.collections || []) {
    console.log(`${c.$id} | ${c.name}`);
  }
}

main().catch(console.error);
