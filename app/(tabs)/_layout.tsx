import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import useAppTheme from '../theme';

export default function TabLayout() {
  const theme = useAppTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onBackground,
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.colors.outline,
          borderBottomWidth: 1,
        },
        headerTitleStyle: {
          color: theme.colors.onBackground,
        },
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          height: 120,
          paddingBottom: 50,
          paddingTop: 10,
          paddingLeft: 5,
          paddingRight: 5,
          borderTopColor: theme.colors.outline,
        },
      }}>
        <Tabs.Screen 
        name="index" 
        options={{
          title: 'Collections',
          headerRight: () => (
            <TouchableOpacity onPress={() => console.log('Profile')}>
              <Ionicons name="person-circle-outline" size={36} color={theme.colors.onBackground} />

            </TouchableOpacity>
          ),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'file-tray-full' : 'file-tray-full-outline'} color={theme.colors.onSurfaceVariant} size={28} />
          ),
          tabBarLabel: ({ focused, color }) => (
            <Text
              style={{
                fontSize: 14,
                fontWeight: focused ? '800' : '400',
                color: color,
                marginTop: 5,
              }}
            > Verses
            </Text>
          ),
        }}
      />
          <Tabs.Screen 
        name="practice" 
        options={{
          title: 'Practice',
          headerTitle: 'Practice',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'extension-puzzle' : 'extension-puzzle-outline'} color={theme.colors.onSurfaceVariant} size={28} />
          ),
          tabBarLabel: ({ focused, color }) => (
            <Text
              style={{
                fontSize: 14,
                fontWeight: focused ? '800' : '400',
                color: color,
                marginTop: 5,
              }}
            > Practice
            </Text>
          ),
        }}
      />
          <Tabs.Screen 
            name="search" 
            options={{
              tabBarIcon: ({ color, focused }) => (
                <Ionicons name={focused ? 'search' : 'search-outline'} color={theme.colors.onSurfaceVariant} size={28} />
              ),
              tabBarLabel: ({ focused, color }) => (
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: focused ? '800' : '400',
                    color: color,
                    marginTop: 5,
                  }}
                > Search
                </Text>
              ),
        }}
      />
      <Tabs.Screen
        name="bible"
        options={{
          title: 'Bible',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'book-sharp' : 'book-outline'} color={color} size={28}/>
          ),
          tabBarLabel: ({ focused, color }) => (
            <Text
              style={{
                fontSize: 14,
                fontWeight: focused ? '800' : '400',
                color: color,
                marginTop: 5,
              }}
            > Bible
            </Text>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'planet' : 'planet-outline'} color={color} size={28}/>
          ),
          tabBarLabel: ({ focused, color }) => (
            <Text
              style={{
                fontSize: 14,
                fontWeight: focused ? '800' : '400',
                color: color,
                marginTop: 5,
              }}
            > Explore
            </Text>
          ),
        }}
      />
    </Tabs>
  );
}
