const fs = require("fs");

const path = "lib/appwrite.js";
let content = fs.readFileSync(path, "utf8");

const backup = `${path}.bak.fix_submit_quiz_clean_${Date.now()}`;
fs.copyFileSync(path, backup);

const startMarker = "export const submitQuizAttempt = async ({";
const start = content.indexOf(startMarker);

if (start === -1) {
  throw new Error("submitQuizAttempt not found");
}

const possibleEnds = [
  "export const updateCourse = async",
  "// UPDATE LEARNING CONTENT",
  "export const getUserQuizAttempts = async",
];

let end = -1;

for (const marker of possibleEnds) {
  const found = content.indexOf(marker, start + 50);
  if (found !== -1 && (end === -1 || found < end)) {
    end = found;
  }
}

if (end === -1) {
  throw new Error("Cannot find safe end after submitQuizAttempt");
}

const cleanFunction = `export const submitQuizAttempt = async ({
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

`;

content = content.slice(0, start) + cleanFunction + "\n" + content.slice(end);

fs.writeFileSync(path, content, "utf8");

console.log("DONE submitQuizAttempt clean fixed");
console.log("Backup:", backup);
