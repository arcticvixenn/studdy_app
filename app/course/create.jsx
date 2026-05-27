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

import FormField from '../../components/FormField';
import CustomButton from '../../components/CustomButton';
import { createCourse } from '../../lib/appwrite';
import { useGlobalContext } from '../../context/GlobalProvider';

const categories = [
  'Програмування',
  'Математика',
  'Штучний інтелект',
  'Аналіз даних',
  'Англійська мова',
];

const levels = ['Початковий', 'Середній', 'Просунутий'];

const CreateCourse = () => {
  const { user } = useGlobalContext();

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    level: '',
    cover: null,
  });

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });

    if (!result.canceled) {
      setForm((prev) => ({
        ...prev,
        cover: result.assets[0],
      }));
    }
  };

  const submit = async () => {
    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.category ||
      !form.level
    ) {
      return Alert.alert('Помилка', 'Заповни всі обов’язкові поля.');
    }

    setLoading(true);

    try {
      const course = await createCourse({
        ...form,
        user,
      });

      router.replace(`/course/${course.$id}`);
    } catch (error) {
      Alert.alert('Помилка', error.message || 'Не вдалося створити курс.');
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
          Створити курс
        </Text>

        <FormField
          title="Назва курсу"
          value={form.title}
          placeholder="Наприклад: Вступ до машинного навчання"
          handleChangeText={(value) =>
            setForm((prev) => ({ ...prev, title: value }))
          }
          otherStyles="mb-6"
        />

        <FormField
          title="Опис"
          value={form.description}
          placeholder="Коротко опиши, чого навчиться користувач..."
          handleChangeText={(value) =>
            setForm((prev) => ({ ...prev, description: value }))
          }
          multiline
          numberOfLines={6}
          otherStyles="mb-6"
        />

        <Text className="text-gray-100 font-pmedium mb-3">Категорія</Text>
        <View className="flex-row flex-wrap mb-5">
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              onPress={() => setForm((prev) => ({ ...prev, category }))}
              className={`mr-2 mb-3 px-4 py-3 rounded-full border ${
                form.category === category
                  ? 'bg-secondary border-secondary'
                  : 'bg-black-100 border-black-200'
              }`}
            >
              <Text
                className={
                  form.category === category
                    ? 'text-primary'
                    : 'text-gray-100'
                }
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="text-gray-100 font-pmedium mb-3">Рівень</Text>
        <View className="flex-row flex-wrap mb-5">
          {levels.map((level) => (
            <TouchableOpacity
              key={level}
              onPress={() => setForm((prev) => ({ ...prev, level }))}
              className={`mr-2 mb-3 px-4 py-3 rounded-full border ${
                form.level === level
                  ? 'bg-secondary border-secondary'
                  : 'bg-black-100 border-black-200'
              }`}
            >
              <Text
                className={
                  form.level === level
                    ? 'text-primary'
                    : 'text-gray-100'
                }
              >
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          onPress={pickCover}
          className="h-24 bg-black-100 border border-black-200 rounded-2xl justify-center items-center mb-8"
        >
          <Text className="text-white font-pmedium">
            {form.cover ? 'Обкладинку обрано ✓' : 'Обрати обкладинку'}
          </Text>
        </TouchableOpacity>

        <CustomButton
          title="Створити курс"
          handlePress={submit}
          isLoading={loading}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default CreateCourse;