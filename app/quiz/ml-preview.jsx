import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { generateMlQuiz } from "../../lib/localMlQuizApi";
import { getMlQuizDraft, clearMlQuizDraft } from "../../lib/mlQuizDraftStore";
import { saveMlGeneratedQuiz } from "../../lib/appwrite";

const defaultText = `Машинне навчання — це напрям штучного інтелекту, який дозволяє комп'ютерним системам навчатися на основі даних.
Навчання з учителем використовує розмічені дані, де для кожного прикладу відома правильна відповідь.
Класифікація є задачею машинного навчання, у якій модель визначає клас об'єкта на основі його ознак.
Регресія використовується для прогнозування числових значень, наприклад ціни, температури або рейтингу.
Навчання без учителя застосовується тоді, коли дані не мають готових правильних відповідей.
Кластеризація дозволяє об'єднувати схожі об'єкти у групи без попередньо заданих міток.
Нейронна мережа складається з шарів нейронів і може знаходити складні закономірності у великих наборах даних.
Якість моделі оцінюється за допомогою метрик, таких як точність, повнота, F1-міра або середня абсолютна помилка.`;

const createEmptyQuestion = (order) => ({
  questionText: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctOption: "A",
  explanation: "",
  difficulty: 1,
  topic: "",
  questionOrder: order,
});

