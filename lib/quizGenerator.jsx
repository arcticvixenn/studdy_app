const cleanText = (text) => {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
};

const splitSentences = (text) => {
  return cleanText(text)
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 40);
};

const extractKeywords = (text) => {
  const stopWords = new Set([
    'це',
    'що',
    'для',
    'при',
    'який',
    'яка',
    'яке',
    'які',
    'або',
    'але',
    'та',
    'і',
    'в',
    'у',
    'на',
    'до',
    'з',
    'із',
    'за',
    'не',
    'є',
    'як',
    'так',
    'його',
    'її',
    'вони',
    'може',
    'можуть',
    'буде',
    'система',
    'користувач',
  ]);

  const words = cleanText(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .split(/\s+/)
    .filter((word) => word.length > 4 && !stopWords.has(word));

  const frequency = {};

  words.forEach((word) => {
    frequency[word] = (frequency[word] || 0) + 1;
  });

  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word]) => word);
};

const pickDistractors = (keywords, correctKeyword) => {
  const distractors = keywords
    .filter((keyword) => keyword !== correctKeyword)
    .slice(0, 6);

  while (distractors.length < 3) {
    distractors.push(
      ['алгоритм', 'параметр', 'модель', 'результат', 'ознака'][
        distractors.length
      ]
    );
  }

  return distractors.slice(0, 3);
};

const shuffleOptions = (options) => {
  return [...options]
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map((item) => item.value);
};

const buildQuestionFromSentence = (sentence, keywords, index) => {
  const lowerSentence = sentence.toLowerCase();

  const correctKeyword =
    keywords.find((keyword) => lowerSentence.includes(keyword)) ||
    keywords[index % keywords.length] ||
    'поняття';

  const distractors = pickDistractors(keywords, correctKeyword);

  const options = shuffleOptions([
    correctKeyword,
    ...distractors,
  ]);

  const correctIndex = options.indexOf(correctKeyword);
  const correctOption = ['A', 'B', 'C', 'D'][correctIndex];

  return {
    questionText: `Яке поняття найкраще пов’язане з твердженням: "${sentence}"?`,
    optionA: options[0],
    optionB: options[1],
    optionC: options[2],
    optionD: options[3],
    correctOption,
    explanation: `Правильна відповідь — "${correctKeyword}", оскільки це ключове поняття з наведеного фрагмента матеріалу.`,
    topic: correctKeyword,
    difficulty: index < 2 ? 1 : index < 4 ? 2 : 3,
    questionOrder: index + 1,
  };
};

export const generateQuizFromLessonText = ({
  lessonTitle,
  lessonContent,
  questionsCount = 5,
}) => {
  const text = cleanText(lessonContent);
  const sentences = splitSentences(text);
  const keywords = extractKeywords(text);

  if (!text || text.length < 120 || sentences.length === 0 || keywords.length < 4) {
    return {
      title: `Тест: ${lessonTitle || 'Урок'}`,
      questions: [],
      error:
        'Недостатньо тексту для автоматичної генерації тесту. Додай більший навчальний матеріал.',
    };
  }

  const selectedSentences = sentences.slice(0, questionsCount);

  const questions = selectedSentences.map((sentence, index) =>
    buildQuestionFromSentence(sentence, keywords, index)
  );

  return {
    title: `Тест: ${lessonTitle || 'Урок'}`,
    questions,
    error: null,
  };
};