import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import 'react-native-gesture-handler'; // must be at the top
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider } from 'react-native-paper';
import { getUserCollections, loginUserWithToken } from './db';
import { useAppStore } from './store';
import useStyles from './styles';
import useAppTheme from './theme';


SplashScreen.hideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    'Noto Serif': require('../assets/fonts/Noto_Serif/NotoSerif-VariableFont_wdth,wght.ttf'),
    'Noto Serif bold': require('../assets/fonts/Noto_Serif/static/NotoSerif-Bold.ttf'),
    'Inter': require('../assets/fonts/Inter/Inter-VariableFont_opsz,wght.ttf'),
  });

  const theme = useAppTheme();

  const [appIsReady, setAppIsReady] = React.useState(false);
  const styles = useStyles();
  const [splashIsVisible, setSplashIsVisible] = React.useState(true);
  const setUser = useAppStore((state) => state.setUser);
  const user = useAppStore((state) => state.user);
  const homePageStats = useAppStore((state) => state.homePageStats);
  const getHomePageStats = useAppStore((state) => state.getHomePageStats);
  const [errorLogginIn, setErrorLoggingIn] = useState(false);
  const setCollections = useAppStore((state) => state.setCollections);

  
SystemUI.setBackgroundColorAsync(theme.colors.background);

React.useEffect(() => {
  const login = async () => {
    const TIMEOUT_MS = 4000; 
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Login process timed out')), TIMEOUT_MS)
    );

    try {
      await Promise.race([
        (async () => {
          if (!errorLogginIn) {
            const token = await SecureStore.getItemAsync('userToken');
  
            console.log('logging in with token:');
            console.log(token);
            console.log(user);
            if (token) {
              if (user.username === 'Default User') {
                const fetchedUser = await loginUserWithToken(token);
                fetchedUser.streakLength = 0; // Change to functions in store that do it automatically on user set
                fetchedUser.versesMemorized = 0;
                fetchedUser.versesOverdue = 0;
                fetchedUser.numberPublishedCollections = 0;
                setUser(fetchedUser);
                const collections = await getUserCollections(fetchedUser.username);
                setCollections(collections);
                alert('logging in for user: ' + fetchedUser.username);
              }
            }
            setAppIsReady(true);
            getHomePageStats(user);
          }
        })(),
        timeoutPromise,
      ]);
    } catch (e) {
      console.warn('Login error:', e);
      setErrorLoggingIn(true);
    } finally {
      setAppIsReady(true);
    }
  };

  login();
}, [loaded, error]);


  if (!appIsReady) {
    return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background, padding: 30 }}>
      <Text style={{fontSize: 36, color: theme.colors.onBackground, position: 'absolute', top: 200}}>Logo goes here</Text>
      <View style={{padding: 20}}>
        <Text style={{fontSize: 20, fontWeight: 900, fontFamily: 'Inter', color: theme.colors.onBackground, textAlign: 'center'}} >Let the word of Christ dwell in you richly in all wisdom.</Text>
        <Text style={{marginTop: 10, fontSize: 16, fontWeight: 500, fontFamily: 'Inter', color: theme.colors.onBackground, textAlign: 'center'}}>- Colossians 3:16</Text>
        <Text style={{marginTop: 50, fontSize: 20, fontWeight: 500, fontFamily: 'Inter', color: theme.colors.onBackground, textAlign: 'center'}}>Starting Up...</Text>
      </View>
    </View>
    )
  }

  return ( 
    <GestureHandlerRootView style={{flex: 1}}>
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
                headerTintColor: theme.colors.onBackground,
          headerShadowVisible: false,
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
                headerTintColor: theme.colors.onBackground,
          headerShadowVisible: false,
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
                headerTintColor: theme.colors.onBackground,
          headerShadowVisible: false,
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
                headerTintColor: theme.colors.onBackground,
          headerShadowVisible: false,
              }} 
            />
        </Stack>
      </PaperProvider>
    </GestureHandlerRootView>
  )
}