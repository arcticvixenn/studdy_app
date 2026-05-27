import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Video, ResizeMode } from 'expo-av';

import {
  getLessonById,
  getLessonQuiz,
} from '../../lib/appwrite';

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
    } catch (error) {
      console.log('loadLesson error:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadLesson();
    }, [lessonId])
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
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: 36,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-secondary font-psemibold mb-5">
            ← Назад
          </Text>
        </TouchableOpacity>

        <Text className="text-secondary text-sm font-psemibold mb-2">
          Урок {lesson?.lessonOrder}
        </Text>

        <Text className="text-white text-3xl font-psemibold">
          {lesson?.title}
        </Text>

        {lesson?.description ? (
          <Text className="text-gray-100 text-sm leading-5 mt-4">
            {lesson.description}
          </Text>
        ) : null}

        {lesson?.mediaType === 'video' && lesson?.videoUrl ? (
          <View className="w-full h-60 bg-black rounded-2xl overflow-hidden mt-6">
            {Platform.OS === 'web' ? (
              <video
                src={lesson.videoUrl}
                controls
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  backgroundColor: '#000',
                }}
              />
            ) : (
              <Video
                source={{ uri: lesson.videoUrl }}
                style={{
                  width: '100%',
                  height: '100%',
                }}
                resizeMode={ResizeMode.CONTAIN}
                useNativeControls
              />
            )}
          </View>
        ) : null}

        {lesson?.content ? (
          <View className="bg-black-100 border border-black-200 rounded-2xl p-5 mt-6">
            <Text className="text-white text-lg font-psemibold mb-3">
              Матеріал уроку
            </Text>

            <Text className="text-gray-100 text-sm leading-6">
              {lesson.content}
            </Text>
          </View>
        ) : null}

        {quiz ? (
          <TouchableOpacity
            onPress={() => router.push(`/quiz/${quiz.$id}`)}
            activeOpacity={0.85}
            className="bg-secondary rounded-2xl p-5 mt-7"
          >
            <Text className="text-primary text-lg font-psemibold">
              Пройти тест після уроку
            </Text>

            <Text className="text-primary/80 mt-2">
              {quiz.title}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() =>
              router.push(
                `/quiz/create?lessonId=${lesson?.$id}&courseId=${lesson?.courseId}`
              )
            }
            activeOpacity={0.85}
            className="bg-black-100 border border-secondary rounded-2xl p-5 mt-7"
          >
            <Text className="text-secondary text-lg font-psemibold">
              Створити тест до уроку
            </Text>

            <Text className="text-gray-100 mt-2">
              Додай питання, щоб після матеріалу користувач міг перевірити знання.
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default LessonDetails;