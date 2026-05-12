import React, { useState } from 'react';
import {
  Image,
  View,
  Text,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';

import { useGlobalContext } from '../../context/GlobalProvider';
import { createVideo } from '../../lib/appwrite';
import FormField from '../../components/FormField';
import CustomButton from '../../components/CustomButton';

const Create = () => {
  const { user, updatePosts } = useGlobalContext();

  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    video: null,
    thumbnail: null,
    prompt: '',
  });

  const openPicker = async (selectType) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        selectType === 'image'
          ? ImagePicker.MediaTypeOptions.Images
          : ImagePicker.MediaTypeOptions.Videos,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      if (selectType === 'image') {
        setForm({ ...form, thumbnail: result.assets[0] });
      } else if (selectType === 'video') {
        setForm({ ...form, video: result.assets[0] });
      }
    }
  };

  const submit = async () => {
    if (!form.title || !form.video || !form.thumbnail || !form.prompt) {
      return Alert.alert('Помилка', 'Заповніть усі поля публікації.');
    }

    setUploading(true);

    try {
      const newPost = await createVideo({
        ...form,
        userId: user.$id,
      });

      updatePosts(newPost);

      Alert.alert(
        'Успіх',
        'Публікацію створено. На наступному етапі ми перетворимо цей модуль на повноцінний освітній допис.'
      );
    } catch (error) {
      Alert.alert('Помилка', error.message || 'Щось пішло не так.');
    } finally {
      setUploading(false);
      setForm({
        title: '',
        video: null,
        thumbnail: null,
        prompt: '',
      });
    }
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 24,
          paddingBottom: 32,
        }}
      >
        <Text className="text-3xl text-white font-psemibold mb-3">
          Створити публікацію
        </Text>

        <Text className="text-sm text-gray-100 font-pregular leading-5 mb-8">
          Поки цей екран технічно працює на старій логіці відеопостів. Уже в
          наступному етапі ми замінимо його на форму освітнього допису з
          темою, категорією, тегами та прикріпленими матеріалами.
        </Text>

        <FormField
          title="Заголовок публікації"
          value={form.title}
          placeholder="Наприклад: Як я розібрався з алгоритмом Дейкстри"
          handleChangeText={(e) => setForm({ ...form, title: e })}
          otherStyles="mb-6"
        />

        <Text className="text-base text-gray-100 font-pmedium mb-2">
          Навчальне відео або демонстрація
        </Text>

        <TouchableOpacity
          onPress={() => openPicker('video')}
          className="mb-6"
        >
          {form.video ? (
            <Video
              source={{ uri: form.video.uri }}
              style={{
                width: '100%',
                height: 256,
                borderRadius: 16,
              }}
              resizeMode={ResizeMode.COVER}
            />
          ) : (
            <View className="h-40 bg-black-100 border border-black-200 justify-center items-center rounded-2xl">
              <Text className="text-white font-pmedium">
                Завантажити відео
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <Text className="text-base text-gray-100 font-pmedium mb-2">
          Обкладинка публікації
        </Text>

        <TouchableOpacity
          onPress={() => openPicker('image')}
          className="mb-6"
        >
          {form.thumbnail ? (
            <Image
              source={{ uri: form.thumbnail.uri }}
              style={{
                width: '100%',
                height: 200,
                borderRadius: 16,
              }}
              resizeMode="cover"
            />
          ) : (
            <View className="h-20 bg-black-100 border border-black-200 justify-center items-center rounded-2xl">
              <Text className="text-white font-pmedium">
                Завантажити обкладинку
              </Text>
            </View>
          )}
        </TouchableOpacity>

        <FormField
          title="Опис"
          value={form.prompt}
          placeholder="Опишіть, що корисного містить ця публікація"
          handleChangeText={(e) => setForm({ ...form, prompt: e })}
          otherStyles="mb-8"
        />

        <CustomButton
          title="Опублікувати"
          handlePress={submit}
          isLoading={uploading}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Create;