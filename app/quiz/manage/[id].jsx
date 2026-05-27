import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
} from '../../../lib/appwrite';

const QuestionPreview = ({ question }) => {
  return (
    <View className="bg-black-100 border border-black-200 rounded-2xl mx-4 mb-4 p-4">
      <Text className="text-secondary text-xs font-psemibold mb-2">
        Питання {question.questionOrder}
      </Text>

      <Text className="text-white font-psemibold mb-3">
        {question.questionText}
      </Text>

      <Text className="text-gray-100 text-sm">
        Тема: {question.topic} · Складність: {question.difficulty}
      </Text>

      <Text className="text-gray-100 text-sm mt-2">
        Правильна відповідь: {question.correctOption}
      </Text>
    </View>
  );
};

const ManageQuiz = () => {
  const { id } = useLocalSearchParams();
  const quizId = Array.isArray(id) ? id[0] : id;

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <SafeAreaView className="bg-primary h-full justify-center items-center">
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="bg-primary h-full">
      <FlatList
        data={questions}
        keyExtractor={(item) => item.$id}
        renderItem={({ item }) => <QuestionPreview question={item} />}
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

            <Text className="text-gray-100 mt-2">
              Кількість питань: {questions.length}
            </Text>

            <TouchableOpacity
              onPress={() => router.push(`/question/create?quizId=${quizId}`)}
              className="bg-secondary rounded-2xl p-4 mt-6"
            >
              <Text className="text-primary font-psemibold text-center">
                Додати питання
              </Text>
            </TouchableOpacity>

            <Text className="text-lg text-gray-100 font-pregular mt-7 mb-4">
              Питання тесту
            </Text>
          </View>
        )}
        ListEmptyComponent={() => (
          <View className="px-4">
            <Text className="text-gray-100">
              Питань поки немає.
            </Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </SafeAreaView>
  );
};

export default ManageQuiz;