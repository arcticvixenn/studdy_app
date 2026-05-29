const ML_SERVER_URL = 'http://192.168.1.104:6060';

const decodeUtf8JsonResponse = async (response) => {
  const arrayBuffer = await response.arrayBuffer();
  const decoder = new TextDecoder('utf-8');
  const text = decoder.decode(arrayBuffer);

  return JSON.parse(text);
};

export const getPythonMlRecommendations = async (userId) => {
  if (!userId) {
    return {
      trained: false,
      recommendations: [],
      samples: 0,
      model: 'Local Python ML server',
      reason: 'User is not defined.',
    };
  }

  try {
    const healthResponse = await fetch(`${ML_SERVER_URL}/health`, {
      method: 'GET',
      headers: {
        Accept: 'application/json; charset=utf-8',
      },
    });

    if (!healthResponse.ok) {
      return {
        trained: false,
        recommendations: [],
        samples: 0,
        model: 'Local Python ML server',
        reason: 'ML server is not available.',
      };
    }

    const health = await decodeUtf8JsonResponse(healthResponse);

    return {
      trained: false,
      recommendations: [],
      samples: 0,
      model: health?.service || 'Local Python ML server',
      reason:
        'Python recommendation endpoint is not implemented yet. Quiz generation module is available.',
    };
  } catch (error) {
    console.log('getPythonMlRecommendations error:', error);

    return {
      trained: false,
      recommendations: [],
      samples: 0,
      model: 'Local Python ML server',
      reason: 'Failed to connect to Python ML server.',
    };
  }
};

export const getPythonMlHealth = async () => {
  try {
    const response = await fetch(`${ML_SERVER_URL}/health`, {
      method: 'GET',
      headers: {
        Accept: 'application/json; charset=utf-8',
      },
    });

    if (!response.ok) {
      return null;
    }

    return await decodeUtf8JsonResponse(response);
  } catch (error) {
    console.log('getPythonMlHealth error:', error);
    return null;
  }
};