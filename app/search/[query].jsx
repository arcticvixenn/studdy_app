import { useEffect } from 'react';
import { FlatList, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';

import SearchInput from '../../components/SearchInput';
import EmptyState from '../../components/EmptyState';
import PostCard from '../../components/PostCard';
import { searchPosts } from '../../lib/appwrite';
import useAppwrite from '../../lib/useAppwrite';

const Search = () => {
  const { query } = useLocalSearchParams();

  const normalizedQuery = Array.isArray(query) ? query[0] : query || '';

  const { data: posts, refetch } = useAppwrite(() =>
    searchPosts(normalizedQuery)
  );

  useEffect(() => {
    refetch();
  }, [normalizedQuery]);

  return (
    <SafeAreaView className="bg-primary h-full">
      <FlatList
        data={posts ?? []}
        keyExtractor={(item) => item.$id}
        renderItem={({ item }) => <PostCard post={item} />}
        ListHeaderComponent={() => (
          <View className="px-4 my-6">
            <Text className="font-pmedium text-sm text-gray-100">
              Результати пошуку
            </Text>

            <Text className="text-2xl font-psemibold text-white mt-1 mb-6">
              {normalizedQuery}
            </Text>

            <SearchInput
              initialQuery={normalizedQuery}
              refetch={refetch}
            />
          </View>
        )}
        ListEmptyComponent={() => (
          <EmptyState
            title="Нічого не знайдено"
            subtitle="Спробуй інше ключове слово або створи власний допис на цю тему."
          />
        )}
        contentContainerStyle={{
          paddingBottom: 24,
        }}
      />
    </SafeAreaView>
  );
};

export default Search;