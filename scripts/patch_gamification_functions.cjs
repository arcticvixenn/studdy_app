const fs = require("fs");

const path = "lib/appwrite.js";
let content = fs.readFileSync(path, "utf8");

const backup = `${path}.bak.gamification_${Date.now()}`;
fs.copyFileSync(path, backup);

const block = `

// GAMIFICATION

const userProgressCollectionId = 'user_progress';
const xpEventsCollectionId = 'xp_events';

const getDateKey = (date = new Date()) => date.toISOString().slice(0, 10);

const getYesterdayKey = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return getDateKey(date);
};

export const getXpNeededForLevel = (level) => {
  const safeLevel = Math.max(Number(level) || 1, 1);
  return 120 + (safeLevel - 1) * 80 + Math.pow(safeLevel - 1, 2) * 25;
};

export const calculateLevelInfo = (xpTotal = 0) => {
  let level = 1;
  let remainingXp = Math.max(Number(xpTotal) || 0, 0);

  while (remainingXp >= getXpNeededForLevel(level)) {
    remainingXp -= getXpNeededForLevel(level);
    level += 1;
    if (level > 100) break;
  }

  const xpForNextLevel = getXpNeededForLevel(level);

  return {
    level,
    xpInCurrentLevel: remainingXp,
    xpForNextLevel,
    progressPercent: Math.min(Math.round((remainingXp / xpForNextLevel) * 100), 100),
  };
};

export const getOrCreateUserProgress = async (userId) => {
  if (!userId) return null;

  const existing = await databases.listDocuments(
    databaseId,
    userProgressCollectionId,
    [Query.equal('userId', userId), Query.limit(1)]
  );

  if (existing.documents.length > 0) {
    const progress = existing.documents[0];
    return {
      ...progress,
      ...calculateLevelInfo(progress.xpTotal || 0),
    };
  }

  const created = await databases.createDocument(
    databaseId,
    userProgressCollectionId,
    ID.unique(),
    {
      userId,
      xpTotal: 0,
      level: 1,
      streak: 0,
      lastActiveDate: '',
      dailyQuestDate: '',
      dailyQuestCompleted: false,
    }
  );

  return {
    ...created,
    ...calculateLevelInfo(0),
  };
};

export const awardXp = async ({
  userId,
  points = 0,
  source = 'activity',
  sourceId = '',
  sourceType = '',
  reason = 'Навчальна активність',
  topic = '',
}) => {
  if (!userId || !points || points <= 0) {
    return await getOrCreateUserProgress(userId);
  }

  const today = getDateKey();
  const yesterday = getYesterdayKey();
  const current = await getOrCreateUserProgress(userId);

  const nextXpTotal = (current?.xpTotal || 0) + points;
  const levelInfo = calculateLevelInfo(nextXpTotal);

  const nextStreak =
    current?.lastActiveDate === today
      ? current?.streak || 1
      : current?.lastActiveDate === yesterday
      ? (current?.streak || 0) + 1
      : 1;

  await databases.createDocument(
    databaseId,
    xpEventsCollectionId,
    ID.unique(),
    {
      userId,
      points,
      source,
      sourceId,
      sourceType,
      reason,
      dateKey: today,
      topic,
    }
  );

  const updated = await databases.updateDocument(
    databaseId,
    userProgressCollectionId,
    current.$id,
    {
      xpTotal: nextXpTotal,
      level: levelInfo.level,
      streak: nextStreak,
      lastActiveDate: today,
    }
  );

  return {
    ...updated,
    ...levelInfo,
    gainedXp: points,
  };
};

const dailyQuestPool = [
  {
    id: 'quiz',
    title: 'Пройди один тест',
    description: 'Отримай XP за результат тесту.',
    reward: 70,
    icon: '🧠',
  },
  {
    id: 'save',
    title: 'Збережи корисний матеріал',
    description: 'Додай пост або урок у збережене.',
    reward: 35,
    icon: '⭐',
  },
  {
    id: 'comment',
    title: 'Залиш навчальний коментар',
    description: 'Постав питання або поясни тему.',
    reward: 45,
    icon: '💬',
  },
  {
    id: 'lesson',
    title: 'Переглянь навчальний матеріал',
    description: 'Відкрий корисний урок або публікацію.',
    reward: 40,
    icon: '📚',
  },
];

export const getDailyQuest = async (userId) => {
  const progress = await getOrCreateUserProgress(userId);
  const today = getDateKey();

  const index =
    today.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    dailyQuestPool.length;

  const quest = dailyQuestPool[index];

  if (progress?.dailyQuestDate !== today) {
    const updated = await databases.updateDocument(
      databaseId,
      userProgressCollectionId,
      progress.$id,
      {
        dailyQuestDate: today,
        dailyQuestCompleted: false,
      }
    );

    return {
      ...quest,
      completed: false,
      progress: updated,
    };
  }

  return {
    ...quest,
    completed: Boolean(progress.dailyQuestCompleted),
    progress,
  };
};

export const completeDailyQuest = async (userId) => {
  const progress = await getOrCreateUserProgress(userId);
  const quest = await getDailyQuest(userId);
  const today = getDateKey();

  if (quest.completed) {
    return {
      alreadyCompleted: true,
      quest,
      progress,
    };
  }

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
    sourceId: today,
    sourceType: quest.id,
    reason: \`Квест дня: \${quest.title}\`,
  });

  return {
    alreadyCompleted: false,
    quest: {
      ...quest,
      completed: true,
    },
    progress: updatedProgress,
  };
};

export const awardQuizXp = async ({
  userId,
  quizId = '',
  scorePercent = 0,
  topic = '',
}) => {
  const score = Math.max(0, Math.min(Number(scorePercent) || 0, 100));

  const points =
    score >= 90 ? 120 :
    score >= 75 ? 90 :
    score >= 60 ? 60 :
    score >= 40 ? 35 :
    15;

  return await awardXp({
    userId,
    points,
    source: 'quiz_result',
    sourceId: quizId,
    sourceType: 'quiz',
    reason: \`Тест складено на \${score}%\`,
    topic,
  });
};

export const getUserActivityCalendar = async (userId, days = 28) => {
  if (!userId) return [];

  const start = new Date();
  start.setDate(start.getDate() - Math.max(days - 1, 1));
  const startKey = getDateKey(start);

  const events = await databases.listDocuments(
    databaseId,
    xpEventsCollectionId,
    [
      Query.equal('userId', userId),
      Query.greaterThanEqual('dateKey', startKey),
      Query.orderDesc('dateKey'),
      Query.limit(200),
    ]
  );

  const map = {};

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = getDateKey(date);

    map[key] = {
      dateKey: key,
      points: 0,
      events: 0,
    };
  }

  events.documents.forEach((event) => {
    if (!map[event.dateKey]) {
      map[event.dateKey] = {
        dateKey: event.dateKey,
        points: 0,
        events: 0,
      };
    }

    map[event.dateKey].points += event.points || 0;
    map[event.dateKey].events += 1;
  });

  return Object.values(map).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
};

export const getSmartLearningAdvice = async (userId) => {
  if (!userId) return [];

  const answers = await getUserQuizAnswers(userId);
  const wrong = answers.filter((answer) => !answer.isCorrect);
  const byTopic = {};

  wrong.forEach((answer) => {
    const topic = answer.topic || 'Загальна тема';
    byTopic[topic] = (byTopic[topic] || 0) + 1;
  });

  return Object.entries(byTopic)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([topic, count]) => ({
      topic,
      title: \`Повтори тему: \${topic}\`,
      description: \`У цій темі було помилок: \${count}. Варто пройти короткий повтор або тест ще раз.\`,
      actionLabel: 'Повторити тему',
    }));
};

`;

if (!content.includes("export const awardXp")) {
  content += block;
}

fs.writeFileSync(path, content, "utf8");

console.log("DONE gamification functions");
console.log("Backup:", backup);
