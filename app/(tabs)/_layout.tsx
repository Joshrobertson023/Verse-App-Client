import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Tabs, useRootNavigationState } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Badge } from 'react-native-paper';
import { useAppStore } from '../store';
import useAppTheme from '../theme';

export default function TabLayout() {
  const theme = useAppTheme();
  const user = useAppStore((state) => state.user);
  const numNotifications = useAppStore((state) => state.numNotifications);
  const rootNavigationState = useRootNavigationState();

React.useEffect(() => {
  if (!rootNavigationState?.key) return; // ✅ Wait until ready
  console.log('user.username: ' + user.username);
  if (user.username === 'Default User') {
    router.replace('../(auth)/createName');
  }
}, [rootNavigationState?.key, user]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.onBackground,
        tabBarInactiveTintColor: theme.colors.onBackground,
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.colors.background,
          borderBottomColor: theme.colors.outline,
          borderBottomWidth: 1,
        },
        headerShadowVisible: false,
        headerTitleStyle: {
          color: theme.colors.onBackground,
        },
        headerTintColor: theme.colors.onBackground,
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
          title: 'VerseApp',
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 15, marginRight: 10 }}>
              <TouchableOpacity onPress={() => router.push('.././notifications')}>
                <Ionicons style={{marginTop: 4}} name="notifications-outline" size={32} color={theme.colors.onBackground} />
                {numNotifications > 0 && (
                <Badge
                  size={18}
                  style={{
                    position: 'absolute',
                    top: -3,
                    right: -3,
                    backgroundColor: 'red',
                    color: 'white',
                    fontSize: 12,
                  }}
                >
                  {numNotifications}
                </Badge>
              )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('../user/profile')}>
                <View style={{borderRadius: 50, borderWidth: 1, borderColor: theme.colors.onBackground, width: 38, height: 38, flex: 1, justifyContent: 'center', alignItems: 'center', padding: 5, marginRight: 5}}>
                  <Text style={{color: theme.colors.onBackground, fontSize: 20}}>
                    {(user.firstName.at(0) || 'D').toUpperCase() + (user.lastName.at(0) || 'U').toUpperCase()}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          ),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={28} />
          ),
          tabBarLabel: ({ focused, color }) => (
            <Text
              style={{
                fontSize: 14,
                fontWeight: focused ? '800' : '400',
                color: color,
                marginTop: 5,
              }}
            > Home
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
            <Ionicons name={focused ? 'extension-puzzle' : 'extension-puzzle-outline'} color={color} size={28} />
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
                <Ionicons name={focused ? 'search' : 'search-outline'} color={color} size={28} />
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
