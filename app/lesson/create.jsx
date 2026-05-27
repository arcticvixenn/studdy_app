import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import FormField from '../../components/FormField';
import CustomButton from '../../components/CustomButton';
import { createLesson } from '../../lib/appwrite';
import { useGlobalContext } from '../../context/GlobalProvider';

const types = [
  { key: 'text', label: 'Текст' },
  { key: 'video', label: 'Відео' },
];

const CreateLesson = () => {
  const { courseId } = useLocalSearchParams();
  const { user } = useGlobalContext();

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    content: '',
    mediaType: 'text',
    video: null,
    thumbnail: null,
    lessonOrder: '1',
    estimatedMinutes: '5',
  });

  const normalizedCourseId = Array.isArray(courseId) ? courseId[0] : courseId;

  const pickVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'video/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        const asset = result.assets[0];

        setForm((prev) => ({
          ...prev,
          video: {
            ...asset,
            file: asset.file || result.output?.[0] || null,
          },
        }));
      }
    } catch (error) {
      console.log('pickVideo error:', error);
      Alert.alert('Помилка', 'Не вдалося обрати відео.');
    }
  };

  const pickThumbnail = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
      });

      if (!result.canceled) {
        setForm((prev) => ({
          ...prev,
          thumbnail: result.assets[0],
        }));
      }
    } catch (error) {
      console.log('pickThumbnail error:', error);
      Alert.alert('Помилка', 'Не вдалося обрати обкладинку.');
    }
  };

  const submit = async () => {
    if (!normalizedCourseId) {
      return Alert.alert('Помилка', 'Не вдалося визначити курс.');
    }

    if (!form.title.trim()) {
      return Alert.alert('Помилка', 'Введи назву уроку.');
    }

    if (form.mediaType === 'text' && !form.content.trim()) {
      return Alert.alert('Помилка', 'Додай текст уроку.');
    }

    if (form.mediaType === 'video' && (!form.video || !form.thumbnail)) {
      return Alert.alert('Помилка', 'Додай відео та обкладинку.');
    }

    if (!user?.accountId) {
      return Alert.alert('Помилка', 'Не вдалося визначити автора уроку.');
    }

    setLoading(true);

    try {
      await createLesson({
        ...form,
        courseId: normalizedCourseId,
        user,
      });

      router.back();
    } catch (error) {
      Alert.alert('Помилка', error.message || 'Не вдалося створити урок.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 20,
          paddingBottom: 36,
        }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Text className="text-secondary font-psemibold mb-5">
            ← Назад
          </Text>
        </TouchableOpacity>

        <Text className="text-white text-3xl font-psemibold mb-6">
          Додати урок
        </Text>

        <View className="flex-row mb-6">
          {types.map((type) => (
            <TouchableOpacity
              key={type.key}
              onPress={() =>
                setForm((prev) => ({
                  ...prev,
                  mediaType: type.key,
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
                className={
                  form.mediaType === type.key
                    ? 'text-primary'
                    : 'text-gray-100'
                }
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FormField
          title="Назва уроку"
          value={form.title}
          placeholder="Наприклад: Що таке градієнтний спуск"
          handleChangeText={(value) =>
            setForm((prev) => ({ ...prev, title: value }))
          }
          otherStyles="mb-6"
        />

        <FormField
          title="Короткий опис"
          value={form.description}
          placeholder="Коротко опиши урок..."
          handleChangeText={(value) =>
            setForm((prev) => ({ ...prev, description: value }))
          }
          multiline
          numberOfLines={4}
          otherStyles="mb-6"
        />

        {form.mediaType === 'text' && (
          <FormField
            title="Текст уроку"
            value={form.content}
            placeholder="Основний навчальний матеріал..."
            handleChangeText={(value) =>
              setForm((prev) => ({ ...prev, content: value }))
            }
            multiline
            numberOfLines={8}
            otherStyles="mb-6"
          />
        )}

        {form.mediaType === 'video' && (
          <>
            <TouchableOpacity
              onPress={pickVideo}
              className="h-24 bg-black-100 border border-black-200 rounded-2xl justify-center items-center mb-4"
            >
              <Text className="text-white font-pmedium">
                {form.video ? 'Відео обрано ✓' : 'Обрати відео'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={pickThumbnail}
              className="h-24 bg-black-100 border border-black-200 rounded-2xl justify-center items-center mb-6"
            >
              <Text className="text-white font-pmedium">
                {form.thumbnail ? 'Обкладинку обрано ✓' : 'Обрати обкладинку'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <FormField
          title="Номер уроку"
          value={form.lessonOrder}
          placeholder="1"
          keyboardType="numeric"
          handleChangeText={(value) =>
            setForm((prev) => ({ ...prev, lessonOrder: value }))
          }
          otherStyles="mb-6"
        />

        <FormField
          title="Орієнтовний час, хв"
          value={form.estimatedMinutes}
          placeholder="5"
          keyboardType="numeric"
          handleChangeText={(value) =>
            setForm((prev) => ({ ...prev, estimatedMinutes: value }))
          }
          otherStyles="mb-8"
        />

        <CustomButton
          title="Створити урок"
          handlePress={submit}
          isLoading={loading}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default CreateLesson;