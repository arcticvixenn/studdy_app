const fs = require("fs");

const path = "lib/appwrite.js";
let content = fs.readFileSync(path, "utf8");

const backup = `${path}.bak.fix_gamification_profile_logic_${Date.now()}`;
fs.copyFileSync(path, backup);

// 1. Локальна дата замість UTC
content = content.replace(
  "const getDateKey = (date = new Date()) => date.toISOString().slice(0, 10);",
  `const getDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return \`\${year}-\${month}-\${day}\`;
};`
);

// 2. Прибираємо lesson-квест, бо він поки не має стабільного автозарахування
const questStart = content.indexOf("const dailyQuestPool = [");
const questEndMarker = "export const getDailyQuest = async";
const questEnd = content.indexOf(questEndMarker, questStart);

if (questStart !== -1 && questEnd !== -1) {
  const newQuestPool = `const dailyQuestPool = [
  {
    id: 'quiz',
    title: 'Пройди один тест',
    description: 'Заверши будь-який тест. XP зарахується автоматично після результату.',
    reward: 70,
    icon: '🧠',
    actionLabel: 'Перейти до курсів',
    route: '/learn',
  },
  {
    id: 'save',
    title: 'Збережи корисний матеріал',
    description: 'Збережи будь-яку публікацію у стрічці. Квест виконається автоматично.',
    reward: 35,
    icon: '⭐',
    actionLabel: 'Перейти до стрічки',
    route: '/home',
  },
  {
    id: 'comment',
    title: 'Залиш навчальний коментар',
    description: 'Напиши коментар під публікацією. Квест виконається автоматично.',
    reward: 45,
    icon: '💬',
    actionLabel: 'Перейти до стрічки',
    route: '/home',
  },
];

`;
  content = content.slice(0, questStart) + newQuestPool + content.slice(questEnd);
}

// 3. Замінюємо awardQuizXp на стабільну версію
function replaceFunction(source, marker, replacement) {
  const start = source.indexOf(marker);
  if (start === -1) {
    console.log("Function not found:", marker);
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

content = replaceFunction(
  content,
  "export const awardQuizXp = async ({",
  `export const awardQuizXp = async ({
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

  const progress = await awardXp({
    userId,
    points,
    source: 'quiz_result',
    sourceId: quizId || \`quiz_\${Date.now()}\`,
    sourceType: 'quiz',
    reason: \`Тест складено на \${score}%\`,
    topic,
  });

  console.log('QUIZ XP AWARDED:', {
    userId,
    quizId,
    score,
    points,
    level: progress?.level,
    xpTotal: progress?.xpTotal,
  });

  return progress;
};

`
);

fs.writeFileSync(path, content, "utf8");

console.log("DONE gamification logic fixed");
console.log("Backup:", backup);
