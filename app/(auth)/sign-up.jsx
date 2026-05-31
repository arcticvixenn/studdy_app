import { View, Text, ScrollView, Image, Alert } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { images } from "../../constants";
import FormField from '../../components/FormField';
import CustomButton from '../../components/CustomButton';
import { Link, router } from 'expo-router';
import { useGlobalContext } from '../../context/GlobalProvider';
import { createUser } from '../../lib/appwrite';
import {
  generateVerificationCode,
  sendEmailVerificationCode,
} from '../../lib/emailjs';

const SignUp = () => {
  const [step, setStep] = useState('form');
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    code: '',
  });
  const [verification, setVerification] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { setUser, setIsLoggedIn } = useGlobalContext();

  const sendCode = async () => {
    if (!form.username || !form.email || !form.password) {
      Alert.alert('Помилка', 'Заповни username, email і пароль');
      return;
    }

    if (form.password.length < 8) {
      Alert.alert('Помилка', 'Пароль має містити мінімум 8 символів');
      return;
    }

    setIsSubmitting(true);

    try {
      const code = generateVerificationCode();

      await sendEmailVerificationCode({
        email: form.email.trim(),
        username: form.username.trim(),
        code,
      });

      setVerification({
        code,
        expiresAt: Date.now() + 10 * 60 * 1000,
      });

      setStep('code');
      Alert.alert('Код відправлено', 'Перевір пошту та введи код.');
    } catch (error) {
      Alert.alert('Помилка', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyAndRegister = async () => {
    if (!form.code) {
      Alert.alert('Помилка', 'Введи код з email');
      return;
    }

    if (!verification) {
      Alert.alert('Помилка', 'Спочатку надішли код.');
      return;
    }

    if (Date.now() > verification.expiresAt) {
      Alert.alert('Помилка', 'Код застарів. Надішли новий код.');
      setStep('form');
      return;
    }

    if (form.code.trim() !== verification.code) {
      Alert.alert('Помилка', 'Неправильний код.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createUser(
        form.email.trim(),
        form.password,
        form.username.trim()
      );

      setUser(result);
      setIsLoggedIn(true);
      router.replace('/home');
    } catch (error) {
      Alert.alert('Помилка', error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView>
        <View className="w-full justify-center min-h-[85vh] px-4 my-6">
          <Image source={images.logo} resizeMode="contain" className="w-[115px] h-[35px]" />

          <Text className="text-3xl text-white mt-10 font-psemibold">
            Реєстрація Studdy
          </Text>

          <Text className="text-gray-100 mt-3 font-pregular">
            Створи акаунт через код на email. Username має бути унікальним.
          </Text>

          {step === 'form' ? (
            <>
              <FormField
                title="Унікальний username"
                value={form.username}
                handleChangeText={(e) => setForm({ ...form, username: e })}
                otherStyles="mt-8"
              />

              <FormField
                title="Email"
                value={form.email}
                handleChangeText={(e) => setForm({ ...form, email: e })}
                otherStyles="mt-7"
                keyboardType="email-address"
              />

              <FormField
                title="Пароль"
                value={form.password}
                handleChangeText={(e) => setForm({ ...form, password: e })}
                otherStyles="mt-7"
              />

              <CustomButton
                title="Надіслати код"
                handlePress={sendCode}
                containerStyles="mt-7"
                isLoading={isSubmitting}
              />
            </>
          ) : (
            <>
              <Text className="text-gray-100 mt-8">
                Код надіслано на: {form.email}
              </Text>

              <FormField
                title="Код з email"
                value={form.code}
                handleChangeText={(e) => setForm({ ...form, code: e })}
                otherStyles="mt-5"
                keyboardType="number-pad"
              />

              <CustomButton
                title="Підтвердити і створити акаунт"
                handlePress={verifyAndRegister}
                containerStyles="mt-7"
                isLoading={isSubmitting}
              />

              <CustomButton
                title="Надіслати код повторно"
                handlePress={sendCode}
                containerStyles="mt-4 bg-black-100 border border-secondary"
                textStyles="text-secondary"
                isLoading={isSubmitting}
              />
            </>
          )}

          <View className="justify-center pt-5 flex-row gap-2">
            <Text className="text-lg text-gray-100 font-pregular">
              Уже є акаунт?
            </Text>
            <Link href="/sign-in" className="text-lg font-psemibold text-secondary">
              Увійти
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SignUp;
