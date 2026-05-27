const sigmoid = (value) => {
  return 1 / (1 + Math.exp(-value));
};

const dot = (weights, features) => {
  return weights.reduce((sum, weight, index) => {
    return sum + weight * features[index];
  }, 0);
};

const buildTopicStats = (answers) => {
  const stats = {};

  answers.forEach((answer) => {
    const topic = answer.topic || 'Без теми';

    if (!stats[topic]) {
      stats[topic] = {
        topic,
        total: 0,
        correct: 0,
        incorrect: 0,
        difficultySum: 0,
        accuracy: 0,
        averageDifficulty: 0,
      };
    }

    stats[topic].total += 1;
    stats[topic].difficultySum += Number(answer.difficulty || 1);

    if (answer.isCorrect) {
      stats[topic].correct += 1;
    } else {
      stats[topic].incorrect += 1;
    }
  });

  Object.values(stats).forEach((item) => {
    item.accuracy = item.total > 0 ? item.correct / item.total : 0;
    item.averageDifficulty =
      item.total > 0 ? item.difficultySum / item.total : 1;
  });

  return stats;
};

const buildTopicIndex = (answers) => {
  const topics = [
    ...new Set(answers.map((answer) => answer.topic || 'Без теми')),
  ];

  return topics.reduce((acc, topic, index) => {
    acc[topic] = index;
    return acc;
  }, {});
};

const buildFeatures = ({ answer, topicStats, topicIndex, topicsCount }) => {
  const topic = answer.topic || 'Без теми';
  const stats = topicStats[topic];

  const difficulty = Number(answer.difficulty || 1);
  const normalizedDifficulty = Math.min(Math.max(difficulty, 1), 5) / 5;

  const topicAccuracy = stats?.accuracy ?? 0.5;
  const topicExperience = Math.min((stats?.total ?? 0) / 10, 1);

  const topicVector = new Array(topicsCount).fill(0);
  const topicPosition = topicIndex[topic];

  if (typeof topicPosition === 'number') {
    topicVector[topicPosition] = 1;
  }

  return [
    1,
    normalizedDifficulty,
    topicAccuracy,
    topicExperience,
    ...topicVector,
  ];
};

const trainLogisticRegression = (trainingData, featureCount) => {
  const weights = new Array(featureCount).fill(0);
  const learningRate = 0.12;
  const epochs = 700;

  for (let epoch = 0; epoch < epochs; epoch += 1) {
    trainingData.forEach(({ features, label }) => {
      const prediction = sigmoid(dot(weights, features));
      const error = prediction - label;

      for (let index = 0; index < weights.length; index += 1) {
        weights[index] -= learningRate * error * features[index];
      }
    });
  }

  return weights;
};

export const buildLearningMlModel = (answers) => {
  if (!answers || answers.length < 3) {
    return {
      trained: false,
      modelType: 'Logistic Regression',
      message: 'Потрібно хоча б 3 відповіді для навчання ML-моделі.',
      samples: answers?.length || 0,
      recommendations: [],
    };
  }

  const topicStats = buildTopicStats(answers);
  const topicIndex = buildTopicIndex(answers);
  const topics = Object.keys(topicIndex);
  const topicsCount = topics.length;

  const trainingData = answers.map((answer) => {
    const features = buildFeatures({
      answer,
      topicStats,
      topicIndex,
      topicsCount,
    });

    return {
      features,
      label: answer.isCorrect ? 1 : 0,
    };
  });

  const featureCount = trainingData[0].features.length;
  const weights = trainLogisticRegression(trainingData, featureCount);

  const recommendations = topics
    .map((topic) => {
      const stats = topicStats[topic];

      const virtualAnswer = {
        topic,
        difficulty: Math.round(stats.averageDifficulty || 1),
      };

      const features = buildFeatures({
        answer: virtualAnswer,
        topicStats,
        topicIndex,
        topicsCount,
      });

      const probabilityCorrect = sigmoid(dot(weights, features));
      const repeatPriority = Math.round((1 - probabilityCorrect) * 100);

      let reason = 'Тема потребує повторення.';

      if (stats.incorrect > 0 && stats.accuracy < 0.7) {
        reason = 'Є помилки та низька точність відповідей.';
      } else if (stats.averageDifficulty >= 3 && stats.accuracy < 0.85) {
        reason = 'Тема має підвищену складність.';
      } else if (stats.total < 3) {
        reason = 'Недостатньо відповідей для впевненої оцінки.';
      }

      return {
        topic,
        repeatPriority,
        probabilityCorrect: Math.round(probabilityCorrect * 100),
        totalAnswers: stats.total,
        accuracy: Math.round(stats.accuracy * 100),
        incorrect: stats.incorrect,
        averageDifficulty: Math.round(stats.averageDifficulty),
        reason,
      };
    })
    .filter((item) => item.repeatPriority >= 20 || item.incorrect > 0)
    .sort((a, b) => b.repeatPriority - a.repeatPriority)
    .slice(0, 5);

  return {
    trained: true,
    modelType: 'Logistic Regression',
    samples: answers.length,
    features: featureCount,
    recommendations,
  };
};




