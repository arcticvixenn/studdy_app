import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const Learn = () => {
  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 24,
          paddingBottom: 32,
        }}
      >
        <View className="mb-8">
          <Text className="text-3xl font-psemibold text-white">
            Навчання
          </Text>

          <Text className="text-sm font-pregular text-gray-100 mt-3 leading-5">
            Тут буде персональний навчальний простір Studdy: матеріали,
            інтерактивні тести, прогрес і рекомендації на основі машинного
            навчання.
          </Text>
        </View>

        <View className="bg-black-100 border border-black-200 rounded-2xl p-5 mb-5">
          <Text className="text-white text-lg font-psemibold mb-2">
            Персональна навчальна добірка
          </Text>

          <Text className="text-gray-100 text-sm font-pregular leading-5">
            У цьому блоці згодом будуть матеріали, які система радитиме
            користувачу на основі його інтересів, активності та результатів
            тестів.
          </Text>
        </View>

        <View className="bg-black-100 border border-black-200 rounded-2xl p-5 mb-5">
          <Text className="text-white text-lg font-psemibold mb-2">
            Інтерактивні тести
          </Text>

          <Text className="text-gray-100 text-sm font-pregular leading-5">
            Тут з’являться квізи за навчальними темами. Саме відповіді на ці
            тести стануть основою для ML-моделі оцінювання рівня знань.
          </Text>
        </View>

        <View className="bg-black-100 border border-black-200 rounded-2xl p-5 mb-5">
          <Text className="text-white text-lg font-psemibold mb-2">
            Аналітика прогресу
          </Text>

          <Text className="text-gray-100 text-sm font-pregular leading-5">
            У цьому розділі ми покажемо сильні й слабкі теми, динаміку
            результатів і прогноз подальшої успішності.
          </Text>
        </View>

        <View className="bg-secondary/10 border border-secondary rounded-2xl p-5">
          <Text className="text-secondary text-lg font-psemibold mb-2">
            ML-блок дипломного проєкту
          </Text>

          <Text className="text-gray-100 text-sm font-pregular leading-5">
            Studdy не обмежиться звичайною фільтрацією контенту. Тут буде
            реалізовано персоналізацію навчання на основі реальних моделей
            машинного навчання.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Learn;