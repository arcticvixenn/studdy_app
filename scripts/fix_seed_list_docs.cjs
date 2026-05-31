const fs = require("fs");

const path = "scripts/seed_quality_learning_content.cjs";
let content = fs.readFileSync(path, "utf8");

const oldBlock = `async function listDocs(collectionId) {
  const q = encodeURIComponent("limit(200)");
  const data = await request(
    "GET",
    \`/databases/\${databaseId}/collections/\${collectionId}/documents?queries[]=\${q}\`
  );

  return data?.documents || [];
}`;

const newBlock = `async function listDocs(collectionId) {
  const data = await request(
    "GET",
    \`/databases/\${databaseId}/collections/\${collectionId}/documents\`
  );

  return data?.documents || [];
}`;

if (!content.includes(oldBlock)) {
  throw new Error("listDocs block not found");
}

content = content.replace(oldBlock, newBlock);

fs.writeFileSync(path, content, "utf8");

console.log("Fixed listDocs query syntax.");
