import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import FormField from '../../../components/FormField';
import CustomButton from '../../../components/CustomButton';
import {
  getLessonById,
  updateLesson,
} from '../../../lib/appwrite';

const EditLesson = () => {
  const { id } = useLocalSearchParams();
  const lessonId = Array.isArray(id) ? id[0] : id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    content: '',
    lessonOrder: '1',
    estimatedMinutes: '5',
  });

  const loadLesson = async () => {
    setLoading(true);

    try {
      const lesson = await getLessonById(lessonId);

      setForm({
        title: lesson.title || '',
        description: lesson.description || '',
        content: lesson.content || '',
        lessonOrder: String(lesson.lessonOrder || 1),
        estimatedMinutes: String(lesson.estimatedMinutes || 5),
      });
    } catch (error) {
      Alert.alert('Помилка', 'Не вдалося завантажити урок.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadLesson();
    }, [lessonId])
  );

  const submit = async () => {
    if (!form.title.trim()) {
      return Alert.alert('Помилка', 'Введи назву уроку.');
    }

    setSaving(true);

    try {
      await updateLesson({
        lessonId,
        ...form,
      });

      router.back();
    } catch (error) {
      Alert.alert('Помилка', error.message || 'Не вдалося оновити урок.');
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
          Редагувати урок
        </Text>

        <FormField
          title="Назва уроку"
          value={form.title}
          placeholder="Назва"
          handleChangeText={(value) =>
            setForm((prev) => ({ ...prev, title: value }))
          }
          otherStyles="mb-6"
        />

        <FormField
          title="Короткий опис"
          value={form.description}
          placeholder="Опис уроку"
          handleChangeText={(value) =>
            setForm((prev) => ({ ...prev, description: value }))
          }
          multiline
          numberOfLines={4}
          otherStyles="mb-6"
        />

        <FormField
          title="Текст уроку"
          value={form.content}
          placeholder="Матеріал уроку"
          handleChangeText={(value) =>
            setForm((prev) => ({ ...prev, content: value }))
          }
          multiline
          numberOfLines={8}
          otherStyles="mb-6"
        />

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
          title="Зберегти зміни"
          handlePress={submit}
          isLoading={saving}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default EditLesson;