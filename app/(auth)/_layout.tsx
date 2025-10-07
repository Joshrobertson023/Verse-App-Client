import { Stack } from 'expo-router';
import React from 'react';
import useAppTheme from '../theme';

export default function RootLayout() {
  const theme = useAppTheme();
  return ( 
    <Stack>
        <Stack.Screen 
        name="createName"
        options={{ headerShown: false }} 
        />
        <Stack.Screen 
        name="login"
        options={{ headerShown: false }} 
        />
    </Stack>
  )
}