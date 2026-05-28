import { useState } from 'react';
import { router, usePathname } from 'expo-router';
import {
  View,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
} from 'react-native';

import { icons } from '../constants';
import { createSearchEvent } from '../lib/appwrite';
import { useGlobalContext } from '../context/GlobalProvider';

const SearchInput = ({ initialQuery, refetch }) => {
  const pathname = usePathname();
  const { user } = useGlobalContext();

  const [query, setQuery] = useState(initialQuery || '');

  const handleSearch = async () => {
    const normalizedQuery = query.trim();

    if (normalizedQuery === '') {
      return Alert.alert(
        'Порожній запит',
        'Введіть тему або ключове слово для пошуку.'
      );
    }

    await createSearchEvent({
      userId: user?.$id,
      permissionUserId: user?.accountId || user?.$id,
      query: normalizedQuery,
      screen: pathname?.startsWith('/search') ? 'search' : 'home',
    });

    if (pathname.startsWith('/search')) {
      router.setParams({ query: normalizedQuery });

      if (refetch) {
        refetch();
      }
    } else {
      router.push(`/search/${encodeURIComponent(normalizedQuery)}`);
    }
  };

  return (
    <View className="flex flex-row items-center space-x-4 w-full h-16 px-4 bg-black-100 rounded-2xl border-2 border-black-200">
      <TextInput
        className="text-base mt-0.5 text-white flex-1 font-pregular"
        value={query}
        placeholder="Знайдіть тему, матеріал або публікацію"
        placeholderTextColor="#CDCDE0"
        onChangeText={(value) => setQuery(value)}
        returnKeyType="search"
        onSubmitEditing={handleSearch}
      />

      <TouchableOpacity onPress={handleSearch}>
        <Image
          source={icons.search}
          className="w-5 h-5"
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );
};

export default SearchInput;