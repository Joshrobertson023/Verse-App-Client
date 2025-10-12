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
        name="createUsername"
        options={{ headerStyle: {
                backgroundColor: theme.colors.background,
              },
              headerTitle: "Create Username",
              headerTitleStyle: {
                color: theme.colors.onBackground,
              },
              headerTintColor: theme.colors.primary,
             }} 
        />
        <Stack.Screen 
        name="enterEmail"
        options={{ headerStyle: {
                backgroundColor: theme.colors.background,
              },
              headerTitle: "Enter Email",
              headerTitleStyle: {
                color: theme.colors.onBackground,
              },
              headerTintColor: theme.colors.primary,
             }} 
        />
        <Stack.Screen
        name="createPassword"
        options={{ headerStyle: {
                backgroundColor: theme.colors.background,
              },
              headerTitle: "Create Password",
              headerTitleStyle: {
                color: theme.colors.onBackground,
              },
              headerTintColor: theme.colors.primary,
             }} 
        />
        <Stack.Screen 
        name="login"
        options={{ headerStyle: {
                backgroundColor: theme.colors.background,
              },
              headerTitle: "Login",
              headerTitleStyle: {
                color: theme.colors.onBackground,
              },
              headerTintColor: theme.colors.primary,
             }} 
        />
    </Stack>
  )
}