import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

import { useGlobalContext } from '../../context/GlobalProvider';
import { createPost } from '../../lib/appwrite';
import FormField from '../../components/FormField';
import CustomButton from '../../components/CustomButton';

const categories = [
  'Програмування',
  'Математика',
  'Штучний інтелект',
  'Аналіз даних',
  'Англійська мова',
  'Самоорганізація',
];

const types = [
  { key: 'text', label: 'Текст' },
  { key: 'image', label: 'Фото' },
  { key: 'video', label: 'Відео' },
];

const Create = () => {
  const { user } = useGlobalContext();

  const [publishing, setPublishing] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    category: '',
    mediaType: 'text',
    image: null,
    video: null,
    thumbnail: null,
  });

  const pickImage = async (field) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });

      if (!result.canceled) {
        setForm((prev) => ({
          ...prev,
          [field]: result.assets[0],
        }));
      }
    } catch (error) {
      console.log('pickImage error:', error);
      Alert.alert('Помилка', 'Не вдалося обрати зображення.');
    }
  };

  const pickVideo = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'video/*',
      copyToCacheDirectory: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];

      const normalizedVideo = {
        ...asset,
        file: asset.file || result.output?.[0] || null,
      };

      setForm((prev) => ({
        ...prev,
        video: normalizedVideo,
      }));
    }
  } catch (error) {
    console.log('pickVideo error:', error);
    Alert.alert('Помилка', 'Не вдалося обрати відео.');
  }
};

  const submit = async () => {
    if (!form.title.trim() || !form.content.trim() || !form.category) {
      return Alert.alert('Помилка', 'Заповни заголовок, текст і категорію.');
    }

    if (form.mediaType === 'image' && !form.image) {
      return Alert.alert('Помилка', 'Додай зображення.');
    }

    if (form.mediaType === 'video' && (!form.video || !form.thumbnail)) {
      return Alert.alert('Помилка', 'Додай відео та обкладинку.');
    }

    setPublishing(true);

    try {
      await createPost({ ...form, user });

      Alert.alert('Готово', 'Публікацію створено.');

      setForm({
        title: '',
        content: '',
        category: '',
        mediaType: 'text',
        image: null,
        video: null,
        thumbnail: null,
      });

      router.replace('/home');
    } catch (error) {
      Alert.alert('Помилка', error.message || 'Не вдалося створити пост.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView className="px-4 pt-6">
        <Text className="text-3xl text-white font-psemibold">
          Створити публікацію
        </Text>

        <View className="flex-row mt-6 mb-6">
          {types.map((type) => (
            <TouchableOpacity
              key={type.key}
              onPress={() =>
                setForm((prev) => ({
                  ...prev,
                  mediaType: type.key,
                  image: null,
                  video: null,
                  thumbnail: null,
                }))
              }
              className={`mr-3 px-4 py-3 rounded-full border ${
                form.mediaType === type.key
                  ? 'bg-secondary border-secondary'
                  : 'bg-black-100 border-black-200'
              }`}
            >
              <Text
                className={`font-pmedium ${
                  form.mediaType === type.key
                    ? 'text-primary'
                    : 'text-gray-100'
                }`}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FormField
          title="Заголовок"
          value={form.title}
          placeholder="Наприклад: Як працює backpropagation"
          handleChangeText={(value) =>
            setForm((prev) => ({ ...prev, title: value }))
          }
          otherStyles="mb-6"
        />

        <FormField
          title="Опис"
          value={form.content}
          placeholder="Напиши коротке пояснення..."
          handleChangeText={(value) =>
            setForm((prev) => ({ ...prev, content: value }))
          }
          multiline
          numberOfLines={6}
          otherStyles="mb-6"
        />

        <Text className="text-base text-gray-100 font-pmedium mb-3">
          Категорія
        </Text>

        <View className="flex-row flex-wrap mb-6">
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              onPress={() =>
                setForm((prev) => ({ ...prev, category }))
              }
              className={`mr-2 mb-3 px-4 py-3 rounded-full border ${
                form.category === category
                  ? 'bg-secondary border-secondary'
                  : 'bg-black-100 border-black-200'
              }`}
            >
              <Text
                className={`text-sm font-pmedium ${
                  form.category === category
                    ? 'text-primary'
                    : 'text-gray-100'
                }`}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {form.mediaType === 'image' && (
          <TouchableOpacity
            onPress={() => pickImage('image')}
            className="h-28 bg-black-100 border border-black-200 rounded-2xl justify-center items-center mb-6"
          >
            <Text className="text-white font-pmedium">
              {form.image ? 'Зображення обрано ✓' : 'Обрати зображення'}
            </Text>
          </TouchableOpacity>
        )}

        {form.mediaType === 'video' && (
          <>
            <TouchableOpacity
              onPress={pickVideo}
              className="h-28 bg-black-100 border border-black-200 rounded-2xl justify-center items-center mb-4"
            >
              <Text className="text-white font-pmedium">
                {form.video ? 'Відео обрано ✓' : 'Обрати відео'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => pickImage('thumbnail')}
              className="h-28 bg-black-100 border border-black-200 rounded-2xl justify-center items-center mb-6"
            >
              <Text className="text-white font-pmedium">
                {form.thumbnail ? 'Обкладинку обрано ✓' : 'Обрати обкладинку'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <CustomButton
          title="Опублікувати"
          handlePress={submit}
          isLoading={publishing}
          containerStyles="mb-10"
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Create;