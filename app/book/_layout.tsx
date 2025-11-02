import React from 'react';
import { Stack } from 'expo-router';
import useAppTheme from '../theme';

export default function BookLayout() {
  const theme = useAppTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.onBackground,
        headerTitleStyle: {
          color: theme.colors.onBackground,
        },
      }}
    >
      <Stack.Screen name="[bookName]" />
    </Stack>
  );
}

