import { Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import React from 'react';
import { Text, View } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { loginUserWithToken } from './db';
import { useAppStore } from './store';
import useStyles from './styles';
import useAppTheme from './theme';


SplashScreen.hideAsync();

export default function RootLayout() {
  const theme = useAppTheme();

  const [appIsReady, setAppIsReady] = React.useState(false);
  const styles = useStyles();
  const [splashIsVisible, setSplashIsVisible] = React.useState(true);
  const setUser = useAppStore((state) => state.setUser);
  const user = useAppStore((state) => state.user);
  const homePageStats = useAppStore((state) => state.homePageStats);
  const getHomePageStats = useAppStore((state) => state.getHomePageStats);

React.useEffect(() => {
  const login = async () => {
    const TIMEOUT_MS = 4000; 
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Login process timed out')), TIMEOUT_MS)
    );

    try {
      await Promise.race([
        (async () => {
          const token = await SecureStore.getItemAsync('userToken');

          if (token) {
            if (!user || user.username === '') {
              const fetchedUser = await loginUserWithToken(token);
              setUser(fetchedUser);
            }
          }
        })(),
        timeoutPromise,
      ]);
    } catch (e) {
      console.warn('Login error:', e);
    } finally {
      await SplashScreen.hideAsync();
      setAppIsReady(true);
      getHomePageStats(user);
    }
  };

  login();
}, []);


  if (!appIsReady) {
    return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <Text style={styles.headline}>Logo goes here</Text>
      <Text style={styles.subheading}>Let the word of Christ dwell in you richly in all wisdom...</Text>
      <Text style={styles.tinyText}>Colossians 3:16</Text>
    </View>
    )
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