import Ionicons from '@expo/vector-icons/Ionicons';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import React, { useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import 'react-native-gesture-handler'; // must be at the top
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider, Portal } from 'react-native-paper';
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
  const [startupVerse, setStartupVerse] = useState(0);
  const { openSettingsSheet } = useAppStore((state) => state.collectionsSheetControls);

  
  SystemUI.setBackgroundColorAsync(theme.colors.background);

  const startupVerses = [
    {
      reference: 'Colossians 3:16',
      text: 'Let the word of Christ dwell in you richly in all wisdom'
    },
    {
      reference: 'Joshua 1:8',
      text: 'This book of the law shall not depart out of thy mouth; but thou shalt meditate therein day and night'
    },
    {
      reference: 'Deuteronomy 6:6-7',
      text: 'And these words, which I command thee this day, shall be in thine heart'
    },
    {
      reference: '2 Timothy 2:15',
      text: 'Study to shew thyself approved unto God, a workman that needeth not to be ashamed, rightly dividing the word of truth.'
    },
    {
      reference: 'Psalm 1:2',
      text: 'But his delight is in the law of the Lord; and in his law doth he meditate day and night.'
    },
    {
      reference: 'Hebrews 4:12',
      text: 'For the word of God is quick, and powerful, and sharper than any twoedged sword'
    },
    {
      reference: 'Matthew 4:4',
      text: '...It is written, Man shall not live by bread alone, but by every word that proceedeth out of the mouth of God.'
    },
    {
      reference: 'Ephesians 6:17',
      text: 'And take the helmet of salvation, and the sword of the Spirit, which is the word of God:'
    }
  ]

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

              const max = startupVerses.length;
              setStartupVerse(Math.floor(Math.random() * max));

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
      <Image source={require('../assets/images/Logo.png')} style={{width: 100, height: 100, borderRadius: 30, marginBottom: 20}} />
      <View style={{padding: 0}}>
        <Text style={{fontSize: 20, fontFamily: 'Noto Serif', color: theme.colors.onBackground, textAlign: 'center'}} >{startupVerses[startupVerse].text}</Text>
        <Text style={{marginTop: 10, fontSize: 16, fontWeight: 500, fontFamily: 'Inter', color: theme.colors.onBackground, textAlign: 'center'}}>- {startupVerses[startupVerse].reference}</Text>
      </View>
    </View>
    )
  }

  return ( 
    <GestureHandlerRootView style={{flex: 1}}>
        <PaperProvider theme={theme}>
          <Portal.Host>
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
                headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 15, marginRight: 10 }}>
              <TouchableOpacity onPress={() => {openSettingsSheet()}}>
                <Ionicons style={{marginTop: 4}} name={"ellipsis-vertical"} size={32} color={theme.colors.onBackground} />
              </TouchableOpacity>
            </View>
          ),
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
            <Stack.Screen
          name="collections/reorderCollections"
          options={{
            title: 'Reorder Collections',
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
          name="collections/reorderVerses"
          options={{
            title: 'Reorder Passages',
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
          name="collections/editCollection"
          options={{
            title: 'Edit Collection',
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
          name="practiceSession"
          options={{
            title: 'Practice',
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
        </Portal.Host>
      </PaperProvider>
    </GestureHandlerRootView>
  )
}