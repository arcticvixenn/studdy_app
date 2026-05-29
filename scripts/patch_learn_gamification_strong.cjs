const fs = require("fs");

const appwritePath = "lib/appwrite.js";
const learnPath = "app/(tabs)/learn.jsx";

const stamp = Date.now();

fs.copyFileSync(appwritePath, `${appwritePath}.bak.${stamp}`);
fs.copyFileSync(learnPath, `${learnPath}.bak.${stamp}`);

let appwrite = fs.readFileSync(appwritePath, "utf8");
let learn = fs.readFileSync(learnPath, "utf8");

// ================================
// 1) APPWRITE: real gamification profile
// ================================

if (!appwrite.includes("export const getUserGamificationProfile = async")) {
  const gamificationFunction = `
export const getUserGamificationProfile = async (userId) => {
  if (!userId) {
    return {
      xp: 0,
      level: 1,
      rank: 'Новачок',
      levelProgress: 0,
      nextLevelXp: 280,
      counters: {},
      dailyQuest: {},
      achievements: [],
    };
  }

  const safeList = async (collectionId, queries) => {
    try {
      const result = await databases.listDocuments(databaseId, collectionId, queries);
      return result.documents || [];
    } catch (error) {
      console.log('gamification safeList error:', collectionId, error);
      return [];
    }
  };

  const isToday = (dateValue) => {
    if (!dateValue) return false;

    const date = new Date(dateValue);
    const today = new Date();

    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const getRank = (level) => {
    if (level >= 26) return 'Studdy Master';
    if (level >= 19) return 'Data Specialist';
    if (level >= 13) return 'ML Explorer';
    if (level >= 8) return 'Аналітик';
    if (level >= 4) return 'Дослідник';
    return 'Новачок';
  };

  const getCorrectValue = (answer) => {
    if (typeof answer?.isCorrect === 'boolean') return answer.isCorrect;
    if (typeof answer?.correct === 'boolean') return answer.correct;
    if (typeof answer?.isRight === 'boolean') return answer.isRight;

    if (
      answer?.selectedOption &&
      answer?.correctOption &&
      answer.selectedOption === answer.correctOption
    ) {
      return true;
    }

    return false;
  };

  try {
    const [answers, likes, saves, comments, viewEvents, searchEvents] =
      await Promise.all([
        getUserQuizAnswers(userId),
        safeList(likesCollectionId, [
          Query.equal('userId', userId),
          Query.limit(100),
        ]),
        safeList(savesCollectionId, [
          Query.equal('userId', userId),
          Query.limit(100),
        ]),
        safeList(commentsCollectionId, [
          Query.equal('authorId', userId),
          Query.limit(100),
        ]),
        safeList(viewEventsCollectionId, [
          Query.equal('userId', userId),
          Query.limit(100),
        ]),
        safeList(searchEventsCollectionId, [
          Query.equal('userId', userId),
          Query.limit(100),
        ]),
      ]);

    const totalAnswers = answers.length;
    const correctAnswers = answers.filter(getCorrectValue).length;
    const incorrectAnswers = Math.max(totalAnswers - correctAnswers, 0);

    const todayAnswers = answers.filter((item) => isToday(item.$createdAt));
    const todayLikes = likes.filter((item) => isToday(item.$createdAt));
    const todaySaves = saves.filter((item) => isToday(item.$createdAt));
    const todayComments = comments.filter((item) => isToday(item.$createdAt));
    const todayViews = viewEvents.filter((item) => isToday(item.$createdAt));
    const todaySearches = searchEvents.filter((item) => isToday(item.$createdAt));

    const videoViews = viewEvents.filter(
      (item) => item.source === 'video_feed' || item.source === 'shorts'
    );

    const lessonViews = viewEvents.filter((item) => item.contentType === 'lesson');
    const courseViews = viewEvents.filter((item) => item.contentType === 'course');

    const todayVideoViews = todayViews.filter(
      (item) => item.source === 'video_feed' || item.source === 'shorts'
    );

    const todayRecommendationViews = todayViews.filter(
      (item) =>
        item.source === 'ml_recommendation' ||
        item.source === 'recommendation' ||
        item.source === 'home_feed'
    );

    const activeDates = new Set(
      [
        ...answers,
        ...likes,
        ...saves,
        ...comments,
        ...viewEvents,
        ...searchEvents,
      ]
        .map((item) => item.$createdAt)
        .filter(Boolean)
        .map((date) => new Date(date).toDateString())
    );

    let streakDays = 0;
    const cursor = new Date();

    while (activeDates.has(cursor.toDateString())) {
      streakDays += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    const accuracy = totalAnswers
      ? Math.round((correctAnswers / totalAnswers) * 100)
      : 0;

    const xp =
      correctAnswers * 16 +
      incorrectAnswers * 4 +
      likes.length * 4 +
      saves.length * 8 +
      comments.length * 10 +
      viewEvents.length * 3 +
      searchEvents.length * 2 +
      videoViews.length * 6 +
      lessonViews.length * 10 +
      courseViews.length * 18 +
      streakDays * 20;

    const xpPerLevel = 280;
    const level = Math.max(1, Math.floor(xp / xpPerLevel) + 1);
    const levelBase = (level - 1) * xpPerLevel;
    const nextLevelXp = level * xpPerLevel;
    const levelProgress = Math.min(
      100,
      Math.max(0, Math.round(((xp - levelBase) / xpPerLevel) * 100))
    );

    const dailyQuest = {
      watchedShort: todayVideoViews.length > 0,
      interacted:
        todayLikes.length + todaySaves.length + todayComments.length > 0,
      quizCompleted: todayAnswers.length > 0,
      openedRecommendation: todayRecommendationViews.length > 0,
      todayActions:
        todayAnswers.length +
        todayLikes.length +
        todaySaves.length +
        todayComments.length +
        todayViews.length +
        todaySearches.length,
    };

    return {
      xp,
      level,
      rank: getRank(level),
      levelProgress,
      nextLevelXp,
      accuracy,
      streakDays,
      counters: {
        totalAnswers,
        correctAnswers,
        incorrectAnswers,
        likesCount: likes.length,
        savesCount: saves.length,
        commentsCount: comments.length,
        viewsCount: viewEvents.length,
        searchesCount: searchEvents.length,
        videoViewsCount: videoViews.length,
        lessonViewsCount: lessonViews.length,
        courseViewsCount: courseViews.length,
        todayActions: dailyQuest.todayActions,
      },
      dailyQuest,
      achievements: [
        {
          icon: '🎯',
          title: 'Перший прорив',
          description: '10 правильних відповідей',
          unlocked: correctAnswers >= 10,
        },
        {
          icon: '🎬',
          title: 'Shorts-навчання',
          description: '5 коротких відео',
          unlocked: videoViews.length >= 5,
        },
        {
          icon: '💬',
          title: 'Активний учасник',
          description: '3 коментарі',
          unlocked: comments.length >= 3,
        },
        {
          icon: '💾',
          title: 'Колекціонер знань',
          description: '3 збережені матеріали',
          unlocked: saves.length >= 3,
        },
        {
          icon: '🧠',
          title: 'Точний мозок',
          description: '70%+ точності',
          unlocked: accuracy >= 70 && totalAnswers >= 5,
        },
        {
          icon: '🚀',
          title: 'Новий рівень',
          description: 'Досягни рівня 5',
          unlocked: level >= 5,
        },
      ],
    };
  } catch (error) {
    console.log('getUserGamificationProfile error:', error);

    return {
      xp: 0,
      level: 1,
      rank: 'Новачок',
      levelProgress: 0,
      nextLevelXp: 280,
      accuracy: 0,
      streakDays: 0,
      counters: {},
      dailyQuest: {},
      achievements: [],
    };
  }
};

`;

  const marker = "\n\n// -----------------------------\n// USER BEHAVIOR EVENTS";
  if (appwrite.includes(marker)) {
    appwrite = appwrite.replace(marker, `\n${gamificationFunction}${marker}`);
  } else {
    appwrite += `\n${gamificationFunction}`;
  }
}

