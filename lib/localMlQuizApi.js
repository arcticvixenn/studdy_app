const ML_API_BASE_URL = "http://192.168.1.104:6060";

export async function generateMlQuiz({ title, text, questionCount = 5 }) {
  const healthUrl = `${ML_API_BASE_URL}/quiz/health`;
  const generateUrl = `${ML_API_BASE_URL}/quiz/generate`;

  console.log("ML health URL:", healthUrl);
  console.log("ML generate URL:", generateUrl);

  try {
    const healthResponse = await fetch(healthUrl);
    console.log("ML health status:", healthResponse.status);

    const response = await fetch(generateUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title,
        text,
        questionCount,
      }),
    });

    console.log("ML generate status:", response.status);

    const responseText = await response.text();
    console.log("ML generate response text:", responseText.slice(0, 500));

    if (!response.ok) {
      throw new Error(`ML quiz generation failed: ${response.status} ${responseText}`);
    }

    return JSON.parse(responseText);
  } catch (error) {
    console.log("ML quiz fetch failed full:", error);
    throw error;
  }
}

export async function checkMlQuizHealth() {
  const url = `${ML_API_BASE_URL}/quiz/health`;

  console.log("Calling ML health API:", url);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("ML quiz service is not available");
  }

  return await response.json();
}
