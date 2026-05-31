import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import SearchInput from '../../components/SearchInput';
import EmptyState from '../../components/EmptyState';
import { useGlobalContext } from '../../context/GlobalProvider';
import {
  createSearchEvent,
  searchContentWithNlp,
} from '../../lib/appwrite';

const getTypeLabel = (type) => {
  if (type === 'course') return 'Курс';
  if (type === 'lesson') return 'Урок';
  if (type === 'post') return 'Пост';
  return 'Матеріал';
};

const openSearchResult = (item) => {
  if (!item?.id) return;

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

const SearchResultCard = ({ item }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => openSearchResult(item)}
      className="bg-black-100 border border-black-200 rounded-3xl p-4 mb-4"
    >
      <View className="flex-row justify-between items-start mb-2">
        <View className="bg-secondary/15 border border-secondary/30 rounded-full px-3 py-1">
          <Text className="text-secondary text-xs font-psemibold">
            {getTypeLabel(item.type)}
          </Text>
        </View>

        <View className="bg-primary rounded-full px-3 py-1">
          <Text className="text-gray-100 text-xs font-psemibold">
            {item.searchScore || 0}% збіг
          </Text>
        </View>
      </View>

      <Text className="text-white text-lg font-psemibold mt-2">
        {item.title || item.name || 'Навчальний матеріал'}
      </Text>

      {item.category ? (
        <Text className="text-secondary text-sm font-pmedium mt-2">
          {item.category}
        </Text>
      ) : null}

      {item.description || item.content ? (
        <Text
          className="text-gray-100 text-sm mt-3 leading-5"
          numberOfLines={3}
        >
          {item.description || item.content}
        </Text>
      ) : null}

      <View className="bg-primary border border-black-200 rounded-2xl px-3 py-3 mt-4">
        <Text className="text-gray-100 text-xs leading-5">
          {item.reason || 'Знайдено через NLP-схожість тексту.'}
        </Text>

        <Text className="text-gray-100 text-xs mt-2">
          NLP similarity: {Math.round((item.textSimilarity || 0) * 100)}% · Coverage: {Math.round((item.tokenCoverage || 0) * 100)}%
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const Search = () => {
  const { query } = useLocalSearchParams();
  const { user } = useGlobalContext();

  const normalizedQuery = Array.isArray(query) ? query[0] : query;

  const [loading, setLoading] = useState(true);
  const [searchModel, setSearchModel] = useState('NLP text similarity search');
  const [results, setResults] = useState([]);

  const loadSearchResults = async () => {
    if (!normalizedQuery?.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const response = await searchContentWithNlp({
        query: normalizedQuery,
        limit: 40,
      });

      setResults(response?.results || []);
      setSearchModel(response?.modelType || 'NLP text similarity search');

      if (user?.$id) {
        await createSearchEvent({
          userId: user.$id,
          permissionUserId: user.accountId,
          query: normalizedQuery,
          resultCount: response?.resultCount || response?.results?.length || 0,
        });
      }
    } catch (error) {
      console.log('NLP search error:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSearchResults();
    }, [normalizedQuery, user?.$id])
  );

  return (
    <SafeAreaView className="bg-primary h-full">
      <FlatList
        data={results}
        keyExtractor={(item, index) => `${item.type}-${item.id}-${index}`}
        renderItem={({ item }) => <SearchResultCard item={item} />}
        ListHeaderComponent={() => (
          <View className="px-4 pt-5 pb-4">
            <Text className="text-white text-3xl font-psemibold">
              Розумний пошук
            </Text>

            <Text className="text-gray-100 text-sm mt-3 leading-5">
              Studdy шукає не тільки точний збіг слів, а й схожі за змістом курси,
              уроки та публікації.
            </Text>

            <View className="mt-5">
              <SearchInput initialQuery={normalizedQuery} />
            </View>

            <View className="bg-black-100 border border-black-200 rounded-3xl p-4 mt-5">
              <Text className="text-gray-100 text-sm">
                Запит:
              </Text>

              <Text className="text-white text-xl font-psemibold mt-1">
                {normalizedQuery}
              </Text>

              <Text className="text-secondary text-xs font-psemibold mt-3">
                Модель: {searchModel}
              </Text>

              <Text className="text-gray-100 text-xs mt-2">
                Знайдено результатів: {results.length}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={() =>
          loading ? (
            <View className="py-16 items-center">
              <ActivityIndicator size="large" color="#FF9C01" />
              <Text className="text-gray-100 mt-4">
                Studdy аналізує схожість текстів...
              </Text>
            </View>
          ) : (
            <EmptyState
              title="Нічого не знайдено"
              subtitle="Спробуй інший запит або більш загальну тему."
            />
          )
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 40,
        }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

export default Search;
