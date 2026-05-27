import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import FormField from '../../../components/FormField';
import CustomButton from '../../../components/CustomButton';
import {
  getCourseById,
  updateCourse,
} from '../../../lib/appwrite';

const categories = [
  'Програмування',
  'Математика',
  'Штучний інтелект',
  'Аналіз даних',
  'Англійська мова',
];

const levels = ['Початковий', 'Середній', 'Просунутий'];

const EditCourse = () => {
  const { id } = useLocalSearchParams();
  const courseId = Array.isArray(id) ? id[0] : id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    level: '',
  });

  const loadCourse = async () => {
    setLoading(true);

    try {
      const course = await getCourseById(courseId);

      setForm({
        title: course.title || '',
        description: course.description || '',
        category: course.category || '',
        level: course.level || '',
      });
    } catch (error) {
      Alert.alert('Помилка', 'Не вдалося завантажити курс.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadCourse();
    }, [courseId])
  );

  const submit = async () => {
    if (
      !form.title.trim() ||
      !form.description.trim() ||
      !form.category ||
      !form.level
    ) {
      return Alert.alert('Помилка', 'Заповни всі поля.');
    }

    setSaving(true);

    try {
      await updateCourse({
        courseId,
        ...form,
      });

      router.back();
    } catch (error) {
      Alert.alert('Помилка', error.message || 'Не вдалося оновити курс.');
    } finally {
      setSaving(false);
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
          Редагувати курс
        </Text>

        <FormField
          title="Назва курсу"
          value={form.title}
          placeholder="Назва"
          handleChangeText={(value) =>
            setForm((prev) => ({ ...prev, title: value }))
          }
          otherStyles="mb-6"
        />

        <FormField
          title="Опис"
          value={form.description}
          placeholder="Опис курсу"
          handleChangeText={(value) =>
            setForm((prev) => ({ ...prev, description: value }))
          }
          multiline
          numberOfLines={6}
          otherStyles="mb-6"
        />

        <Text className="text-gray-100 font-pmedium mb-3">
          Категорія
        </Text>

        <View className="flex-row flex-wrap mb-5">
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

        <Text className="text-gray-100 font-pmedium mb-3">
          Рівень
        </Text>

        <View className="flex-row flex-wrap mb-8">
          {levels.map((level) => (
            <TouchableOpacity
              key={level}
              onPress={() =>
                setForm((prev) => ({ ...prev, level }))
              }
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

        <CustomButton
          title="Зберегти зміни"
          handlePress={submit}
          isLoading={saving}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default EditCourse;