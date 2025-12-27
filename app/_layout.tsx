import { Lora_400Regular, Lora_700Bold } from '@expo-google-fonts/lora';
import { Merriweather_400Regular, Merriweather_700Bold } from '@expo-google-fonts/merriweather';
import { SourceSansPro_400Regular, SourceSansPro_600SemiBold } from '@expo-google-fonts/source-sans-pro';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack, router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import React, { useEffect, useRef, useState } from 'react';
import { Image, Platform, TouchableOpacity, type TouchableOpacityProps, View } from 'react-native';
import 'react-native-gesture-handler'; // MUST be at the very top - before any other imports
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { PaperProvider, Portal } from 'react-native-paper';
import { checkIfBanned, getActiveBan, getAdminUsernames, getCurrentVerseOfDayAsUserVerse, getPopularSearches, getStreakLength, getUserCollections, loginUserWithToken, updateLastSeen } from './db';
import { useAppStore } from './store';
import useStyles from './styles';
import useAppTheme from './theme';
// REMOVED: import { registerBackgroundNotificationTask, unregisterBackgroundNotificationTask } from './backgroundNotifications';
import { ensurePushTokenRegistered, unregisterStoredPushToken } from './pushTokenManager';
import { updateAppBadge } from './utils/badgeManager';

const TouchableOpacityWithDefaults = TouchableOpacity as typeof TouchableOpacity & {
  defaultProps?: Partial<TouchableOpacityProps>;
};

TouchableOpacityWithDefaults.defaultProps = {
  ...(TouchableOpacityWithDefaults.defaultProps ?? {}),
  activeOpacity: 0.8,
};

const RECENT_SEARCHES_KEY = '@verseApp:recentSearches';

