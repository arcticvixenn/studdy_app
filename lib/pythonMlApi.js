const ML_SERVER_URL = 'http://127.0.0.1:6060';

export const getPythonMlRecommendations = async (userId) => {
  if (!userId) {
    return {
      trained: false,
      recommendations: [],
    };
  }

  try {
    const response = await fetch(`${ML_SERVER_URL}/recommend/${userId}`);

    if (!response.ok) {
      throw new Error('ML server returned error');
    }

    const data = await response.json();

    return {
      trained: Boolean(data.trained),
      modelType: data.modelType || 'RandomForestClassifier',
      metrics: data.metrics || null,
      featureImportances: data.featureImportances || [],
      recommendations: data.recommendations || [],
      message: data.message || null,
    };
  } catch (error) {
    console.log('getPythonMlRecommendations error:', error);

    return {
      trained: false,
      modelType: 'RandomForestClassifier',
      recommendations: [],
      message:
        'Python ML-сервер зараз недоступний. Запусти ml-server, щоб побачити персональні рекомендації.',
    };
  }
};