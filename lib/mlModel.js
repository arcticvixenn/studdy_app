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