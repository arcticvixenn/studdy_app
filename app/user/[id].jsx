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
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import PostCard from '../../components/PostCard';
import InfoBox from '../../components/InfoBox';
import EmptyState from '../../components/EmptyState';
import { useGlobalContext } from '../../context/GlobalProvider';
import {
  getFollowState,
  getFollowersCount,
  getFollowingCount,
  getUserById,
  getUserPosts,
  toggleFollow,
} from '../../lib/appwrite';

const UserProfile = () => {
  const { id } = useLocalSearchParams();
  const targetUserId = Array.isArray(id) ? id[0] : id;

  const { user } = useGlobalContext();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [isFollowing, setIsFollowing] = useState(false);
  const [followId, setFollowId] = useState(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    setLoading(true);

    try {
      const [
        profileData,
        postsData,
        followers,
        following,
        followState,
      ] = await Promise.all([
        getUserById(targetUserId),
        getUserPosts(targetUserId),
        getFollowersCount(targetUserId),
        getFollowingCount(targetUserId),
        getFollowState(targetUserId, user?.$id),
      ]);

      setProfile(profileData);
      setPosts(postsData);
      setFollowersCount(followers);
      setFollowingCount(following);
      setIsFollowing(followState.isFollowing);
      setFollowId(followState.followId);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [targetUserId, user?.$id])
  );

  const handleFollow = async () => {
    if (!user?.$id || followLoading) return;

    setFollowLoading(true);

    try {
      const nextState = await toggleFollow({
        targetUserId,
        user,
        isFollowing,
        currentFollowId: followId,
      });

      setIsFollowing(nextState.isFollowing);
      setFollowId(nextState.followId);
      setFollowersCount((prev) =>
        nextState.isFollowing ? prev + 1 : Math.max(prev - 1, 0)
      );
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="bg-primary h-full justify-center items-center">
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="bg-primary h-full">
      <FlatList
        data={posts}
        keyExtractor={(item) => item.$id}
        renderItem={({ item }) => <PostCard post={item} />}
        ListHeaderComponent={() => (
          <View className="w-full justify-center items-center mt-6 mb-8 px-4">
            <TouchableOpacity className="w-full mb-6" onPress={() => router.back()}>
              <Text className="text-secondary font-psemibold">← Назад</Text>
            </TouchableOpacity>

            <View className="w-20 h-20 border border-secondary rounded-2xl justify-center items-center">
              {profile?.avatar ? (
                <Image
                  source={{ uri: profile.avatar }}
                  className="w-[92%] h-[92%] rounded-2xl"
                  resizeMode="cover"
                />
              ) : null}
            </View>

            <InfoBox
              title={profile?.username || 'Користувач Studdy'}
              subtitle="Навчальний профіль"
              containerStyles="mt-5"
              titleStyles="text-lg"
            />

            <View className="mt-6 flex-row">
              <InfoBox
                title={followersCount}
                subtitle="Підписників"
                containerStyles="mr-10"
                titleStyles="text-xl"
              />

              <InfoBox
                title={followingCount}
                subtitle="Підписок"
                titleStyles="text-xl"
              />
            </View>

            {profile?.$id !== user?.$id && (
              <TouchableOpacity
                onPress={handleFollow}
                disabled={followLoading}
                className={`mt-8 px-6 py-4 rounded-2xl ${
                  isFollowing ? 'bg-black-100 border border-secondary' : 'bg-secondary'
                }`}
              >
                <Text
                  className={`font-psemibold ${
                    isFollowing ? 'text-secondary' : 'text-primary'
                  }`}
                >
                  {followLoading
                    ? '...'
                    : isFollowing
                    ? 'Відписатися'
                    : 'Підписатися'}
                </Text>
              </TouchableOpacity>
            )}

            <Text className="w-full text-lg text-gray-100 font-pregular mt-8 mb-4">
              Публікації
            </Text>
          </View>
        )}
        ListEmptyComponent={() => (
          <EmptyState
            title="Публікацій поки немає"
            subtitle="Цей користувач ще нічого не опублікував."
          />
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </SafeAreaView>
  );
};

export default UserProfile;