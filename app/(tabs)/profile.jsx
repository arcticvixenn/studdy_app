import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';

import { icons } from '../../constants';
import EmptyState from '../../components/EmptyState';
import PostCard from '../../components/PostCard';
import InfoBox from '../../components/InfoBox';
import {
  completeDailyQuest,
  getDailyQuest,
  getFollowersCount,
  getFollowingCount,
  getOrCreateUserProgress,
  getSavedPosts,
  getSmartLearningAdvice,
  getUserActivityCalendar,
  getUserPosts,
  signOut,
  uploadUserAvatar,
} from '../../lib/appwrite';
import useAppwrite from '../../lib/useAppwrite';
import { useGlobalContext } from '../../context/GlobalProvider';

const ActivityCell = ({ item }) => {
  const intensity =
    item.points >= 150 ? 'bg-secondary' :
    item.points >= 80 ? 'bg-orange-400' :
    item.points >= 30 ? 'bg-yellow-300' :
    item.points > 0 ? 'bg-yellow-100' :
    'bg-black-200';

  return (
    <View className="items-center mb-3">
      <View className={`w-7 h-7 rounded-lg ${intensity}`} />
      <Text className="text-gray-100 text-[9px] mt-1">
        {item.points}
      </Text>
    </View>
  );
};

const Profile = () => {
  const { user, setUser, setIsLoggedIn } = useGlobalContext();

  const [activeTab, setActiveTab] = useState('posts');
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [progress, setProgress] = useState(null);
  const [dailyQuest, setDailyQuest] = useState(null);
  const [activityCalendar, setActivityCalendar] = useState([]);
  const [smartAdvice, setSmartAdvice] = useState([]);
  const [isQuestLoading, setIsQuestLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const {
    data: posts,
    refetch: refetchPosts,
  } = useAppwrite(() => {
    if (!user?.$id) return Promise.resolve([]);
    return getUserPosts(user.$id);
  });

  const {
    data: savedPosts,
    refetch: refetchSavedPosts,
  } = useAppwrite(() => {
    if (!user?.$id) return Promise.resolve([]);
    return getSavedPosts(user.$id);
  });

  const loadGamification = useCallback(async () => {
    if (!user?.$id) return;

    try {
      const [progressResult, questResult, calendarResult, adviceResult] =
        await Promise.all([
          getOrCreateUserProgress(user.$id),
          getDailyQuest(user.$id),
          getUserActivityCalendar(user.$id, 28),
          getSmartLearningAdvice(user.$id),
        ]);

      setProgress(progressResult);
      setDailyQuest(questResult);
      setActivityCalendar(calendarResult);
      setSmartAdvice(adviceResult);
    } catch (error) {
      console.log('load profile gamification error:', error);
    }
  }, [user?.$id]);

  useFocusEffect(
    useCallback(() => {
      refetchPosts();
      refetchSavedPosts();

      if (user?.$id) {
        getFollowersCount(user.$id).then(setFollowersCount);
        getFollowingCount(user.$id).then(setFollowingCount);
        loadGamification();
      }
    }, [user?.$id, loadGamification])
  );

  const changeAvatar = async () => {
    if (!user?.$id || avatarLoading) return;

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert('Помилка', 'Потрібен доступ до галереї для вибору аватарки.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) return;

      setAvatarLoading(true);

      const updatedUser = await uploadUserAvatar({
        user,
        asset: result.assets[0],
      });

      setUser(updatedUser);
      Alert.alert('Готово', 'Аватарку оновлено.');
    } catch (error) {
      Alert.alert('Помилка', error.message || 'Не вдалося оновити аватарку.');
    } finally {
      setAvatarLoading(false);
    }
  };

  const logout = async () => {
    await signOut();
    setUser(null);
    setIsLoggedIn(false);
    router.replace('/sign-in');
  };

  const finishDailyQuest = async () => {
    if (!user?.$id) return;

    setIsQuestLoading(true);

    try {
      const result = await completeDailyQuest(user.$id);

      setDailyQuest(result.quest);
      setProgress(result.progress);

      const calendarResult = await getUserActivityCalendar(user.$id, 28);
      setActivityCalendar(calendarResult);

      Alert.alert(
        result.alreadyCompleted ? 'Квест уже виконано' : 'XP отримано',
        result.alreadyCompleted
          ? 'Сьогоднішній квест уже був зарахований.'
          : `Ти отримала ${result.progress?.gainedXp || dailyQuest?.reward || 0} XP.`
      );
    } catch (error) {
      Alert.alert('Помилка', error.message);
    } finally {
      setIsQuestLoading(false);
    }
  };

  const currentData = activeTab === 'posts' ? posts ?? [] : savedPosts ?? [];

  const progressPercent = progress?.progressPercent || 0;
  const xpInCurrentLevel = progress?.xpInCurrentLevel || 0;
  const xpForNextLevel = progress?.xpForNextLevel || 120;

  return (
    <SafeAreaView className="bg-primary h-full">
      <FlatList
        data={currentData}
        keyExtractor={(item) => item.$id}
        renderItem={({ item }) => <PostCard post={item} />}
        ListHeaderComponent={() => (
          <View className="w-full px-4 mt-6 mb-8">
            <TouchableOpacity
              className="w-full items-end mb-6"
              onPress={logout}
            >
              <Image
                source={icons.logout}
                resizeMode="contain"
                className="w-6 h-6"
              />
            </TouchableOpacity>

            <View className="bg-black-100 border border-black-200 rounded-[28px] p-5">
              <View className="flex-row items-center">
                <TouchableOpacity
                  onPress={changeAvatar}
                  disabled={avatarLoading}
                  activeOpacity={0.85}
                  className="w-24 h-24 border-2 border-secondary rounded-3xl justify-center items-center bg-primary"
                >
                  {user?.avatar ? (
                    <Image
                      source={{ uri: user.avatar }}
                      className="w-[92%] h-[92%] rounded-3xl"
                      resizeMode="cover"
                    />
                  ) : (
                    <Text className="text-secondary text-3xl font-pbold">
                      {(user?.username || 'S').slice(0, 1).toUpperCase()}
                    </Text>
                  )}
                  <View className="absolute -bottom-2 -right-2 bg-secondary px-2 py-1 rounded-xl">
                    <Text className="text-primary text-[10px] font-pbold">
                      {avatarLoading ? '...' : 'EDIT'}
                    </Text>
                  </View>
                </TouchableOpacity>

                <View className="flex-1 ml-4">
                  <Text className="text-white text-2xl font-pbold">
                    {user?.username || 'Користувач Studdy'}
                  </Text>

                  <Text className="text-gray-100 mt-1 font-pregular">
                    Навчальний профіль
                  </Text>

                  <View className="flex-row mt-3">
                    <View className="bg-secondary/20 px-3 py-2 rounded-xl mr-2">
                      <Text className="text-secondary font-pbold">
                        LVL {progress?.level || 1}
                      </Text>
                    </View>

                    <View className="bg-black-200 px-3 py-2 rounded-xl">
                      <Text className="text-white font-pbold">
                        🔥 {progress?.streak || 0} днів
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              <View className="mt-5">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-100 font-pmedium">
                    Прогрес рівня
                  </Text>
                  <Text className="text-secondary font-psemibold">
                    {xpInCurrentLevel}/{xpForNextLevel} XP
                  </Text>
                </View>

                <View className="h-4 bg-black-200 rounded-full overflow-hidden">
                  <View
                    className="h-full bg-secondary rounded-full"
                    style={{ width: `${progressPercent}%` }}
                  />
                </View>
              </View>
            </View>

            <View className="mt-5 flex-row flex-wrap justify-between">
              <InfoBox
                title={(posts ?? []).length}
                subtitle="Публікацій"
                containerStyles="w-[31%] bg-black-100 rounded-2xl py-4"
                titleStyles="text-xl"
              />

              <InfoBox
                title={followersCount}
                subtitle="Підписників"
                containerStyles="w-[31%] bg-black-100 rounded-2xl py-4"
                titleStyles="text-xl"
              />

              <InfoBox
                title={followingCount}
                subtitle="Підписок"
                containerStyles="w-[31%] bg-black-100 rounded-2xl py-4"
                titleStyles="text-xl"
              />
            </View>

            <View className="bg-black-100 border border-black-200 rounded-[24px] p-5 mt-5">
              <View className="flex-row justify-between items-start">
                <View className="flex-1 pr-3">
                  <Text className="text-white text-xl font-pbold">
                    {dailyQuest?.icon || '🎯'} Квест дня
                  </Text>

                  <Text className="text-secondary mt-2 font-psemibold">
                    {dailyQuest?.title || 'Завантаження...'}
                  </Text>

                  <Text className="text-gray-100 mt-2">
                    {dailyQuest?.description || 'Готуємо завдання на сьогодні.'}
                  </Text>

                  <Text className="text-white mt-3 font-psemibold">
                    Нагорода: {dailyQuest?.reward || 0} XP
                  </Text>
                </View>

                <View className="bg-primary px-3 py-2 rounded-xl">
                  <Text className="text-secondary font-pbold">
                    {dailyQuest?.completed ? 'DONE' : 'NEW'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={finishDailyQuest}
                disabled={dailyQuest?.completed || isQuestLoading}
                className={`mt-4 rounded-2xl py-4 items-center ${
                  dailyQuest?.completed ? 'bg-black-200' : 'bg-secondary'
                }`}
              >
                <Text
                  className={`font-pbold ${
                    dailyQuest?.completed ? 'text-gray-100' : 'text-primary'
                  }`}
                >
                  {dailyQuest?.completed
                    ? 'Квест уже виконано'
                    : isQuestLoading
                    ? 'Нараховуємо XP...'
                    : 'Зарахувати квест'}
                </Text>
              </TouchableOpacity>
            </View>

            <View className="bg-black-100 border border-black-200 rounded-[24px] p-5 mt-5">
              <Text className="text-white text-xl font-pbold">
                Календар активності
              </Text>

              <Text className="text-gray-100 mt-2">
                Скільки XP було зароблено за останні 28 днів.
              </Text>

              <View className="flex-row flex-wrap justify-between mt-5">
                {activityCalendar.map((item) => (
                  <ActivityCell key={item.dateKey} item={item} />
                ))}
              </View>
            </View>

            <View className="bg-black-100 border border-black-200 rounded-[24px] p-5 mt-5">
              <Text className="text-white text-xl font-pbold">
                Розумні поради для навчання
              </Text>

              {smartAdvice.length ? (
                smartAdvice.map((item) => (
                  <View
                    key={item.topic}
                    className="bg-primary rounded-2xl p-4 mt-4 border border-black-200"
                  >
                    <Text className="text-secondary font-pbold">
                      {item.title}
                    </Text>
                    <Text className="text-gray-100 mt-2">
                      {item.description}
                    </Text>
                  </View>
                ))
              ) : (
                <Text className="text-gray-100 mt-3">
                  Пройди кілька тестів, і тут зʼявляться персональні поради:
                  що повторити, де були помилки і який матеріал відкрити далі.
                </Text>
              )}
            </View>

            <View className="w-full flex-row bg-black-100 border border-black-200 rounded-2xl p-1 mt-6">
              <TouchableOpacity
                onPress={() => setActiveTab('posts')}
                className={`flex-1 py-3 rounded-xl items-center ${
                  activeTab === 'posts' ? 'bg-secondary' : ''
                }`}
              >
                <Text
                  className={`font-psemibold ${
                    activeTab === 'posts'
                      ? 'text-primary'
                      : 'text-gray-100'
                  }`}
                >
                  Мої публікації
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('saved')}
                className={`flex-1 py-3 rounded-xl items-center ${
                  activeTab === 'saved' ? 'bg-secondary' : ''
                }`}
              >
                <Text
                  className={`font-psemibold ${
                    activeTab === 'saved'
                      ? 'text-primary'
                      : 'text-gray-100'
                  }`}
                >
                  Збережене
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <EmptyState
            title={
              activeTab === 'posts'
                ? 'Власних публікацій поки немає'
                : 'Збережених публікацій поки немає'
            }
            subtitle={
              activeTab === 'posts'
                ? 'Створи перший допис і почни формувати свою навчальну активність.'
                : 'Натискай на закладку в постах, щоб зберігати корисні матеріали.'
            }
          />
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </SafeAreaView>
  );
};

export default Profile;
