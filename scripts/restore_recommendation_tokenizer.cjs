const fs = require("fs");

const path = "lib/appwrite.js";
let content = fs.readFileSync(path, "utf8");

const backup = `${path}.bak.restore_recommendation_tokenizer_${Date.now()}`;
fs.copyFileSync(path, backup);

const cleanBlock = String.raw`
const normalizeRecommendationText = (value) => {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/['’\u0060]/g, '')
    .replace(/[^a-zа-яіїєґё0-9\s-]/giu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const RECOMMENDATION_STOP_WORDS = new Set([
  'і', 'й', 'та', 'або', 'але', 'що', 'це', 'як', 'для', 'на', 'у', 'в', 'до',
  'з', 'із', 'за', 'про', 'при', 'від', 'над', 'під', 'між', 'через', 'без',
  'не', 'є', 'бути', 'було', 'були', 'може', 'можуть', 'який', 'яка', 'яке',
  'які', 'також', 'тому', 'наприклад', 'the', 'and', 'or', 'to', 'of', 'in',
  'on', 'for', 'with', 'is', 'are'
]);

const tokenizeRecommendationText = (value) => {
  const normalized = normalizeRecommendationText(value);

  return normalized
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)
    .filter((token) => !RECOMMENDATION_STOP_WORDS.has(token));
};

`;

const normalizeStart = content.indexOf("const normalizeRecommendationText =");
const buildStart = content.indexOf("const buildTextVector =");

if (buildStart === -1) {
  throw new Error("Cannot find buildTextVector marker");
}

if (normalizeStart !== -1 && normalizeStart < buildStart) {
  content = content.slice(0, normalizeStart) + cleanBlock + content.slice(buildStart);
} else {
  content = content.slice(0, buildStart) + cleanBlock + content.slice(buildStart);
}

fs.writeFileSync(path, content, "utf8");

console.log("DONE restored recommendation tokenizer");
console.log("Backup:", backup);
