import React, { useState } from "react";
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

const defaultText = `Машинне навчання — це напрям штучного інтелекту, який дозволяє комп'ютерним системам навчатися на основі даних.
Навчання з учителем використовує розмічені дані, де для кожного прикладу відома правильна відповідь.
Класифікація є задачею машинного навчання, у якій модель визначає клас об'єкта на основі його ознак.
Регресія використовується для прогнозування числових значень, наприклад ціни, температури або рейтингу.
Навчання без учителя застосовується тоді, коли дані не мають готових правильних відповідей.
Кластеризація дозволяє об'єднувати схожі об'єкти у групи без попередньо заданих міток.
Нейронна мережа складається з шарів нейронів і може знаходити складні закономірності у великих наборах даних.
Якість моделі оцінюється за допомогою метрик, таких як точність, повнота, F1-міра або середня абсолютна помилка.`;

const MlQuizPreview = () => {
  const [title, setTitle] = useState("Типи машинного навчання");
  const [text, setText] = useState(defaultText);
  const [loading, setLoading] = useState(false);
  const [quiz, setQuiz] = useState(null);

  const handleGenerate = async () => {
    if (!title.trim() || !text.trim()) {
      Alert.alert("Помилка", "Вкажи назву теми та навчальний текст.");
      return;
    }

    try {
      setLoading(true);

      const result = await generateMlQuiz({
        title: title.trim(),
        text: text.trim(),
        questionCount: 5,
      });

      setQuiz(result);
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

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView className="px-4 py-6">
        <TouchableOpacity onPress={() => router.back()} className="mb-5">
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
          className="bg-black-100 text-white rounded-xl px-4 py-3 mb-5 border border-black-200 min-h-[220px]"
        />

        <TouchableOpacity
          onPress={handleGenerate}
          disabled={loading}
          activeOpacity={0.85}
          className="bg-secondary rounded-2xl p-5 mb-6"
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
                {quiz.statistics?.questionCount}
              </Text>
            </View>

            {quiz.questions?.map((question) => (
              <View
                key={question.questionOrder}
                className="bg-black-100 rounded-2xl p-4 border border-black-200 mb-4"
              >
                <Text className="text-secondary font-psemibold mb-2">
                  Питання {question.questionOrder}
                </Text>

                <Text className="text-white text-base mb-3 leading-6">
                  {question.questionText}
                </Text>

                <Text className="text-gray-100 mb-1">A: {question.optionA}</Text>
                <Text className="text-gray-100 mb-1">B: {question.optionB}</Text>
                <Text className="text-gray-100 mb-1">C: {question.optionC}</Text>
                <Text className="text-gray-100 mb-3">D: {question.optionD}</Text>

                <Text className="text-secondary">
                  Правильна відповідь: {question.correctOption}
                </Text>

                <Text className="text-gray-100 mt-2 leading-6">
                  {question.explanation}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

export default MlQuizPreview;
