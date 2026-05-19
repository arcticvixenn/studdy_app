import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { icons } from '../constants';
import { useGlobalContext } from '../context/GlobalProvider';
import {
  getPostLikeState,
  togglePostLike,
  getPostCommentsCount,
  getPostSaveState,
  togglePostSave,
} from '../lib/appwrite';

const PostCard = ({ post }) => {
  const { user } = useGlobalContext();

  const [likesCount, setLikesCount] = useState(post.likesCount ?? 0);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount ?? 0);

  const [isLiked, setIsLiked] = useState(false);
  const [likeId, setLikeId] = useState(null);
  const [likeLoading, setLikeLoading] = useState(false);

  const [isSaved, setIsSaved] = useState(false);
  const [saveId, setSaveId] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadStates = async () => {
      const [likeState, actualCommentsCount, saveState] = await Promise.all([
        getPostLikeState(post.$id, user?.$id),
        getPostCommentsCount(post.$id),
        getPostSaveState(post.$id, user?.$id),
      ]);

      if (isMounted) {
        setLikesCount(likeState.likesCount);
        setIsLiked(likeState.isLiked);
        setLikeId(likeState.likeId);
        setCommentsCount(actualCommentsCount);
        setIsSaved(saveState.isSaved);
        setSaveId(saveState.saveId);
      }
    };

    loadStates();

    return () => {
      isMounted = false;
    };
  }, [post.$id, user?.$id]);

  const handleLike = async () => {
    if (!user?.$id || likeLoading) return;

    setLikeLoading(true);

    try {
      const nextState = await togglePostLike({
        postId: post.$id,
        user,
        currentLikeId: likeId,
        isLiked,
      });

      setLikesCount(nextState.likesCount);
      setIsLiked(nextState.isLiked);
      setLikeId(nextState.likeId);
    } finally {
      setLikeLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.$id || saveLoading) return;

    setSaveLoading(true);

    try {
      const nextState = await togglePostSave({
        postId: post.$id,
        user,
        currentSaveId: saveId,
        isSaved,
      });

      setIsSaved(nextState.isSaved);
      setSaveId(nextState.saveId);
    } finally {
      setSaveLoading(false);
    }
  };

  const openAuthorProfile = () => {
    if (post.authorId === user?.$id) {
      router.push('/profile');
    } else {
      router.push(`/user/${post.authorId}`);
    }
  };

  return (
    <View className="bg-black-100 border border-black-200 rounded-2xl mx-4 mb-5 p-4">
      <TouchableOpacity
        onPress={openAuthorProfile}
        activeOpacity={0.8}
        className="flex-row items-center mb-4"
      >
        <Image
          source={{ uri: post.authorAvatar }}
          className="w-11 h-11 rounded-xl mr-3"
          resizeMode="cover"
        />

        <View className="flex-1">
          <Text className="text-white font-psemibold">
            {post.authorName}
          </Text>

          <Text className="text-gray-100 text-xs">
            {post.category}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push(`/post/${post.$id}`)}
      >
        <Text className="text-white text-lg font-psemibold mb-2">
          {post.title}
        </Text>

        <Text className="text-gray-100 text-sm leading-5">
          {post.content}
        </Text>

        {post.mediaType === 'image' && post.imageUrl && (
          <Image
            source={{ uri: post.imageUrl }}
            className="w-full h-52 rounded-2xl mt-4"
            resizeMode="cover"
          />
        )}

        {post.mediaType === 'video' && post.thumbnailUrl && (
          <View className="relative mt-4">
            <Image
              source={{ uri: post.thumbnailUrl }}
              className="w-full h-52 rounded-2xl"
              resizeMode="cover"
            />

            <Image
              source={icons.play}
              className="w-14 h-14 absolute self-center top-[78px]"
              resizeMode="contain"
            />
          </View>
        )}
      </TouchableOpacity>

      <View className="flex-row mt-4 pt-4 border-t border-black-200 items-center">
        <TouchableOpacity
          onPress={handleLike}
          activeOpacity={0.8}
          className="flex-row items-center mr-6"
        >
          {likeLoading ? (
            <ActivityIndicator size="small" />
          ) : (
            <Text
              className={`text-base font-psemibold ${
                isLiked ? 'text-secondary' : 'text-gray-100'
              }`}
            >
              {isLiked ? '♥' : '♡'}
            </Text>
          )}

          <Text className="text-gray-100 ml-2">{likesCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push(`/post/${post.$id}`)}
          activeOpacity={0.8}
          className="flex-row items-center mr-6"
        >
          <Text className="text-gray-100">💬 {commentsCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSave}
          activeOpacity={0.8}
          className="flex-row items-center"
        >
          {saveLoading ? (
            <ActivityIndicator size="small" />
          ) : (
            <Text
              className={`text-base ${
                isSaved ? 'text-secondary' : 'text-gray-100'
              }`}
            >
              🔖
            </Text>
          )}

          <Text className="text-gray-100 ml-2">
            {isSaved ? 'Збережено' : 'Зберегти'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PostCard;