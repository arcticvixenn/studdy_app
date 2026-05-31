const fs = require("fs");

const path = "lib/appwrite.js";
let content = fs.readFileSync(path, "utf8");

const backup = `${path}.bak.core_stability_${Date.now()}`;
fs.copyFileSync(path, backup);

function replaceFunction(source, marker, replacement) {
  const start = source.indexOf(marker);
  if (start === -1) {
    console.log("SKIP, not found:", marker);
    return source;
  }

  const braceStart = source.indexOf("{", start);
  let depth = 0;

  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}") depth--;

    if (depth === 0) {
      return source.slice(0, start) + replacement + source.slice(i + 2);
    }
  }

  throw new Error("Cannot replace function: " + marker);
}

// 1) Кирилиця в пошуку/рекомендаціях: не вирізати українські символи
content = content
  .replace(/\/\[\^a-z0-9\\s\]\+\/g/g, "/[^a-zа-яіїєґё0-9\\s]+/giu")
  .replace(/\/\[\^a-z0-9\\s\]\+\/gi/g, "/[^a-zа-яіїєґё0-9\\s]+/giu")
  .replace(/\/\[a-z0-9\]\+\/g/g, "/[a-zа-яіїєґё0-9]+/giu")
  .replace(/\/\[a-z0-9\]\+\/gi/g, "/[a-zа-яіїєґё0-9]+/giu");

// 2) Рівні зробити значно складнішими
content = replaceFunction(
  content,
  "export const getXpNeededForLevel = (level) => {",
  `export const getXpNeededForLevel = (level) => {
  const safeLevel = Math.max(Number(level) || 1, 1);

  // Складність росте нелінійно:
  // 1 рівень ≈ 300 XP, далі все важче.
  return Math.round(
    300 +
    (safeLevel - 1) * 220 +
    Math.pow(safeLevel - 1, 1.7) * 140
  );
};

`
);

// 3) Автозарахування квесту: додати лог і стабільну перевірку
content = replaceFunction(
  content,
  "export const completeDailyQuestIfMatches = async (userId, actionId) => {",
  `export const completeDailyQuestIfMatches = async (userId, actionId) => {
  if (!userId || !actionId) return null;

  try {
    const quest = await getDailyQuest(userId);

    console.log('DAILY QUEST CHECK:', {
      userId,
      actionId,
      questId: quest?.id,
      completed: quest?.completed,
    });

    if (!quest || quest.completed || quest.id !== actionId) {
      return {
        matched: false,
        quest,
      };
    }

    const result = await completeDailyQuest(userId);

    console.log('DAILY QUEST COMPLETED:', {
      actionId,
      questId: quest.id,
      reward: quest.reward,
    });

    return {
      matched: true,
      ...result,
    };
  } catch (error) {
    console.log('completeDailyQuestIfMatches error:', error);
    return null;
  }
};

`
);

fs.writeFileSync(path, content, "utf8");

console.log("DONE core stability patch");
console.log("Backup:", backup);
