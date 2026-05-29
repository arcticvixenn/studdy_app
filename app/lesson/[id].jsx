import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Video, ResizeMode } from 'expo-av';

import {
  getLessonById,
  getLessonQuiz,
} from '../../lib/appwrite';

import { setMlQuizDraft } from '../../lib/mlQuizDraftStore';

const LessonDetails = () => {
  const { id } = useLocalSearchParams();

  const lessonId = Array.isArray(id) ? id[0] : id;

  const [lesson, setLesson] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadLesson = async () => {
    setLoading(true);

    try {
      const [lessonData, quizData] = await Promise.all([
        getLessonById(lessonId),
        getLessonQuiz(lessonId),
      ]);

      setLesson(lessonData);
      setQuiz(quizData);

      console.log('LESSON DATA:', lessonData);
      console.log('QUIZ DATA:', quizData);
    } catch (error) {
      console.log('loadLesson error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMlQuizGenerator = () => {
    const lessonText = lesson?.content || lesson?.description || '';

    if (!lessonText.trim()) {
      Alert.alert(
        'Недостатньо даних',
        'Для ML-генерації тесту потрібно додати текстовий матеріал уроку.'
      );
      return;
    }

    if (lessonText.trim().length < 80) {
      Alert.alert(
        'Замало тексту',
        'Для якісної ML-генерації потрібно більше навчального тексту.'
      );
      return;
    }

    setMlQuizDraft({
      lessonId: lesson?.$id,
      courseId: lesson?.courseId,
      title: lesson?.title || 'Навчальний матеріал',
      text: lessonText,
    });

    router.push('/quiz/ml-preview');
  };

  useFocusEffect(
    useCallback(() => {
      loadLesson();
    }, [lessonId])
  );

  if (loading) {
    return (
      <SafeAreaView className="bg-primary h-full items-center justify-center">
        <ActivityIndicator size="large" color="#FF9C01" />
        <Text className="text-gray-100 mt-4">Завантаження уроку...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView className="px-4 py-6">
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.8}
          className="mb-5"
        >
          <Text className="text-secondary text-base">← Назад</Text>
        </TouchableOpacity>

        <View className="bg-black-100 rounded-2xl p-5 border border-black-200">
          <Text className="text-gray-100 text-sm mb-2">
            Урок {lesson?.lessonOrder}
          </Text>

          <Text className="text-white text-2xl font-psemibold mb-3">
            {lesson?.title}
          </Text>

          {lesson?.description ? (
            <Text className="text-gray-100 text-base leading-6">
              {lesson.description}
            </Text>
          ) : null}
        </View>

        {lesson?.mediaType === 'video' && lesson?.videoUrl ? (
          <View className="mt-6 bg-black-100 rounded-2xl overflow-hidden border border-black-200">
            {Platform.OS === 'web' ? (
              <video
                src={lesson.videoUrl}
                controls
                style={{
                  width: '100%',
                  height: 260,
                  backgroundColor: '#000',
                }}
              />
            ) : (
              <Video
                source={{ uri: lesson.videoUrl }}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                style={{
                  width: '100%',
                  height: 260,
                  backgroundColor: '#000',
                }}
              />
            )}
          </View>
        ) : null}

        {lesson?.content ? (
          <View className="bg-black-100 rounded-2xl p-5 mt-6 border border-black-200">
            <Text className="text-white text-lg font-psemibold mb-3">
              Матеріал уроку
            </Text>

            <Text className="text-gray-100 text-base leading-7">
              {lesson.content}
            </Text>
          </View>
        ) : null}

        {quiz ? (
          <View className="mt-7">
            <TouchableOpacity
              onPress={() => router.push(`/quiz/${quiz.$id}`)}
              activeOpacity={0.85}
              className="bg-secondary rounded-2xl p-5"
            >
              <Text className="text-primary text-lg font-psemibold">
                Пройти тест після уроку
              </Text>

              <Text className="text-primary mt-1">
                {quiz.title}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleOpenMlQuizGenerator}
              activeOpacity={0.85}
              className="bg-black-100 border border-secondary rounded-2xl p-5 mt-4"
            >
              <Text className="text-secondary text-lg font-psemibold">
                Згенерувати новий тест за допомогою ML
              </Text>

              <Text className="text-gray-100 mt-1 leading-6">
                Система проаналізує текст уроку, виділить ключові поняття,
                визначить складність і сформує нові тестові питання.
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="mt-7">
            <View className="bg-black-100 border border-black-200 rounded-2xl p-5">
              <Text className="text-white text-lg font-psemibold">
                Тест до цього уроку ще не створено
              </Text>

              <Text className="text-gray-100 mt-2 leading-6">
                Тест можна створити вручну або згенерувати за допомогою
                локального ML/NLP-модуля, який аналізує навчальний текст уроку.
              </Text>
            </View>

            <TouchableOpacity
              onPress={() =>
                router.push(
                  `/quiz/create?lessonId=${lesson?.$id}&courseId=${lesson?.courseId}`
                )
              }
              activeOpacity={0.85}
              className="bg-secondary rounded-2xl p-5 mt-4"
            >
              <Text className="text-primary text-lg font-psemibold">
                Створити тест вручну
              </Text>

              <Text className="text-primary mt-1">
                Додай питання, варіанти відповідей і пояснення.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleOpenMlQuizGenerator}
              activeOpacity={0.85}
              className="bg-black-100 border border-secondary rounded-2xl p-5 mt-4"
            >
              <Text className="text-secondary text-lg font-psemibold">
                Згенерувати тест за допомогою ML
              </Text>

              <Text className="text-gray-100 mt-1 leading-6">
                Система проаналізує текст уроку, виділить ключові поняття,
                визначить теми, оцінить складність і сформує тестові питання.
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default LessonDetails;