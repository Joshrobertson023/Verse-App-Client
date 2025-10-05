import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#cfcfd0ff',
        tabBarInactiveTintColor: '#cfcfd0ff',
        headerStyle: {
          backgroundColor: '#000000ff',
        },
        headerShadowVisible: false,
        headerTintColor: '#fff',
        tabBarStyle: {
          backgroundColor: '#000000ff',
        },
      }}>
          <Tabs.Screen 
        name="index" 
        options={{
          title: 'Collections',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'file-tray-full' : 'file-tray-full-outline'} color={color} size={24} />
          ),
        }}
      />
          <Tabs.Screen 
        name="practice" 
        options={{
          title: 'Practice',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'extension-puzzle' : 'extension-puzzle-outline'} color={color} size={24} />
          ),
        }}
      />
          <Tabs.Screen 
            name="search" 
            options={{
              tabBarLabel: '', // hide label
              tabBarIcon: ({ color, focused }) => (
                <View
                  style={focused ? {
                    width: 45,
                    height: 45,
                    borderRadius: 50,
                    backgroundColor: '#3b3b3bff',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: Platform.OS === 'ios' ? 10 : -35, // lift above tab bar
                  } : {
                    width: 45,
                    height: 45,
                    borderRadius: 50,
                    backgroundColor: '#232323ff',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: Platform.OS === 'ios' ? 10 : -35, // lift above tab bar
                  }}
                >
              <Ionicons
                name={'search-outline'}
                color="#cfcfd0ff"
                size={30} // bigger icon
              />
            </View>
          ),
          tabBarItemStyle: {
            marginTop: -10, // adjust spacing for floating effect
          },
        }}
      />
      <Tabs.Screen
        name="bible"
        options={{
          title: 'Bible',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'book-sharp' : 'book-outline'} color={color} size={24}/>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'planet' : 'planet-outline'} color={color} size={24}/>
          ),
        }}
      />
    </Tabs>
  );
}