fs.writeFileSync(appwritePath, appwrite, "utf8");

// ================================
// 2) LEARN: import gamification
// ================================

if (!learn.includes("getUserGamificationProfile")) {
  learn = learn.replace(
    "getUserContentRecommendations,",
    "getUserContentRecommendations,\n  getUserGamificationProfile,"
  );
}

// ================================
// 3) LEARN: safe recommendation opening
// ================================

learn = learn.replace(
  /const openRecommendation = \(item\) => \{[\s\S]*?\n\};/,
  `const openRecommendation = (item) => {
  if (!item) return;

  const type =
    item.type ||
    item.recommendationType ||
    item.contentType ||
    item.entityType;

  const id =
    item.id ||
    item.$id ||
    item.contentId ||
    item.entityId ||
    item.courseId ||
    item.lessonId ||
    item.postId;

  if (!type || !id) {
    router.push('/home');
    return;
  }

  if (type === 'course') {
    router.push(\`/course/\${id}\`);
    return;
  }

  if (type === 'lesson') {
    router.push(\`/lesson/\${id}\`);
    return;
  }

  if (type === 'post' || type === 'video' || type === 'short_video') {
    router.push(\`/post/\${id}\`);
  }
};`
);

// ================================
// 4) LEARN: add gamification state
// ================================

