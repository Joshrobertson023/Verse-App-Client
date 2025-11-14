import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { CHECK_INTERVAL_SECONDS, TASK_NAME } from './backgroundNotificationTask';

export const registerBackgroundNotificationTask = async () => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (!isRegistered) {
      await BackgroundFetch.registerTaskAsync(TASK_NAME, {
        minimumInterval: CHECK_INTERVAL_SECONDS,
        stopOnTerminate: false,
        startOnBoot: true,
      });
    } else {
      await BackgroundFetch.setMinimumIntervalAsync(CHECK_INTERVAL_SECONDS);
    }
  } catch (error) {
    console.error('Failed to register background notification task', error);
  }
};

export const unregisterBackgroundNotificationTask = async () => {
  try {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(TASK_NAME);
    if (isRegistered) {
      await BackgroundFetch.unregisterTaskAsync(TASK_NAME);
    }
  } catch (error) {
    console.error('Failed to unregister background notification task', error);
  }
};


