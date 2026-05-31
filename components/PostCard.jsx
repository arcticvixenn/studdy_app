import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { router } from 'expo-router';

import { icons } from '../constants';
import { useGlobalContext } from '../context/GlobalProvider';
import {
  awardXp,
  completeDailyQuestIfMatches,
  deletePost,
  getPostLikeState,
  togglePostLike,
  getPostCommentsCount,
  getPostSaveState,
  togglePostSave,
} from '../lib/appwrite';

const PostCard = ({ post, onDeleted }) => {
  const { user } = useGlobalContext();

  const [likesCount, setLikesCount] = useState(post.likesCount ?? 0);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount ?? 0);

  const [isLiked, setIsLiked] = useState(false);
  const [likeId, setLikeId] = useState(null);
  const [likeLoading, setLikeLoading] = useState(false);

  const [isSaved, setIsSaved] = useState(false);
  const [saveId, setSaveId] = useState(null);
  const [saveLoading, setSaveLoading] = useState(false);

  const [deleteLoading, setDeleteLoading] = useState(false);

  const isOwner = post.authorId === user?.$id;
  const isVideo = post.mediaType === 'video' && post.videoUrl;
  const isShort = post.videoType === 'short';

  useEffect(() => {
    let isMounted = true;

    const loadStates = async () => {
      if (!post?.$id) return;

      try {
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
      } catch (error) {
        console.log('load post card state error:', error);
      }
    };

    loadStates();

    return () => {
      isMounted = false;
    };
  }, [post?.$id, user?.$id]);

  const handleLike = async () => {
    if (!user?.$id || likeLoading) return;

    setLikeLoading(true);

    try {
      const wasLiked = isLiked;

      const nextState = await togglePostLike({
        postId: post.$id,
        user,
        currentLikeId: likeId,
        isLiked,
      });

      setLikesCount(nextState.likesCount);
      setIsLiked(nextState.isLiked);
      setLikeId(nextState.likeId);

      if (!wasLiked && nextState.isLiked) {
        try {
          await awardXp({
            userId: user.$id,
            points: 10,
            source: 'like',
            sourceId: post.$id,
            sourceType: 'post',
            reason: 'Лайк навчального матеріалу',
            topic: post.category || '',
          });
        } catch (xpError) {
          console.log('like XP error:', xpError);
        }
      }
    } finally {
      setLikeLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user?.$id || saveLoading) return;

    setSaveLoading(true);

    try {
      const wasSaved = isSaved;

      const nextState = await togglePostSave({
        postId: post.$id,
        user,
        currentSaveId: saveId,
        isSaved,
      });

      setIsSaved(nextState.isSaved);
      setSaveId(nextState.saveId);

      if (!wasSaved && nextState.isSaved) {
        try {
          await awardXp({
            userId: user.$id,
            points: 20,
            source: 'save',
            sourceId: post.$id,
            sourceType: 'post',
            reason: 'Збереження корисного матеріалу',
            topic: post.category || '',
          });

          await completeDailyQuestIfMatches(user.$id, 'save');
        } catch (xpError) {
          console.log('save XP error:', xpError);
        }
      }
    } finally {
      setSaveLoading(false);
    }
  };

  const confirmDelete = () => {
    if (Platform.OS === 'web') {
      return window.confirm('Видалити публікацію?');
    }

    return new Promise((resolve) => {
      Alert.alert(
        'Видалити публікацію?',
        'Цю дію не можна буде скасувати.',
        [
          { text: 'Скасувати', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Видалити', style: 'destructive', onPress: () => resolve(true) },
        ]
      );
    });
  };

  const handleDelete = async () => {
    if (!isOwner || deleteLoading) return;

    const confirmed = await confirmDelete();
    if (!confirmed) return;

    setDeleteLoading(true);

    try {
      await deletePost(post.$id);

      if (onDeleted) {
        onDeleted(post.$id);
      }
    } catch (error) {
      console.log('deletePost error:', error);

      if (Platform.OS === 'web') {
        window.alert(error.message || 'Не вдалося видалити публікацію.');
      } else {
        Alert.alert('Помилка', error.message || 'Не вдалося видалити публікацію.');
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  const openAuthorProfile = () => {
    if (post.authorId === user?.$id) {
      router.push('/profile');
    } else {
      router.push(`/user/${post.authorId}`);
    }
  };

  const openPost = () => {
    router.push(`/post/${post.$id}`);
  };

  return (
    <View className="bg-black-100 border border-black-200 rounded-2xl mx-4 mb-5 p-4">
      <TouchableOpacity
        onPress={openAuthorProfile}
        activeOpacity={0.8}
        className="flex-row items-center mb-4"
      >
        {post.authorAvatar ? (
          <Image
            source={{ uri: post.authorAvatar }}
            className="w-11 h-11 rounded-xl mr-3"
            resizeMode="cover"
          />
        ) : (
          <View className="w-11 h-11 rounded-xl mr-3 bg-secondary justify-center items-center">
            <Text className="text-primary font-pbold">
              {(post.authorName || 'S').slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}

        <View className="flex-1">
          <Text className="text-white font-psemibold">
            {post.authorName || 'Studdy User'}
          </Text>

          <Text className="text-gray-100 text-xs">
            {post.category || 'Навчальний матеріал'}
          </Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity activeOpacity={0.9} onPress={openPost}>
        <Text className="text-white text-lg font-psemibold mb-2">
          {post.title}
        </Text>

        <Text className="text-gray-100 text-sm leading-5">
          {post.content}
        </Text>
      </TouchableOpacity>

      {post.mediaType === 'image' && post.imageUrl && (
        <TouchableOpacity activeOpacity={0.9} onPress={openPost}>
          <Image
            source={{ uri: post.imageUrl }}
            className="w-full h-52 rounded-2xl mt-4"
            resizeMode="cover"
          />
        </TouchableOpacity>
      )}

      {isVideo && (
        <View
          className="w-full rounded-2xl overflow-hidden bg-black-200 mt-4"
          style={{ height: isShort ? 360 : 220 }}
        >
          <Video
            source={{ uri: post.videoUrl }}
            style={{ width: '100%', height: '100%' }}
            useNativeControls
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={false}
            isLooping={isShort}
            posterSource={post.thumbnailUrl ? { uri: post.thumbnailUrl } : undefined}
            usePoster={Boolean(post.thumbnailUrl)}
          />
        </View>
      )}

      {post.mediaType === 'video' && !post.videoUrl && post.thumbnailUrl && (
        <TouchableOpacity activeOpacity={0.9} onPress={openPost} className="relative mt-4">
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
        </TouchableOpacity>
      )}

      <View className="flex-row mt-4 pt-4 border-t border-black-200 items-center flex-wrap">
        <TouchableOpacity
          onPress={handleLike}
          activeOpacity={0.8}
          className="flex-row items-center mr-6 mb-2"
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

          <Text className="text-gray-100 ml-2">
            {likesCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={openPost}
          activeOpacity={0.8}
          className="flex-row items-center mr-6 mb-2"
        >
          <Text className="text-gray-100">
            💬 {commentsCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSave}
          activeOpacity={0.8}
          className="flex-row items-center mr-6 mb-2"
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

        {isOwner && (
          <TouchableOpacity
            onPress={handleDelete}
            activeOpacity={0.8}
            disabled={deleteLoading}
            className="flex-row items-center mb-2"
          >
            <Text className="text-red-400">
              {deleteLoading ? 'Видалення...' : '🗑 Видалити'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export default PostCard;