if (!learn.includes("const [gamificationProfile, setGamificationProfile]")) {
  learn = learn.replace(
    "const [contentRecommendations, setContentRecommendations] = useState(null);",
    `const [contentRecommendations, setContentRecommendations] = useState(null);
  const [gamificationProfile, setGamificationProfile] = useState(null);`
  );
}

// ================================
// 5) LEARN: prevent endless loading without user
// ================================

learn = learn.replace(
  "if (!user?.$id) return;",
  `if (!user?.$id) {
      setLearningStats({});
      setMlRecommendations({});
      setKnowledgeMastery({});
      setContentRecommendations({});
      setGamificationProfile({});
      setLoading(false);
      return;
    }`
);

// ================================
// 6) LEARN: include gamification in Promise.all
// ================================

learn = learn.replace(
  "const [statsRes, mlRes, masteryRes, contentRes] = await Promise.all([",
  "const [statsRes, mlRes, masteryRes, contentRes, gameRes] = await Promise.all(["
);

learn = learn.replace(
  "getUserContentRecommendations(user.$id),",
  `getUserContentRecommendations(user.$id),
        getUserGamificationProfile(user.$id),`
);

if (!learn.includes("setGamificationProfile(gameRes || {});")) {
  learn = learn.replace(
    "setContentRecommendations(contentRes || {});",
    `setContentRecommendations(contentRes || {});
      setGamificationProfile(gameRes || {});`
  );
}

if (!learn.includes("setGamificationProfile({});")) {
  learn = learn.replace(
    "setContentRecommendations({});",
    `setContentRecommendations({});
      setGamificationProfile({});`
  );
}

// ================================
// 7) LEARN: add game object in dashboard
// ================================

if (!learn.includes("const game = gamificationProfile || {};")) {
  learn = learn.replace(
    "const ml = mlRecommendations || {};",
    `const ml = mlRecommendations || {};
    const game = gamificationProfile || {};
    const gameCounters = game.counters || {};
    const dailyQuest = game.dailyQuest || {};`
  );
}

// ================================
// 8) LEARN: replace counters with real social/game counters
// ================================

