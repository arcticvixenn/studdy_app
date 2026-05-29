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
  getAllPosts,
  getUserContentRecommendations,
} from '../../lib/appwrite';
import useAppwrite from '../../lib/useAppwrite';
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
    <View className="bg-primary border border-black-200 rounded-xl p-3 mr-3 w-72">
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-secondary text-xs font-psemibold">
          {getTypeLabel()}
        </Text>

        <Text className="text-gray-100 text-xs">
          {item.score ? `${item.score}% збіг` : 'Рекомендовано'}
        </Text>
      </View>

      <Text className="text-white font-psemibold" numberOfLines={2}>
        {item.title || 'Навчальний матеріал'}
      </Text>

      <Text className="text-gray-100 text-xs mt-2" numberOfLines={3}>
        {item.reason || 'Рекомендовано ML-моделлю Studdy.'}
      </Text>

      <TouchableOpacity
        onPress={openRecommendation}
        activeOpacity={0.85}
        className="bg-secondary rounded-xl p-3 mt-4"
      >
        <Text className="text-primary text-center font-psemibold">
          Відкрити
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const MlRecommendationsBlock = ({ ml, loading, user }) => {
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
      <Text className="text-white text-lg font-psemibold">
        Рекомендації для тебе
      </Text>

      <Text className="text-gray-100 text-sm leading-5 mt-2">
        Studdy підібрав матеріали на основі твоїх відповідей, слабких тем,
        пошукової активності, переглядів і схожості контенту.
      </Text>

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

      {ml.recommendations?.length ? (
        <FlatList
          data={ml.recommendations}
          keyExtractor={(item, index) => `${item.type}-${item.id}-${index}`}
          renderItem={({ item }) => (
            <RecommendationCard item={item} user={user} />
          )}
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-4"
        />
      ) : (
        <Text className="text-gray-100 text-sm mt-4">
          Поки немає матеріалів для персональних рекомендацій.
        </Text>
      )}
    </View>
  );
};

const Home = () => {
  const { user } = useGlobalContext();
  const { data: posts, refetch } = useAppwrite(getAllPosts);

  const [refreshing, setRefreshing] = useState(false);
  const [mlRecommendations, setMlRecommendations] = useState(null);
  const [mlLoading, setMlLoading] = useState(false);

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
      refetch();
      loadMlRecommendations();
    }, [user?.$id])
  );

  const onRefresh = async () => {
    setRefreshing(true);

    await Promise.all([
      refetch(),
      loadMlRecommendations(),
    ]);

    setRefreshing(false);
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <FlatList
        data={posts ?? []}
        keyExtractor={(item) => item.$id}
        renderItem={({ item }) => <PostCard post={item} />}
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
            title="Публікацій поки немає"
            subtitle="Створи перший освітній допис для спільноти Studdy."
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