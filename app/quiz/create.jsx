import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import FormField from '../../components/FormField';
import CustomButton from '../../components/CustomButton';
import { createQuiz } from '../../lib/appwrite';

const CreateQuiz = () => {
  const { lessonId, courseId } = useLocalSearchParams();

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    passingScore: '60',
  });

  const submit = async () => {
    if (!form.title.trim()) {
      return Alert.alert('Помилка', 'Введи назву тесту.');
    }

    setLoading(true);

    try {
      const quiz = await createQuiz({
        lessonId: Array.isArray(lessonId) ? lessonId[0] : lessonId,
        courseId: Array.isArray(courseId) ? courseId[0] : courseId,
        title: form.title,
        passingScore: form.passingScore,
      });

      router.replace(`/quiz/manage/${quiz.$id}`);
    } catch (error) {
      Alert.alert('Помилка', error.message || 'Не вдалося створити тест.');
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
          Створити тест
        </Text>

        <FormField
          title="Назва тесту"
          value={form.title}
          placeholder="Наприклад: Перевірка базових понять"
          handleChangeText={(value) =>
            setForm((prev) => ({ ...prev, title: value }))
          }
          otherStyles="mb-6"
        />

        <FormField
          title="Прохідний бал, %"
          value={form.passingScore}
          placeholder="60"
          keyboardType="numeric"
          handleChangeText={(value) =>
            setForm((prev) => ({ ...prev, passingScore: value }))
          }
          otherStyles="mb-8"
        />

        <CustomButton
          title="Створити тест"
          handlePress={submit}
          isLoading={loading}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default CreateQuiz;