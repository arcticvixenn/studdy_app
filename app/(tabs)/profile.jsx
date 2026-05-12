import { View, Text, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlatList } from 'react-native';
import { router } from 'expo-router';

import { icons } from '../../constants';
import EmptyState from '../../components/EmptyState';
import { getUserPosts, signOut } from '../../lib/appwrite';
import useAppwrite from '../../lib/useAppwrite';
import VideoCard from '../../components/VideoCard';
import { useGlobalContext } from '../../context/GlobalProvider';
import InfoBox from '../../components/InfoBox';

const Profile = () => {
  const { user, setUser, setIsLoggedIn } = useGlobalContext();

  const { data: posts } = useAppwrite(() => {
    if (!user?.$id) {
      return Promise.resolve([]);
    }

    return getUserPosts(user.$id);
  });

  const logout = async () => {
    await signOut();
    setUser(null);
    setIsLoggedIn(false);
    router.replace('/sign-in');
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <FlatList
        data={posts ?? []}
        keyExtractor={(item) => item.$id}
        renderItem={({ item }) => <VideoCard video={item} />}
        ListHeaderComponent={() => (
          <View className="w-full justify-center items-center mt-6 mb-12 px-4">
            <TouchableOpacity
              className="w-full items-end mb-10"
              onPress={logout}
            >
              <Image
                source={icons.logout}
                resizeMode="contain"
                className="w-6 h-6"
              />
            </TouchableOpacity>

            <View className="w-20 h-20 border border-secondary rounded-2xl justify-center items-center">
              <Image
                source={{ uri: user?.avatar }}
                className="w-[92%] h-[92%] rounded-2xl"
                resizeMode="cover"
              />
            </View>

            <InfoBox
              title={user?.username || 'Користувач Studdy'}
              subtitle="Особистий навчальний профіль"
              containerStyles="mt-5"
              titleStyles="text-lg"
            />

            <View className="mt-6 flex-row">
              <InfoBox
                title={(posts ?? []).length}
                subtitle="Публікацій"
                containerStyles="mr-10"
                titleStyles="text-xl"
              />

              <InfoBox
                title="0"
                subtitle="Підписників"
                titleStyles="text-xl"
              />
            </View>

            <View className="w-full bg-black-100 border border-black-200 rounded-2xl p-4 mt-8">
              <Text className="text-white text-base font-psemibold mb-2">
                Майбутня аналітика навчання
              </Text>

              <Text className="text-gray-100 text-sm font-pregular leading-5">
                Тут з’являться прогрес за темами, кількість пройдених тестів,
                слабкі знання та персональні ML-рекомендації.
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <EmptyState
            title="Власних публікацій поки немає"
            subtitle="Створи перший допис і почни формувати свою навчальну активність."
          />
        )}
      />
    </SafeAreaView>
  );
};

export default Profile;