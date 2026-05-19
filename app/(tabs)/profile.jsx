import { useCallback, useState } from 'react';
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

import { icons } from '../../constants';
import EmptyState from '../../components/EmptyState';
import PostCard from '../../components/PostCard';
import InfoBox from '../../components/InfoBox';
import {
  getFollowersCount,
  getFollowingCount,
  getSavedPosts,
  getUserPosts,
  signOut,
} from '../../lib/appwrite';
import useAppwrite from '../../lib/useAppwrite';
import { useGlobalContext } from '../../context/GlobalProvider';

const Profile = () => {
  const { user, setUser, setIsLoggedIn } = useGlobalContext();

  const [activeTab, setActiveTab] = useState('posts');
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const {
    data: posts,
    refetch: refetchPosts,
  } = useAppwrite(() => {
    if (!user?.$id) {
      return Promise.resolve([]);
    }

    return getUserPosts(user.$id);
  });

  const {
    data: savedPosts,
    refetch: refetchSavedPosts,
  } = useAppwrite(() => {
    if (!user?.$id) {
      return Promise.resolve([]);
    }

    return getSavedPosts(user.$id);
  });

  useFocusEffect(
    useCallback(() => {
      refetchPosts();
      refetchSavedPosts();

      if (user?.$id) {
        getFollowersCount(user.$id).then(setFollowersCount);
        getFollowingCount(user.$id).then(setFollowingCount);
      }
    }, [user?.$id])
  );

  const logout = async () => {
    await signOut();
    setUser(null);
    setIsLoggedIn(false);
    router.replace('/sign-in');
  };

  const currentData =
    activeTab === 'posts' ? posts ?? [] : savedPosts ?? [];

  return (
    <SafeAreaView className="bg-primary h-full">
      <FlatList
        data={currentData}
        keyExtractor={(item) => item.$id}
        renderItem={({ item }) => <PostCard post={item} />}
        ListHeaderComponent={() => (
          <View className="w-full justify-center items-center mt-6 mb-8 px-4">
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
              {user?.avatar ? (
                <Image
                  source={{ uri: user.avatar }}
                  className="w-[92%] h-[92%] rounded-2xl"
                  resizeMode="cover"
                />
              ) : null}
            </View>

            <InfoBox
              title={user?.username || 'Користувач Studdy'}
              subtitle="Особистий навчальний профіль"
              containerStyles="mt-5"
              titleStyles="text-lg"
            />

            <View className="mt-6 flex-row flex-wrap justify-center">
              <InfoBox
                title={(posts ?? []).length}
                subtitle="Публікацій"
                containerStyles="mr-6 mb-4"
                titleStyles="text-xl"
              />

              <InfoBox
                title={followersCount}
                subtitle="Підписників"
                containerStyles="mr-6 mb-4"
                titleStyles="text-xl"
              />

              <InfoBox
                title={followingCount}
                subtitle="Підписок"
                containerStyles="mb-4"
                titleStyles="text-xl"
              />
            </View>

            <View className="w-full flex-row bg-black-100 border border-black-200 rounded-2xl p-1 mt-6">
              <TouchableOpacity
                onPress={() => setActiveTab('posts')}
                className={`flex-1 py-3 rounded-xl items-center ${
                  activeTab === 'posts' ? 'bg-secondary' : ''
                }`}
              >
                <Text
                  className={`font-psemibold ${
                    activeTab === 'posts'
                      ? 'text-primary'
                      : 'text-gray-100'
                  }`}
                >
                  Мої публікації
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('saved')}
                className={`flex-1 py-3 rounded-xl items-center ${
                  activeTab === 'saved' ? 'bg-secondary' : ''
                }`}
              >
                <Text
                  className={`font-psemibold ${
                    activeTab === 'saved'
                      ? 'text-primary'
                      : 'text-gray-100'
                  }`}
                >
                  Збережене
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <EmptyState
            title={
              activeTab === 'posts'
                ? 'Власних публікацій поки немає'
                : 'Збережених публікацій поки немає'
            }
            subtitle={
              activeTab === 'posts'
                ? 'Створи перший допис і почни формувати свою навчальну активність.'
                : 'Натискай на закладку в постах, щоб зберігати корисні матеріали.'
            }
          />
        )}
        contentContainerStyle={{
          paddingBottom: 24,
        }}
      />
    </SafeAreaView>
  );
};

export default Profile;