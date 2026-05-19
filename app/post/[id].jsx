import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, router } from 'expo-router';

import PostCard from '../../components/PostCard';
import CommentItem from '../../components/CommentItem';
import { useGlobalContext } from '../../context/GlobalProvider';
import {
  createComment,
  getPostById,
  getPostComments,
} from '../../lib/appwrite';

const PostDetails = () => {
  const { id } = useLocalSearchParams();
  const postId = Array.isArray(id) ? id[0] : id;

  const { user } = useGlobalContext();

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadData = async () => {
    setLoading(true);

    try {
      const [postData, commentsData] = await Promise.all([
        getPostById(postId),
        getPostComments(postId),
      ]);

      setPost(postData);
      setComments(commentsData);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [postId])
  );

  const handleSend = async () => {
    if (!text.trim() || sending) return;

    setSending(true);

    try {
      const newComment = await createComment({
        postId,
        text,
        user,
      });

      setComments((prev) => [...prev, newComment]);
      setText('');
    } finally {
      setSending(false);
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
        data={comments}
        keyExtractor={(item) => item.$id}
        renderItem={({ item }) => (
          <View className="px-4">
            <CommentItem comment={item} />
          </View>
        )}
        ListHeaderComponent={() => (
          <>
            <View className="px-4 pt-4">
              <TouchableOpacity onPress={() => router.back()}>
                <Text className="text-secondary font-psemibold mb-4">
                  ← Назад
                </Text>
              </TouchableOpacity>
            </View>

            {post ? <PostCard post={post} /> : null}

            <View className="px-4 mb-4">
              <Text className="text-white text-xl font-psemibold">
                Коментарі
              </Text>
            </View>
          </>
        )}
        ListEmptyComponent={() => (
          <View className="px-4">
            <Text className="text-gray-100">
              Коментарів поки немає.
            </Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 130 }}
      />

      <View className="absolute bottom-0 left-0 right-0 bg-primary border-t border-black-200 p-4">
        <View className="flex-row items-center">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Напиши коментар..."
            placeholderTextColor="#7b7b8b"
            className="flex-1 bg-black-100 border border-black-200 rounded-2xl px-4 py-4 text-white mr-3"
          />

          <TouchableOpacity
            onPress={handleSend}
            disabled={sending}
            className="bg-secondary rounded-2xl px-4 py-4"
          >
            <Text className="text-primary font-psemibold">
              {sending ? '...' : 'Надіслати'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default PostDetails;