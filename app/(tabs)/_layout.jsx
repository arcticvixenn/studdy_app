import React from 'react';
import { Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const TabIcon = ({ iconName, title, focused }) => {
  const color = focused ? '#FFA001' : '#CDCDE0';

  return (
    <View
      style={{
        width: 70,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons
        name={iconName}
        size={24}
        color={color}
      />

      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={{
          color,
          fontSize: 10,
          lineHeight: 13,
          marginTop: 4,
          textAlign: 'center',
          width: 70,
          fontFamily: focused ? 'Poppins-SemiBold' : 'Poppins-Regular',
        }}
      >
        {title}
      </Text>
    </View>
  );
};

const TabsLayout = () => {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#FFA001',
        tabBarInactiveTintColor: '#CDCDE0',
        tabBarStyle: {
          backgroundColor: '#161622',
          borderTopWidth: 1,
          borderTopColor: '#232533',
          height: 76,
          paddingTop: 6,
          paddingBottom: 10,
        },
        tabBarItemStyle: {
          height: 60,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Головна',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconName={focused ? 'home' : 'home-outline'}
              title="Головна"
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="videos"
        options={{
          title: 'Відео',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconName={focused ? 'play' : 'play-outline'}
              title="Відео"
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="learn"
        options={{
          title: 'Навчання',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconName={focused ? 'book' : 'book-outline'}
              title="Навчання"
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="create"
        options={{
          title: 'Створити',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconName={focused ? 'add-circle' : 'add-circle-outline'}
              title="Створити"
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профіль',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              iconName={focused ? 'person' : 'person-outline'}
              title="Профіль"
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
};

export default TabsLayout;
