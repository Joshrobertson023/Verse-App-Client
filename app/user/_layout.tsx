import React from 'react';
import useAppTheme from '../theme';
import { Stack } from 'expo-router';
import * as SystemUI from 'expo-system-ui';

export default function UserLayout() {
  const theme = useAppTheme();
  SystemUI.setBackgroundColorAsync(theme.colors.background);
  
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.onBackground,
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      <Stack.Screen name="streak" options={{ title: 'Streak' }} />
      <Stack.Screen name="friends" options={{ title: 'Friends' }} />
      <Stack.Screen name="[username]" options={{ title: 'User Profile' }} />
    </Stack>
  );
}

