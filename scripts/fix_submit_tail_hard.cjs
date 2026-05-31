const fs = require("fs");

const path = "lib/appwrite.js";
let content = fs.readFileSync(path, "utf8");

const backup = `${path}.bak.fix_submit_tail_hard_${Date.now()}`;
fs.copyFileSync(path, backup);

const submitMarker = "export const submitQuizAttempt = async ({";
const submitStart = content.indexOf(submitMarker);

if (submitStart === -1) {
  throw new Error("submitQuizAttempt not found");
}

const strayRegex = /\r?\n\s*=>\s*\{\s*\r?\n\s*if\s*\(!user\?\.\$id\s*\|\|\s*!user\?\.accountId\)/g;
strayRegex.lastIndex = submitStart;

const strayMatch = strayRegex.exec(content);

if (!strayMatch) {
  console.log("No broken tail found. File may already be fixed.");
  console.log("Backup:", backup);
  process.exit(0);
}

const strayStart = strayMatch.index;

const updateCourseMarker = "export const updateCourse = async";
const updateCourseStart = content.indexOf(updateCourseMarker, strayStart);

if (updateCourseStart === -1) {
  console.log("Could not find updateCourse marker. Printing debug around broken part:");
  console.log(content.slice(strayStart, strayStart + 1200));
  throw new Error("Cannot safely cut broken tail");
}

content =
  content.slice(0, strayStart) +
  "\n\n// -----------------------------\n// UPDATE LEARNING CONTENT\n// -----------------------------\n\n" +
  content.slice(updateCourseStart);

fs.writeFileSync(path, content, "utf8");

console.log("DONE hard fixed broken submitQuizAttempt tail");
console.log("Backup:", backup);
