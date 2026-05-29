const fs = require("fs");

const path = "lib/appwrite.js";
let content = fs.readFileSync(path, "utf8");

const startMarker = "const applySocialSignalsToRecommendations = (result, socialSignals) => {";
const endMarker = "export const getUserContentRecommendations = async (userId) => {";

const start = content.indexOf(startMarker);
const end = content.indexOf(endMarker);

if (start === -1 || end === -1 || end <= start) {
  throw new Error("Cannot find applySocialSignalsToRecommendations block.");
}

const newBlock = `const applySocialSignalsToRecommendations = (result, socialSignals) => {
  if (!result?.recommendations?.length) {
    return {
      ...result,
      socialSignals,
      modelType: result?.modelType || 'Studdy ML recommendations',
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

  const getItemId = (item) =>
    item.id ||
    item.$id ||
    item.contentId ||
    item.postId ||
    item.lessonId ||
    item.courseId ||
    null;

  const getItemType = (item) =>
    item.type ||
    item.recommendationType ||
    item.contentType ||
    item.entityType ||
    'material';

  const getItemCategory = (item) =>
    item.category ||
    item.matchedTopic ||
    item.topic ||
    item.mainTopic ||
    null;

  const getItemAuthor = (item) =>
    item.authorId ||
    item.creatorId ||
    item.userId ||
    null;

  const normalized = result.recommendations.map((item) => {
    const id = getItemId(item);
    const type = getItemType(item);
    const category = getItemCategory(item);
    const authorId = getItemAuthor(item);

    const isExactInteractedPost =
      type === 'post' && id && interactedPostIds.has(id);

    let boost = 0;
    const reasons = [];

    if (category && preferredCategories.has(category)) {
      boost += Math.min(18, preferredCategories.get(category));
      reasons.push(\`схожа категорія: "\${category}"\`);
    }

    if (authorId && preferredAuthors.has(authorId)) {
      boost += Math.min(10, preferredAuthors.get(authorId));
      reasons.push('схожий автор або джерело');
    }

    if (isExactInteractedPost) {
      boost -= 100;
      reasons.push('цей матеріал уже був у твоїх взаємодіях, тому Studdy не просуває його повторно');
    }

    const baseScore = Number(
      item.score ||
      item.recommendationScore ||
      item.priorityScore ||
      50
    );

    const nextScore = Math.max(0, Math.min(100, Math.round(baseScore + boost)));

    const socialReason =
      reasons.length && !isExactInteractedPost
        ? \` Додатково враховано: \${reasons.join(', ')}.\`
        : '';

    return {
      ...item,
      id,
      type,
      category,
      authorId,
      score: nextScore,
      recommendationScore: nextScore,
      isExactInteractedPost,
      reason:
        item.reason ||
        item.explanation
          ? \`\${item.reason || item.explanation}\${socialReason}\`
          : \`Рекомендовано Studdy ML.\${socialReason}\`,
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

    if (categoryCount >= 3 || typeCount >= 6) {
      continue;
    }

    diversified.push(item);
    categoryLimits.set(category, categoryCount + 1);
    typeLimits.set(type, typeCount + 1);
  }

  const finalRecommendations = diversified.length
    ? diversified
    : filtered.length
    ? filtered
    : normalized.sort((a, b) => Number(b.score || 0) - Number(a.score || 0));

  return {
    ...result,
    recommendations: finalRecommendations,
    socialSignals,
    recommendationPolicy:
      'similar_content_without_recommending_exact_interacted_posts',
    modelType: result.modelType
      ? \`\${result.modelType} + social similarity + diversity filter\`
      : 'Studdy ML + social similarity + diversity filter',
  };
};

`;

content = content.slice(0, start) + newBlock + content.slice(end);

fs.writeFileSync(path, content, "utf8");

console.log("Recommendation model fixed: exact interacted posts are excluded, similar content is boosted.");
