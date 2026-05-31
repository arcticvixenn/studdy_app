const fs = require("fs");

function backup(path) {
  fs.copyFileSync(path, `${path}.bak.ukrainian_nlp_${Date.now()}`);
}

const stopWords = String.raw`[
  'і', 'й', 'та', 'або', 'але', 'що', 'це', 'як', 'для', 'на', 'у', 'в', 'до',
  'з', 'із', 'за', 'про', 'при', 'від', 'над', 'під', 'між', 'через', 'без',
  'не', 'є', 'бути', 'було', 'були', 'може', 'можуть', 'який', 'яка', 'яке',
  'які', 'також', 'тому', 'наприклад', 'цей', 'ця', 'це', 'ці', 'його', 'її',
  'the', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'with', 'is', 'are'
]`;

function replaceBlockBefore(content, startMarker, endMarker, newBlock) {
  const start = content.indexOf(startMarker);
  const end = content.indexOf(endMarker, start);

  if (start === -1 || end === -1 || end <= start) {
    console.log("SKIP block:", startMarker);
    return content;
  }

  return content.slice(0, start) + newBlock + "\n" + content.slice(end);
}

function replaceFunction(content, marker, replacement) {
  const start = content.indexOf(marker);

  if (start === -1) {
    console.log("SKIP function:", marker);
    return content;
  }

  const braceStart = content.indexOf("{", start);
  let depth = 0;

  for (let i = braceStart; i < content.length; i++) {
    if (content[i] === "{") depth++;
    if (content[i] === "}") depth--;

    if (depth === 0) {
      return content.slice(0, start) + replacement + content.slice(i + 2);
    }
  }

  console.log("FAILED function:", marker);
  return content;
}

function patchAppwrite() {
  const path = "lib/appwrite.js";
  let content = fs.readFileSync(path, "utf8");
  backup(path);

  const recommendationBlock = String.raw`
const normalizeRecommendationText = (value) => {
  return String(value || '')
    .toLocaleLowerCase('uk-UA')
    .normalize('NFKC')
    .replace(/['’\u0060]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const RECOMMENDATION_STOP_WORDS = new Set(${stopWords});

const tokenizeRecommendationText = (value) => {
  const normalized = normalizeRecommendationText(value);

  return normalized
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .filter((token) => !RECOMMENDATION_STOP_WORDS.has(token));
};

`;

  content = replaceBlockBefore(
    content,
    "const normalizeRecommendationText =",
    "const buildTextVector =",
    recommendationBlock
  );

  const searchBlock = String.raw`
const SEARCH_NLP_STOP_WORDS = new Set(${stopWords});

const searchNormalizeText = (value) => {
  return String(value || '')
    .toLocaleLowerCase('uk-UA')
    .normalize('NFKC')
    .replace(/['’\u0060]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const searchTokenizeText = (value) => {
  const normalized = searchNormalizeText(value);

  const baseTokens = normalized
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .filter((token) => !SEARCH_NLP_STOP_WORDS.has(token));

  const tokens = [...baseTokens];

  for (let index = 0; index < baseTokens.length - 1; index += 1) {
    tokens.push(baseTokens[index] + ' ' + baseTokens[index + 1]);
  }

  return tokens;
};

`;

  content = replaceBlockBefore(
    content,
    "const SEARCH_NLP_STOP_WORDS =",
    "const searchBuildVector =",
    searchBlock
  );

  content = content
    .replace(/NLP-[^`'"]*текст[^`'"]*/g, "NLP-схожість тексту")
    .replace(/Р[^`'"]*Studdy ML\./g, "Рекомендовано Studdy ML.");

  fs.writeFileSync(path, content, "utf8");
  console.log("DONE appwrite Ukrainian NLP");
}

function patchMlModel() {
  const path = "lib/mlModel.js";

  if (!fs.existsSync(path)) {
    console.log("SKIP lib/mlModel.js not found");
    return;
  }

  let content = fs.readFileSync(path, "utf8");
  backup(path);

  const normalizeTextFn = String.raw`
const normalizeText = (value) => {
  return String(value || '')
    .toLocaleLowerCase('uk-UA')
    .normalize('NFKC')
    .replace(/['’\u0060]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

`;

  const tokenizeTextFn = String.raw`
const TOKEN_STOP_WORDS = new Set(${stopWords});

const tokenizeText = (value) => {
  return normalizeText(value)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .filter((token) => !TOKEN_STOP_WORDS.has(token));
};

`;

  if (content.includes("const normalizeText =")) {
    content = replaceFunction(content, "const normalizeText =", normalizeTextFn);
  } else {
    content = normalizeTextFn + "\n" + content;
  }

  if (content.includes("const tokenizeText =")) {
    content = replaceFunction(content, "const tokenizeText =", tokenizeTextFn);
  } else {
    const insertAfter = content.indexOf("const normalizeText =");
    const afterFn = content.indexOf("};", insertAfter);

    if (afterFn !== -1) {
      content = content.slice(0, afterFn + 2) + "\n\n" + tokenizeTextFn + content.slice(afterFn + 2);
    } else {
      content = tokenizeTextFn + "\n" + content;
    }
  }

  content = content
    .replace(/\/\[\^a-z0-9\\s-\]\/gi/g, "/[^\\p{L}\\p{N}\\s-]/gu")
    .replace(/\/\[\^a-z0-9\\s\]\/gi/g, "/[^\\p{L}\\p{N}\\s]/gu")
    .replace(/\/\[a-z0-9\]\+\/gi/g, "/[\\p{L}\\p{N}]+/gu");

  fs.writeFileSync(path, content, "utf8");
  console.log("DONE mlModel Ukrainian NLP");
}

patchAppwrite();
patchMlModel();

console.log("DONE Ukrainian NLP full patch");
