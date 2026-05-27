import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import {
  createQuestion,
  createQuiz,
  getLessonById,
} from '../../lib/appwrite';
import { generateQuizWithAi } from '../../lib/aiQuizApi';
import { useGlobalContext } from '../../context/GlobalProvider';

const GeneratedQuestionCard = ({ question }) => {
  return (
    <View className="bg-black-100 border border-black-200 rounded-2xl mx-4 mb-4 p-4">
      <Text className="text-secondary text-xs font-psemibold mb-2">
        Питання {question.questionOrder}
      </Text>

      <Text className="text-white font-psemibold mb-3">
        {question.questionText}
      </Text>

      <Text className="text-gray-100 text-sm mb-1">
        A. {question.optionA}
      </Text>

      <Text className="text-gray-100 text-sm mb-1">
        B. {question.optionB}
      </Text>

      <Text className="text-gray-100 text-sm mb-1">
        C. {question.optionC}
      </Text>

      <Text className="text-gray-100 text-sm mb-3">
        D. {question.optionD}
      </Text>

      <Text className="text-secondary text-sm">
        Правильна відповідь: {question.correctOption}
      </Text>

      <Text className="text-gray-100 text-xs mt-2">
        Тема: {question.topic} · Складність: {question.difficulty}
      </Text>

      {question.explanation ? (
        <Text className="text-gray-100 text-xs mt-2">
          Пояснення: {question.explanation}
        </Text>
      ) : null}
    </View>
  );
};

const GenerateQuiz = () => {
  const { lessonId, courseId } = useLocalSearchParams();

  const normalizedLessonId = Array.isArray(lessonId) ? lessonId[0] : lessonId;
  const normalizedCourseId = Array.isArray(courseId) ? courseId[0] : courseId;

  const { user } = useGlobalContext();

  const [lesson, setLesson] = useState(null);
  const [generatedQuiz, setGeneratedQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const generateForLesson = async (lessonData) => {
    const generated = await generateQuizWithAi({
      lessonTitle: lessonData.title,
      lessonContent: lessonData.content,
      questionsCount: 5,
    });

    setGeneratedQuiz(generated);
  };

  const loadAndGenerate = async () => {
    setLoading(true);

    try {
      const lessonData = await getLessonById(normalizedLessonId);
      setLesson(lessonData);

      await generateForLesson(lessonData);
    } catch (error) {
      console.log('generate quiz load error:', error);
      Alert.alert('Помилка', 'Не вдалося згенерувати тест.');
    } finally {
      setLoading(false);
    }
  };

  const regenerateQuiz = async () => {
    if (!lesson) return;

    setRegenerating(true);

    try {
      await generateForLesson(lesson);
    } catch (error) {
      Alert.alert('Помилка', 'Не вдалося перегенерувати тест.');
    } finally {
      setRegenerating(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadAndGenerate();
    }, [normalizedLessonId])
  );

  const saveGeneratedQuiz = async () => {
    if (!generatedQuiz?.questions?.length) {
      return Alert.alert('Помилка', 'Немає питань для збереження.');
    }

    if (!user?.accountId) {
      return Alert.alert('Помилка', 'Не вдалося визначити автора тесту.');
    }

    setSaving(true);

    try {
      const quiz = await createQuiz({
        courseId: normalizedCourseId,
        lessonId: normalizedLessonId,
        title: generatedQuiz.title,
        passingScore: 60,
        user,
      });

      for (const question of generatedQuiz.questions) {
        await createQuestion({
          quizId: quiz.$id,
          questionText: question.questionText,
          optionA: question.optionA,
          optionB: question.optionB,
          optionC: question.optionC,
          optionD: question.optionD,
          correctOption: question.correctOption,
          explanation: question.explanation || '',
          topic: question.topic || 'Загальна тема',
          difficulty: question.difficulty || 1,
          questionOrder: question.questionOrder,
          user,
        });
      }

      router.replace(`/quiz/manage/${quiz.$id}`);
    } catch (error) {
      console.log('save generated quiz error:', error);
      Alert.alert('Помилка', error.message || 'Не вдалося зберегти тест.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="bg-primary h-full justify-center items-center">
        <ActivityIndicator size="large" />
        <Text className="text-gray-100 mt-4">
          AI генерує тест...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="bg-primary h-full">
      <FlatList
        data={generatedQuiz?.questions ?? []}
        keyExtractor={(item) => String(item.questionOrder)}
        renderItem={({ item }) => <GeneratedQuestionCard question={item} />}
        ListHeaderComponent={() => (
          <View className="px-4 pt-5 pb-5">
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-secondary font-psemibold mb-5">
                ← Назад
              </Text>
            </TouchableOpacity>

            <Text className="text-white text-3xl font-psemibold">
              AI-генерація тесту
            </Text>

            <Text className="text-gray-100 mt-3 leading-5">
              Studdy аналізує текст уроку та автоматично формує тестові питання,
              варіанти відповідей, правильну відповідь і пояснення.
            </Text>

            {lesson ? (
              <View className="bg-black-100 border border-black-200 rounded-2xl p-4 mt-5">
                <Text className="text-white font-psemibold">
                  Урок: {lesson.title}
                </Text>

                <Text className="text-gray-100 text-sm mt-2">
                  Згенеровано питань: {generatedQuiz?.questions?.length ?? 0}
                </Text>

                <Text className="text-gray-100 text-sm mt-2">
                  Джерело генерації:{' '}
                  {generatedQuiz?.source === 'ai'
                    ? 'AI backend'
                    : 'локальний fallback'}
                </Text>

                {generatedQuiz?.fallbackReason ? (
                  <Text className="text-yellow-400 text-xs mt-2">
                    {generatedQuiz.fallbackReason}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {generatedQuiz?.error ? (
              <View className="bg-red-500/10 border border-red-500 rounded-2xl p-4 mt-5">
                <Text className="text-red-400">
                  {generatedQuiz.error}
                </Text>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  onPress={saveGeneratedQuiz}
                  disabled={saving}
                  className="bg-secondary rounded-2xl p-4 mt-6"
                >
                  <Text className="text-primary font-psemibold text-center">
                    {saving ? 'Збереження...' : 'Зберегти згенерований тест'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={regenerateQuiz}
                  disabled={regenerating}
                  className="bg-black-100 border border-secondary rounded-2xl p-4 mt-4"
                >
                  <Text className="text-secondary font-psemibold text-center">
                    {regenerating ? 'Генерація...' : 'Згенерувати ще раз'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <Text className="text-lg text-gray-100 font-pregular mt-7 mb-4">
              Згенеровані питання
            </Text>
          </View>
        )}
        ListEmptyComponent={() => (
          <View className="px-4">
            <Text className="text-gray-100">
              Питання не згенеровано.
            </Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </SafeAreaView>
  );
};

export default GenerateQuiz;