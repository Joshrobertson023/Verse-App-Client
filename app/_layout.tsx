import { Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React from 'react';
import { PaperProvider } from 'react-native-paper';
import { loginUserWithToken } from './db';
import { useAppStore } from './store';
import useAppTheme from './theme';

export default function RootLayout() {
  const theme = useAppTheme();

  const [appIsReady, setAppIsReady] = React.useState(false);
  const [splashIsVisible, setSplashIsVisible] = React.useState(true);
  const setUser = useAppStore((state) => state.setUser);
  const user = useAppStore((state) => state.user);
  const homePageStats = useAppStore((state) => state.homePageStats);
  const getHomePageStats = useAppStore((state) => state.getHomePageStats);

  React.useEffect(() => {
    const login = async() => {
        try {
        let token = await SecureStore.getItemAsync('userToken');
        if (token) {
            if (!user || user.username === '') {
            const user = await loginUserWithToken(token);
            setUser(user);
          }
        }
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
        getHomePageStats(user);
      }
    }
    login();
  }, []);

  if (!appIsReady) {
    return null;
  }


  return ( 
      <PaperProvider theme={theme}>
        <Stack>
          <Stack.Screen 
            name="(tabs)"
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="(auth)"
            options={{ headerShown: false }} 
          />
          <Stack.Screen 
            name="collections/addnew"
            options={{ 
              title: 'New Collection',
              headerStyle: {
                backgroundColor: theme.colors.background,
              },
              headerTitleStyle: {
                color: theme.colors.onBackground,
              },
              headerTintColor: theme.colors.primary,
             }} 
          />
          <Stack.Screen
            name="notifications"
            options={{
              title: 'Notifications',
              headerStyle: {
                backgroundColor: theme.colors.background,
              },
              headerTitleStyle: {
                color: theme.colors.onBackground,
              },
              headerTintColor: theme.colors.primary,
            }}
          />
          <Stack.Screen 
            name="collections/[id]"
            options={{
              title: '',
              headerStyle: {
                backgroundColor: theme.colors.background,
              },
              headerTitleStyle: {
                color: theme.colors.onBackground,
              },
              headerTintColor: theme.colors.primary,
            }} 
          />
        <Stack.Screen
        name="user/profile"
        options={{
          title: 'Profile',
              headerStyle: {
                backgroundColor: theme.colors.background,
              },
              headerTitleStyle: {
                color: theme.colors.onBackground,
              },
              headerTintColor: theme.colors.primary,
            }} 
          />
      </Stack>
    </PaperProvider>
  )
}