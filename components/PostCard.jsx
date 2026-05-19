import React from 'react';
import { Image, Text, View } from 'react-native';

import { icons } from '../constants';

const PostCard = ({ post }) => {
  return (
    <View className="bg-black-100 border border-black-200 rounded-2xl mx-4 mb-5 p-4">
      <View className="flex-row items-center mb-4">
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
      </View>

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

      <View className="flex-row mt-4 pt-4 border-t border-black-200">
        <Text className="text-gray-100 mr-5">
          ♡ {post.likesCount ?? 0}
        </Text>
        <Text className="text-gray-100">
          💬 {post.commentsCount ?? 0}
        </Text>
      </View>
    </View>
  );
};

export default PostCard;