const MlQuizPreview = () => {
  const [draft, setDraft] = useState(null);
  const [title, setTitle] = useState("Типи машинного навчання");
  const [text, setText] = useState(defaultText);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const [editableQuestions, setEditableQuestions] = useState([]);

  useEffect(() => {
    const savedDraft = getMlQuizDraft();

    if (savedDraft?.title || savedDraft?.text) {
      setDraft(savedDraft);
      setTitle(savedDraft.title || "Навчальний матеріал");
      setText(savedDraft.text || "");
    }
  }, []);

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else if (draft?.lessonId) {
      router.replace(`/lesson/${draft.lessonId}`);
    } else {
      router.replace("/");
    }
  };

  const updateQuestion = (index, field, value) => {
    setEditableQuestions((prev) =>
      prev.map((question, currentIndex) =>
        currentIndex === index
          ? {
              ...question,
              [field]: value,
            }
          : question
      )
    );
  };

  const addQuestion = () => {
    setEditableQuestions((prev) => [
      ...prev,
      createEmptyQuestion(prev.length + 1),
    ]);
  };

  const removeQuestion = (index) => {
    setEditableQuestions((prev) =>
      prev
        .filter((_, currentIndex) => currentIndex !== index)
        .map((question, currentIndex) => ({
          ...question,
          questionOrder: currentIndex + 1,
        }))
    );
  };

  const validateQuestions = () => {
    if (!editableQuestions.length) {
      Alert.alert("Немає питань", "Спочатку згенеруй або додай питання.");
      return false;
    }

    for (const question of editableQuestions) {
      if (!question.questionText.trim()) {
        Alert.alert(
          "Помилка",
          `Питання ${question.questionOrder}: текст питання порожній.`
        );
        return false;
      }

      if (
        !question.optionA.trim() ||
        !question.optionB.trim() ||
        !question.optionC.trim() ||
        !question.optionD.trim()
      ) {
        Alert.alert(
          "Помилка",
          `Питання ${question.questionOrder}: заповни всі варіанти відповіді.`
        );
        return false;
      }

      if (!["A", "B", "C", "D"].includes(question.correctOption)) {
        Alert.alert(
          "Помилка",
          `Питання ${question.questionOrder}: неправильний формат правильної відповіді.`
        );
        return false;
      }
    }

    return true;
  };

  const handleGenerate = async () => {
    if (!title.trim() || !text.trim()) {
      Alert.alert("Помилка", "Вкажи назву теми та навчальний текст.");
      return;
    }

    if (text.trim().length < 80) {
      Alert.alert(
        "Замало тексту",
        "Для якісної ML-генерації потрібно більше навчального тексту."
      );
      return;
    }

    try {
      setLoading(true);

      const result = await generateMlQuiz({
        title: title.trim(),
        text: text.trim(),
        questionCount: 5,
      });

      const normalizedQuestions = (result.questions || []).map(
        (question, index) => ({
          questionText: question.questionText || "",
          optionA: question.optionA || "",
          optionB: question.optionB || "",
          optionC: question.optionC || "",
          optionD: question.optionD || "",
          correctOption: question.correctOption || "A",
          explanation: question.explanation || "",
          difficulty: question.difficulty || 1,
          topic: question.topic || title.trim(),
          questionOrder: index + 1,
          sourceSentence: question.sourceSentence || "",
        })
      );

      setQuiz(result);
      setEditableQuestions(normalizedQuestions);
    } catch (error) {
      console.log("ML quiz generation error:", error);
      Alert.alert(
        "Помилка ML-сервера",
        "Не вдалося згенерувати тест. Перевір, чи запущений ml-server на порту 6060."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuiz = async () => {
    if (!validateQuestions()) {
      return;
    }

    if (!draft?.lessonId) {
      Alert.alert(
        "Немає lessonId",
        "Відкрий ML-генератор саме зі сторінки уроку, щоб тест можна було прив'язати до уроку."
      );
      return;
    }

    try {
      setSaving(true);

      console.log("Saving ML quiz...", {
        lessonId: draft.lessonId,
        courseId: draft.courseId,
        title: quiz?.title || `Тест: ${title.trim()}`,
        questionCount: editableQuestions.length,
      });

      const result = await saveMlGeneratedQuiz({
        lessonId: draft.lessonId,
        courseId: draft.courseId,
        title: quiz?.title || `Тест: ${title.trim()}`,
        questions: editableQuestions,
      });

      console.log("Saved ML quiz result:", result);

      clearMlQuizDraft();

      if (typeof window !== "undefined") {
        window.alert("ML-згенерований тест успішно збережено.");
      }

      router.replace(`/quiz/${result.quiz.$id}`);
    } catch (error) {
      console.log("save ML quiz error:", error);
      Alert.alert(
        "Помилка збереження",
        error?.message || "Не вдалося зберегти тест в Appwrite."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView className="px-4 py-6">
        <TouchableOpacity onPress={handleGoBack} className="mb-5">
          <Text className="text-secondary text-base">← Назад</Text>
        </TouchableOpacity>

        <Text className="text-white text-2xl font-psemibold mb-2">
          ML-генерація тесту
        </Text>

        <Text className="text-gray-100 mb-5 leading-6">
          Локальний ML/NLP-модуль аналізує текст, виділяє ключові поняття,
          визначає теми, оцінює складність і формує тестові питання.
        </Text>

        <Text className="text-white mb-2">Назва теми</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Наприклад: Типи машинного навчання"
          placeholderTextColor="#7B7B8B"
          className="bg-black-100 text-white rounded-xl px-4 py-3 mb-4 border border-black-200"
        />

        <Text className="text-white mb-2">Навчальний текст</Text>
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          textAlignVertical="top"
          placeholder="Встав навчальний текст..."
          placeholderTextColor="#7B7B8B"
          className="bg-black-100 text-white rounded-xl px-4 py-3 mb-5 border border-black-200 min-h-[180px]"
        />

        <TouchableOpacity
          onPress={handleGenerate}
          disabled={loading}
          activeOpacity={0.85}
          className="bg-secondary rounded-2xl p-5 mb-4"
        >
          {loading ? (
            <ActivityIndicator color="#161622" />
          ) : (
            <Text className="text-primary text-center text-lg font-psemibold">
              Згенерувати тест ML
            </Text>
          )}
        </TouchableOpacity>

        {quiz ? (
          <View className="mb-10">
            <View className="bg-black-100 rounded-2xl p-4 border border-black-200 mb-5">
              <Text className="text-white text-lg font-psemibold">
                {quiz.title}
              </Text>

              <Text className="text-gray-100 mt-2">
                Джерело: {quiz.source}
              </Text>

              <Text className="text-gray-100 mt-1">
                Речень: {quiz.statistics?.sentenceCount} | Ключових слів:{" "}
                {quiz.statistics?.keywordCount} | Тем:{" "}
                {quiz.statistics?.topicCount} | Питань:{" "}
                {editableQuestions.length}
              </Text>
            </View>

            <Text className="text-white text-xl font-psemibold mb-3">
              Редагування питань
            </Text>

            {editableQuestions.map((question, index) => (
              <View
                key={`question-${index}`}
                className="bg-black-100 rounded-2xl p-4 border border-black-200 mb-4"
              >
                <View className="flex-row justify-between items-center mb-3">
                  <Text className="text-secondary font-psemibold">
                    Питання {index + 1}
                  </Text>

                  <TouchableOpacity onPress={() => removeQuestion(index)}>
                    <Text className="text-red-400">Видалити</Text>
                  </TouchableOpacity>
                </View>

                <Text className="text-white mb-2">Текст питання</Text>
                <TextInput
                  value={question.questionText}
                  onChangeText={(value) =>
                    updateQuestion(index, "questionText", value)
                  }
                  multiline
                  textAlignVertical="top"
                  placeholder="Введи питання"
                  placeholderTextColor="#7B7B8B"
                  className="bg-primary text-white rounded-xl px-4 py-3 mb-3 border border-black-200 min-h-[80px]"
                />

                <Text className="text-white mb-2">Варіант A</Text>
                <TextInput
                  value={question.optionA}
                  onChangeText={(value) =>
                    updateQuestion(index, "optionA", value)
                  }
                  placeholder="Варіант A"
                  placeholderTextColor="#7B7B8B"
                  className="bg-primary text-white rounded-xl px-4 py-3 mb-3 border border-black-200"
                />

                <Text className="text-white mb-2">Варіант B</Text>
                <TextInput
                  value={question.optionB}
                  onChangeText={(value) =>
                    updateQuestion(index, "optionB", value)
                  }
                  placeholder="Варіант B"
                  placeholderTextColor="#7B7B8B"
                  className="bg-primary text-white rounded-xl px-4 py-3 mb-3 border border-black-200"
                />

                <Text className="text-white mb-2">Варіант C</Text>
                <TextInput
                  value={question.optionC}
                  onChangeText={(value) =>
                    updateQuestion(index, "optionC", value)
                  }
                  placeholder="Варіант C"
                  placeholderTextColor="#7B7B8B"
                  className="bg-primary text-white rounded-xl px-4 py-3 mb-3 border border-black-200"
                />

                <Text className="text-white mb-2">Варіант D</Text>
                <TextInput
                  value={question.optionD}
                  onChangeText={(value) =>
                    updateQuestion(index, "optionD", value)
                  }
                  placeholder="Варіант D"
                  placeholderTextColor="#7B7B8B"
                  className="bg-primary text-white rounded-xl px-4 py-3 mb-3 border border-black-200"
                />

                <Text className="text-white mb-2">Правильна відповідь</Text>
                <View className="flex-row gap-2 mb-3">
                  {["A", "B", "C", "D"].map((option) => (
                    <TouchableOpacity
                      key={option}
                      onPress={() =>
                        updateQuestion(index, "correctOption", option)
                      }
                      className={`px-4 py-3 rounded-xl border ${
                        question.correctOption === option
                          ? "bg-secondary border-secondary"
                          : "bg-primary border-black-200"
                      }`}
                    >
                      <Text
                        className={
                          question.correctOption === option
                            ? "text-primary font-psemibold"
                            : "text-gray-100"
                        }
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text className="text-white mb-2">Пояснення</Text>
                <TextInput
                  value={question.explanation}
                  onChangeText={(value) =>
                    updateQuestion(index, "explanation", value)
                  }
                  multiline
                  textAlignVertical="top"
                  placeholder="Пояснення правильної відповіді"
                  placeholderTextColor="#7B7B8B"
                  className="bg-primary text-white rounded-xl px-4 py-3 mb-3 border border-black-200 min-h-[80px]"
                />
              </View>
            ))}

            <TouchableOpacity
              onPress={addQuestion}
              activeOpacity={0.85}
              className="bg-black-100 border border-secondary rounded-2xl p-5 mb-4"
            >
              <Text className="text-secondary text-center text-lg font-psemibold">
                Додати питання
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSaveQuiz}
              disabled={saving}
              activeOpacity={0.85}
              className="bg-secondary rounded-2xl p-5 mb-8"
            >
              {saving ? (
                <ActivityIndicator color="#161622" />
              ) : (
                <Text className="text-primary text-center text-lg font-psemibold">
                  Зберегти тест
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default MlQuizPreview;