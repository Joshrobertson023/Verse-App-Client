import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { Platform, View } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#ffd33d',
        headerStyle: {
          backgroundColor: '#25292e',
        },
        headerShadowVisible: false,
        headerTintColor: '#fff',
        tabBarStyle: {
          backgroundColor: '#25292e',
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
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: '#ffd33d',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: Platform.OS === 'ios' ? -10 : -5, // lift above tab bar
              }}
            >
              <Ionicons
                name={focused ? 'search' : 'search-outline'}
                color="#25292e"
                size={36} // bigger icon
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
