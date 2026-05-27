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
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import EmptyState from '../../components/EmptyState';
import useAppwrite from '../../lib/useAppwrite';
import {
  getAllCourses,
  getUserLearningStats,
  getUserMlLearningRecommendations,
  getUserKnowledgeMastery,
} from '../../lib/appwrite';
import { useGlobalContext } from '../../context/GlobalProvider';

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

const StatBox = ({ title, value, subtitle }) => {
  return (
    <View className="bg-black-100 border border-black-200 rounded-2xl p-4 flex-1 mx-1">
      <Text className="text-secondary text-2xl font-psemibold text-center">
        {value}
      </Text>

      <Text className="text-white text-sm font-psemibold text-center mt-1">
        {title}
      </Text>

      {subtitle ? (
        <Text className="text-gray-100 text-xs text-center mt-1">
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
};

const TopicItem = ({ topic, type }) => {
  const isWeak = type === 'weak';
  const isMedium = type === 'medium';

  return (
    <View className="bg-primary border border-black-200 rounded-xl p-3 mb-2">
      <View className="flex-row justify-between items-center">
        <Text className="text-white font-psemibold flex-1">
          {topic.topic}
        </Text>

        <Text
          className={
            isWeak
              ? 'text-red-400'
              : isMedium
              ? 'text-yellow-400'
              : 'text-secondary'
          }
        >
          {topic.accuracy}%
        </Text>
      </View>

      <Text className="text-gray-100 text-xs mt-1">
        Правильно: {topic.correct}/{topic.total} · Помилок: {topic.incorrect} ·
        Складність: {topic.averageDifficulty}
      </Text>

      {topic.priorityScore ? (
        <Text className="text-gray-100 text-xs mt-1">
          Пріоритет повторення: {topic.priorityScore}
        </Text>
      ) : null}
    </View>
  );
};

const MlRecommendationItem = ({ item }) => {
  const getPriorityLabel = (priority) => {
    if (priority >= 70) return 'Високий пріоритет';
    if (priority >= 40) return 'Середній пріоритет';
    return 'Низький пріоритет';
  };

  const getPriorityColor = (priority) => {
    if (priority >= 70) return 'text-red-400';
    if (priority >= 40) return 'text-yellow-400';
    return 'text-secondary';
  };

  return (
    <View className="bg-primary border border-black-200 rounded-xl p-3 mb-3">
      <View className="flex-row justify-between items-center">
        <Text className="text-white font-psemibold flex-1">
          {item.topic}
        </Text>

        <Text className={`font-psemibold ${getPriorityColor(item.repeatPriority)}`}>
          {getPriorityLabel(item.repeatPriority)}
        </Text>
      </View>

      <Text className="text-gray-100 text-xs mt-2">
        {item.reason}
      </Text>

      <Text className="text-gray-100 text-xs mt-2">
        Точність за темою: {item.accuracy}% · Помилок: {item.incorrect} ·
        Складність: {item.averageDifficulty}
      </Text>

      {item.lessonId ? (
        <TouchableOpacity
          onPress={() => router.push(`/lesson/${item.lessonId}`)}
          activeOpacity={0.85}
          className="bg-secondary rounded-xl p-3 mt-4"
        >
          <Text className="text-primary text-center font-psemibold">
            Перейти до уроку
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const MlRecommendations = ({ ml, loading }) => {
  if (loading) {
    return (
      <View className="bg-black-100 border border-black-200 rounded-2xl p-5 mt-6">
        <ActivityIndicator />
      </View>
    );
  }

  if (!ml || !ml.trained) {
    return (
      <View className="bg-black-100 border border-black-200 rounded-2xl p-5 mt-6">
        <Text className="text-white text-lg font-psemibold">
          Персональні рекомендації Studdy
        </Text>

        <Text className="text-gray-100 text-sm leading-5 mt-3">
          ML-модель почне формувати персональні теми для повторення після
          кількох відповідей у тестах.
        </Text>

        {ml?.message ? (
          <Text className="text-gray-100 text-xs mt-3">
            {ml.message}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View className="bg-black-100 border border-black-200 rounded-2xl p-4 mt-6">
      <Text className="text-white text-lg font-psemibold mb-2">
        Персональні рекомендації Studdy
      </Text>

      <Text className="text-gray-100 text-sm leading-5 mb-4">
        Studdy аналізує відповіді користувача, теми та складність питань,
         щоб підібрати теми, які варто повторити першими.
      </Text>

      <View className="bg-primary border border-black-200 rounded-xl p-3 mb-4">
        <Text className="text-gray-100 text-xs">
          Модель: {ml.modelType} · Навчальних прикладів: {ml.samples} · Ознак:{' '}
          {ml.features}
        </Text>
      </View>

      {ml.recommendations.length ? (
        ml.recommendations.map((item) => (
          <MlRecommendationItem key={item.topic} item={item} />
        ))
      ) : (
        <Text className="text-gray-100 text-sm">
          Поки немає тем, які потребують повторення.
        </Text>
      )}
    </View>
  );
};

const MasteryTopicItem = ({ item }) => {
  const levelColor =
    item.level === 'Сильний'
      ? 'text-secondary'
      : item.level === 'Впевнений'
      ? 'text-yellow-400'
      : item.level === 'Базовий'
      ? 'text-orange-400'
      : 'text-red-400';

  return (
    <View className="bg-primary border border-black-200 rounded-xl p-3 mb-3">
      <View className="flex-row justify-between items-center">
        <Text className="text-white font-psemibold flex-1">
          {item.topic}
        </Text>

        <Text className={`font-psemibold ${levelColor}`}>
          {item.level}
        </Text>
      </View>

      <Text className="text-secondary text-xl font-psemibold mt-2">
        {item.masteryScore}/100
      </Text>

      <Text className="text-gray-100 text-xs mt-2">
        {item.explanation}
      </Text>

      <Text className="text-gray-100 text-xs mt-2">
        Точність: {item.accuracy}% · Відповідей: {item.totalAnswers} · Помилок:{' '}
        {item.incorrectAnswers} · Складність: {item.averageDifficulty}
      </Text>
    </View>
  );
};

const KnowledgeMastery = ({ mastery, loading }) => {
  if (loading) {
    return (
      <View className="bg-black-100 border border-black-200 rounded-2xl p-5 mt-6">
        <ActivityIndicator />
      </View>
    );
  }

  if (!mastery || !mastery.trained) {
    return (
      <View className="bg-black-100 border border-black-200 rounded-2xl p-5 mt-6">
        <Text className="text-white text-lg font-psemibold">
          Профіль знань
        </Text>

        <Text className="text-gray-100 text-sm leading-5 mt-3">
          Після кількох відповідей Studdy оцінить рівень знань за кожною темою.
        </Text>

        {mastery?.message ? (
          <Text className="text-gray-100 text-xs mt-3">
            {mastery.message}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View className="bg-black-100 border border-black-200 rounded-2xl p-4 mt-6">
      <Text className="text-white text-lg font-psemibold mb-2">
        Профіль знань
      </Text>

      <Text className="text-gray-100 text-sm leading-5 mb-4">
        ML-модель оцінює рівень засвоєння тем на основі точності, складності
        питань, кількості відповідей і помилок.
      </Text>

      <View className="bg-primary border border-black-200 rounded-xl p-3 mb-4">
        <Text className="text-gray-100 text-xs">
          Модель: {mastery.modelType} · Навчальних прикладів: {mastery.samples}
        </Text>
      </View>

      {mastery.topics.length ? (
        mastery.topics.map((item) => (
          <MasteryTopicItem key={item.topic} item={item} />
        ))
      ) : (
        <Text className="text-gray-100 text-sm">
          Даних для профілю знань поки недостатньо.
        </Text>
      )}
    </View>
  );
};

const LearningProgress = ({ stats, loading }) => {
  if (loading) {
    return (
      <View className="bg-black-100 border border-black-200 rounded-2xl p-5 mt-6">
        <ActivityIndicator />
      </View>
    );
  }

  if (!stats || stats.attemptsCount === 0) {
    return (
      <View className="bg-black-100 border border-black-200 rounded-2xl p-5 mt-6">
        <Text className="text-white text-lg font-psemibold">
          Прогрес навчання
        </Text>

        <Text className="text-gray-100 text-sm leading-5 mt-3">
          Пройди перший тест після уроку, щоб Studdy почав аналізувати твої
          сильні та слабкі теми.
        </Text>
      </View>
    );
  }

  return (
    <View className="mt-6">
      <Text className="text-white text-xl font-psemibold mb-4">
        Прогрес навчання
      </Text>

      <View className="flex-row mb-3">
        <StatBox
          title="Тестів"
          value={stats.attemptsCount}
          subtitle="пройдено"
        />

        <StatBox
          title="Середній бал"
          value={`${stats.averageScore}%`}
          subtitle="за тестами"
        />
      </View>

      <View className="flex-row mb-5">
        <StatBox
          title="Точність"
          value={`${stats.accuracy}%`}
          subtitle="за відповідями"
        />

        <StatBox
          title="Відповідей"
          value={stats.totalAnswers}
          subtitle={`${stats.correctAnswers} правильних`}
        />
      </View>

      <View className="bg-black-100 border border-black-200 rounded-2xl p-4 mb-4">
        <Text className="text-white text-lg font-psemibold mb-2">
          Рекомендовано повторити
        </Text>

        <Text className="text-gray-100 text-sm leading-5 mb-3">
          Studdy визначає теми за кількістю помилок, складністю питань і
          відсотком правильних відповідей.
        </Text>

        {stats.recommendedTopics.length ? (
          stats.recommendedTopics.map((topic) => (
            <TopicItem key={topic.topic} topic={topic} type="weak" />
          ))
        ) : (
          <Text className="text-gray-100 text-sm">
            Поки немає тем, які потребують повторення.
          </Text>
        )}
      </View>

      <View className="bg-black-100 border border-black-200 rounded-2xl p-4 mb-4">
        <Text className="text-white text-lg font-psemibold mb-3">
          Слабкі теми
        </Text>

        {stats.weakTopics.length ? (
          stats.weakTopics.map((topic) => (
            <TopicItem key={topic.topic} topic={topic} type="weak" />
          ))
        ) : (
          <Text className="text-gray-100 text-sm">
            Явно слабких тем поки немає.
          </Text>
        )}
      </View>

      <View className="bg-black-100 border border-black-200 rounded-2xl p-4 mb-4">
        <Text className="text-white text-lg font-psemibold mb-3">
          Середні теми
        </Text>

        {stats.mediumTopics.length ? (
          stats.mediumTopics.map((topic) => (
            <TopicItem key={topic.topic} topic={topic} type="medium" />
          ))
        ) : (
          <Text className="text-gray-100 text-sm">
            Середні теми з’являться після більшої кількості тестів.
          </Text>
        )}
      </View>

      <View className="bg-black-100 border border-black-200 rounded-2xl p-4">
        <Text className="text-white text-lg font-psemibold mb-3">
          Сильні теми
        </Text>

        {stats.strongTopics.length ? (
          stats.strongTopics.map((topic) => (
            <TopicItem key={topic.topic} topic={topic} type="strong" />
          ))
        ) : (
          <Text className="text-gray-100 text-sm">
            Сильні теми з’являться після кількох успішних тестів.
          </Text>
        )}
      </View>
    </View>
  );
};

const Learn = () => {
  const { user } = useGlobalContext();

  const {
    data: courses,
    refetch,
  } = useAppwrite(getAllCourses);

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [ml, setMl] = useState(null);
  const [mlLoading, setMlLoading] = useState(false);

  const [mastery, setMastery] = useState(null);
  const [masteryLoading, setMasteryLoading] = useState(false);

  const loadStats = async () => {
    if (!user?.$id) return;

    setStatsLoading(true);

    try {
      const result = await getUserLearningStats(user.$id);
      setStats(result);
    } catch (error) {
      console.log('load learning stats error:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const loadMlRecommendations = async () => {
    if (!user?.$id) return;

    setMlLoading(true);

    try {
      const result = await getUserMlLearningRecommendations(user.$id);
      setMl(result);
    } catch (error) {
      console.log('load ml recommendations error:', error);
    } finally {
      setMlLoading(false);
    }
  };

  const loadKnowledgeMastery = async () => {
    if (!user?.$id) return;

    setMasteryLoading(true);

    try {
      const result = await getUserKnowledgeMastery(user.$id);
      setMastery(result);
    } catch (error) {
      console.log('load knowledge mastery error:', error);
    } finally {
      setMasteryLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      refetch();
      loadStats();
      loadMlRecommendations();
      loadKnowledgeMastery();
    }, [user?.$id])
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
              Studdy. Результати проходження стають основою для ML-аналізу.
            </Text>

            <LearningProgress stats={stats} loading={statsLoading} />

            <MlRecommendations ml={ml} loading={mlLoading} />

            <KnowledgeMastery mastery={mastery} loading={masteryLoading} />



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