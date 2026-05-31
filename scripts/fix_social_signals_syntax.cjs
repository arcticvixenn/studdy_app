const fs = require("fs");

const path = "lib/appwrite.js";
let content = fs.readFileSync(path, "utf8");

const backup = `${path}.bak.fix_social_signals_syntax_${Date.now()}`;
fs.copyFileSync(path, backup);

const startMarker = "const getUserSocialLearningSignals = async (userId) => {";
const endMarker = "const buildSafeRecommendationReason = ({";

const start = content.indexOf(startMarker);
const end = content.indexOf(endMarker, start);

if (start === -1) {
  throw new Error("getUserSocialLearningSignals not found");
}

if (end === -1) {
  throw new Error("buildSafeRecommendationReason marker not found");
}

const cleanFunction = `
const getUserSocialLearningSignals = async (userId) => {
  const emptySignals = {
    interactedPostIds: [],
    preferredCategories: [],
    preferredAuthors: [],
    interactionProfileText: '',
    totalSignals: 0,
  };

  if (!userId) {
    return emptySignals;
  }

  const safeList = async (collectionId) => {
    try {
      const result = await databases.listDocuments(
        databaseId,
        collectionId,
        [
          Query.equal('userId', userId),
          Query.limit(100),
        ]
      );

      return result.documents || [];
    } catch (error) {
      console.log('social signal load skipped:', collectionId, error?.message || error);
      return [];
    }
  };

  try {
    const [likes, saves, comments, views, searches] = await Promise.all([
      safeList(likesCollectionId),
      safeList(savesCollectionId),
      safeList(commentsCollectionId),
      safeList('view_events'),
      safeList('search_events'),
    ]);

    const interactedPostIds = new Set();
    const categoryScores = new Map();
    const authorScores = new Map();
    const textParts = [];

    const addCategory = (category, points = 1) => {
      if (!category) return;
      const key = String(category).trim();
      if (!key) return;
      categoryScores.set(key, (categoryScores.get(key) || 0) + points);
      textParts.push(key);
    };

    const addAuthor = (authorId, points = 1) => {
      if (!authorId) return;
      const key = String(authorId).trim();
      if (!key) return;
      authorScores.set(key, (authorScores.get(key) || 0) + points);
    };

    [...likes, ...saves, ...comments].forEach((item) => {
      if (item.postId) interactedPostIds.add(item.postId);
      addCategory(item.category || item.topic, 2);
      addAuthor(item.authorId || item.creatorId, 1);
      if (item.text) textParts.push(item.text);
    });

    views.forEach((item) => {
      if (item.postId) interactedPostIds.add(item.postId);
      if (item.sourceId && item.sourceType === 'post') interactedPostIds.add(item.sourceId);
      addCategory(item.category || item.topic, 1);
      if (item.title) textParts.push(item.title);
    });

    searches.forEach((item) => {
      addCategory(item.category || item.topic, 1);
      if (item.query) textParts.push(item.query);
    });

    const preferredCategories = Array.from(categoryScores.entries())
      .map(([category, score]) => ({ category, score }))
      .sort((a, b) => b.score - a.score);

    const preferredAuthors = Array.from(authorScores.entries())
      .map(([authorId, score]) => ({ authorId, score }))
      .sort((a, b) => b.score - a.score);

    return {
      interactedPostIds: Array.from(interactedPostIds),
      preferredCategories,
      preferredAuthors,
      interactionProfileText: textParts.join(' '),
      totalSignals:
        likes.length +
        saves.length +
        comments.length +
        views.length +
        searches.length,
    };
  } catch (error) {
    console.log('getUserSocialLearningSignals error:', error);
    return emptySignals;
  }
};

`;

content = content.slice(0, start) + cleanFunction + content.slice(end);

// прибираємо типові подвійні одинарні лапки, які зʼявились після hard clean
content = content.replace(/''([^'\\r\\n]+)''/g, "'$1'");

fs.writeFileSync(path, content, "utf8");

console.log("DONE fixed getUserSocialLearningSignals syntax");
console.log("Backup:", backup);
