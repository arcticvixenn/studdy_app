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
  getQuizById,
  updateQuiz,
} from '../../../lib/appwrite';

const EditQuiz = () => {
  const { id } = useLocalSearchParams();
  const quizId = Array.isArray(id) ? id[0] : id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    passingScore: '60',
  });

  const loadQuiz = async () => {
    setLoading(true);

    try {
      const quiz = await getQuizById(quizId);

      setForm({
        title: quiz.title || '',
        passingScore: String(quiz.passingScore || 60),
      });
    } catch (error) {
      Alert.alert('Помилка', 'Не вдалося завантажити тест.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadQuiz();
    }, [quizId])
  );

  const submit = async () => {
    if (!form.title.trim()) {
      return Alert.alert('Помилка', 'Введи назву тесту.');
    }

    setSaving(true);

    try {
      await updateQuiz({
        quizId,
        ...form,
      });

      router.back();
    } catch (error) {
      Alert.alert('Помилка', error.message || 'Не вдалося оновити тест.');
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
          Редагувати тест
        </Text>

        <FormField
          title="Назва тесту"
          value={form.title}
          placeholder="Назва"
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
          title="Зберегти зміни"
          handlePress={submit}
          isLoading={saving}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default EditQuiz;