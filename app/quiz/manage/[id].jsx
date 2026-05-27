import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import {
  deleteQuestion,
  deleteQuiz,
  getQuizById,
  getQuizQuestions,
} from '../../../lib/appwrite';

const QuestionPreview = ({ question, onDelete }) => {
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

      <TouchableOpacity
        onPress={() => router.push(`/question/edit/${question.$id}`)}
        activeOpacity={0.85}
        className="mt-4 bg-black-100 border border-secondary rounded-xl p-3"
      >
        <Text className="text-secondary text-center font-psemibold">
          Редагувати питання
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => onDelete(question.$id)}
        activeOpacity={0.85}
        className="mt-3 bg-red-500/10 border border-red-500 rounded-xl p-3"
      >
        <Text className="text-red-400 text-center font-psemibold">
          Видалити питання
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const ManageQuiz = () => {
  const { id } = useLocalSearchParams();
  const quizId = Array.isArray(id) ? id[0] : id;

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

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

  const confirmAction = (message) => {
    if (Platform.OS === 'web') {
      return window.confirm(message);
    }

    return true;
  };

  const showError = (message) => {
    if (Platform.OS === 'web') {
      window.alert(message);
    } else {
      Alert.alert('Помилка', message);
    }
  };

  const handleDeleteQuiz = async () => {
    const confirmed = confirmAction('Видалити тест?');

    if (!confirmed || deleting) return;

    setDeleting(true);

    try {
      await deleteQuiz(quizId);
      router.back();
    } catch (error) {
      console.log('deleteQuiz error:', error);
      showError(error.message || 'Не вдалося видалити тест.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteQuestion = async (questionId) => {
    const confirmed = confirmAction('Видалити питання?');

    if (!confirmed || deleting) return;

    setDeleting(true);

    try {
      await deleteQuestion(questionId);
      setQuestions((prev) =>
        prev.filter((question) => question.$id !== questionId)
      );
    } catch (error) {
      console.log('deleteQuestion error:', error);
      showError(error.message || 'Не вдалося видалити питання.');
    } finally {
      setDeleting(false);
    }
  };

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
        renderItem={({ item }) => (
          <QuestionPreview
            question={item}
            onDelete={handleDeleteQuestion}
          />
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

            <Text className="text-gray-100 mt-2">
              Кількість питань: {questions.length}
            </Text>

            <TouchableOpacity
              onPress={() => router.push(`/quiz/edit/${quizId}`)}
              activeOpacity={0.85}
              className="bg-black-100 border border-secondary rounded-2xl p-4 mt-6"
            >
              <Text className="text-secondary font-psemibold text-center">
                Редагувати тест
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push(`/question/create?quizId=${quizId}`)}
              activeOpacity={0.85}
              className="bg-secondary rounded-2xl p-4 mt-4"
            >
              <Text className="text-primary font-psemibold text-center">
                Додати питання
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDeleteQuiz}
              activeOpacity={0.85}
              disabled={deleting}
              className="bg-red-500/10 border border-red-500 rounded-2xl p-4 mt-4"
            >
              <Text className="text-red-400 font-psemibold text-center">
                {deleting ? 'Видалення...' : 'Видалити тест'}
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