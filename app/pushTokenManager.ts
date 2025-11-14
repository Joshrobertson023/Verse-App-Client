import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { registerDevicePushToken, removeDevicePushToken } from './db';
import type { User } from './store';

const PUSH_TOKEN_STORAGE_KEY = '@verseApp:expoPushToken';

const getProjectId = (): string | undefined => {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
};

const isRunningInExpoGo = (): boolean => {
  return Constants.appOwnership === 'expo';
};

const ensureAndroidNotificationChannel = async () => {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#E6F4FE',
  });
};

export const ensurePushTokenRegistered = async (user: User): Promise<string | undefined> => {
  if (!user?.username || user.username === 'Default User') {
    return undefined;
  }

  if (isRunningInExpoGo()) {
    console.log('Push notifications are limited in Expo Go. Use a development or production build for full support.');
    return undefined;
  }

  await ensureAndroidNotificationChannel();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permissions not granted.');
    return undefined;
  }

  const projectId = getProjectId();
  const tokenResult = projectId
    ? await Notifications.getExpoPushTokenAsync({ projectId })
    : await Notifications.getExpoPushTokenAsync();

  const token = tokenResult.data;
  if (!token) {
    console.warn('Expo push token unavailable.');
    return undefined;
  }

  const storedToken = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);

  if (storedToken && storedToken !== token) {
    try {
      await removeDevicePushToken(user.username, storedToken);
    } catch (error) {
      console.warn('Failed to remove stale push token:', error);
    }
  }

  await registerDevicePushToken(user.username, token, Platform.OS);
  await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);

  return token;
};

export const unregisterStoredPushToken = async (user: User): Promise<void> => {
  if (!user?.username || user.username === 'Default User') {
    await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
    return;
  }

  const storedToken = await AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
  if (!storedToken) {
    return;
  }

  try {
    await removeDevicePushToken(user.username, storedToken);
  } catch (error) {
    console.warn('Failed to unregister push token:', error);
  } finally {
    await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
  }
};

export const getStoredPushToken = async (): Promise<string | null> => {
  return AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
};


