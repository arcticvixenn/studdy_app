const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const libDir = path.join(process.cwd(), "lib");
const currentPath = path.join(libDir, "appwrite.js");

const brokenCopy = path.join(libDir, `appwrite.js.BROKEN_CURRENT_${Date.now()}.js`);
fs.copyFileSync(currentPath, brokenCopy);
console.log("Saved broken current file:", brokenCopy);

const requiredSnippets = [
  "export const createUser",
  "export const signIn",
  "export const signOut",
  "export const createPost",
  "export const getVideoPosts",
  "export const getUserPosts",
  "export const getSavedPosts",
  "export const getFollowersCount",
  "export const getFollowingCount",
  "export const getOrCreateUserProgress",
  "export const getDailyQuest",
  "export const getUserActivityCalendar",
  "export const getSmartLearningAdvice",
  "export const uploadUserAvatar",
  "export const submitQuizAttempt",
];

const backups = fs
  .readdirSync(libDir)
  .filter((name) =>
    name.startsWith("appwrite.js.bak") &&
    !name.includes("BROKEN")
  )
  .map((name) => {
    const full = path.join(libDir, name);
    const content = fs.readFileSync(full, "utf8");

    const checkPath = path.join(libDir, "__tmp_appwrite_check.js");
    fs.writeFileSync(checkPath, content, "utf8");

    const check = spawnSync(process.execPath, ["--check", checkPath], {
      encoding: "utf8",
    });

    fs.unlinkSync(checkPath);

    const syntaxOk = check.status === 0;
    const score = requiredSnippets.filter((s) => content.includes(s)).length;

    return {
      name,
      full,
      mtimeMs: fs.statSync(full).mtimeMs,
      syntaxOk,
      score,
      missing: requiredSnippets.filter((s) => !content.includes(s)),
      error: check.stderr || check.stdout || "",
    };
  })
  .sort((a, b) => {
    if (a.syntaxOk !== b.syntaxOk) return a.syntaxOk ? -1 : 1;
    if (a.score !== b.score) return b.score - a.score;
    return b.mtimeMs - a.mtimeMs;
  });

console.log("\nBackup candidates:");
backups.slice(0, 10).forEach((b) => {
  console.log(`${b.syntaxOk ? "OK " : "BAD"} score=${b.score}/${requiredSnippets.length} ${b.name}`);
});

const best = backups.find((b) => b.syntaxOk);

if (!best) {
  console.log("\nNO VALID BACKUP FOUND.");
  process.exit(2);
}

fs.copyFileSync(best.full, currentPath);

console.log("\nRESTORED:");
console.log(best.name);
console.log(`score=${best.score}/${requiredSnippets.length}`);

if (best.missing.length) {
  console.log("\nMissing exports in restored file:");
  best.missing.forEach((m) => console.log(" -", m));
}

const finalCheck = spawnSync(process.execPath, ["--check", currentPath], {
  encoding: "utf8",
});

if (finalCheck.status !== 0) {
  console.log("\nRESTORE FAILED:");
  console.log(finalCheck.stderr || finalCheck.stdout);
  process.exit(3);
}

console.log("\nSYNTAX OK");
