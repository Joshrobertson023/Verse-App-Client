import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect, useRef, useState } from 'react';
import { Image, Platform, Text, TouchableOpacity, View } from 'react-native';
import 'react-native-gesture-handler'; // must be at the top
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider, Portal } from 'react-native-paper';
import { getPopularSearches, getStreakLength, getUserCollections, loginUserWithToken, updateLastSeen } from './db';
import { useAppStore } from './store';
import useStyles from './styles';
import useAppTheme from './theme';

const RECENT_SEARCHES_KEY = '@verseApp:recentSearches';


SplashScreen.hideAsync();

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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
  const setPopularSearches = useAppStore((state) => state.setPopularSearches);
  const [startupVerse, setStartupVerse] = useState(0);
  const { openSettingsSheet } = useAppStore((state) => state.collectionsSheetControls);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  // Set up notification listeners and register for push notifications
  useEffect(() => {
    registerForPushNotificationsAsync();

    // Listen for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Listen for user interactions with notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  // Update last seen every minute
  useEffect(() => {
    if (!user.username) return;

    const updateLastSeenInterval = setInterval(async () => {
      try {
        await updateLastSeen(user.username);
      } catch (error) {
        console.error('Failed to update last seen:', error);
      }
    }, 60000); // Update every minute

    // Update immediately on mount
    updateLastSeen(user.username).catch(error => {
      console.error('Failed to update last seen:', error);
    });

    return () => clearInterval(updateLastSeenInterval);
  }, [user.username]);

  async function registerForPushNotificationsAsync() {
    try {
      // Check if running in Expo Go (development mode)
      const isExpoGo = __DEV__;
      
      if (isExpoGo) {
        console.log('Push notifications not fully supported in Expo Go. Use a development build for full functionality.');
        return;
      }

      let token;

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#E6F4FE',
        });
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }

      token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log('Push notification token:', token);

      // TODO: Send token to your server to store in database
      // This should be called when the user logs in and has pushNotificationsEnabled = true
      
      return token;
    } catch (error) {
      console.error('Error getting push token:', error);
      return;
    }
  }

  
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
                  try {
                    const fetchedUser = await loginUserWithToken(token);
                    // Fetch streakLength from API
                    try {
                      fetchedUser.streakLength = await getStreakLength(fetchedUser.username);
                    } catch (error) {
                      console.error('Failed to fetch streak length:', error);
                      fetchedUser.streakLength = 0;
                    }
                    // versesMemorized, versesOverdue, and numberPublishedCollections come from the database
                    setUser(fetchedUser);
                    const collections = await getUserCollections(fetchedUser.username);
                    setCollections(collections);
                  } catch (loginError) {
                    console.error('Failed to login with token:', loginError);
                    // Clear recent searches and token when login fails
                    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
                    await SecureStore.deleteItemAsync('userToken');
                    throw loginError;
                  }
                }
              }
              setAppIsReady(true);
              getHomePageStats(user);
              
              // Load popular searches on app start
              try {
                const popularSearches = await getPopularSearches(10);
                setPopularSearches(popularSearches);
              } catch (error) {
                console.error('Failed to load popular searches:', error);
              }
            }
          })(),
          timeoutPromise,
        ]);
      } catch (e) {
        console.warn('Login error:', e);
        setErrorLoggingIn(true);
        // Clear recent searches when token login fails
        await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
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
          <Stack
            screenOptions={{
              contentStyle: {
                backgroundColor: theme.colors.background,
              },
            }}
          >
            <Stack.Screen 
              name="(tabs)"
              options={{ 
                headerShown: false,
                animation: 'fade'
              }} 
            />
            <Stack.Screen 
              name="(auth)"
              options={{ headerShown: false }} 
            />
            <Stack.Screen 
              name="privacy"
              options={{ 
                title: 'Privacy Policy',
                headerStyle: {
                  backgroundColor: theme.colors.background,
                },
                headerTitleStyle: {
                  color: theme.colors.onBackground,
                },
                headerTintColor: theme.colors.onBackground,
              }} 
            />
            <Stack.Screen 
              name="terms"
              options={{ 
                title: 'Terms of Service',
                headerStyle: {
                  backgroundColor: theme.colors.background,
                },
                headerTitleStyle: {
                  color: theme.colors.onBackground,
                },
                headerTintColor: theme.colors.onBackground,
              }} 
            />
            <Stack.Screen 
              name="activity"
              options={{ 
                title: 'Activity Tracking & Sharing',
                headerStyle: {
                  backgroundColor: theme.colors.background,
                },
                headerTitleStyle: {
                  color: theme.colors.onBackground,
                },
                headerTintColor: theme.colors.onBackground,
              }} 
            />
            <Stack.Screen 
              name="user"
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
              }}
            />
            <Stack.Screen
          name="admin"
          options={{
            title: 'Admin Panel',
            headerStyle: {
              backgroundColor: theme.colors.background,
            },
            headerTitleStyle: {
              color: theme.colors.onBackground,
            },
            headerTintColor: theme.colors.onBackground,
              }}
            />
            <Stack.Screen
          name="settings"
          options={{
            title: 'Settings',
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
                animation: 'fade_from_bottom',
                headerStyle: {
                  backgroundColor: theme.colors.background,
                },
                headerShadowVisible: false,
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
              }} 
            />
            <Stack.Screen
          name="book"
          options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="explore/collection/[id]"
              options={{
                title: '',
                headerStyle: {
                  backgroundColor: theme.colors.background,
                },
                headerTitleStyle: {
                  color: theme.colors.onBackground,
                },
                headerTintColor: theme.colors.onBackground,
              }}
            />
        </Stack>
        </Portal.Host>
      </PaperProvider>
    </GestureHandlerRootView>
  )
}