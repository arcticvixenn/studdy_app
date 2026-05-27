import { generateQuizFromLessonText } from './quizGenerator';

const AI_SERVER_URL = 'http://localhost:5050';

export const generateQuizWithAi = async ({
  lessonTitle,
  lessonContent,
  questionsCount = 5,
}) => {
  try {
    const response = await fetch(`${AI_SERVER_URL}/generate-quiz`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lessonTitle,
        lessonContent,
        questionsCount,
      }),
    });

    if (!response.ok) {
      throw new Error('AI server returned error');
    }

    const data = await response.json();

    if (!data?.questions?.length) {
      throw new Error('AI did not return questions');
    }

    return {
      title: data.title || `Тест: ${lessonTitle || 'Урок'}`,
      questions: data.questions,
      source: 'ai',
      error: null,
    };
  } catch (error) {
    console.log('AI quiz generation fallback:', error);

    const fallback = generateQuizFromLessonText({
      lessonTitle,
      lessonContent,
      questionsCount,
    });

    return {
      ...fallback,
      source: 'local',
      fallbackReason:
        'AI-сервер недоступний, тому Studdy використав локальний генератор.',
    };
  }
};