import React from 'react';
import { Image, Text, View } from 'react-native';

const CommentItem = ({ comment }) => {
  return (
    <View className="flex-row mb-4">
      <Image
        source={{ uri: comment.authorAvatar }}
        className="w-10 h-10 rounded-xl mr-3"
        resizeMode="cover"
      />

      <View className="flex-1 bg-black-100 border border-black-200 rounded-2xl p-3">
        <Text className="text-white font-psemibold text-sm">
          {comment.authorName}
        </Text>

        <Text className="text-gray-100 text-sm mt-1 leading-5">
          {comment.text}
        </Text>
      </View>
    </View>
  );
};

export default CommentItem;