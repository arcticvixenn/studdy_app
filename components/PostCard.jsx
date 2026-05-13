import React from 'react';
import { Image, Text, View } from 'react-native';

const formatPostDate = (dateString) => {
  if (!dateString) {
    return '';
  }

  const date = new Date(dateString);

  return date.toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const PostCard = ({ post }) => {
  return (
    <View className="bg-black-100 border border-black-200 rounded-2xl mx-4 mb-5 p-4">
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center flex-1 pr-3">
          <View className="w-11 h-11 rounded-xl overflow-hidden bg-black-200 mr-3">
            {post.authorAvatar ? (
              <Image
                source={{ uri: post.authorAvatar }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : null}
          </View>

          <View className="flex-1">
            <Text
              className="text-white text-sm font-psemibold"
              numberOfLines={1}
            >
              {post.authorName || 'Користувач Studdy'}
            </Text>

            <Text className="text-gray-100 text-xs font-pregular mt-0.5">
              {formatPostDate(post.$createdAt)}
            </Text>
          </View>
        </View>

        <View className="bg-secondary/10 border border-secondary rounded-full px-3 py-1">
          <Text className="text-secondary text-xs font-pmedium">
            {post.category}
          </Text>
        </View>
      </View>

      <Text className="text-white text-lg font-psemibold leading-6 mb-2">
        {post.title}
      </Text>

      <Text className="text-gray-100 text-sm font-pregular leading-5">
        {post.content}
      </Text>

      {post.imageUrl ? (
        <Image
          source={{ uri: post.imageUrl }}
          className="w-full h-52 rounded-2xl mt-4"
          resizeMode="cover"
        />
      ) : null}

      <View className="flex-row items-center mt-4 pt-4 border-t border-black-200">
        <Text className="text-gray-100 text-sm font-pmedium mr-5">
          ♡ {post.likesCount ?? 0}
        </Text>

        <Text className="text-gray-100 text-sm font-pmedium">
          💬 {post.commentsCount ?? 0}
        </Text>
      </View>
    </View>
  );
};

export default PostCard;