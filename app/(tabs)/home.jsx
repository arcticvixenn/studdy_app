import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { router } from 'expo-router';

import { images } from '../../constants';
import SearchInput from '../../components/SearchInput';
import EmptyState from '../../components/EmptyState';
import PostCard from '../../components/PostCard';
import {
  createViewEvent,
  getAllCourses,
  getAllPosts,
  getUserContentRecommendations,
} from '../../lib/appwrite';
import { useGlobalContext } from '../../context/GlobalProvider';

const RecommendationCard = ({ item, user }) => {
  const getTypeLabel = () => {
    if (item.type === 'course') return 'Курс';
    if (item.type === 'lesson') return 'Урок';

    if (item.type === 'post') {
      if (item.mediaType === 'video') return 'Відео';
      return 'Пост';
    }

    return 'Матеріал';
  };

  const openRecommendation = async () => {
    await createViewEvent({
      userId: user?.$id,
      permissionUserId: user?.accountId || user?.$id,
      contentId: item.id,
      contentType: item.type,
      duration: 0,
      source: 'ml_recommendation',
    });

    if (item.type === 'course') {
      router.push(`/course/${item.id}`);
      return;
    }

    if (item.type === 'lesson') {
      router.push(`/lesson/${item.id}`);
      return;
    }

    if (item.type === 'post') {
      router.push(`/post/${item.id}`);
    }
  };

  return (
    <TouchableOpacity
      onPress={openRecommendation}
      activeOpacity={0.85}
      className="bg-primary border border-black-200 rounded-2xl p-4 mb-3"
    >
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-secondary text-xs font-psemibold">
          {getTypeLabel()}
        </Text>

        <Text className="text-gray-100 text-xs">
          {item.score ? `${item.score}% збіг` : 'Рекомендовано'}
        </Text>
      </View>

      <Text className="text-white text-base font-psemibold" numberOfLines={2}>
        {item.title || 'Навчальний матеріал'}
      </Text>

      <Text className="text-gray-100 text-sm mt-2 leading-5" numberOfLines={3}>
        {item.reason || 'Рекомендовано ML-моделлю Studdy.'}
      </Text>

      <View className="bg-secondary rounded-xl p-3 mt-4">
        <Text className="text-primary text-center font-psemibold">
          Відкрити
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const MlRecommendationsBlock = ({ ml, loading, user }) => {
  const [expanded, setExpanded] = useState(false);

  const recommendations = ml?.recommendations || [];
  const visibleRecommendations = expanded
    ? recommendations
    : recommendations.slice(0, 3);

  if (loading) {
    return (
      <View className="bg-black-100 border border-black-200 rounded-2xl p-5 mt-6">
        <ActivityIndicator color="#FF9C01" />
        <Text className="text-gray-100 text-sm text-center mt-3">
          Завантаження ML-рекомендацій...
        </Text>
      </View>
    );
  }

  if (!ml || !ml.trained) {
    return (
      <View className="bg-black-100 border border-black-200 rounded-2xl p-5 mt-6">
        <Text className="text-white text-lg font-psemibold">
          Рекомендації для тебе
        </Text>

        <Text className="text-gray-100 text-sm leading-5 mt-3">
          Studdy зможе підібрати персональні курси, уроки, пости й відео
          після накопичення більшої кількості навчальних даних.
        </Text>

        {ml?.reason || ml?.message ? (
          <Text className="text-yellow-400 text-xs mt-3">
            {ml.reason || ml.message}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View className="bg-black-100 border border-black-200 rounded-2xl p-4 mt-6">
      <View className="flex-row justify-between items-start">
        <View className="flex-1 pr-3">
          <Text className="text-white text-lg font-psemibold">
            Рекомендації для тебе
          </Text>

          <Text className="text-gray-100 text-sm leading-5 mt-2">
            Матеріали підібрано на основі відповідей, слабких тем, переглядів
            і схожості контенту.
          </Text>
        </View>

        <View className="bg-primary rounded-xl px-3 py-2 border border-black-200">
          <Text className="text-secondary text-xs font-psemibold">
            ML
          </Text>
        </View>
      </View>

      <View className="bg-primary border border-black-200 rounded-xl p-3 mt-4">
        <Text className="text-gray-100 text-xs">
          Модель: {ml.modelType || ml.model || 'Studdy ML recommendations'}
        </Text>

        {ml.metrics ? (
          <Text className="text-gray-100 text-xs mt-1">
            Accuracy: {Math.round(Number(ml.metrics.accuracy || 0) * 100)}% ·
            F1: {Math.round(Number(ml.metrics.f1 || 0) * 100)}%
          </Text>
        ) : null}

        {ml.samples ? (
          <Text className="text-gray-100 text-xs mt-1">
            Навчальних прикладів: {ml.samples}
          </Text>
        ) : null}
      </View>

      <View className="mt-4">
        {visibleRecommendations.length ? (
          visibleRecommendations.map((item, index) => (
            <RecommendationCard
              key={`${item.type}-${item.id}-${index}`}
              item={item}
              user={user}
            />
          ))
        ) : (
          <Text className="text-gray-100 text-sm">
            Поки немає матеріалів для персональних рекомендацій.
          </Text>
        )}
      </View>

      {recommendations.length > 3 ? (
        <TouchableOpacity
          onPress={() => setExpanded((prev) => !prev)}
          activeOpacity={0.85}
          className="bg-primary border border-secondary rounded-xl p-3 mt-1"
        >
          <Text className="text-secondary text-center font-psemibold">
            {expanded ? 'Показати менше' : 'Показати всі рекомендації'}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const CourseFeedCard = ({ course, user }) => {
  const openCourse = async () => {
    await createViewEvent({
      userId: user?.$id,
      permissionUserId: user?.accountId || user?.$id,
      contentId: course.$id,
      contentType: 'course',
      duration: 0,
      source: 'home_feed',
    });

    router.push(`/course/${course.$id}`);
  };

  const openAuthorProfile = () => {
    if (!course.authorId) return;

    if (course.authorId === user?.$id) {
      router.push('/profile');
      return;
    }

    router.push(`/user/${course.authorId}`);
  };

  return (
    <View className="bg-black-100 border border-black-200 rounded-2xl mx-4 mb-5 overflow-hidden">
      {course.coverUrl ? (
        <Image
          source={{ uri: course.coverUrl }}
          className="w-full h-44"
          resizeMode="cover"
        />
      ) : (
        <View className="w-full h-36 bg-primary justify-center items-center">
          <Text className="text-secondary font-psemibold">
            Studdy Course
          </Text>
        </View>
      )}

      <View className="p-4">
        <View className="flex-row justify-between items-center mb-2">
          <Text className="text-secondary text-xs font-psemibold">
            Курс
          </Text>

          <Text className="text-gray-100 text-xs">
            {course.level || 'Для всіх'}
          </Text>
        </View>

        <Text className="text-white text-xl font-psemibold" numberOfLines={2}>
          {course.title}
        </Text>

        {course.description ? (
          <Text className="text-gray-100 text-sm leading-5 mt-3" numberOfLines={4}>
            {course.description}
          </Text>
        ) : null}

        <TouchableOpacity onPress={openAuthorProfile} activeOpacity={0.8}>
          <Text className="text-gray-100 text-xs mt-4">
            Автор:{' '}
            <Text className="text-secondary font-psemibold">
              {course.authorName || 'Користувач Studdy'}
            </Text>
          </Text>
        </TouchableOpacity>

        <View className="flex-row justify-between items-center mt-4">
          <Text className="text-gray-100 text-xs">
            Уроків: {course.lessonsCount ?? 0}
          </Text>

          <Text className="text-gray-100 text-xs">
            {course.category || 'Навчання'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={openCourse}
          activeOpacity={0.85}
          className="bg-secondary rounded-xl p-4 mt-4"
        >
          <Text className="text-primary text-center font-psemibold">
            Відкрити курс
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const Home = () => {
  const { user } = useGlobalContext();

  const [feedItems, setFeedItems] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mlRecommendations, setMlRecommendations] = useState(null);
  const [mlLoading, setMlLoading] = useState(false);

  const buildHomeFeed = async () => {
    setFeedLoading(true);

    try {
      const [posts, courses] = await Promise.all([
        getAllPosts(),
        getAllCourses(),
      ]);

      const normalizedPosts = (posts || [])
        .filter((post) => post.mediaType !== 'short_video')
        .map((post) => ({
          ...post,
          __feedType: 'post',
          __sortDate: post.$createdAt,
        }));

      const normalizedCourses = (courses || []).map((course) => ({
        ...course,
        __feedType: 'course',
        __sortDate: course.$createdAt,
      }));

      const mixedFeed = [...normalizedPosts, ...normalizedCourses].sort(
        (a, b) => new Date(b.__sortDate) - new Date(a.__sortDate)
      );

      setFeedItems(mixedFeed);
    } catch (error) {
      console.log('buildHomeFeed error:', error);
    } finally {
      setFeedLoading(false);
    }
  };

  const loadMlRecommendations = async () => {
    if (!user?.$id) return;

    setMlLoading(true);

    try {
      const result = await getUserContentRecommendations(user.$id);
      setMlRecommendations(result);
    } catch (error) {
      console.log('load ml recommendations error:', error);

      setMlRecommendations({
        trained: false,
        recommendations: [],
        samples: 0,
        model: 'Studdy ML recommendations',
        reason: 'Не вдалося завантажити рекомендації.',
      });
    } finally {
      setMlLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      buildHomeFeed();
      loadMlRecommendations();
    }, [user?.$id])
  );

  const onRefresh = async () => {
    setRefreshing(true);

    await Promise.all([
      buildHomeFeed(),
      loadMlRecommendations(),
    ]);

    setRefreshing(false);
  };

  const renderFeedItem = ({ item }) => {
    if (item.__feedType === 'course') {
      return <CourseFeedCard course={item} user={user} />;
    }

    return <PostCard post={item} />;
  };

  const emptyTitle = feedLoading
    ? 'Завантаження...'
    : 'Публікацій поки немає';

  const emptySubtitle = feedLoading
    ? 'Studdy завантажує освітню стрічку.'
    : 'Створи перший освітній допис або курс для спільноти Studdy.';

  return (
    <SafeAreaView className="bg-primary h-full">
      <FlatList
        data={feedItems}
        keyExtractor={(item) => `${item.__feedType}-${item.$id}`}
        renderItem={renderFeedItem}
        ListHeaderComponent={() => (
          <View className="my-6 px-4">
            <View className="justify-between items-start flex-row mb-6">
              <View className="flex-1 pr-4">
                <Text className="font-pmedium text-sm text-gray-100">
                  Вітаємо у Studdy,
                </Text>

                <Text className="text-2xl font-psemibold text-white mt-1">
                  {user?.username || 'студенте'}
                </Text>
              </View>

              <Image
                source={images.logoSmall}
                className="w-9 h-10"
                resizeMode="contain"
              />
            </View>

            <SearchInput />

            <MlRecommendationsBlock
              ml={mlRecommendations}
              loading={mlLoading}
              user={user}
            />

            <Text className="text-lg text-gray-100 font-pregular mt-6 mb-4">
              Освітня стрічка
            </Text>
          </View>
        )}
        ListEmptyComponent={() => (
          <EmptyState
            title={emptyTitle}
            subtitle={emptySubtitle}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </SafeAreaView>
  );
};

export default Home;
