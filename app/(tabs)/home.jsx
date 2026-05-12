import { View, Text, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList } from 'react-native';
import { useState } from 'react';

import { images } from '../../constants';
import SearchInput from '../../components/SearchInput';
import Trending from '../../components/Trending';
import EmptyState from '../../components/EmptyState';
import { getAllPosts, getLatestPosts } from '../../lib/appwrite';
import useAppwrite from '../../lib/useAppwrite';
import VideoCard from '../../components/VideoCard';
import { useGlobalContext } from '../../context/GlobalProvider';

const Home = () => {
  const { user } = useGlobalContext();

  const { data: posts, refetch } = useAppwrite(getAllPosts);
  const { data: latestPosts } = useAppwrite(getLatestPosts);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <FlatList
        data={posts}
        keyExtractor={(item) => item.$id}
        renderItem={({ item }) => <VideoCard video={item} />}
        ListHeaderComponent={() => (
          <View className="my-6 px-4 space-y-6">
            <View className="justify-between items-start flex-row mb-6">
              <View className="flex-1 pr-4">
                <Text className="font-pmedium text-sm text-gray-100">
                  Вітаємо у Studdy,
                </Text>

                <Text className="text-2xl font-psemibold text-white mt-1">
                  {user?.username || 'студенте'}
                </Text>

                <Text className="text-sm font-pregular text-gray-100 mt-3 leading-5">
                  Тут з’являтимуться освітні публікації, рекомендації та
                  обговорення, які допомагатимуть вчитися ефективніше.
                </Text>
              </View>

              <View className="mt-1.5">
                <Image
                  source={images.logoSmall}
                  className="w-9 h-10"
                  resizeMode="contain"
                />
              </View>
            </View>

            <SearchInput />

            <View className="bg-black-100 border border-black-200 rounded-2xl p-4">
              <Text className="text-white text-base font-psemibold mb-2">
                Майбутня персоналізація
              </Text>

              <Text className="text-gray-100 text-sm font-pregular leading-5">
                Після підключення ML-системи цей блок буде показувати
                індивідуальні матеріали, рекомендовані теми та персональні
                навчальні підказки.
              </Text>
            </View>

            <View className="w-full flex-1 pt-2 pb-8 mt-2">
              <Text className="text-gray-100 text-lg font-pregular mb-3">
                Останні публікації спільноти
              </Text>

              <Trending posts={latestPosts ?? []} />
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <EmptyState
            title="Публікацій поки немає"
            subtitle="Створи першу освітню публікацію для спільноти Studdy."
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </SafeAreaView>
  );
};

export default Home;