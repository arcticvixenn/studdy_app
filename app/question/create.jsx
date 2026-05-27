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

import FormField from '../../components/FormField';
import CustomButton from '../../components/CustomButton';
import { createQuestion } from '../../lib/appwrite';

const answerOptions = ['A', 'B', 'C', 'D'];

const CreateQuestion = () => {
  const { quizId } = useLocalSearchParams();

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    questionText: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctOption: 'A',
    explanation: '',
    topic: '',
    difficulty: '1',
    questionOrder: '1',
  });

  const submit = async () => {
    if (
      !form.questionText.trim() ||
      !form.optionA.trim() ||
      !form.optionB.trim() ||
      !form.optionC.trim() ||
      !form.optionD.trim() ||
      !form.topic.trim()
    ) {
      return Alert.alert('Помилка', 'Заповни всі обов’язкові поля.');
    }

    setLoading(true);

    try {
      await createQuestion({
        quizId: Array.isArray(quizId) ? quizId[0] : quizId,
        ...form,
      });

      router.back();
    } catch (error) {
      Alert.alert('Помилка', error.message || 'Не вдалося створити питання.');
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
          Додати питання
        </Text>

        <FormField
          title="Текст питання"
          value={form.questionText}
          placeholder="Сформулюй питання..."
          multiline
          numberOfLines={5}
          handleChangeText={(value) =>
            setForm((prev) => ({ ...prev, questionText: value }))
          }
          otherStyles="mb-6"
        />

        {answerOptions.map((option) => (
          <FormField
            key={option}
            title={`Варіант ${option}`}
            value={form[`option${option}`]}
            placeholder={`Введи відповідь ${option}`}
            handleChangeText={(value) =>
              setForm((prev) => ({
                ...prev,
                [`option${option}`]: value,
              }))
            }
            otherStyles="mb-5"
          />
        ))}

        <Text className="text-gray-100 font-pmedium mb-3">
          Правильна відповідь
        </Text>

        <View className="flex-row mb-6">
          {answerOptions.map((option) => (
            <TouchableOpacity
              key={option}
              onPress={() =>
                setForm((prev) => ({
                  ...prev,
                  correctOption: option,
                }))
              }
              className={`mr-3 px-4 py-3 rounded-full border ${
                form.correctOption === option
                  ? 'bg-secondary border-secondary'
                  : 'bg-black-100 border-black-200'
              }`}
            >
              <Text
                className={
                  form.correctOption === option
                    ? 'text-primary'
                    : 'text-gray-100'
                }
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FormField
          title="Пояснення"
          value={form.explanation}
          placeholder="Чому ця відповідь правильна..."
          multiline
          numberOfLines={4}
          handleChangeText={(value) =>
            setForm((prev) => ({ ...prev, explanation: value }))
          }
          otherStyles="mb-6"
        />

        <FormField
          title="Тема"
          value={form.topic}
          placeholder="Наприклад: нейронні мережі"
          handleChangeText={(value) =>
            setForm((prev) => ({ ...prev, topic: value }))
          }
          otherStyles="mb-6"
        />

        <FormField
          title="Складність"
          value={form.difficulty}
          placeholder="1"
          keyboardType="numeric"
          handleChangeText={(value) =>
            setForm((prev) => ({ ...prev, difficulty: value }))
          }
          otherStyles="mb-6"
        />

        <FormField
          title="Номер питання"
          value={form.questionOrder}
          placeholder="1"
          keyboardType="numeric"
          handleChangeText={(value) =>
            setForm((prev) => ({ ...prev, questionOrder: value }))
          }
          otherStyles="mb-8"
        />

        <CustomButton
          title="Створити питання"
          handlePress={submit}
          isLoading={loading}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default CreateQuestion;