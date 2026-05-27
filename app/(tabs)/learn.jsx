import React, { useCallback } from 'react';
import {
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import EmptyState from '../../components/EmptyState';
import useAppwrite from '../../lib/useAppwrite';
import { getAllCourses } from '../../lib/appwrite';

const CourseCard = ({ course }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push(`/course/${course.$id}`)}
      className="bg-black-100 border border-black-200 rounded-2xl mx-4 mb-5 overflow-hidden"
    >
      {course.coverUrl ? (
        <Image
          source={{ uri: course.coverUrl }}
          className="w-full h-44"
          resizeMode="cover"
        />
      ) : (
        <View className="w-full h-32 bg-black-200 justify-center items-center">
          <Text className="text-gray-100 font-pmedium">
            Studdy Course
          </Text>
        </View>
      )}

      <View className="p-4">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-secondary text-xs font-psemibold">
            {course.category}
          </Text>

          <Text className="text-gray-100 text-xs font-pregular">
            {course.level}
          </Text>
        </View>

        <Text className="text-white text-lg font-psemibold mb-2">
          {course.title}
        </Text>

        <Text
          className="text-gray-100 text-sm font-pregular leading-5"
          numberOfLines={3}
        >
          {course.description}
        </Text>

        <View className="flex-row justify-between items-center mt-4">
          <Text className="text-gray-100 text-xs">
            Автор: {course.authorName}
          </Text>

          <Text className="text-gray-100 text-xs">
            Уроків: {course.lessonsCount ?? 0}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const Learn = () => {
  const {
    data: courses,
    refetch,
  } = useAppwrite(getAllCourses);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [])
  );

  return (
    <SafeAreaView className="bg-primary h-full">
      <FlatList
        data={courses ?? []}
        keyExtractor={(item) => item.$id}
        renderItem={({ item }) => <CourseCard course={item} />}
        ListHeaderComponent={() => (
          <View className="px-4 pt-6 pb-5">
            <Text className="text-3xl text-white font-psemibold">
              Навчання
            </Text>

            <Text className="text-sm text-gray-100 font-pregular leading-5 mt-3">
              Курси, уроки й тести формують персональну освітню траєкторію
              Studdy. Результати проходження стануть основою для ML-аналізу.
            </Text>

            <View className="bg-black-100 border border-black-200 rounded-2xl p-4 mt-6">
              <Text className="text-white font-psemibold text-base mb-2">
                Далі тут буде персональна добірка
              </Text>

              <Text className="text-gray-100 text-sm leading-5">
                Система рекомендуватиме курси й уроки відповідно до сильних та
                слабких тем користувача.
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => router.push('/course/create')}
              activeOpacity={0.85}
              className="bg-secondary rounded-2xl p-4 mt-6"
            >
              <Text className="text-primary text-base font-psemibold text-center">
                Створити курс
              </Text>
            </TouchableOpacity>

            <Text className="text-lg text-gray-100 font-pregular mt-7 mb-4">
              Каталог курсів
            </Text>
          </View>
        )}
        ListEmptyComponent={() => (
          <EmptyState
            title="Курсів поки немає"
            subtitle="Створи перший курс, щоб почати наповнювати навчальний модуль Studdy."
          />
        )}
        contentContainerStyle={{
          paddingBottom: 24,
        }}
      />
    </SafeAreaView>
  );
};

export default Learn;