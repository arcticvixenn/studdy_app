import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import {
  getCourseById,
  getCourseLessons,
} from '../../lib/appwrite';
import { useGlobalContext } from '../../context/GlobalProvider';

const LessonCard = ({ lesson }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push(`/lesson/${lesson.$id}`)}
      className="bg-black-100 border border-black-200 rounded-2xl mx-4 mb-4 p-4"
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
  );
};

const CourseDetails = () => {
  const { id } = useLocalSearchParams();
  const courseId = Array.isArray(id) ? id[0] : id;

  const { user } = useGlobalContext();

  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

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
        data={lessons}
        keyExtractor={(item) => item.$id}
        renderItem={({ item }) => <LessonCard lesson={item} />}
        ListHeaderComponent={() => (
          <View className="mb-5">
            <View className="px-4 pt-5">
              <TouchableOpacity onPress={() => router.back()}>
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

              {course?.authorId === user?.$id && (
                <TouchableOpacity
                  onPress={() =>
                    router.push(`/lesson/create?courseId=${courseId}`)
                  }
                  activeOpacity={0.85}
                  className="bg-secondary rounded-2xl p-4 mt-6"
                >
                  <Text className="text-primary font-psemibold text-center">
                    Додати урок
                  </Text>
                </TouchableOpacity>
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