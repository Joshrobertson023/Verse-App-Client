import AsyncStorage from '@react-native-async-storage/async-storage';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import { getUserNotificationsTop } from './db';
import type { Notification as AppNotification } from './store';
import { useAppStore } from './store';

export const TASK_NAME = 'verseapp-background-notification-check';
export const STORAGE_KEY_PREFIX = '@verseApp:lastNotificationId:';
export const CHECK_INTERVAL_SECONDS = 30 * 60; // 30 minutes

const getStorageKey = (username: string) => `${STORAGE_KEY_PREFIX}${username}`;

const ensureNotificationChannel = async () => {
  if (Platform.OS !== 'android') {
    return;
  }

  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Verse Memorization Updates',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E6F4FE',
    });
  } catch (error) {
    console.error('Failed to ensure notification channel', error);
  }
};

const deliverNotifications = async (notifications: AppNotification[]) => {
  if (notifications.length === 1) {
    const [single] = notifications;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'New notification',
        body: single.message,
        sound: true,
        data: {
          notificationId: single.id,
          notificationType: single.notificationType,
        },
      },
      trigger: null,
    });
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'New notifications',
      body: `You have ${notifications.length} new notifications.`,
      sound: true,
      data: {
        notificationCount: notifications.length,
      },
    },
    trigger: null,
  });
};

TaskManager.defineTask(TASK_NAME, async () => {
  try {
    const { user } = useAppStore.getState();
    const username = user?.username;
    const pushEnabled = user?.pushNotificationsEnabled ?? true;

    if (!username || username === 'Default User' || !pushEnabled) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    await ensureNotificationChannel();

    const page = await getUserNotificationsTop(username, 10);
    const items: AppNotification[] = page?.items ?? [];

    if (!items.length) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const storageKey = getStorageKey(username);
    const storedId = await AsyncStorage.getItem(storageKey);
    const lastDeliveredId = storedId ? Number(storedId) : undefined;

    const unread = items.filter((notification) => !notification.isRead);
    if (!unread.length) {
      const highestSeen = Math.max(...items.map((n) => n.id));
      await AsyncStorage.setItem(storageKey, highestSeen.toString());
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const newNotifications = typeof lastDeliveredId === 'number' && !Number.isNaN(lastDeliveredId)
      ? unread.filter((notification) => notification.id > lastDeliveredId)
      : unread;

    if (!newNotifications.length) {
      const highestSeen = Math.max(...items.map((n) => n.id));
      await AsyncStorage.setItem(storageKey, highestSeen.toString());
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    const highestNewId = Math.max(...newNotifications.map((n) => n.id));
    const highestOverallId = Math.max(highestNewId, ...(items.map((n) => n.id)));

    await deliverNotifications(newNotifications);
    await AsyncStorage.setItem(storageKey, highestOverallId.toString());

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background notification check failed', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

