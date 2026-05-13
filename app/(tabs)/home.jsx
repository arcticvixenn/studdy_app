import { useState } from 'react';
import { FlatList, Image, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { images } from '../../constants';
import SearchInput from '../../components/SearchInput';
import EmptyState from '../../components/EmptyState';
import PostCard from '../../components/PostCard';
import { getAllPosts } from '../../lib/appwrite';
import useAppwrite from '../../lib/useAppwrite';
import { useGlobalContext } from '../../context/GlobalProvider';

const Home = () => {
  const { user } = useGlobalContext();
  const { data: posts, refetch } = useAppwrite(getAllPosts);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
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

                <Text className="text-sm font-pregular text-gray-100 mt-3 leading-5">
                  Читайте пояснення, ставте питання та діліться власними
                  навчальними напрацюваннями.
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

            <View className="bg-black-100 border border-black-200 rounded-2xl p-4 mt-6 mb-6">
              <Text className="text-white text-base font-psemibold mb-2">
                Підготовка до персоналізації
              </Text>

              <Text className="text-gray-100 text-sm font-pregular leading-5">
                Згодом цей блок буде наповнюватися рекомендаціями матеріалів,
                темами для повторення та ML-підказками на основі навчальної
                активності користувача.
              </Text>
            </View>

            <Text className="text-lg text-gray-100 font-pregular mb-4">
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
        contentContainerStyle={{
          paddingBottom: 24,
        }}
      />
    </SafeAreaView>
  );
};

export default Home;