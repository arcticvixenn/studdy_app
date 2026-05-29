import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { router } from 'expo-router';

import { useGlobalContext } from '../context/GlobalProvider';
import {
  createViewEvent,
  getPostCommentsCount,
  getPostLikeState,
  getPostSaveState,
  togglePostLike,
  togglePostSave,
} from '../lib/appwrite';

const VideoFeedItem = ({
  post,
  isActive,
  shouldPrepare,
  itemHeight,
}) => {
  const { user } = useGlobalContext();

  const nativeVideoRef = useRef(null);
  const webVideoRef = useRef(null);

  const [isPaused, setIsPaused] = useState(false);

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

    const loadPostState = async () => {
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
        console.log('load video post state error:', error);
      }
    };

    loadPostState();

    return () => {
      isMounted = false;
    };
  }, [post.$id, user?.$id]);

  useEffect(() => {
    const controlVideo = async () => {
      if (Platform.OS === 'web') {
        if (!webVideoRef.current) return;

        if (isActive && !isPaused) {
          webVideoRef.current.play().catch(() => {});
        } else {
          webVideoRef.current.pause();

          if (!isActive) {
            webVideoRef.current.currentTime = 0;
          }
        }

        return;
      }

      if (!nativeVideoRef.current) return;

      try {
        if (isActive && !isPaused) {
          await nativeVideoRef.current.playAsync();
        } else {
          await nativeVideoRef.current.pauseAsync();

          if (!isActive) {
            await nativeVideoRef.current.setPositionAsync(0);
          }
        }
      } catch (error) {
        console.log('control video error:', error);
      }
    };

    controlVideo();
  }, [isActive, isPaused]);

  useEffect(() => {
    if (!isActive) {
      setIsPaused(false);
      return;
    }

    const registerView = async () => {
      try {
        await createViewEvent({
          userId: user?.$id,
          permissionUserId: user?.accountId || user?.$id,
          contentId: post.$id,
          contentType: 'post',
          duration: 0,
          source: 'video_feed',
        });
      } catch (error) {
        console.log('create video view event error:', error);
      }
    };

    registerView();
  }, [isActive, post.$id, user?.$id]);

  const togglePause = () => {
    setIsPaused((prev) => !prev);
  };

  const pauseCurrentVideo = async () => {
    setIsPaused(true);

    if (Platform.OS === 'web') {
      if (webVideoRef.current) {
        webVideoRef.current.pause();
      }

      return;
    }

    if (nativeVideoRef.current) {
      try {
        await nativeVideoRef.current.pauseAsync();
      } catch (error) {
        console.log('pause current video error:', error);
      }
    }
  };

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
    } catch (error) {
      console.log('toggle video like error:', error);
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
    } catch (error) {
      console.log('toggle video save error:', error);
    } finally {
      setSaveLoading(false);
    }
  };

  const openComments = async () => {
    if (!post?.$id) return;

    await pauseCurrentVideo();

    router.push({
      pathname: '/post/[id]',
      params: {
        id: post.$id,
        from: 'videos',
        t: Date.now().toString(),
      },
    });
  };

  const openAuthorProfile = async () => {
    if (!post.authorId) return;

    await pauseCurrentVideo();

    if (post.authorId === user?.$id) {
      router.push('/profile');
      return;
    }

    router.push(`/user/${post.authorId}`);
  };

  return (
    <View style={{ height: itemHeight }} className="bg-black justify-end">
      <TouchableOpacity activeOpacity={1} onPress={togglePause} className="absolute inset-0">
        {shouldPrepare ? (
          Platform.OS === 'web' ? (
            <video
              ref={webVideoRef}
              src={post.videoUrl}
              loop
              playsInline
              muted={false}
              style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                inset: 0,
                objectFit: 'contain',
                backgroundColor: '#000',
              }}
            />
          ) : (
            <Video
              ref={nativeVideoRef}
              source={{ uri: post.videoUrl }}
              style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
              }}
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay={isActive && !isPaused}
              isLooping
              isMuted={false}
              useNativeControls={false}
            />
          )
        ) : post.thumbnailUrl ? (
          <Image
            source={{ uri: post.thumbnailUrl }}
            style={{
              width: '100%',
              height: '100%',
              position: 'absolute',
            }}
            resizeMode="contain"
          />
        ) : (
          <View className="absolute inset-0 bg-black items-center justify-center">
            <Text className="text-secondary text-lg font-psemibold">
              Studdy Shorts
            </Text>

            <Text className="text-gray-100 text-sm mt-2">
              Завантаження відео...
            </Text>
          </View>
        )}

        {isPaused && isActive ? (
          <View className="absolute inset-0 items-center justify-center">
            <View className="bg-black/60 rounded-full w-20 h-20 items-center justify-center">
              <Text className="text-white text-4xl ml-1">▶</Text>
            </View>
          </View>
        ) : null}
      </TouchableOpacity>

      <View className="absolute right-4 bottom-32 items-center">
        <TouchableOpacity
          onPress={handleLike}
          disabled={likeLoading}
          activeOpacity={0.8}
          className="items-center mb-5"
        >
          {likeLoading ? (
            <ActivityIndicator size="small" color="#FF9C01" />
          ) : (
            <Text className={`text-3xl ${isLiked ? 'text-secondary' : 'text-white'}`}>
              {isLiked ? '♥' : '♡'}
            </Text>
          )}

          <Text className="text-white text-xs mt-1">{likesCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={openComments}
          activeOpacity={0.8}
          className="items-center mb-5"
        >
          <Text className="text-white text-3xl">💬</Text>
          <Text className="text-white text-xs mt-1">{commentsCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saveLoading}
          activeOpacity={0.8}
          className="items-center mb-5"
        >
          {saveLoading ? (
            <ActivityIndicator size="small" color="#FF9C01" />
          ) : (
            <Text className={`text-3xl ${isSaved ? 'text-secondary' : 'text-white'}`}>
              🔖
            </Text>
          )}

          <Text className="text-white text-xs mt-1">
            {isSaved ? 'Saved' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="p-5 pr-20 bg-black/65">
        <Text className="text-secondary font-pmedium mb-2">
          {post.mediaType === 'short_video' ? 'Studdy Shorts' : post.category || 'Відео'}
        </Text>

        <Text className="text-white text-xl font-psemibold" numberOfLines={2}>
          {post.title}
        </Text>

        <Text className="text-gray-100 mt-2" numberOfLines={3}>
          {post.content}
        </Text>

        <TouchableOpacity
          onPress={openAuthorProfile}
          activeOpacity={0.8}
          className="flex-row items-center mt-4"
        >
          {post.authorAvatar ? (
            <Image
              source={{ uri: post.authorAvatar }}
              className="w-9 h-9 rounded-xl mr-3"
              resizeMode="cover"
            />
          ) : (
            <View className="w-9 h-9 rounded-xl bg-primary border border-black-200 items-center justify-center mr-3">
              <Text className="text-secondary font-psemibold">
                {(post.authorName || 'S').slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}

          <Text className="text-white font-pmedium">
            @{post.authorName || 'studdy_user'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default VideoFeedItem;
