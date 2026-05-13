import React, { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

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

const Create = () => {
  const { user } = useGlobalContext();

  const [publishing, setPublishing] = useState(false);
  const [form, setForm] = useState({
    title: '',
    content: '',
    category: '',
    image: null,
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
    });

    if (!result.canceled) {
      setForm((prev) => ({
        ...prev,
        image: result.assets[0],
      }));
    }
  };

  const removeImage = () => {
    setForm((prev) => ({
      ...prev,
      image: null,
    }));
  };

  const submit = async () => {
    if (!form.title.trim()) {
      return Alert.alert('Помилка', 'Введіть заголовок публікації.');
    }

    if (!form.content.trim()) {
      return Alert.alert('Помилка', 'Напишіть основний текст публікації.');
    }

    if (!form.category) {
      return Alert.alert('Помилка', 'Оберіть навчальну категорію.');
    }

    if (!user?.$id) {
      return Alert.alert(
        'Помилка',
        'Не вдалося визначити поточного користувача.'
      );
    }

    setPublishing(true);

    try {
      await createPost({
        title: form.title,
        content: form.content,
        category: form.category,
        image: form.image,
        user,
      });

      Alert.alert('Готово', 'Освітню публікацію успішно створено.');

      setForm({
        title: '',
        content: '',
        category: '',
        image: null,
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
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 24,
          paddingBottom: 36,
        }}
      >
        <Text className="text-3xl text-white font-psemibold">
          Створити допис
        </Text>

        <Text className="text-sm text-gray-100 font-pregular leading-5 mt-3 mb-8">
          Поділіться поясненням, питанням, корисною нотаткою або навчальним
          спостереженням. Так формується освітня спільнота Studdy.
        </Text>

        <FormField
          title="Заголовок"
          value={form.title}
          placeholder="Наприклад: Просте пояснення градієнтного спуску"
          handleChangeText={(value) =>
            setForm((prev) => ({
              ...prev,
              title: value,
            }))
          }
          otherStyles="mb-6"
        />

        <FormField
          title="Текст публікації"
          value={form.content}
          placeholder="Напишіть основну думку, пояснення або запитання..."
          handleChangeText={(value) =>
            setForm((prev) => ({
              ...prev,
              content: value,
            }))
          }
          multiline
          numberOfLines={7}
          otherStyles="mb-6"
        />

        <View className="mb-6">
          <Text className="text-base text-gray-100 font-pmedium mb-3">
            Навчальна категорія
          </Text>

          <View className="flex-row flex-wrap">
            {categories.map((category) => {
              const isActive = form.category === category;

              return (
                <TouchableOpacity
                  key={category}
                  activeOpacity={0.8}
                  onPress={() =>
                    setForm((prev) => ({
                      ...prev,
                      category,
                    }))
                  }
                  className={`px-4 py-3 rounded-full mr-2 mb-3 border ${
                    isActive
                      ? 'bg-secondary border-secondary'
                      : 'bg-black-100 border-black-200'
                  }`}
                >
                  <Text
                    className={`text-sm font-pmedium ${
                      isActive ? 'text-primary' : 'text-gray-100'
                    }`}
                  >
                    {category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View className="mb-8">
          <Text className="text-base text-gray-100 font-pmedium mb-3">
            Зображення до допису
          </Text>

          {form.image ? (
            <View>
              <Image
                source={{ uri: form.image.uri }}
                className="w-full h-56 rounded-2xl"
                resizeMode="cover"
              />

              <TouchableOpacity
                onPress={removeImage}
                activeOpacity={0.8}
                className="mt-3 self-start bg-black-100 border border-black-200 rounded-xl px-4 py-3"
              >
                <Text className="text-white text-sm font-pmedium">
                  Прибрати зображення
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={pickImage}
              activeOpacity={0.8}
              className="h-24 bg-black-100 border border-dashed border-black-200 rounded-2xl justify-center items-center"
            >
              <Text className="text-white text-sm font-pmedium">
                Обрати зображення
              </Text>

              <Text className="text-gray-100 text-xs font-pregular mt-1">
                Необов’язково
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <CustomButton
          title="Опублікувати"
          handlePress={submit}
          isLoading={publishing}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Create;