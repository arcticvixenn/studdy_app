const fs = require("fs");

const path = "lib/appwrite.js";
let content = fs.readFileSync(path, "utf8");

// 1) Track like/unlike as ML behavior event
if (!content.includes("source: isLiked ? 'post_unlike' : 'post_like'")) {
  content = content.replace(
    "    return await getPostLikeState(postId, user.$id);",
    `    await createViewEvent({
      userId: user.$id,
      permissionUserId: user.accountId,
      contentId: postId,
      contentType: 'post',
      duration: 0,
      source: isLiked ? 'post_unlike' : 'post_like',
    });

    return await getPostLikeState(postId, user.$id);`
  );
}

// 2) Track save/unsave as ML behavior event
if (!content.includes("source: isSaved ? 'post_unsave' : 'post_save'")) {
  content = content.replace(
    "    return await getPostSaveState(postId, user.$id);",
    `    await createViewEvent({
      userId: user.$id,
      permissionUserId: user.accountId,
      contentId: postId,
      contentType: 'post',
      duration: 0,
      source: isSaved ? 'post_unsave' : 'post_save',
    });

    return await getPostSaveState(postId, user.$id);`
  );
}

// 3) Replace createComment with version that also writes ML behavior event
const newCreateComment = `export const createComment = async ({ postId, text, user }) => {
  if (!user?.$id) {
    throw new Error('Не вдалося визначити користувача.');
  }

  const createdComment = await databases.createDocument(
    databaseId,
    commentsCollectionId,
    ID.unique(),
    {
      postId,
      authorId: user.$id,
      authorName: user.username || 'Користувач Studdy',
      authorAvatar: user.avatar || null,
      text: text.trim(),
      likesCount: 0,
    },
    user.accountId
      ? [Permission.delete(Role.user(user.accountId))]
      : undefined
  );

  await createViewEvent({
    userId: user.$id,
    permissionUserId: user.accountId,
    contentId: postId,
    contentType: 'post',
    duration: 0,
    source: 'post_comment',
  });

  return createdComment;
};`;

content = content.replace(
  /export const createComment = async \(\{ postId, text, user \}\) => \{[\s\S]*?\n\};\n\n\/\/ SAVES/,
  `${newCreateComment}\n\n// SAVES`
);

