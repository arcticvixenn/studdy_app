const ML_API_BASE_URL = "http://127.0.0.1:6060";

export async function generateMlQuiz({ title, text, questionCount = 5 }) {
  const response = await fetch(`${ML_API_BASE_URL}/quiz/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      title,
      text,
      questionCount,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ML quiz generation failed: ${response.status} ${errorText}`);
  }

  return await response.json();
}

export async function checkMlQuizHealth() {
  const response = await fetch(`${ML_API_BASE_URL}/quiz/health`);

  if (!response.ok) {
    throw new Error("ML quiz service is not available");
  }

  return await response.json();
}