learn = learn.replace(
  /const savedCount = numberFrom\([\s\S]*?const streakDays = numberFrom\([\s\S]*?\);\n/,
  `const savedCount = numberFrom(
      gameCounters.savesCount,
      stats?.savedCount,
      stats?.savedPosts,
      stats?.totalSavedPosts
    );

    const likedCount = numberFrom(
      gameCounters.likesCount,
      stats?.likedCount,
      stats?.likedPosts,
      stats?.totalLikes
    );

    const commentsCount = numberFrom(
      gameCounters.commentsCount,
      stats?.commentsCount,
      stats?.totalComments,
      stats?.commentedPosts
    );

    const streakDays = numberFrom(
      game.streakDays,
      stats?.streakDays,
      stats?.activeDays,
      stats?.currentStreak
    );
`
);

// ================================
// 9) LEARN: replace XP/level section with real game profile
// ================================

learn = learn.replace(
  /const xp =[\s\S]*?const rank = getRankByLevel\(level\);/,
  `const fallbackXp =
      completedCourses * 120 +
      completedLessons * 35 +
      correctAnswers * 14 +
      totalAnswers * 4 +
      likedCount * 3 +
      savedCount * 5 +
      commentsCount * 6 +
      streakDays * 10;

    const xp = numberFrom(game.xp, totalScore, fallbackXp);

    const xpPerLevel = 280;
    const fallbackLevel = Math.max(1, Math.floor(xp / xpPerLevel) + 1);
    const level = numberFrom(game.level, fallbackLevel);
    const currentLevelXpBase = (level - 1) * xpPerLevel;
    const nextLevelXpBase = numberFrom(game.nextLevelXp, level * xpPerLevel);
    const levelProgress = numberFrom(
      game.levelProgress,
      clamp(Math.round(((xp - currentLevelXpBase) / xpPerLevel) * 100), 0, 100)
    );

    const rank = game.rank || getRankByLevel(level);`
);

// ================================
// 10) LEARN: achievements from backend if available
// ================================

learn = learn.replace(
  "const achievements = [",
  "const fallbackAchievements = ["
);

learn = learn.replace(
  /const questTasks = \[/,
  `const achievements = ensureArray(game.achievements).length
      ? ensureArray(game.achievements)
      : fallbackAchievements;

    const questTasks = [`
);

// ================================
// 11) LEARN: daily quest done state
// ================================

learn = learn.replace(
  "done: false,\n        onPress: () => router.push('/videos'),",
  "done: !!dailyQuest.watchedShort,\n        onPress: () => router.push('/videos'),"
);

learn = learn.replace(
  "done: false,\n        onPress: () => {\n          const focusLessonId = repeatRecommendations[0]?.lessonId;",
  "done: !!dailyQuest.openedRecommendation,\n        onPress: () => {\n          const focusLessonId = repeatRecommendations[0]?.lessonId;"
);

learn = learn.replace(
  "done: false,\n        onPress: () => router.push('/quiz/ml-preview'),",
  "done: !!dailyQuest.quizCompleted,\n        onPress: () => router.push('/quiz/ml-preview'),"
);

// ================================
// 12) LEARN: normalize recommendation cards
// ================================

learn = learn.replace(
  "key={`${item.type}-${item.id}-${index}`}",
  "key={`${item.type || item.recommendationType}-${item.id || item.$id || index}`}"
);

learn = learn.replace(
  "{Math.round(numberFrom(item.score, 65))}%",
  "{Math.round(numberFrom(item.score, item.recommendationScore, 65))}%"
);

// ================================
// 13) LEARN: dependencies
// ================================

learn = learn.replace(
  "}, [learningStats, mlRecommendations, knowledgeMastery, contentRecommendations]);",
  "}, [learningStats, mlRecommendations, knowledgeMastery, contentRecommendations, gamificationProfile]);"
);

fs.writeFileSync(learnPath, learn, "utf8");

console.log("Strong learn/gamification audit patch applied.");
