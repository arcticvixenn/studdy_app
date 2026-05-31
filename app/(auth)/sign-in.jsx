import { View, Text, ScrollView, Image, Alert, Platform } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { images } from "../../constants";
import FormField from '../../components/FormField';
import CustomButton from '../../components/CustomButton';
import { Link, router } from 'expo-router';
import { useGlobalContext } from '../../context/GlobalProvider';
import { signIn, signInWithGoogle, getCurrentUser } from '../../lib/appwrite';

const SignIn = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const { setUser, setIsLoggedIn } = useGlobalContext();

  const submit = async () => {
    if (!form.email || !form.password) {
      Alert.alert('Помилка', 'Заповни email і пароль');
      return;
    }

    setIsSubmitting(true);

    try {
      await signIn(form.email, form.password);
      const result = await getCurrentUser();
      setUser(result);
      setIsLoggedIn(true);
      router.replace('/home');
    } catch (error) {
      Alert.alert('Помилка', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitGoogle = async () => {
    setIsGoogleSubmitting(true);

    try {
      const result = await signInWithGoogle();
      if (!result) return;
      setUser(result);
      setIsLoggedIn(true);
      router.replace('/home');
    } catch (error) {
      Alert.alert('Помилка', error.message);
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView>
        <View className="w-full justify-center min-h-[85vh] px-4 my-6">
          <Image source={images.logo} resizeMode="contain" className="w-[115px] h-[35px]" />

          <Text className="text-3xl text-white mt-10 font-psemibold">
            Вхід у Studdy
          </Text>

          <Text className="text-gray-100 mt-3 font-pregular">
            Увійди, щоб продовжити навчання, проходити тести та отримувати рекомендації.
          </Text>

          {Platform.OS === 'web' && (
            <>
              <CustomButton
                title="Увійти через Google"/>
              <Text className="text-gray-100 text-center mt-6">або</Text>
            </>
          )}

          <FormField
            title="Email"
            value={form.email}
            handleChangeText={(e) => setForm({ ...form, email: e })}
            otherStyles="mt-5"
            keyboardType="email-address"
          />

          <FormField
            title="Пароль"
            value={form.password}
            handleChangeText={(e) => setForm({ ...form, password: e })}
            otherStyles="mt-7"
          />

          <CustomButton
            title="Увійти"
            handlePress={submit}
            containerStyles="mt-7"
            isLoading={isSubmitting}
          />

          <View className="justify-center pt-5 flex-row gap-2">
            <Text className="text-lg text-gray-100 font-pregular">
              Немає акаунта?
            </Text>
            <Link href="/sign-up" className="text-lg font-psemibold text-secondary">
              Реєстрація
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignIn;


