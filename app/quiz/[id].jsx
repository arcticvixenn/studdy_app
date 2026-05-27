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
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import {
  getQuizById,
  getQuizQuestions,
  submitQuizAttempt,
} from '../../lib/appwrite';
import { useGlobalContext } from '../../context/GlobalProvider';

const options = [
  { key: 'A', field: 'optionA' },
  { key: 'B', field: 'optionB' },
  { key: 'C', field: 'optionC' },
  { key: 'D', field: 'optionD' },
];

const QuizTaking = () => {
  const { id } = useLocalSearchParams();
  const quizId = Array.isArray(id) ? id[0] : id;

  const { user } = useGlobalContext();

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const loadQuiz = async () => {
    setLoading(true);

    try {
      const [quizData, questionsData] = await Promise.all([
        getQuizById(quizId),
        getQuizQuestions(quizId),
      ]);

      setQuiz(quizData);
      setQuestions(questionsData);
    } catch (error) {
      console.log('loadQuiz error:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadQuiz();
    }, [quizId])
  );

  const chooseAnswer = (questionId, option) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

  const submit = async () => {
    if (questions.length === 0) {
      return Alert.alert('Помилка', 'У цьому тесті ще немає питань.');
    }

    const unanswered = questions.some(
      (question) => !selectedAnswers[question.$id]
    );

    if (unanswered) {
      return Alert.alert('Помилка', 'Дайте відповідь на всі питання.');
    }

    setSubmitting(true);

    try {
      const quizResult = await submitQuizAttempt({
        quiz,
        questions,
        selectedAnswers,
        user,
      });

      setResult(quizResult);
    } catch (error) {
      Alert.alert('Помилка', error.message || 'Не вдалося завершити тест.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="bg-primary h-full justify-center items-center">
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  if (result) {
    return (
      <SafeAreaView className="bg-primary h-full justify-center px-4">
        <View className="bg-black-100 border border-black-200 rounded-2xl p-6">
          <Text className="text-white text-3xl font-psemibold text-center">
            Результат
          </Text>

          <Text className="text-secondary text-5xl font-psemibold text-center mt-6">
            {result.score}%
          </Text>

          <Text className="text-gray-100 text-center mt-4">
            Правильних відповідей: {result.correctAnswers} /{' '}
            {result.totalQuestions}
          </Text>

          <Text
            className={`text-center mt-4 font-psemibold ${
              result.passed ? 'text-secondary' : 'text-red-400'
            }`}
          >
            {result.passed ? 'Тест пройдено' : 'Тест не пройдено'}
          </Text>

          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-secondary rounded-2xl p-4 mt-8"
          >
            <Text className="text-primary font-psemibold text-center">
              Повернутися до уроку
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="bg-primary h-full">
      <FlatList
        data={questions}
        keyExtractor={(item) => item.$id}
        renderItem={({ item }) => (
          <View className="bg-black-100 border border-black-200 rounded-2xl mx-4 mb-5 p-4">
            <Text className="text-secondary text-xs font-psemibold mb-2">
              Питання {item.questionOrder}
            </Text>

            <Text className="text-white text-lg font-psemibold mb-4">
              {item.questionText}
            </Text>

            {options.map((option) => {
              const isSelected = selectedAnswers[item.$id] === option.key;

              return (
                <TouchableOpacity
                  key={option.key}
                  onPress={() => chooseAnswer(item.$id, option.key)}
                  className={`border rounded-2xl p-4 mb-3 ${
                    isSelected
                      ? 'bg-secondary border-secondary'
                      : 'bg-primary border-black-200'
                  }`}
                >
                  <Text
                    className={
                      isSelected ? 'text-primary' : 'text-gray-100'
                    }
                  >
                    {option.key}. {item[option.field]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        ListHeaderComponent={() => (
          <View className="px-4 pt-5 pb-5">
            <TouchableOpacity onPress={() => router.back()}>
              <Text className="text-secondary font-psemibold mb-5">
                ← Назад
              </Text>
            </TouchableOpacity>

            <Text className="text-white text-3xl font-psemibold">
              {quiz?.title}
            </Text>

            <Text className="text-gray-100 mt-3">
              Прохідний бал: {quiz?.passingScore}%
            </Text>
          </View>
        )}
        ListFooterComponent={() => (
          <View className="px-4 pb-8">
            <TouchableOpacity
              onPress={submit}
              disabled={submitting}
              className="bg-secondary rounded-2xl p-4"
            >
              <Text className="text-primary font-psemibold text-center">
                {submitting ? 'Перевірка...' : 'Завершити тест'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

export default QuizTaking;