import { Stack } from 'expo-router';
import React from 'react';
import { PaperProvider } from 'react-native-paper';
import useAppTheme from './theme';

export default function RootLayout() {
  const theme = useAppTheme();
  return (
      <PaperProvider theme={theme}>
        <Stack>
          <Stack.Screen 
            name="(tabs)"
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="collections/addnew"
            options={{ headerShown: false }} 
          />
        </Stack>
      </PaperProvider>
  )
}