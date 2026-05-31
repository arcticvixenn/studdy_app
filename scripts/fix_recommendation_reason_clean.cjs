const fs = require("fs");

const path = "lib/appwrite.js";
let content = fs.readFileSync(path, "utf8");

const backup = `${path}.bak.fix_recommendation_reason_${Date.now()}`;
fs.copyFileSync(path, backup);

function replaceFunction(source, marker, replacement) {
  const start = source.indexOf(marker);

  if (start === -1) {
    throw new Error("Marker not found: " + marker);
  }

  const braceStart = source.indexOf("{", start);
  let depth = 0;

  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}") depth--;

    if (depth === 0) {
      let end = i + 1;
      while (end < source.length && /\s/.test(source[end])) end++;
      if (source[end] === ";") end += 1;

      return source.slice(0, start) + replacement + source.slice(end);
    }
  }

  throw new Error("Cannot replace function: " + marker);
}

const cleanBlock = String.raw`
const hasBrokenEncoding = (value) => {
  return /Р[’ЎЋџВ°-я]|С[–—”ЃЏѓ]|вЂ|в„|рџ|тА|╬/.test(String(value || ''));
};

const buildSafeRecommendationReason = ({
  item,
  category,
  textSimilarity,
  categoryBoost,
  authorBoost,
}) => {
  const topic =
    category ||
    item?.topic ||
    item?.matchedTopic ||
    item?.title ||
    item?.name ||
    'навчання';

  const parts = [
    'Матеріал допоможе підсилити тему: ' + topic + '.',
  ];

  if (textSimilarity >= 0.12) {
    parts.push('Враховано NLP-схожість тексту: ' + Math.round(textSimilarity * 100) + '%.');
  }

  if (categoryBoost > 0) {
    parts.push('Категорія збігається з твоїми інтересами.');
  }

  if (authorBoost > 0) {
    parts.push('Враховано попередню взаємодію з автором або джерелом.');
  }

  return parts.join(' ');
};

const applySocialSignalsToRecommendations = (result, socialSignals) => {
  const safeModelType =
    'Гібридна рекомендаційна модель Studdy: контент + NLP-схожість + фільтр різноманітності';

  if (!result?.recommendations?.length) {
    return {
      ...result,
      recommendations: [],
      socialSignals,
      recommendationPolicy: 'ukrainian_nlp_text_similarity',
      modelType: safeModelType,
    };
  }

  const interactedPostIds = new Set(socialSignals?.interactedPostIds || []);

  const preferredCategories = new Map(
    (socialSignals?.preferredCategories || []).map((item) => [
      item.category,
      Number(item.score || 0),
    ])
  );

  const preferredAuthors = new Map(
    (socialSignals?.preferredAuthors || []).map((item) => [
      item.authorId,
      Number(item.score || 0),
    ])
  );

  const interactionProfileText = socialSignals?.interactionProfileText || '';

  const normalized = result.recommendations.map((item) => {
    const id = getRecommendationId(item);
    const type = getRecommendationType(item);
    const itemText = getRecommendationText(item);
    const category = item.category || item.matchedTopic || item.topic || null;
    const authorId = item.authorId || item.creatorId || item.userId || null;

    const isExactInteractedPost =
      type === 'post' && id && interactedPostIds.has(id);

    const textSimilarity = cosineTextSimilarity(interactionProfileText, itemText);
    const textSimilarityBoost = Math.round(textSimilarity * 35);

    let categoryBoost = 0;
    let authorBoost = 0;

    if (category && preferredCategories.has(category)) {
      categoryBoost = Math.min(12, preferredCategories.get(category));
    }

    if (authorId && preferredAuthors.has(authorId)) {
      authorBoost = Math.min(8, preferredAuthors.get(authorId));
    }

    const baseScore = Number(
      item.score ||
      item.recommendationScore ||
      item.priorityScore ||
      50
    );

    const nextScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(baseScore + textSimilarityBoost + categoryBoost + authorBoost)
      )
    );

    return {
      ...item,
      id,
      type,
      category,
      authorId,
      score: nextScore,
      recommendationScore: nextScore,
      textSimilarity: Number(textSimilarity.toFixed(4)),
      isExactInteractedPost,
      reason: buildSafeRecommendationReason({
        item,
        category,
        textSimilarity,
        categoryBoost,
        authorBoost,
      }),
    };
  });

  const filtered = normalized
    .filter((item) => !item.isExactInteractedPost)
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0));

  const categoryLimits = new Map();
  const typeLimits = new Map();
  const diversified = [];

  for (const item of filtered) {
    const category = item.category || 'general';
    const type = item.type || 'material';

    const categoryCount = categoryLimits.get(category) || 0;
    const typeCount = typeLimits.get(type) || 0;

    if (categoryCount >= 3 || typeCount >= 5) {
      continue;
    }

    diversified.push(item);
    categoryLimits.set(category, categoryCount + 1);
    typeLimits.set(type, typeCount + 1);

    if (diversified.length >= 10) break;
  }

  return {
    ...result,
    recommendations: diversified.length ? diversified : filtered.slice(0, 10),
    socialSignals,
    recommendationPolicy: 'ukrainian_nlp_text_similarity_without_exact_repeats',
    modelType: safeModelType,
  };
};
`;

content = replaceFunction(
  content,
  "const applySocialSignalsToRecommendations = (result, socialSignals) => {",
  cleanBlock
);

// прибрати сиротські хвости після попередніх патчів
content = content.replace(/\n\s*=>\s*\{[\s\S]*?\n\s*\};/g, "\n");

// прибрати явні старі англійські/биті підписи, якщо десь лишились
content = content
  .replace(/Hybrid Content recommendation \+ NLP text similarity \+ diversity filter/g, "Гібридна рекомендаційна модель Studdy")
  .replace(/NLP text similarity/g, "NLP-схожість тексту")
  .replace(/NLP-Р[^`'"]+/g, "NLP-схожість тексту");

fs.writeFileSync(path, content, "utf8");

console.log("DONE fixed recommendation reasons");
console.log("Backup:", backup);
