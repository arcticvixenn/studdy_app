const fs = require("fs");

const path = "lib/appwrite.js";
let content = fs.readFileSync(path, "utf8");

const backup = `${path}.bak.remove_broken_submit_tail_${Date.now()}`;
fs.copyFileSync(path, backup);

const strayMatch = content.match(/\r?\n\s*=>\s*\{\s*\r?\n\s*if \(!user\?\.\$id \|\| !user\?\.accountId\)/);

if (!strayMatch) {
  console.log("Broken tail not found. Maybe already fixed.");
  console.log("Backup:", backup);
  process.exit(0);
}

const strayStart = strayMatch.index;
const nextMarker = content.indexOf("// -----------------------------\n// UPDATE LEARNING CONTENT", strayStart);

if (nextMarker === -1) {
  throw new Error("Cannot find UPDATE LEARNING CONTENT marker");
}

content = content.slice(0, strayStart) + "\n\n" + content.slice(nextMarker);

fs.writeFileSync(path, content, "utf8");

console.log("DONE removed broken submitQuizAttempt tail");
console.log("Backup:", backup);
