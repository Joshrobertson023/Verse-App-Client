import { Stack } from 'expo-router';
import * as SystemUI from 'expo-system-ui';
import React from 'react';
import useAppTheme from '../theme';


export default function RootLayout() {

  const theme = useAppTheme();
  SystemUI.setBackgroundColorAsync(theme.colors.background);
  return ( 
    <Stack screenOptions={{
      headerStyle: {
        backgroundColor: theme.colors.background,
      },
      headerTintColor: theme.colors.onBackground,
      contentStyle: {
        backgroundColor: theme.colors.background,
      },
    }}>
        <Stack.Screen 
        name="createName"
        options={{ headerShown: false,
              headerStyle: {
                backgroundColor: theme.colors.background,
              },
              headerShadowVisible: false
            }} 
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
              headerTintColor: theme.colors.onBackground,
              headerShadowVisible: false
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
              headerTintColor: theme.colors.onBackground,
              headerShadowVisible: false
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
              headerTintColor: theme.colors.onBackground,
              headerShadowVisible: false
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
              headerTintColor: theme.colors.onBackground,
              headerShadowVisible: false
             }} 
        />
        <Stack.Screen
        name="forgotUsername"
        options={{
              headerStyle: {
                backgroundColor: theme.colors.background,
              },
              headerTitle: "Forgot Username",
              headerTitleStyle: {
                color: theme.colors.onBackground,
              },
              headerTintColor: theme.colors.onBackground,
              headerShadowVisible: false
            }}
        />
        <Stack.Screen
        name="forgotPassword"
        options={{
              headerStyle: {
                backgroundColor: theme.colors.background,
              },
              headerTitle: "Forgot Password",
              headerTitleStyle: {
                color: theme.colors.onBackground,
              },
              headerTintColor: theme.colors.onBackground,
              headerShadowVisible: false
            }}
        />
        <Stack.Screen
        name="resetPassword"
        options={{
              headerStyle: {
                backgroundColor: theme.colors.background,
              },
              headerTitle: "Reset Password",
              headerTitleStyle: {
                color: theme.colors.onBackground,
              },
              headerTintColor: theme.colors.onBackground,
              headerShadowVisible: false
            }}
        />
    </Stack>
  )
}