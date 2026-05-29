const fs = require("fs");

const path = "lib/appwrite.js";
let content = fs.readFileSync(path, "utf8");

const startMarker = "export const getUserContentRecommendations = async (userId) => {";
const start = content.indexOf(startMarker);

if (start === -1) {
  throw new Error("getUserContentRecommendations not found");
}

const endMarker = "\n};";
const afterStart = content.slice(start);
const end = start + afterStart.indexOf(endMarker) + endMarker.length;

let fn = content.slice(start, end);

if (!fn.includes("const socialSignals = await getUserSocialLearningSignals(userId);")) {
  fn = fn.replace(
    "  const answers = await getUserQuizAnswers(userId);",
    "  const answers = await getUserQuizAnswers(userId);\n  const socialSignals = await getUserSocialLearningSignals(userId);"
  );
}

content = content.slice(0, start) + fn + content.slice(end);

fs.writeFileSync(path, content, "utf8");

console.log("Fixed socialSignals inside getUserContentRecommendations.");
