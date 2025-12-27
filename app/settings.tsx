import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Modal, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Divider, TextInput } from 'react-native-paper';
import { ProfileDrawerLink } from './components/ProfileContent';
import { deleteUser, refreshUser, submitBugReport, updateActivityNotifications, updateBadgeNotificationsEnabled, updateBadgeOverdueEnabled, updateBibleVersion, updateEmail, updateNotifyCollectionSaved, updateNotifyMemorizedVerse, updateNotifyNoteLiked, updateNotifyOfFriends, updateNotifyPublishedCollection, updatePassword, updatePracticeReminders, updatePushNotifications, updateReceiveStreakReminders, updateSubscribedVerseOfDay, updateThemeDb, updateTypeOutReference, updateUsername, updateUserProfile } from './db';
import { ensurePushTokenRegistered, unregisterStoredPushToken } from './pushTokenManager';
import { ThemePreference, useAppStore } from './store';
import useStyles from './styles';
import useAppTheme from './theme';
import { updateAppBadge } from './utils/badgeManager';

const RECENT_SEARCHES_KEY = '@verseApp:recentSearches';

export default function SettingsScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  const themePreference = useAppStore((state) => state.themePreference);
  const setThemePreference = useAppStore((state) => state.setThemePreference);
  const [subscribedVerseOfDay, setSubscribedVerseOfDay] = useState(user.subscribedVerseOfDay ?? true);
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(user.pushNotificationsEnabled ?? true);
  const [activityNotificationsEnabled, setActivityNotificationsEnabled] = useState(user.activityNotificationsEnabled ?? true);
  const [notifyMemorizedVerse, setNotifyMemorizedVerse] = useState(user.notifyMemorizedVerse ?? true);
  const [notifyPublishedCollection, setNotifyPublishedCollection] = useState(user.notifyPublishedCollection ?? true);
  const [notifyCollectionSaved, setNotifyCollectionSaved] = useState(user.notifyCollectionSaved ?? true);
  const [notifyNoteLiked, setNotifyNoteLiked] = useState(user.notifyNoteLiked ?? true);
  const [badgeNotificationsEnabled, setBadgeNotificationsEnabled] = useState(user.badgeNotificationsEnabled ?? true);
  const [badgeOverdueEnabled, setBadgeOverdueEnabled] = useState(user.badgeOverdueEnabled ?? true);
  const [practiceRemindersEnabled, setPracticeRemindersEnabled] = useState(user.practiceNotificationsEnabled ?? true);
  const [notifyOfFriends, setNotifyOfFriends] = useState(user.friendsActivityNotificationsEnabled ?? true);
  const [receiveStreakReminders, setReceiveStreakReminders] = useState(user.streakRemindersEnabled ?? true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUsernameConfirm, setShowUsernameConfirm] = useState(false);
  const [deleteUsernameInput, setDeleteUsernameInput] = useState('');
  const [showBugReport, setShowBugReport] = useState(false);
  const [bugReportText, setBugReportText] = useState('');
  const [submittingBugReport, setSubmittingBugReport] = useState(false);
  const [showBugReportSuccess, setShowBugReportSuccess] = useState(false);
  
  // Profile settings state
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [bio, setBio] = useState(user.description || '');
  const [bibleVersion, setBibleVersion] = useState(user.bibleVersion ?? 0);
  const [showUsernameDialog, setShowUsernameDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [themePreferenceLocal, setThemePreferenceLocal] = useState<number>(0);
  const [typeOutReference, setTypeOutReference] = useState(true);



  const themeOptions: Array<{ key: ThemePreference; label: string; description: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { key: 'light', label: 'Light', description: '', icon: 'sunny-outline' },
    { key: 'dark', label: 'Dark', description: '', icon: 'moon-outline' },
    { key: 'system', label: 'Use device setting', description: '', icon: 'phone-portrait-outline' },
  ];

  const handleCustomizeFriendNotifications = () => {

  }

  const handleThemeSelection = (preference: ThemePreference) => {
    setThemePreference(preference);
    const themePreferenceEnum: number = preference === 'light' ? 2 : preference === 'dark' ? 1 : 0;
    alert("updating theme preference to: " + themePreferenceEnum);
    updateThemeDb(themePreferenceEnum, user.username);
  };

  const handleToggleTypeOutReference = async (value: boolean) => {
    setTypeOutReference(value);
    try {
      await updateTypeOutReference(value, user.username);
      setUser({...user, typeOutReference: value});
    } catch (error) {
      console.error('Failed to update type out reference setting:', error);
      alert('Failed to update practice preference');
    }
  }

  const handleTogglePracticeReminders = async (value: boolean) => {
    setPracticeRemindersEnabled(value);
    try {
      await updatePracticeReminders(user.username, value);
      setUser({
        ...user,
        practiceNotificationsEnabled: value
      });
    } catch (error) {
      console.error('Failed to update practice reminders:', error);
      alert('Failed to update practice reminders');
    }
  };

  const handleToggleNotifyOfFriends = async (value: boolean) => {
    setNotifyOfFriends(value);
    try {
      await updateNotifyOfFriends(user.username, value);
      setUser({
        ...user,
        friendsActivityNotificationsEnabled: value
      });
    } catch (error) {
      console.error('Failed to update notify of friends:', error);
      alert('Failed to update notify of friends');
    }
  };

  const handleToggleReceiveStreakReminders = async (value: boolean) => {
    setReceiveStreakReminders(value);
    try {
      await updateReceiveStreakReminders(user.username, value);
      setUser({
        ...user,
        streakRemindersEnabled: value
      });
    } catch (error) {
      console.error('Failed to update receive streak reminders:', error);
      alert('Failed to update receive streak reminders');
    }
  };

  const handleToggleVerseOfDay = async (value: boolean) => {
    setSubscribedVerseOfDay(value);
    try {
      await updateSubscribedVerseOfDay(user.username, value);
      setUser({
        ...user,
        subscribedVerseOfDay: value
      });
    } catch (error) {
      console.error('Failed to update subscription:', error);
      alert('Failed to update subscription');
    }
  };

  const handleTogglePushNotifications = async (value: boolean) => {
    setPushNotificationsEnabled(value);
    try {
      await updatePushNotifications(user.username, value);
      setUser({
        ...user,
        pushNotificationsEnabled: value
      });

      if (value) {
        await ensurePushTokenRegistered({ ...user, pushNotificationsEnabled: value });
      } else {
        await unregisterStoredPushToken(user);
      }
    } catch (error) {
      console.error('Failed to update push notifications:', error);
      alert('Failed to update push notifications');
      setPushNotificationsEnabled(!value);
    }
  };

  const handleToggleActivityNotifications = async (value: boolean) => {
    setActivityNotificationsEnabled(value);
    try {
      await updateActivityNotifications(user.username, value);
      setUser({
        ...user,
        activityNotificationsEnabled: value
      });
    } catch (error) {
      console.error('Failed to update activity notifications:', error);
      alert('Failed to update activity notifications');
      setActivityNotificationsEnabled(!value);
    }
  };

  const handleToggleNotifyMemorizedVerse = async (value: boolean) => {
    setNotifyMemorizedVerse(value);
    try {
      await updateNotifyMemorizedVerse(user.username, value);
      setUser({
        ...user,
        notifyMemorizedVerse: value
      });
    } catch (error) {
      console.error('Failed to update notify memorized verse:', error);
      alert('Failed to update notify memorized verse setting');
      setNotifyMemorizedVerse(!value);
    }
  };

  const handleToggleNotifyPublishedCollection = async (value: boolean) => {
    setNotifyPublishedCollection(value);
    try {
      await updateNotifyPublishedCollection(user.username, value);
      setUser({
        ...user,
        notifyPublishedCollection: value
      });
    } catch (error) {
      console.error('Failed to update notify published collection:', error);
      alert('Failed to update notify published collection setting');
      setNotifyPublishedCollection(!value);
    }
  };

  const handleToggleNotifyCollectionSaved = async (value: boolean) => {
    setNotifyCollectionSaved(value);
    try {
      await updateNotifyCollectionSaved(user.username, value);
      setUser({
        ...user,
        notifyCollectionSaved: value
      });
    } catch (error) {
      console.error('Failed to update notify collection saved:', error);
      alert('Failed to update notify collection saved setting');
      setNotifyCollectionSaved(!value);
    }
  };

  const handleToggleNotifyNoteLiked = async (value: boolean) => {
    setNotifyNoteLiked(value);
    try {
      await updateNotifyNoteLiked(user.username, value);
      setUser({
        ...user,
        notifyNoteLiked: value
      });
    } catch (error) {
      console.error('Failed to update notify note liked:', error);
      alert('Failed to update notify note liked setting');
      setNotifyNoteLiked(!value);
    }
  };

  const handleToggleBadgeNotifications = async (value: boolean) => {
    setBadgeNotificationsEnabled(value);
    try {
      await updateBadgeNotificationsEnabled(user.username, value);
      setUser({
        ...user,
        badgeNotificationsEnabled: value
      });
      // Update badge immediately after changing setting
      await updateAppBadge();
    } catch (error) {
      console.error('Failed to update badge notifications setting:', error);
      alert('Failed to update badge notifications setting');
      setBadgeNotificationsEnabled(!value);
    }
  };

  const handleToggleBadgeOverdue = async (value: boolean) => {
    setBadgeOverdueEnabled(value);
    try {
      await updateBadgeOverdueEnabled(user.username, value);
      setUser({
        ...user,
        badgeOverdueEnabled: value
      });
      // Update badge immediately after changing setting
      await updateAppBadge();
    } catch (error) {
      console.error('Failed to update badge overdue setting:', error);
      alert('Failed to update badge overdue setting');
      setBadgeOverdueEnabled(!value);
    }
  };

  const handleDeleteAccountConfirm = () => {
    setShowDeleteConfirm(false);
    setShowUsernameConfirm(true);
  };

  const handleDeleteAccount = async () => {
    if (deleteUsernameInput.trim() !== user.username) {
      alert('Username does not match. Please type your username exactly as shown.');
      return;
    }

    setShowUsernameConfirm(false);
    setDeleteUsernameInput('');
    try {
      await deleteUser(user.username);
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
      setUser({
        ...user,
        username: '',
        authToken: ''
      });
      router.replace('../../auth/createName');
    } catch (error) {
      console.error('Failed to delete account:', error);
      alert('Failed to delete account');
    }
  };

  const handleSubmitBugReport = async () => {
    if (!bugReportText.trim()) {
      alert('Please describe the bug or issue');
      return;
    }

    setSubmittingBugReport(true);
    try {
      await submitBugReport(user.username, bugReportText);
      setBugReportText('');
      setShowBugReport(false);
      setShowBugReportSuccess(true);
    } catch (error) {
      console.error('Failed to submit bug report:', error);
      alert('Failed to submit bug report. Please try again.');
    } finally {
      setSubmittingBugReport(false);
    }
  };

  const handleSaveProfile = async () => {
    setUpdatingProfile(true);
    try {
      const updatedUser = {
        ...user,
        firstName,
        lastName,
        description: bio,
        bibleVersion
      };
      await updateUserProfile(updatedUser);
      const refreshedUser = await refreshUser(user.username);
      setUser(refreshedUser);
      alert('Profile updated successfully');
    } catch (error) {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleBibleVersionChange = async (version: number) => {
    setBibleVersion(version);
    try {
      await updateBibleVersion(user.username, version);
      const refreshedUser = await refreshUser(user.username);
      setUser(refreshedUser);
    } catch (error) {
      console.error('Failed to update Bible version:', error);
      alert('Failed to update Bible version');
      setBibleVersion(user.bibleVersion ?? 0);
    }
  };

  const handleChangeUsername = async () => {
    if (!newUsername.trim()) {
      alert('Please enter a username');
      return;
    }

    try {
      await updateUsername(user.username, newUsername.trim());
      const refreshedUser = await refreshUser(newUsername.trim());
      setUser(refreshedUser);
      setShowUsernameDialog(false);
      setNewUsername('');
      alert('Username updated successfully');
    } catch (error) {
      console.error('Failed to update username:', error);
      alert(error instanceof Error ? error.message : 'Failed to update username');
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) {
      alert('Please enter an email');
      return;
    }

    try {
      await updateEmail(user.username, newEmail.trim());
      const refreshedUser = await refreshUser(user.username);
      setUser(refreshedUser);
      setShowEmailDialog(false);
      setNewEmail('');
      alert('Email updated successfully');
    } catch (error) {
      console.error('Failed to update email:', error);
      alert('Failed to update email');
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      alert('Please enter and confirm your new password');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    if (newPassword.length < 12) {
      alert('Password must be at least 12 characters long');
      return;
    }

    try {
      await updatePassword(user.username, newPassword);
      setShowPasswordDialog(false);
      setNewPassword('');
      setConfirmPassword('');
      alert('Password updated successfully');
    } catch (error) {
      console.error('Failed to update password:', error);
      alert('Failed to update password');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView style={{ flex: 1 }}>
        <View style={{ padding: 20 }}>

          {/* Profile Settings Section */}
          <View style={{ marginBottom: 30 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: theme.colors.onBackground,
              marginBottom: 15,
              fontFamily: 'Inter'
            }}>
              Profile Settings
            </Text>

            <TouchableOpacity style={{height: 100, width: '100%'}} onPress={() => router.push("/push-notifications-tutorial")}>
              <Text style={{...styles.tinyText}}>Push Notifications</Text>
            </TouchableOpacity>

            <TextInput
              label="First Name"
              mode="outlined"
              value={firstName}
              onChangeText={setFirstName}
              style={{ marginBottom: 12, backgroundColor: theme.colors.surface }}
              textColor={theme.colors.onSurface}
            />

            <TextInput
              label="Last Name"
              mode="outlined"
              value={lastName}
              onChangeText={setLastName}
              style={{ marginBottom: 12, backgroundColor: theme.colors.surface }}
              textColor={theme.colors.onSurface}
            />

            <TextInput
              label="Bio"
              mode="outlined"
              value={bio}
              onChangeText={setBio}
              multiline
              numberOfLines={4}
              style={{ marginBottom: 12, backgroundColor: theme.colors.surface }}
              textColor={theme.colors.onSurface}
            />
            <TouchableOpacity
              onPress={handleSaveProfile}
              disabled={updatingProfile}
              style={styles.button_outlined}
              activeOpacity={0.1}
            >
              <Text style={styles.buttonText_outlined}>Save Profile</Text>
            </TouchableOpacity>

            <Text style={{
              fontSize: 14,
              color: theme.colors.onSurfaceVariant,
              marginBottom: 8,
              marginTop: 10,
              fontFamily: 'Inter'
            }}>
              Preferred Bible Version
            </Text>
            <View style={{
              borderWidth: 1,
              borderColor: theme.colors.outline,
              borderRadius: 4,
              marginBottom: 12,
              backgroundColor: theme.colors.surface
            }}>
              <Picker
                selectedValue={bibleVersion}
                onValueChange={handleBibleVersionChange}
                style={{ color: theme.colors.onSurface }}
                dropdownIconColor={theme.colors.onSurface}
              >
                <Picker.Item label="King James Version (KJV)" value={0} />
                <Picker.Item label="New King James Version (NKJV)" value={1} enabled={false} />
                <Picker.Item label="American Standard Version (ASV)" value={2} enabled={false} />
                <Picker.Item label="New International Version (NIV)" value={3} enabled={false} />
                <Picker.Item label="English Standard Version (ESV)" value={4} enabled={false} />
                <Picker.Item label="New American Standard Bible (NASB)" value={5} enabled={false} />
                <Picker.Item label="Christian Standard Bible (CSB)" value={6} enabled={false} />
              </Picker>
            </View>

            <View style={{height: 40}} />



            
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: theme.colors.onBackground,
              marginBottom: 15,
              fontFamily: 'Inter'
            }}>
              Change Info
            </Text>


            <ProfileDrawerLink 
              icon="pencil"
              label="Change Username"
              onPress={() => setShowUsernameDialog(true)}/>
            <View style={{height: 10}}/>
            <ProfileDrawerLink
              icon="pencil"
              label="Change Email"
              onPress={() => setShowEmailDialog(true)}/>
            <View style={{height: 10}}/>
            <ProfileDrawerLink
              icon="pencil"
              label="Change Password"
              onPress={() => setShowPasswordDialog(true)}/>


          {/* Practice Settings */}
          <View style={{marginBottom: 30, marginTop: 30}}>
            <Text style={{fontSize: 18, fontWeight: '600', color: theme.colors.onBackground, marginBottom: 15, fontFamily: 'Inter'}}>
              Practice Settings
            </Text>

            <View>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 12
              }}>
                <View style={{ flex: 1, marginRight: 16 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '500',
                    color: theme.colors.onBackground,
                    marginBottom: 4,
                    fontFamily: 'Inter'
                  }}>
                    Type out reference
                  </Text>
                </View>
                <Switch
                  value={typeOutReference}
                  onValueChange={handleToggleTypeOutReference}
                  trackColor={{ false: theme.colors.surface2, true: theme.colors.surface2 }}
                />
              </View>
              <Divider />
            </View>
          </View>


          {/* Notifications Section */}
          <View style={{ marginBottom: 30 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: theme.colors.onBackground,
              marginBottom: 15,
              fontFamily: 'Inter'
            }}>
              Notifications
            </Text>

              <View>
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 12
                }}>
                  <View style={{ flex: 1, marginRight: 16 }}>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '500',
                      color: theme.colors.onBackground,
                      marginBottom: 4,
                      fontFamily: 'Inter'
                    }}>
                      Receive push notifications
                    </Text>
                  </View>
                  <Switch
                    value={pushNotificationsEnabled}
                    onValueChange={handleTogglePushNotifications}
                    trackColor={{ false: theme.colors.surface2, true: theme.colors.surface2 }}
                  />
                </View>
                <Divider />
              </View>
            </View>

            <View>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 12
              }}>
                <View style={{ flex: 1, marginRight: 16 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '500',
                    color: theme.colors.onBackground,
                    marginBottom: 4,
                    fontFamily: 'Inter'
                  }}>
                    Receive verse of day push notifications
                  </Text>
                </View>
                <Switch
                  value={subscribedVerseOfDay}
                  onValueChange={handleToggleVerseOfDay}
                  trackColor={{ false: theme.colors.surface2, true: theme.colors.surface2 }}
                />
              </View>
              <Divider />
            </View>
            <View>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 12
              }}>
                <View style={{ flex: 1, marginRight: 16 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '500',
                    color: theme.colors.onBackground,
                    marginBottom: 4,
                    fontFamily: 'Inter'
                  }}>
                    Receive practice reminders
                  </Text>
                </View>
                <Switch
                  value={practiceRemindersEnabled}
                  onValueChange={handleTogglePracticeReminders}
                  trackColor={{ false: theme.colors.surface2, true: theme.colors.surface2 }}
                />
              </View>
              <Divider />
            </View>
            <View>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 12
              }}>
                <View style={{ flex: 1, marginRight: 16 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '500',
                    color: theme.colors.onBackground,
                    marginBottom: 4,
                    fontFamily: 'Inter'
                  }}>
                    Be notified of friend's activity
                  </Text>
                </View>
                <Switch
                  value={notifyOfFriends}
                  onValueChange={handleToggleNotifyOfFriends}
                  trackColor={{ false: theme.colors.surface2, true: theme.colors.surface2 }}
                />
              </View>
              <Divider />
            </View>
            <View>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 12
              }}>
                <View style={{ flex: 1, marginRight: 16 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '500',
                    color: theme.colors.onBackground,
                    marginBottom: 4,
                    fontFamily: 'Inter'
                  }}>
                    Receive streak reminders
                  </Text>
                </View>
                <Switch
                  value={receiveStreakReminders}
                  onValueChange={handleToggleReceiveStreakReminders}
                  trackColor={{ false: theme.colors.surface2, true: theme.colors.surface2 }}
                />
              </View>
              <Divider />
            </View>
            <TouchableOpacity
              onPress={handleCustomizeFriendNotifications}
              disabled={updatingProfile}
              style={styles.button_outlined}
            >
              <Text style={styles.buttonText_outlined}>Customize which friends notify you</Text>
            </TouchableOpacity>


          {/* Activity Notifications Section */}
          <View style={{ marginBottom: 30 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: theme.colors.onBackground,
              marginBottom: 15,
              fontFamily: 'Inter'
            }}>
              Activity Notifications
            </Text>
            <Text style={{
              fontSize: 12,
              color: theme.colors.onSurfaceVariant,
              fontFamily: 'Inter'
            }}>
              Activity notifications are notifications sent to your friends whenever you have new activity in the app.
            </Text>

            <View>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 12
              }}>
                <View style={{ flex: 1, marginRight: 16 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '500',
                    color: theme.colors.onBackground,
                    marginBottom: 4,
                    fontFamily: 'Inter'
                  }}>
                    Memorized a passage
                  </Text>
                </View>
                <Switch
                  value={notifyMemorizedVerse}
                  onValueChange={handleToggleNotifyMemorizedVerse}
                  trackColor={{ false: theme.colors.surface2, true: theme.colors.surface2 }}
                />
              </View>
              <Divider />
            </View>

            <View>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 12
              }}>
                <View style={{ flex: 1, marginRight: 16 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '500',
                    color: theme.colors.onBackground,
                    marginBottom: 4,
                    fontFamily: 'Inter'
                  }}>
                    Published Collection
                  </Text>
                </View>
                <Switch
                  value={notifyPublishedCollection}
                  onValueChange={handleToggleNotifyPublishedCollection}
                  trackColor={{ false: theme.colors.surface2, true: theme.colors.surface2 }}
                />
              </View>
              <Divider />
            </View>

            <View>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 12
              }}>
                <View style={{ flex: 1, marginRight: 16 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '500',
                    color: theme.colors.onBackground,
                    marginBottom: 4,
                    fontFamily: 'Inter'
                  }}>
                    Someone saves your collection
                  </Text>
                </View>
                <Switch
                  value={notifyCollectionSaved}
                  onValueChange={handleToggleNotifyCollectionSaved}
                  trackColor={{ false: theme.colors.surface2, true: theme.colors.surface2 }}
                />
              </View>
              <Divider />
            </View>

            <View>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 12
              }}>
                <View style={{ flex: 1, marginRight: 16 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '500',
                    color: theme.colors.onBackground,
                    marginBottom: 4,
                    fontFamily: 'Inter'
                  }}>
                    Someone likes your public note
                  </Text>
                </View>
                <Switch
                  value={notifyNoteLiked}
                  onValueChange={handleToggleNotifyNoteLiked}
                  trackColor={{ false: theme.colors.surface2, true: theme.colors.surface2 }}
                />
              </View>
              <Divider />
            </View>
          </View>

          {/* Badge Settings Section */}
          <View style={{ marginBottom: 30 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: theme.colors.onBackground,
              marginBottom: 15,
              fontFamily: 'Inter'
            }}>
              App Icon Badge
            </Text>

            <View>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 12
              }}>
                <View style={{ flex: 1, marginRight: 16 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '500',
                    color: theme.colors.onBackground,
                    marginBottom: 4,
                    fontFamily: 'Inter'
                  }}>
                    Show Notifications
                  </Text>
                </View>
                <Switch
                  value={badgeNotificationsEnabled}
                  onValueChange={handleToggleBadgeNotifications}
                  trackColor={{ false: theme.colors.surface2, true: theme.colors.surface2 }}
                />
              </View>
              <Divider />
            </View>

            <View>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 12
              }}>
                <View style={{ flex: 1, marginRight: 16 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '500',
                    color: theme.colors.onBackground,
                    marginBottom: 4,
                    fontFamily: 'Inter'
                  }}>
                    Show Overdue Verses
                  </Text>
                </View>
                <Switch
                  value={badgeOverdueEnabled}
                  onValueChange={handleToggleBadgeOverdue}
                  trackColor={{ false: theme.colors.surface2, true: theme.colors.surface2 }}
                />
              </View>
              <Divider />
            </View>
          </View>
        </View>

          {/* Appearance Section */}
          <View style={{ marginBottom: 30 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: theme.colors.onBackground,
              marginBottom: 15,
              fontFamily: 'Inter'
            }}>
              Appearance
            </Text>

            {themeOptions.map((option) => {
              const isSelected = themePreference === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  onPress={() => handleThemeSelection(option.key)}
                  activeOpacity={0.8}
                  style={{
                    backgroundColor: isSelected ? theme.colors.surface : 'transparent',
                    borderRadius: 12,
                    padding: 15,
                    marginBottom: 10,
                    flexDirection: 'row',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: isSelected ? theme.colors.onBackground : theme.colors.surface2,
                    gap: 12,
                  }}
                >
                  <Ionicons
                    name={option.icon}
                    size={22}
                    color={isSelected ? theme.colors.primary : theme.colors.onSurfaceVariant}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontSize: 16,
                      fontWeight: '500',
                      color: isSelected ? theme.colors.primary : theme.colors.onBackground,
                      fontFamily: 'Inter'
                    }}>
                      {option.label}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Upgrade to Pro Section */}
          <View style={{ marginTop: 30, marginBottom: 30 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: theme.colors.onBackground,
              marginBottom: 15,
              fontFamily: 'Inter'
            }}>
              VerseMemorization Pro
            </Text>

            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: 16,
                padding: 20,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: theme.colors.outline,
              }}
            >
              
            </View>
          </View>

          {/* Report Bug/Issue Section */}
          <View style={{ marginTop: 30, marginBottom: 30 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: theme.colors.onBackground,
              marginBottom: 15,
              fontFamily: 'Inter'
            }}>
              Help
            </Text>

            <ProfileDrawerLink
              icon="information"
              label="about"
              onPress={() => router.push('/about')}/>
            <View style={{height: 10}}/>
            <ProfileDrawerLink
              icon="alert"
              label="Report Bug/Issue"
              onPress={() => setShowBugReport(true)}/>
          </View>

          {/* Danger Zone */}
          <View style={{ marginTop: 30, marginBottom: 30 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: theme.colors.error,
              marginBottom: 15,
              fontFamily: 'Inter'
            }}>
              Danger Zone
            </Text>

            <TouchableOpacity
              style={{
                ...styles.button_outlined,
                borderColor: theme.colors.error,
                borderWidth: 1
              }}
              onPress={() => setShowDeleteConfirm(true)}
            >
              <Text style={{
                ...styles.buttonText_outlined,
                color: theme.colors.error
              }}>
                Delete Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* First Confirmation Dialog */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
        }}>
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 16,
            padding: 24,
            width: '90%',
            maxWidth: 400
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: '600',
              color: theme.colors.error,
              marginBottom: 16,
              fontFamily: 'Inter'
            }}>
              Delete Account
            </Text>
            
            <Text style={{
              fontSize: 16,
              color: theme.colors.onSurfaceVariant,
              marginBottom: 20,
              fontFamily: 'Inter',
              lineHeight: 22
            }}>
              Are you sure you want to delete your account? This action cannot be undone. All your data, collections, and progress will be permanently deleted.
            </Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setShowDeleteConfirm(false)}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12
                }}
              >
                <Text style={{
                  color: theme.colors.onSurfaceVariant,
                  fontFamily: 'Inter',
                  fontWeight: '600'
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteAccountConfirm}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: theme.colors.error
                }}
              >
                <Text style={{
                  color: theme.colors.onError,
                  fontFamily: 'Inter',
                  fontWeight: '600'
                }}>
                  Continue
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Username Confirmation Dialog */}
      <Modal
        visible={showUsernameConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowUsernameConfirm(false);
          setDeleteUsernameInput('');
        }}
      >
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
        }}>
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 16,
            padding: 24,
            width: '90%',
            maxWidth: 400
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: '600',
              color: theme.colors.error,
              marginBottom: 16,
              fontFamily: 'Inter'
            }}>
              Confirm Username
            </Text>
            
            <Text style={{
              fontSize: 16,
              color: theme.colors.onSurfaceVariant,
              marginBottom: 12,
              fontFamily: 'Inter',
              lineHeight: 22
            }}>
              To confirm account deletion, please type your username:
            </Text>

            <Text style={{
              fontSize: 14,
              color: theme.colors.primary,
              marginBottom: 16,
              fontFamily: 'Inter',
              fontWeight: '600'
            }}>
              {user.username}
            </Text>
            
            <TextInput
              label="Username"
              mode="outlined"
              value={deleteUsernameInput}
              onChangeText={setDeleteUsernameInput}
              style={{ marginBottom: 20, backgroundColor: theme.colors.background }}
              textColor={theme.colors.onBackground}
              autoCapitalize="none"
              autoCorrect={false}
            />
            
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowUsernameConfirm(false);
                  setDeleteUsernameInput('');
                }}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12
                }}
              >
                <Text style={{
                  color: theme.colors.onSurfaceVariant,
                  fontFamily: 'Inter',
                  fontWeight: '600'
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteAccount}
                disabled={deleteUsernameInput.trim() !== user.username}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: deleteUsernameInput.trim() === user.username ? theme.colors.error : theme.colors.surface2,
                  opacity: deleteUsernameInput.trim() === user.username ? 1 : 0.5
                }}
              >
                <Text style={{
                  color: deleteUsernameInput.trim() === user.username ? theme.colors.onError : theme.colors.onSurfaceVariant,
                  fontFamily: 'Inter',
                  fontWeight: '600'
                }}>
                  Delete Account
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bug Report Dialog */}
      <Modal
        visible={showBugReport}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBugReport(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
        }}>
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 16,
            padding: 24,
            width: '90%',
            maxWidth: 400
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: '600',
              color: theme.colors.onBackground,
              marginBottom: 16,
              fontFamily: 'Inter'
            }}>
              Please describe the bug or issue you encountered:
            </Text>

            <TextInput
              style={{
                backgroundColor: theme.colors.background,
                borderRadius: 12,
                padding: 12,
                marginBottom: 20,
                color: theme.colors.onBackground,
                fontSize: 16,
                fontFamily: 'Inter',
                height: 150,
                textAlignVertical: 'top'
              }}
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={bugReportText}
              onChangeText={setBugReportText}
              multiline
            />
            
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowBugReport(false);
                  setBugReportText('');
                }}
                disabled={submittingBugReport}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12
                }}
              >
                <Text style={{
                  color: theme.colors.onSurfaceVariant,
                  fontFamily: 'Inter',
                  fontWeight: '600'
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmitBugReport}
                disabled={submittingBugReport}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: theme.colors.primary
                }}
              >
                <Text style={{
                  color: theme.colors.onPrimary,
                  fontFamily: 'Inter',
                  fontWeight: '600'
                }}>
                  {submittingBugReport ? 'Submitting...' : 'Submit'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bug Report Success Dialog */}
      <Modal
        visible={showBugReportSuccess}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBugReportSuccess(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
        }}>
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 16,
            padding: 24,
            width: '90%',
            maxWidth: 400
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: '600',
              color: theme.colors.onBackground,
              marginBottom: 16,
              fontFamily: 'Inter'
            }}>
              Thank You!
            </Text>
            
            <Text style={{
              fontSize: 16,
              color: theme.colors.onSurfaceVariant,
              marginBottom: 20,
              fontFamily: 'Inter',
              lineHeight: 22
            }}>
              Thank you for reporting the issue you encountered. We will look into this and get back to you via email if needed.
            </Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity
                onPress={() => setShowBugReportSuccess(false)}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: theme.colors.primary
                }}
              >
                <Text style={{
                  color: theme.colors.onPrimary,
                  fontFamily: 'Inter',
                  fontWeight: '600'
                }}>
                  OK
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Username Dialog */}
      <Modal
        visible={showUsernameDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUsernameDialog(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
        }}>
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 16,
            padding: 24,
            width: '90%',
            maxWidth: 400
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: '600',
              color: theme.colors.onBackground,
              marginBottom: 16,
              fontFamily: 'Inter'
            }}>
              Change Username
            </Text>
            
            <TextInput
              label="New Username"
              mode="outlined"
              value={newUsername}
              onChangeText={setNewUsername}
              style={{ marginBottom: 20, backgroundColor: theme.colors.background }}
              textColor={theme.colors.onBackground}
            />
            
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowUsernameDialog(false);
                  setNewUsername('');
                }}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12
                }}
              >
                <Text style={{
                  color: theme.colors.onSurfaceVariant,
                  fontFamily: 'Inter',
                  fontWeight: '600'
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleChangeUsername}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: theme.colors.primary
                }}
              >
                <Text style={{
                  color: theme.colors.onPrimary,
                  fontFamily: 'Inter',
                  fontWeight: '600'
                }}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Email Dialog */}
      <Modal
        visible={showEmailDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEmailDialog(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
        }}>
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 16,
            padding: 24,
            width: '90%',
            maxWidth: 400
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: '600',
              color: theme.colors.onBackground,
              marginBottom: 16,
              fontFamily: 'Inter'
            }}>
              Change Email
            </Text>
            
            <TextInput
              label="New Email"
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              value={newEmail}
              onChangeText={setNewEmail}
              style={{ marginBottom: 20, backgroundColor: theme.colors.background }}
              textColor={theme.colors.onBackground}
            />
            
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowEmailDialog(false);
                  setNewEmail('');
                }}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12
                }}
              >
                <Text style={{
                  color: theme.colors.onSurfaceVariant,
                  fontFamily: 'Inter',
                  fontWeight: '600'
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleChangeEmail}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: theme.colors.primary
                }}
              >
                <Text style={{
                  color: theme.colors.onPrimary,
                  fontFamily: 'Inter',
                  fontWeight: '600'
                }}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Dialog */}
      <Modal
        visible={showPasswordDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPasswordDialog(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.5)'
        }}>
          <View style={{
            backgroundColor: theme.colors.surface,
            borderRadius: 16,
            padding: 24,
            width: '90%',
            maxWidth: 400
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: '600',
              color: theme.colors.onBackground,
              marginBottom: 16,
              fontFamily: 'Inter'
            }}>
              Change Password
            </Text>
            
            <TextInput
              label="New Password"
              mode="outlined"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              style={{ marginBottom: 12, backgroundColor: theme.colors.background }}
              textColor={theme.colors.onBackground}
            />
            
            <TextInput
              label="Confirm New Password"
              mode="outlined"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={{ marginBottom: 20, backgroundColor: theme.colors.background }}
              textColor={theme.colors.onBackground}
            />
            
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setShowPasswordDialog(false);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12
                }}
              >
                <Text style={{
                  color: theme.colors.onSurfaceVariant,
                  fontFamily: 'Inter',
                  fontWeight: '600'
                }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleChangePassword}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: theme.colors.primary
                }}
              >
                <Text style={{
                  color: theme.colors.onPrimary,
                  fontFamily: 'Inter',
                  fontWeight: '600'
                }}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
