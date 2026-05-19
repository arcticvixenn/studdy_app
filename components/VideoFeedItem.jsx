import React, { useEffect, useRef } from 'react';
import { Image, Platform, Text, View } from 'react-native';
import { Video, ResizeMode } from 'expo-av';

const VideoFeedItem = ({
  post,
  isActive,
  shouldPrepare,
  itemHeight,
}) => {
  const webVideoRef = useRef(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || !webVideoRef.current) {
      return;
    }

    if (isActive) {
      webVideoRef.current.play().catch(() => {});
    } else {
      webVideoRef.current.pause();
      webVideoRef.current.currentTime = 0;
    }
  }, [isActive]);

  return (
    <View
      style={{ height: itemHeight }}
      className="bg-black justify-end"
    >
      {shouldPrepare ? (
        Platform.OS === 'web' ? (
          <video
            ref={webVideoRef}
            src={post.videoUrl}
            loop
            controls
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
            source={{ uri: post.videoUrl }}
            style={{
              width: '100%',
              height: '100%',
              position: 'absolute',
            }}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={isActive}
            isLooping
            isMuted={false}
            useNativeControls={false}
          />
        )
      ) : (
        <Image
          source={{ uri: post.thumbnailUrl }}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
          }}
          resizeMode="contain"
        />
      )}

      <View className="p-5 bg-black/55">
        <Text className="text-secondary font-pmedium mb-2">
          {post.category}
        </Text>

        <Text className="text-white text-xl font-psemibold">
          {post.title}
        </Text>

        <Text className="text-gray-100 mt-2">
          {post.content}
        </Text>

        <Text className="text-white mt-3 font-pmedium">
          @{post.authorName}
        </Text>
      </View>
    </View>
  );
};

export default VideoFeedItem;