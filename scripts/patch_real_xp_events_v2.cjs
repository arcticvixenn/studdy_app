const fs = require("fs");

const path = "lib/appwrite.js";
let content = fs.readFileSync(path, "utf8");

const backup = `${path}.bak.real_xp_events_v2_${Date.now()}`;
fs.copyFileSync(path, backup);

function findFunctionBlock(source, marker) {
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`Marker not found: ${marker}`);

  const braceStart = source.indexOf("{", start);
  let depth = 0;

  for (let i = braceStart; i < source.length; i++) {
    if (source[i] === "{") depth++;
    if (source[i] === "}") depth--;

    if (depth === 0) {
      return {
        start,
        end: i + 2,
        block: source.slice(start, i + 2),
      };
    }
  }

  throw new Error(`Function block not closed: ${marker}`);
}

function replaceBlock(source, marker, updater) {
  const found = findFunctionBlock(source, marker);
  const updated = updater(found.block);
  return source.slice(0, found.start) + updated + source.slice(found.end);
}

if (!content.includes("export const completeDailyQuestIfMatches")) {
  const marker = "export const awardQuizXp = async ({";
  const index = content.indexOf(marker);

  if (index === -1) throw new Error("awardQuizXp marker not found");

  const helper = `
export const completeDailyQuestIfMatches = async (userId, actionId) => {
  if (!userId || !actionId) return null;

  try {
    const quest = await getDailyQuest(userId);

    if (!quest?.completed && quest?.id === actionId) {
      return await completeDailyQuest(userId);
    }

    return null;
  } catch (error) {
    console.log('completeDailyQuestIfMatches error:', error);
    return null;
  }
};

`;

  content = content.slice(0, index) + helper + content.slice(index);
}

if (!content.includes("XP_COMMENT_AWARD_PATCH")) {
  content = replaceBlock(
    content,
    "export const createComment = async ({ postId, text, user }) => {",
    (block) => {
      let updated = block.replace(
        "return await databases.createDocument(",
        "const createdComment = await databases.createDocument("
      );

      updated = updated.replace(
        /\n\s*\);\s*\n};\s*$/,
        `
  );

  try {
    // XP_COMMENT_AWARD_PATCH
    await awardXp({
      userId: user.$id,
      points: 25,
      source: 'comment',
      sourceId: createdComment.$id,
      sourceType: 'post',
      reason: 'Коментар до навчального матеріалу',
    });

    await completeDailyQuestIfMatches(user.$id, 'comment');
  } catch (xpError) {
    console.log('comment XP error:', xpError);
  }

  return createdComment;
};
`
      );

      return updated;
    }
  );
}

if (!content.includes("XP_QUIZ_AWARD_PATCH")) {
  content = replaceBlock(
    content,
    "export const submitQuizAttempt = async ({",
    (block) => {
      const injection = `
  try {
    // XP_QUIZ_AWARD_PATCH
    const totalQuestions = Array.isArray(questions) ? questions.length : 0;

    const correctCount = (questions || []).reduce((count, question, index) => {
      const questionId = question?.$id || question?.id || String(index);

      const selected =
        selectedAnswers?.[questionId] ??
        selectedAnswers?.[String(index)] ??
        selectedAnswers?.[index];

      const correct =
        question?.correctOption ??
        question?.correctAnswer ??
        question?.answer;

      if (
        String(selected || '').trim().toUpperCase() ===
        String(correct || '').trim().toUpperCase()
      ) {
        return count + 1;
      }

      return count;
    }, 0);

    const scorePercent = totalQuestions
      ? Math.round((correctCount / totalQuestions) * 100)
      : 0;

    await awardQuizXp({
      userId: user.$id,
      quizId: quiz?.$id || quiz?.id || '',
      scorePercent,
      topic: quiz?.topic || quiz?.title || '',
    });

    await completeDailyQuestIfMatches(user.$id, 'quiz');
  } catch (xpError) {
    console.log('quiz XP error:', xpError);
  }

`;

      return block.replace(/\n};\s*$/, `${injection}\n};`);
    }
  );
}

fs.writeFileSync(path, content, "utf8");

console.log("DONE: real XP events patched v2");
console.log("Backup:", backup);
