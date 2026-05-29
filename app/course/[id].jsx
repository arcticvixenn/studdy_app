import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import {
  deleteCourse,
  deleteLesson,
  getCourseById,
  getCourseLessons,
} from '../../lib/appwrite';
import { useGlobalContext } from '../../context/GlobalProvider';

const LessonCard = ({ lesson, canManage, onDelete }) => {
  return (
    <View className="bg-black-100 border border-black-200 rounded-2xl mx-4 mb-4 p-4">
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push(`/lesson/${lesson.$id}`)}
      >
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-secondary text-xs font-psemibold">
            Урок {lesson.lessonOrder}
          </Text>

          <Text className="text-gray-100 text-xs">
            {lesson.estimatedMinutes ?? 5} хв
          </Text>
        </View>

        <Text className="text-white text-lg font-psemibold mb-2">
          {lesson.title}
        </Text>

        {lesson.description ? (
          <Text
            className="text-gray-100 text-sm leading-5"
            numberOfLines={3}
          >
            {lesson.description}
          </Text>
        ) : null}
      </TouchableOpacity>

      {canManage && (
        <>
          <TouchableOpacity
            onPress={() => router.push(`/lesson/edit/${lesson.$id}`)}
            activeOpacity={0.85}
            className="mt-4 bg-black-100 border border-secondary rounded-xl p-3"
          >
            <Text className="text-secondary text-center font-psemibold">
              Редагувати урок
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onDelete(lesson.$id)}
            activeOpacity={0.85}
            className="mt-3 bg-red-500/10 border border-red-500 rounded-xl p-3"
          >
            <Text className="text-red-400 text-center font-psemibold">
              Видалити урок
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};

const CourseDetails = () => {
  const { id } = useLocalSearchParams();
  const courseId = Array.isArray(id) ? id[0] : id;

  const { user } = useGlobalContext();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const loadCourse = async () => {
    setLoading(true);

    try {
      const [courseData, lessonsData] = await Promise.all([
        getCourseById(courseId),
        getCourseLessons(courseId),
      ]);

      setCourse(courseData);
      setLessons(lessonsData);
    } catch (error) {
      console.log('loadCourse error:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCourse();
    }, [courseId])
  );

  const canManage = course?.authorId === user?.$id;

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/learn');
  };

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

  const handleDeleteCourse = async () => {
    const confirmed = confirmAction(
      'Видалити курс? Цю дію не можна буде скасувати.'
    );

    if (!confirmed || deleting) return;

    setDeleting(true);

    try {
      await deleteCourse(courseId);
      router.replace('/learn');
    } catch (error) {
      console.log('deleteCourse error:', error);
      showError(error.message || 'Не вдалося видалити курс.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    const confirmed = confirmAction('Видалити урок?');

    if (!confirmed || deleting) return;

    setDeleting(true);

    try {
      await deleteLesson(lessonId);
      setLessons((prev) =>
        prev.filter((lesson) => lesson.$id !== lessonId)
      );
    } catch (error) {
      console.log('deleteLesson error:', error);
      showError(error.message || 'Не вдалося видалити урок.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="bg-primary h-full justify-center items-center">
        <ActivityIndicator size="large" color="#FF9C01" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="bg-primary h-full">
      <FlatList
        data={lessons}
        keyExtractor={(item) => item.$id}
        renderItem={({ item }) => (
          <LessonCard
            lesson={item}
            canManage={canManage}
            onDelete={handleDeleteLesson}
          />
        )}
        ListHeaderComponent={() => (
          <View className="mb-5">
            <View className="px-4 pt-5">
              <TouchableOpacity onPress={handleGoBack}>
                <Text className="text-secondary font-psemibold mb-5">
                  ← Назад
                </Text>
              </TouchableOpacity>
            </View>

            {course?.coverUrl ? (
              <Image
                source={{ uri: course.coverUrl }}
                className="w-full h-56"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-40 bg-black-200 justify-center items-center">
                <Text className="text-gray-100 font-pmedium">
                  Studdy Course
                </Text>
              </View>
            )}

            <View className="px-4 pt-5">
              <View className="flex-row justify-between items-center mb-3">
                <Text className="text-secondary text-sm font-psemibold">
                  {course?.category}
                </Text>

                <Text className="text-gray-100 text-sm">
                  {course?.level}
                </Text>
              </View>

              <Text className="text-white text-3xl font-psemibold">
                {course?.title}
              </Text>

              <Text className="text-gray-100 text-sm leading-5 mt-4">
                {course?.description}
              </Text>

              <View className="bg-black-100 border border-black-200 rounded-2xl p-4 mt-5">
                <Text className="text-white font-psemibold">
                  Автор: {course?.authorName}
                </Text>

                <Text className="text-gray-100 mt-2">
                  Кількість уроків: {lessons.length}
                </Text>
              </View>

              {canManage && (
                <>
                  <TouchableOpacity
                    onPress={() => router.push(`/course/edit/${courseId}`)}
                    activeOpacity={0.85}
                    className="bg-black-100 border border-secondary rounded-2xl p-4 mt-6"
                  >
                    <Text className="text-secondary font-psemibold text-center">
                      Редагувати курс
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() =>
                      router.push(`/lesson/create?courseId=${courseId}`)
                    }
                    activeOpacity={0.85}
                    className="bg-secondary rounded-2xl p-4 mt-4"
                  >
                    <Text className="text-primary font-psemibold text-center">
                      Додати урок
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleDeleteCourse}
                    activeOpacity={0.85}
                    disabled={deleting}
                    className="bg-red-500/10 border border-red-500 rounded-2xl p-4 mt-4"
                  >
                    <Text className="text-red-400 font-psemibold text-center">
                      {deleting ? 'Видалення...' : 'Видалити курс'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              <Text className="text-lg text-gray-100 font-pregular mt-7 mb-4">
                Уроки курсу
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <View className="px-4">
            <Text className="text-gray-100">
              Уроків у цьому курсі поки немає.
            </Text>
          </View>
        )}
        contentContainerStyle={{
          paddingBottom: 24,
        }}
      />
    </SafeAreaView>
  );
};

export default CourseDetails;