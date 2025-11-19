import * as Notifications from 'expo-notifications';
import { getOverdueVerses, getUnreadNotificationCount } from '../db';
import { useAppStore } from '../store';

/**
 * Updates the app icon badge count based on user preferences
 * Combines notifications and overdue verses counts
 */
export async function updateAppBadge(): Promise<void> {
  try {
    const user = useAppStore.getState().user;
    
    if (!user.username || user.username === 'Default User') {
      // Clear badge if user is not logged in
      await Notifications.setBadgeCountAsync(0);
      return;
    }

    let badgeCount = 0;

    // Add notifications count if enabled
    if (user.badgeNotificationsEnabled !== false) {
      try {
        const notificationCount = await getUnreadNotificationCount(user.username);
        badgeCount += notificationCount;
      } catch (error) {
        console.error('Failed to get notification count for badge:', error);
      }
    }

    // Add overdue verses count if enabled
    if (user.badgeOverdueEnabled !== false) {
      try {
        const overdueVerses = await getOverdueVerses(user.username);
        badgeCount += overdueVerses.length;
      } catch (error) {
        console.error('Failed to get overdue verses count for badge:', error);
      }
    }

    // Update the badge
    await Notifications.setBadgeCountAsync(badgeCount);
  } catch (error) {
    console.error('Failed to update app badge:', error);
  }
}