export const buildKnowledgeMasteryModel = (answers) => {
  if (!answers || answers.length < 3) {
    return {
      trained: false,
      modelType: 'Knowledge Mastery Scoring',
      message: 'Потрібно хоча б 3 відповіді для оцінки рівня знань.',
      topics: [],
      samples: answers?.length || 0,
    };
  }

  const topicStats = buildTopicStats(answers);

  const topics = Object.values(topicStats).map((topic) => {
    const accuracy = topic.accuracy * 100;
    const experienceScore = Math.min(topic.total / 8, 1) * 100;
    const difficultyScore = Math.min(topic.averageDifficulty / 5, 1) * 100;

    /*
      М'якша формула masteryScore:
      - точність є головним фактором;
      - досвід додає впевненості;
      - складність додає бонус, якщо користувач відповідав на складніші питання;
      - помилки вже враховані в accuracy, тому окремий великий штраф прибираємо.
    */
    const masteryScore = Math.round(
      accuracy * 0.7 +
        experienceScore * 0.2 +
        difficultyScore * 0.1
    );

    const normalizedScore = Math.max(0, Math.min(100, masteryScore));

    let level = 'Початковий';
    let explanation = 'Тема потребує базового повторення.';

    if (normalizedScore >= 80) {
      level = 'Сильний';
      explanation = 'Користувач демонструє високий рівень засвоєння теми.';
    } else if (normalizedScore >= 60) {
      level = 'Впевнений';
      explanation = 'Тема загалом засвоєна, але її ще варто закріпити.';
    } else if (normalizedScore >= 40) {
      level = 'Базовий';
      explanation = 'Є базове розуміння, але бажано повторити матеріал.';
    }

    return {
      topic: topic.topic,
      masteryScore: normalizedScore,
      level,
      explanation,
      totalAnswers: topic.total,
      correctAnswers: topic.correct,
      incorrectAnswers: topic.incorrect,
      accuracy: Math.round(accuracy),
      averageDifficulty: Math.round(topic.averageDifficulty),
    };
  });

  return {
    trained: true,
    modelType: 'Knowledge Mastery Scoring',
    samples: answers.length,
    topics: topics.sort((a, b) => a.masteryScore - b.masteryScore),
  };
};



const normalizeText = (value) => {
  return String(value || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .trim();
};

const getTextMatchScore = (text, topic) => {
  const normalizedText = normalizeText(text);
  const normalizedTopic = normalizeText(topic);

  if (!normalizedText || !normalizedTopic) return 0;

  if (normalizedText.includes(normalizedTopic)) {
    return 1;
  }

  const topicWords = normalizedTopic
    .split(/\s+/)
    .filter((word) => word.length > 3);

  if (!topicWords.length) return 0;

  const matchedWords = topicWords.filter((word) =>
    normalizedText.includes(word)
  );

  return matchedWords.length / topicWords.length;
};

const getPriorityWeight = (priority) => {
  if (priority >= 70) return 1.4;
  if (priority >= 40) return 1.1;
  return 0.8;
};

const buildContentText = (item, fields) => {
  return fields.map((field) => item?.[field] || '').join(' ');
};

export const buildContentRecommendationModel = ({
  courses = [],
  lessons = [],
  posts = [],
  mlRecommendations = [],
  masteryTopics = [],
}) => {
  if (!mlRecommendations.length && !masteryTopics.length) {
    return {
      trained: false,
      modelType: 'Hybrid Content Recommendation',
      message: 'Потрібно більше навчальних даних для рекомендації контенту.',
      recommendations: [],
    };
  }

  const topicSignals = [];

  mlRecommendations.forEach((item) => {
    topicSignals.push({
      topic: item.topic,
      priority: item.repeatPriority || 50,
      source: 'repeat',
    });
  });

  masteryTopics.forEach((item) => {
    if (item.masteryScore < 80) {
      topicSignals.push({
        topic: item.topic,
        priority: 100 - item.masteryScore,
        source: 'mastery',
      });
    }
  });

  const scoreContentItem = ({ item, type }) => {
    let fields = [];

    if (type === 'course') {
      fields = ['title', 'description', 'category', 'level'];
    }

    if (type === 'lesson') {
      fields = ['title', 'description', 'content', 'mediaType'];
    }

    if (type === 'post') {
      fields = ['title', 'content', 'category', 'mediaType'];
    }

    const contentText = buildContentText(item, fields);

    let bestTopic = null;
    let bestScore = 0;
    let bestReason = '';

    topicSignals.forEach((signal) => {
      const matchScore = getTextMatchScore(contentText, signal.topic);
      const weightedScore =
        matchScore * 100 * getPriorityWeight(signal.priority);

      if (weightedScore > bestScore) {
        bestScore = weightedScore;
        bestTopic = signal.topic;

        bestReason =
          signal.source === 'repeat'
            ? `Матеріал пов’язаний з темою, яку варто повторити: ${signal.topic}.`
            : `Матеріал допоможе підсилити тему: ${signal.topic}.`;
      }
    });

    return {
      ...item,
      recommendationType: type,
      recommendationScore: Math.round(bestScore),
      matchedTopic: bestTopic,
      reason: bestReason,
    };
  };

  const scoredCourses = courses.map((course) =>
    scoreContentItem({ item: course, type: 'course' })
  );

  const scoredLessons = lessons.map((lesson) =>
    scoreContentItem({ item: lesson, type: 'lesson' })
  );

  const scoredPosts = posts.map((post) =>
    scoreContentItem({ item: post, type: 'post' })
  );

  const recommendations = [
    ...scoredCourses,
    ...scoredLessons,
    ...scoredPosts,
  ]
    .filter((item) => item.recommendationScore > 0)
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
    .slice(0, 8);

  return {
    trained: true,
    modelType: 'Hybrid Content Recommendation',
    samples:
      courses.length + lessons.length + posts.length,
    signals: topicSignals.length,
    recommendations,
  };
};