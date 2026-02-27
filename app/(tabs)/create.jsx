import React, { useState } from 'react';
import { Image, View, Text, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, ResizeMode } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { useGlobalContext } from '../../context/GlobalProvider';
import { createVideo } from '../../lib/appwrite';
import FormField from '../../components/FormField';
import CustomButton from '../../components/CustomButton';

const Create = () => {
  const { user, updatePosts } = useGlobalContext(); // Отримуємо функцію оновлення
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    title: '',
    video: null,
    thumbnail: null,
    prompt: '',
  });

  const openPicker = async (selectType) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: selectType === 'image' ? ImagePicker.MediaTypeOptions.Images : ImagePicker.MediaTypeOptions.Videos,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      if (selectType === 'image') setForm({ ...form, thumbnail: result.assets[0] });
      else if (selectType === 'video') setForm({ ...form, video: result.assets[0] });
    }
  };

  const submit = async () => {
    if (!form.title || !form.video || !form.thumbnail || !form.prompt) {
      return Alert.alert('Помилка', 'Заповніть всі поля');
    }

    setUploading(true);
    try {
      const newPost = await createVideo({ ...form, userId: user.$id });
      updatePosts(newPost); // Додаємо відео в список
      Alert.alert('Успіх', 'Публікація завантажена успішно!');
    } catch (error) {
      Alert.alert('Помилка', error.message || 'Щось пішло не так.');
    } finally {
      setUploading(false);
      setForm({ title: '', video: null, thumbnail: null, prompt: '' });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#1E1E1E' }}>
      <ScrollView style={{ padding: 16 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 24, fontWeight: '600' }}>Поділіться моментом!</Text>

        <FormField
          title="Заголовок відео"
          value={form.title}
          placeholder="Введіть заголовок"
          handleChangeText={(e) => setForm({ ...form, title: e })}
        />

        <TouchableOpacity onPress={() => openPicker('video')}>
          {form.video ? (
            <Video
              source={{ uri: form.video.uri }}
              style={{ width: '100%', height: 256, borderRadius: 16 }}
              resizeMode={ResizeMode.COVER}
            />
          ) : (
            <View style={{ height: 160, backgroundColor: '#333', justifyContent: 'center', alignItems: 'center', borderRadius: 12 }}>
              <Text style={{ color: '#FFFFFF' }}>Завантажити відео</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => openPicker('image')}>
          {form.thumbnail ? (
            <Image source={{ uri: form.thumbnail.uri }} style={{ width: '100%', height: 200, borderRadius: 12 }} resizeMode="cover" />
          ) : (
            <View style={{ height: 64, backgroundColor: '#444', justifyContent: 'center', alignItems: 'center', borderRadius: 12 }}>
              <Text style={{ color: '#FFFFFF' }}>Завантажити заставку</Text>
            </View>
          )}
        </TouchableOpacity>

        <FormField
          title="Опис"
          value={form.prompt}
          placeholder="Введіть опис"
          handleChangeText={(e) => setForm({ ...form, prompt: e })}
        />

        <CustomButton
          title="Готово & Опублікувати"
          handlePress={submit}
          isLoading={uploading}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default Create;