SplashScreen.preventAutoHideAsync().catch(() => {
  // ignore error if splash screen was already hidden
});

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
    'Noto Serif light': require('../assets/fonts/Noto_Serif/static/NotoSerif-Light.ttf'),
    'Noto Serif extralight': require('../assets/fonts/Noto_Serif/static/NotoSerif-ExtraLight.ttf'),
    'Noto Serif medium': require('../assets/fonts/Noto_Serif/static/NotoSerif-Medium.ttf'),
    'Noto Serif semibold': require('../assets/fonts/Noto_Serif/static/NotoSerif-SemiBold.ttf'),
    'Noto Serif bold': require('../assets/fonts/Noto_Serif/static/NotoSerif-Bold.ttf'),
    'Noto Serif extrabold': require('../assets/fonts/Noto_Serif/static/NotoSerif-ExtraBold.ttf'),
    'Noto Serif black': require('../assets/fonts/Noto_Serif/static/NotoSerif-Black.ttf'),
    'Noto Serif italic': require('../assets/fonts/Noto_Serif/static/NotoSerif-Italic.ttf'),
    'Noto Serif bolditalic': require('../assets/fonts/Noto_Serif/static/NotoSerif-BoldItalic.ttf'),
    Inter: require('../assets/fonts/Inter/Inter-VariableFont_opsz,wght.ttf'),
    'Inter thin': require('../assets/fonts/Inter/static/Inter_18pt-Thin.ttf'),
    'Inter extralight': require('../assets/fonts/Inter/static/Inter_18pt-ExtraLight.ttf'),
    'Inter light': require('../assets/fonts/Inter/static/Inter_18pt-Light.ttf'),
    'Inter regular': require('../assets/fonts/Inter/static/Inter_18pt-Regular.ttf'),
    'Inter medium': require('../assets/fonts/Inter/static/Inter_18pt-Medium.ttf'),
    'Inter semibold': require('../assets/fonts/Inter/static/Inter_18pt-SemiBold.ttf'),
    'Inter bold': require('../assets/fonts/Inter/static/Inter_18pt-Bold.ttf'),
    'Inter extrabold': require('../assets/fonts/Inter/static/Inter_18pt-ExtraBold.ttf'),
    'Inter black': require('../assets/fonts/Inter/static/Inter_18pt-Black.ttf'),
    'Inter italic': require('../assets/fonts/Inter/static/Inter_18pt-Italic.ttf'),
    'Inter bolditalic': require('../assets/fonts/Inter/static/Inter_18pt-BoldItalic.ttf'),
    Merriweather: Merriweather_400Regular,
    'Merriweather bold': Merriweather_700Bold,
    Lora: Lora_400Regular,
    'Lora bold': Lora_700Bold,
    'Source Sans Pro': SourceSansPro_400Regular,
    'Source Sans Pro semibold': SourceSansPro_600SemiBold,
  });

  const theme = useAppTheme();

  const [appIsReady, setAppIsReady] = React.useState(false);
  const styles = useStyles();
  const setUser = useAppStore((state) => state.setUser);
  const user = useAppStore((state) => state.user);
  const homePageStats = useAppStore((state) => state.homePageStats);
  const getHomePageStats = useAppStore((state) => state.getHomePageStats);
  const [errorLogginIn, setErrorLoggingIn] = useState(false);
  const setCollections = useAppStore((state) => state.setCollections);
  const setPopularSearches = useAppStore((state) => state.setPopularSearches);
  const setVerseOfDay = useAppStore((state) => state.setVerseOfDay);
  const [startupVerse, setStartupVerse] = useState(0);
  const { openSettingsSheet } = useAppStore((state) => state.collectionsSheetControls);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  // Handle font loading errors gracefully
  React.useEffect(() => {
    if (error) {
      console.error('Font loading error:', error);
      // Continue app initialization even if fonts fail to load
      // The app will use system fonts as fallback
    }
  }, [error]);

  // Set up notification channel and listeners
  useEffect(() => {
    // Create notification channel for Android (REQUIRED for Android 8.0+)
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#E6F4FE',
      }).catch(error => {
        console.error('Failed to create notification channel:', error);
      });
    }

    // Listen for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      // Optionally refresh notification count or data here
      updateAppBadge().catch(error => {
        console.error('Failed to update badge after notification:', error);
      });
    });

    // Listen for user interactions with notifications
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      const data = response.notification.request.content.data;
      
      // Navigate based on notification data
      if (data?.notificationId || data?.notificationType) {
        // Navigate to notifications screen when user taps notification
        router.push('/notifications');
      }
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

  // Register for push notifications when user logs in
  useEffect(() => {
    void registerForPushNotificationsAsync();
  }, [user.username, user.pushNotificationsEnabled]);

  // REMOVED: Background notification polling task
  // Push notifications are now handled directly by the server sending to Expo's push service
  // No need for background polling anymore

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

  // Update badge when user changes
  useEffect(() => {
    if (user.username && user.username !== 'Default User') {
      updateAppBadge().catch(error => {
        console.error('Failed to update badge:', error);
      });
    } else {
      // Clear badge if user is not logged in
      updateAppBadge().catch(error => {
        console.error('Failed to clear badge:', error);
      });
    }
  }, [user.username, user.badgeNotificationsEnabled, user.badgeOverdueEnabled]);

  async function registerForPushNotificationsAsync() {
    try {
      if (!user.username || user.username === 'Default User') {
        return;
      }

      if (!(user.pushNotificationsEnabled ?? true)) {
        await unregisterStoredPushToken(user);
        return;
      }

      await ensurePushTokenRegistered(user);
    } catch (error) {
      console.error('Error ensuring push token registration:', error);
    }
  }

  // Set system UI background color with error handling
  React.useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.background).catch((err) => {
      console.warn('Failed to set system UI background color:', err);
    });
  }, [theme.colors.background]);

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
    // Continue even if fonts failed to load (error state)
    // This ensures the app doesn't hang if fonts are missing
    if (!loaded && !error) {
      return;
    }

    const login = async () => {
      const TIMEOUT_MS = 4000; 
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Login process timed out')), TIMEOUT_MS)
      );

      try {
        await Promise.race([
          (async () => {
            if (!errorLogginIn) {
              let token: string | null = null;
              try {
                token = await SecureStore.getItemAsync('userToken');
              } catch (secureStoreError) {
                console.error('Failed to read from SecureStore:', secureStoreError);
                // Continue without token - user will need to login again
              }
    
              console.log('logging in with token:');
              console.log(token);
              console.log(user);

              const max = startupVerses.length;
              setStartupVerse(Math.floor(Math.random() * max));

              if (token) {
                if (user.username === 'Default User') {
                  try {
                    const fetchedUser = await loginUserWithToken(token);

                    // Check if user is banned
                    const isBanned = await checkIfBanned(fetchedUser.username);
                    if (isBanned) {
                      const activeBan = await getActiveBan(fetchedUser.username);
                      try {
                        await SecureStore.deleteItemAsync('userToken');
                      } catch (e) {
                        console.warn('Failed to delete token from SecureStore:', e);
                      }
                      try {
                        await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
                      } catch (e) {
                        console.warn('Failed to remove recent searches:', e);
                      }
                      router.replace({
                        pathname: '/(auth)/banned',
                        params: {
                          reason: activeBan?.reason || 'Your account has been banned.',
                          banDate: activeBan?.banDate || new Date().toISOString(),
                          banExpireDate: activeBan?.banExpireDate || null
                        }
                      });
                      return;
                    }

                    let adminUsernames: string[] = [];
                    try {
                      adminUsernames = await getAdminUsernames();
                    } catch (error) {
                      console.error('Failed to load admin usernames:', error);
                    }

                    const userWithAdminFlag = {
                      ...fetchedUser,
                      isAdmin: adminUsernames.includes(fetchedUser.username),
                    };

                    // Fetch streakLength from API
                    try {
                      userWithAdminFlag.streakLength = await getStreakLength(userWithAdminFlag.username);
                    } catch (error) {
                      console.error('Failed to fetch streak length:', error);
                      userWithAdminFlag.streakLength = 0;
                    }
                    // versesMemorized, versesOverdue, and numberPublishedCollections come from the database
                    setUser(userWithAdminFlag);
                    const collections = await getUserCollections(userWithAdminFlag.username);
                    setCollections(collections);
                  } catch (loginError) {
                    console.error('Failed to login with token:', loginError);
                    // Clear recent searches and token when login fails
                    try {
                      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
                    } catch (e) {
                      console.warn('Failed to remove recent searches:', e);
                    }
                    try {
                      await SecureStore.deleteItemAsync('userToken');
                    } catch (e) {
                      console.warn('Failed to delete token from SecureStore:', e);
                    }
                    throw loginError;
                  }
                }
              }
              // Load verse of day before hiding splash screen
              try {
                const verseOfDay = await getCurrentVerseOfDayAsUserVerse();
                setVerseOfDay(verseOfDay);
              } catch (error) {
                console.error('Failed to load verse of day:', error);
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
        try {
          await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
        } catch (storageError) {
          console.warn('Failed to clear recent searches:', storageError);
        }
      } finally {
        // Always set app as ready, even if login failed
        // This ensures the app doesn't hang on splash screen
        setAppIsReady(true);
      }
    };

    login();
  }, [loaded, error]);

  React.useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync().catch(() => {
        // ignore errors when hiding splash screen
      });
    }
  }, [appIsReady]);


  if (!appIsReady) {
    return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#b93838ff', padding: 30 }}>
      <Image source={require('../assets/images/LogoIcon.png')} style={{width: 70, height: 80, marginBottom: 20}} />
    </View>
    )
  }

  return ( 
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.background }}>
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
              name="about"
              options={{ 
                title: 'About',
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
            name="push-notifications-tutorial"
            options={{
            title: 'push-notifications-tutorial',
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
          name="collections/reorderExistingVerses"
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
          name="collections/publishCollection"
          options={{
            title: 'Publish Collection',
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
          name="chapters"
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