// 4) Add social-signal helpers before getUserContentRecommendations
const helpersMarker = "const getUserSocialLearningSignals = async (userId) =>";
if (!content.includes(helpersMarker)) {
  const helpers = `
const getUserSocialLearningSignals = async (userId) => {
  if (!userId) {
    return {
      interactedPostIds: [],
      preferredCategories: [],
      preferredAuthors: [],
      totalSignals: 0,
    };
  }

  try {
    const [likes, saves, comments] = await Promise.all([
      databases.listDocuments(databaseId, likesCollectionId, [
        Query.equal('userId', userId),
        Query.limit(100),
      ]),
      databases.listDocuments(databaseId, savesCollectionId, [
        Query.equal('userId', userId),
        Query.limit(100),
      ]),
      databases.listDocuments(databaseId, commentsCollectionId, [
        Query.equal('authorId', userId),
        Query.limit(100),
      ]),
    ]);

    const weightedPostIds = new Map();

    const addSignal = (postId, weight) => {
      if (!postId) return;
      weightedPostIds.set(postId, (weightedPostIds.get(postId) || 0) + weight);
    };

    likes.documents.forEach((item) => addSignal(item.postId, 3));
    saves.documents.forEach((item) => addSignal(item.postId, 5));
    comments.documents.forEach((item) => addSignal(item.postId, 4));

    const interactedPostIds = [...weightedPostIds.keys()];

    const interactedPosts = await Promise.all(
      interactedPostIds.map(async (postId) => {
        try {
          return await getPostById(postId);
        } catch {
          return null;
        }
      })
    );

    const categoryScores = new Map();
    const authorScores = new Map();

    interactedPosts.filter(Boolean).forEach((post) => {
      const weight = weightedPostIds.get(post.$id) || 1;

      if (post.category) {
        categoryScores.set(
          post.category,
          (categoryScores.get(post.category) || 0) + weight
        );
      }

      if (post.authorId) {
        authorScores.set(
          post.authorId,
          (authorScores.get(post.authorId) || 0) + weight
        );
      }
    });

    return {
      interactedPostIds,
      preferredCategories: [...categoryScores.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([category, score]) => ({ category, score })),
      preferredAuthors: [...authorScores.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([authorId, score]) => ({ authorId, score })),
      totalSignals:
        likes.documents.length + saves.documents.length + comments.documents.length,
    };
  } catch (error) {
    console.log('getUserSocialLearningSignals error:', error);

    return {
      interactedPostIds: [],
      preferredCategories: [],
      preferredAuthors: [],
      totalSignals: 0,
    };
  }
};

const applySocialSignalsToRecommendations = (result, socialSignals) => {
  if (!result?.recommendations?.length || !socialSignals?.totalSignals) {
    return {
      ...result,
      socialSignals,
    };
  }

  const interactedPostIds = new Set(socialSignals.interactedPostIds || []);
  const preferredCategories = new Map(
    (socialSignals.preferredCategories || []).map((item) => [
      item.category,
      item.score,
    ])
  );
  const preferredAuthors = new Map(
    (socialSignals.preferredAuthors || []).map((item) => [
      item.authorId,
      item.score,
    ])
  );

  const recommendations = result.recommendations
    .map((item) => {
      let boost = 0;
      const reasons = [];

      if (item.type === 'post' && interactedPostIds.has(item.id)) {
        boost += 8;
        reasons.push('ти вже взаємодіяв з подібним матеріалом');
      }

      if (item.category && preferredCategories.has(item.category)) {
        boost += Math.min(12, preferredCategories.get(item.category));
        reasons.push(\`категорія "\${item.category}" часто зустрічається у твоїх діях\`);
      }

      if (item.authorId && preferredAuthors.has(item.authorId)) {
        boost += Math.min(8, preferredAuthors.get(item.authorId));
        reasons.push('автор схожий на тих, чиї матеріали ти лайкав або коментував');
      }

      const nextScore = Math.min(100, Math.round(Number(item.score || 0) + boost));

      return {
        ...item,
        score: nextScore,
        reason:
          boost > 0
            ? \`\${item.reason || 'Рекомендовано Studdy ML.'} Додатково враховано: \${reasons.join(', ')}.\`
            : item.reason,
      };
    })
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0));

  return {
    ...result,
    recommendations,
    socialSignals,
    modelType: result.modelType
      ? \`\${result.modelType} + social interactions\`
      : 'Studdy ML + social interactions',
  };
};

`;

  content = content.replace(
    "export const getUserContentRecommendations = async (userId) => {",
    `${helpers}\nexport const getUserContentRecommendations = async (userId) => {`
  );
}

// 5) Patch getUserContentRecommendations to use social signals
if (!content.includes("const socialSignals = await getUserSocialLearningSignals(userId);")) {
  content = content.replace(
    "  const answers = await getUserQuizAnswers(userId);",
    "  const answers = await getUserQuizAnswers(userId);\n  const socialSignals = await getUserSocialLearningSignals(userId);"
  );

  content = content.replace(
    /  return buildContentRecommendationModel\(\{\s*[\s\S]*?masteryTopics: mastery\.topics \|\| \[\],\s*\}\);\s*\n\};/,
    `  const baseRecommendations = buildContentRecommendationModel({
    courses,
    lessons,
    posts,
    mlRecommendations: mlLearning.recommendations || [],
    masteryTopics: mastery.topics || [],
  });

  return applySocialSignalsToRecommendations(baseRecommendations, socialSignals);
};`
  );
}

fs.writeFileSync(path, content, "utf8");

console.log("ML social interactions patch applied.");
