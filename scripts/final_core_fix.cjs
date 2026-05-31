const fs = require("fs");

const path = "lib/appwrite.js";
let content = fs.readFileSync(path, "utf8");

const backup = `${path}.bak.final_core_fix_${Date.now()}`;
fs.copyFileSync(path, backup);

function replaceFunction(source, marker, replacement) {
  const start = source.indexOf(marker);

  if (start === -1) {
    console.log("SKIP missing:", marker);
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

// Ukrainian-safe text normalization for recommendations
content = replaceFunction(
  content,
  "const normalizeRecommendationText = (value) =>",
  `const normalizeRecommendationText = (value) => {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/['’\`]/g, '')
    .replace(/[^a-zа-яіїєґё0-9\\s-]/giu, ' ')
    .replace(/\\s+/g, ' ')
    .trim();
};

`
);

// Ukrainian-safe text normalization for search
content = replaceFunction(
  content,
  "const searchNormalizeText = (value) =>",
  `const searchNormalizeText = (value) => {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/['’\`]/g, '')
    .replace(/[^a-zа-яіїєґё0-9\\s-]/giu, ' ')
    .replace(/\\s+/g, ' ')
    .trim();
};

`
);

// Harder level formula
content = replaceFunction(
  content,
  "export const getXpNeededForLevel = (level) => {",
  `export const getXpNeededForLevel = (level) => {
  const safeLevel = Math.max(Number(level) || 1, 1);

  return Math.round(
    300 +
    (safeLevel - 1) * 240 +
    Math.pow(safeLevel - 1, 1.85) * 160
  );
};

`
);

// Robust quest completion for real actions
content = replaceFunction(
  content,
  "export const completeDailyQuestIfMatches = async (userId, actionId) => {",
  `export const completeDailyQuestIfMatches = async (userId, actionId) => {
  if (!userId || !actionId) return null;

  try {
    const quest = await getDailyQuest(userId);

    console.log('DAILY QUEST CHECK:', {
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

    const today = getDateKey();
    const progress = await getOrCreateUserProgress(userId);

    await databases.updateDocument(
      databaseId,
      userProgressCollectionId,
      progress.$id,
      {
        dailyQuestDate: today,
        dailyQuestCompleted: true,
      }
    );

    const updatedProgress = await awardXp({
      userId,
      points: quest.reward,
      source: 'daily_quest',
      sourceId: \`\${today}_\${quest.id}\`,
      sourceType: quest.id,
      reason: \`Квест дня: \${quest.title}\`,
      topic: quest.title,
    });

    console.log('DAILY QUEST COMPLETED:', {
      actionId,
      reward: quest.reward,
      xpTotal: updatedProgress?.xpTotal,
    });

    return {
      matched: true,
      quest: {
        ...quest,
        completed: true,
      },
      progress: updatedProgress,
    };
  } catch (error) {
    console.log('completeDailyQuestIfMatches error:', error);
    return null;
  }
};

`
);

// Stable quiz submit: no difficulty field, XP + quest after test
content = replaceFunction(
  content,
  "export const submitQuizAttempt = async ({",
  `export const submitQuizAttempt = async ({
  quiz,
  questions,
  selectedAnswers,
  user,
}) => {
  if (!user?.$id || !user?.accountId) {
    throw new Error('Потрібно увійти в акаунт.');
  }

  const safeQuestions = Array.isArray(questions) ? questions : [];
  const totalQuestions = safeQuestions.length;

  const checkedAnswers = safeQuestions.map((question, index) => {
    const questionId = question?.$id || question?.id || String(index);

    const selectedOption =
      selectedAnswers?.[questionId] ??
      selectedAnswers?.[String(index)] ??
      selectedAnswers?.[index] ??
      '';

    const correctOption =
      question?.correctOption ??
      question?.correctAnswer ??
      question?.answer ??
      '';

    const isCorrect =
      String(selectedOption || '').trim().toUpperCase() ===
      String(correctOption || '').trim().toUpperCase();

    return {
      question,
      questionId,
      selectedOption: String(selectedOption || ''),
      correctOption: String(correctOption || ''),
      isCorrect,
    };
  });

  const correctAnswers = checkedAnswers.filter((item) => item.isCorrect).length;

  const score =
    totalQuestions > 0
      ? Math.round((correctAnswers / totalQuestions) * 100)
      : 0;

  const passed = score >= (quiz?.passingScore ?? 60);

  const attempt = await databases.createDocument(
    databaseId,
    'quiz_attempts',
    ID.unique(),
    {
      userId: user.$id,
      accountId: user.accountId,
      courseId: quiz?.courseId || '',
      lessonId: quiz?.lessonId || '',
      quizId: quiz?.$id || quiz?.id || '',
      quizTitle: quiz?.title || '',
      topic: quiz?.topic || quiz?.title || '',
      score,
      scorePercent: score,
      percentage: score,
      totalQuestions,
      total: totalQuestions,
      correctAnswers,
      correctCount: correctAnswers,
      passed,
      completed: true,
      completedAt: new Date().toISOString(),
      status: 'completed',
    },
    [Permission.read(Role.user(user.accountId))]
  );

  await Promise.all(
    checkedAnswers.map(({ question, questionId, selectedOption, correctOption, isCorrect }, index) =>
      databases.createDocument(
        databaseId,
        'quiz_answers',
        ID.unique(),
        {
          attemptId: attempt.$id,
          userId: user.$id,
          accountId: user.accountId,
          questionId,
          quizId: quiz?.$id || quiz?.id || '',
          lessonId: quiz?.lessonId || '',
          courseId: quiz?.courseId || '',
          questionText: question?.questionText || question?.question || '',
          selectedOption,
          selectedAnswer: selectedOption,
          correctOption,
          correctAnswer: correctOption,
          isCorrect,
          correct: isCorrect,
          topic: question?.topic || quiz?.topic || '',
          questionOrder: question?.questionOrder || question?.order || index + 1,
        },
        [Permission.read(Role.user(user.accountId))]
      )
    )
  );

  try {
    const xpProgress = await awardQuizXp({
      userId: user.$id,
      quizId: quiz?.$id || quiz?.id || '',
      scorePercent: score,
      topic: quiz?.topic || quiz?.title || '',
    });

    await completeDailyQuestIfMatches(user.$id, 'quiz');

    console.log('QUIZ XP AWARDED:', {
      score,
      xpTotal: xpProgress?.xpTotal,
      level: xpProgress?.level,
    });
  } catch (xpError) {
    console.log('quiz XP error:', xpError);
  }

  return {
    attempt,
    score,
    correctAnswers,
    totalQuestions,
    passed,
  };
};

`
);

fs.writeFileSync(path, content, "utf8");

console.log("DONE final core fix");
console.log("Backup:", backup);
