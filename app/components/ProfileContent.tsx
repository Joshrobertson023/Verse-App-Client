import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { deleteProfilePicture, getAllUserVerses, getUserActivity, refreshUser, suggestVerseOfDay, updateActivityNotifications, updateUserProfile, uploadProfilePicture } from '../db';
import { Activity, loggedOutUser, useAppStore } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';
import { formatPoints } from '../utils/numberFormat';
import { cacheProfilePicture, clearCachedProfilePicture } from '../utils/profilePictureCache';

const RECENT_SEARCHES_KEY = '@verseApp:recentSearches';

type ActivityWithTimeAgo = Activity & { timeAgo: string };

export default function ProfileContent() {
  const styles = useStyles();
  const theme = useAppTheme();
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  const setCollections = useAppStore((state) => state.setCollections);
  const profileCache = useAppStore((state) => state.profileCache);
  const setProfileCache = useAppStore((state) => state.setProfileCache);
  const resetProfileCache = useAppStore((state) => state.resetProfileCache);

  const [showDescriptionEdit, setShowDescriptionEdit] = useState(false);
  const [tempDescription, setTempDescription] = useState(user.description || '');
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [showSuggestionDialog, setShowSuggestionDialog] = useState(false);
  const [suggestionReference, setSuggestionReference] = useState('');
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);

  const isLoadingProfile = profileCache.isLoading && !profileCache.isLoaded;
  const myActivityLoaded = profileCache.isLoaded && !profileCache.isLoading;
  const myActivity = useMemo<ActivityWithTimeAgo[]>(() => {
    return (profileCache.activity || []).map((activity) => {
      const date = new Date(activity.dateCreated);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffWeeks = Math.floor(diffDays / 7);
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const timeAgo =
        diffWeeks > 0 ? `${diffWeeks}w` : diffDays > 0 ? `${diffDays}d` : diffHours > 0 ? `${diffHours}h` : 'today';
      return {
        ...activity,
        timeAgo,
      };
    });
  }, [profileCache.activity]);

  useEffect(() => {
    setTempDescription(user.description || '');
  }, [user.description]);

  useEffect(() => {
    if (!user.username || user.username === loggedOutUser.username) {
      resetProfileCache();
      return;
    }

    if (profileCache.username && profileCache.username !== user.username) {
      resetProfileCache();
    }
  }, [profileCache.username, resetProfileCache, user.username]);

  useEffect(() => {
    if (!user.username || user.username === loggedOutUser.username) {
      return;
    }

    if (profileCache.isLoaded) {
      return;
    }

    const { isLoading: currentlyLoading } = useAppStore.getState().profileCache;
    if (currentlyLoading) {
      return;
    }

    let isCancelled = false;

    const loadProfileData = async () => {
      try {
        setProfileCache({ isLoading: true, error: null });
        const [verses, activity] = await Promise.all([
          getAllUserVerses(user.username),
          getUserActivity(user.username, 5),
        ]);

        if (isCancelled) return;

        setProfileCache({
          activity: activity || [],
          isLoaded: true,
          isLoading: false,
          lastFetchedAt: Date.now(),
          username: user.username,
          error: null,
        });
      } catch (error) {
        if (isCancelled) return;
        console.error('Failed to load profile data:', error);
        setProfileCache({
          isLoading: false,
          isLoaded: false,
          error: error instanceof Error ? error.message : 'Failed to load profile data',
        });
      }
    };

    loadProfileData();

    return () => {
      isCancelled = true;
      const { isLoading } = useAppStore.getState().profileCache;
      if (isLoading) {
        setProfileCache({ isLoading: false });
      }
    };
  }, [profileCache.isLoaded, setProfileCache, user.username]);

  const logoutClick = async () => {
    resetProfileCache();
    setUser(loggedOutUser);
    await SecureStore.deleteItemAsync('userToken');
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    setCollections([]);
    router.replace('/(auth)/createName');
  };

  const getDisplayName = () => `${user.firstName} ${user.lastName}`;

  const handleSaveDescription = async () => {
    try {
      await updateUserProfile({ ...user, description: tempDescription });
      setUser({ ...user, description: tempDescription });
      setShowDescriptionEdit(false);
    } catch (error) {
      console.error('Failed to update description:', error);
      alert('Failed to update description');
    }
  };

  const handleCancelDescription = () => {
    setTempDescription(user.description || '');
    setShowDescriptionEdit(false);
  };

  const handleSubmitSuggestion = async () => {
    if (!suggestionReference.trim()) {
      Alert.alert('Error', 'Please enter a verse reference');
      return;
    }

    setSubmittingSuggestion(true);
    try {
      await suggestVerseOfDay(user.username, suggestionReference.trim());
      Alert.alert('Success', 'Your suggestion has been submitted! Thank you.');
      setSuggestionReference('');
      setShowSuggestionDialog(false);
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to submit suggestion. Please try again.');
    } finally {
      setSubmittingSuggestion(false);
    }
  };

  const handlePickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need access to your photos to set a profile picture.');
        return;
      }

      // Show action sheet
      const alertOptions: any[] = [
        { text: 'Camera', onPress: () => pickImageFromCamera() },
        { text: 'Photo Library', onPress: () => pickImageFromLibrary() },
      ];
      
      // Always show remove option if there's a profile picture
      if (user.profilePictureUrl) {
        alertOptions.push({ text: 'Remove Picture', onPress: () => handleRemovePicture(), style: 'destructive' });
      }
      
      alertOptions.push({ text: 'Cancel', style: 'cancel' });
      
      Alert.alert(
        'Profile Picture',
        'Choose an option',
        alertOptions,
        { cancelable: true }
      );
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to open image picker');
    }
  };

  const pickImageFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await handleUploadPicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image from library:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const pickImageFromCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need access to your camera to take a profile picture.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await handleUploadPicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleUploadPicture = async (imageUri: string) => {
    setUploadingPicture(true);
    try {
      const profilePictureUrl = await uploadProfilePicture(user.username, imageUri);
      console.log('[Profile] Uploaded profile picture URL:', profilePictureUrl);
      
      // Refresh user to get the latest data from server
      const refreshedUser = await refreshUser(user.username);
      console.log('[Profile] Refreshed user profile picture URL:', refreshedUser.profilePictureUrl);
      
      // Cache the profile picture locally
      if (refreshedUser.profilePictureUrl) {
        await cacheProfilePicture(user.username, refreshedUser.profilePictureUrl, false);
      }
      
      // Use the URL from the refreshed user (which should match what we uploaded)
      // Add cache-busting parameter to force image refresh
      const cacheBustedUrl = refreshedUser.profilePictureUrl 
        ? `${refreshedUser.profilePictureUrl}${refreshedUser.profilePictureUrl.includes('?') ? '&' : '?'}t=${Date.now()}`
        : refreshedUser.profilePictureUrl;
      
      const updatedUser = {
        ...refreshedUser,
        profilePictureUrl: cacheBustedUrl
      };
      
      console.log('[Profile] Setting user with profile picture URL:', updatedUser.profilePictureUrl);
      setUser(updatedUser);
      Alert.alert('Success', 'Profile picture updated successfully');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      Alert.alert('Error', 'Failed to upload profile picture. Please try again.');
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleRemovePicture = async () => {
    Alert.alert(
      'Remove Profile Picture',
      'Are you sure you want to remove your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setUploadingPicture(true);
            try {
              await deleteProfilePicture(user.username);
              // Clear cached profile picture
              await clearCachedProfilePicture(user.username);
              const refreshedUser = await refreshUser(user.username);
              console.log('[Profile] After delete, refreshed user profile picture URL:', refreshedUser.profilePictureUrl);
              setUser(refreshedUser);
              Alert.alert('Success', 'Profile picture removed successfully');
            } catch (error) {
              console.error('Error removing profile picture:', error);
              Alert.alert('Error', 'Failed to remove profile picture. Please try again.');
            } finally {
              setUploadingPicture(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ padding: 20, paddingTop: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30, marginTop: 20 }}>
          <TouchableOpacity 
            style={{ position: 'relative' }}
            onPress={handlePickImage}
            disabled={uploadingPicture}
            activeOpacity={0.7}
          >
            <View
              style={{
                width: 70,
                height: 70,
                borderRadius: 35,
                backgroundColor: theme.colors.surface,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 2,
                borderColor: theme.colors.onBackground,
                overflow: 'hidden',
              }}
            >
              {user.profilePictureUrl ? (
                <Image
                  source={{ uri: user.profilePictureUrl }}
                  style={{ width: 70, height: 70 }}
                  contentFit="cover"
                  key={user.profilePictureUrl}
                  recyclingKey={user.profilePictureUrl}
                />
              ) : (
                <Ionicons name="person" size={40} color={theme.colors.onBackground} />
              )}
              {uploadingPicture && (
                <View
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <ActivityIndicator size="small" color={theme.colors.onPrimary} />
                </View>
              )}
            </View>
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: theme.colors.primary,
                borderWidth: 3,
                borderColor: theme.colors.background,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Ionicons name="camera" size={12} color={theme.colors.onPrimary} />
            </View>
          </TouchableOpacity>

          <View style={{ marginLeft: 15, flex: 1 }}>
            <Text
              style={{
                fontSize: 24,
                fontWeight: '600',
                color: theme.colors.onBackground,
                fontFamily: 'Inter',
              }}
            >
              {getDisplayName()}
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: theme.colors.onSurfaceVariant,
                fontFamily: 'Inter',
              }}
            >
              @{user.username}
            </Text>
          </View>
        </View>

        <View style={{ marginBottom: 30, marginTop: -20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            {/* reserved for future edit button */}
          </View>
          {!!user.description && (
            <Text
              style={{
                fontSize: 14,
                color: theme.colors.onBackground,
                fontFamily: 'Inter',
                lineHeight: 20,
              }}
            >
              {user.description}
            </Text>
          )}
        </View>

        <View
          style={{
            flexDirection: 'row',
            marginBottom: 10,
            width: '100%',
          }}
        >
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <View
              style={{
                justifyContent: 'center',
                marginTop: -10,
              }}
            >
              <Ionicons name="flame" size={52} color={theme.colors.onBackground} />
            </View>
            <View
              style={{
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  ...styles.text,
                  marginBottom: -7,
                  marginTop: -5,
                  fontSize: 36,
                  fontWeight: 800,
                  color: theme.colors.onBackground,
                }}
              >
                {user.streakLength || 0}
              </Text>
              <Text
                style={{
                  ...styles.text,
                  margin: 0,
                  fontSize: 14,
                  color: theme.colors.onSurfaceVariant,
                }}
              >
                Day Streak
              </Text>
            </View>
          </View>

          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 15,
            }}
          >
            <View
              style={{
                justifyContent: 'center',
                marginTop: -10,
              }}
            >
              <Ionicons name="star-outline" size={44} color={theme.colors.onBackground} style={{marginTop: -5, marginRight: 8}} />
            </View>
            <View
              style={{
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  ...styles.text,
                  marginBottom: -7,
                  marginTop: -5,
                  fontSize: 36,
                  fontWeight: 800,
                  color: theme.colors.onBackground,
                }}
              >
                {formatPoints(user.points || 0)}
              </Text>
              <Text
                style={{
                  ...styles.text,
                  margin: 0,
                  fontSize: 14,
                  color: theme.colors.onSurfaceVariant,
                }}
              >
                Points
              </Text>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 10 }}>
          <ProfileDrawerLink
            icon="analytics-outline"
            label="Global Leaderboard"
            onPress={() => router.push('/user/leaderboard')}
          />
        </View>
        <View style={{height: 10}} />
        <ProfileDrawerLink
          icon="people-outline"
          label="Friends"
          onPress={() => router.push('/user/friends')}
        />

        <View style={{ gap: 10 }}>

          {isLoadingProfile && (
            <View
              style={{
                marginTop: 24,
                backgroundColor: theme.colors.surface,
                padding: 20,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: theme.colors.outline,
                alignItems: 'center',
              }}
            >
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text
                style={{
                  fontFamily: 'Inter',
                  fontSize: 14,
                  marginTop: 12,
                  color: theme.colors.onSurfaceVariant,
                }}
              >
                Loading profile activity...
              </Text>
            </View>
          )}

          {!isLoadingProfile && myActivityLoaded && (
            <View
              style={{
                marginTop: 24,
                borderRadius: 16,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={{ ...styles.tinyText, fontFamily: 'Inter bold' }}>My Activity</Text>
                  <Pressable 
                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                    onPress={() => {
                      Alert.alert(
                        'My Activity',
                        'Your friends get notified about your activity. You can turn this off in settings.',
                        [{ text: 'OK' }]
                      );
                    }}
                  >
                    <Ionicons 
                      name="help-circle-outline" 
                      size={20} 
                      color={theme.colors.onSurfaceVariant}
                      style={{ marginLeft: 4 }}
                    />
                  </Pressable>
                </View>
                <TouchableOpacity 
                  activeOpacity={0.1}
                  onPress={async () => {
                    try {
                      const newValue = !(user.activityNotificationsEnabled ?? true);
                      await updateActivityNotifications(user.username, newValue);
                      setUser({
                        ...user,
                        activityNotificationsEnabled: newValue
                      });
                    } catch (error) {
                      console.error('Failed to update activity sharing:', error);
                      alert('Failed to update activity sharing');
                    }
                  }}
                >
                  <Text
                    style={{
                      fontFamily: 'Inter',
                      fontSize: 11,
                      color: theme.colors.onSurfaceVariant,
                      textDecorationLine: 'underline',
                      marginTop: -5
                    }}
                  >
                    {(user.activityNotificationsEnabled ?? true) ? 'Stop Sharing Activity' : 'Start Sharing Activity'}
                  </Text>
                </TouchableOpacity>
              </View>
              {myActivity.length > 0 ? (
                myActivity.map((activity) => (
                  <View
                    key={activity.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingVertical: 4,
                      paddingBottom: -12
                    }}
                  >
                    <View style={{
                      width: 4,
                      height: '120%',
                      marginLeft: 8,
                      position: 'absolute',
                      borderRadius: 999,
                      backgroundColor: theme.colors.onBackground,
                    }} />
                    <Text
                      style={{
                        fontFamily: 'Inter',
                        fontSize: 14,
                        color: theme.colors.onBackground,
                        flex: 1,
                        marginLeft: 25
                      }}
                    >
                      {activity.text}
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'Inter',
                        fontSize: 12,
                        color: theme.colors.onBackground,
                        height: 25,
                        opacity: 0.6
                      }}
                    >
                      {activity.timeAgo}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={{ paddingVertical: 12 }}>
                  <Text
                    style={{
                      fontFamily: 'Inter',
                      fontSize: 16,
                      color: theme.colors.onBackground,
                      marginBottom: 8,
                      textAlign: 'left',
                    }}
                  >
                    No recent activity
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={{ marginTop: 10, paddingTop: 20, gap: 10 }}>
          <ProfileDrawerLink
            icon="settings"
            label="Settings"
            onPress={() => router.push('/settings')}
          />

          <ProfileDrawerLink
            icon="information-circle-outline"
            label="About"
            onPress={() => router.push('/about')}
          />

          {user.isPaid ? (
            <ProfileDrawerLink
              icon="card-outline"
              label="Manage Subscription"
              onPress={() => router.push('/manageSubscription')}
              iconColor={theme.colors.primary}
            />
          ) : (
            // <ProfileDrawerLink
            //   icon="star"
            //   label="Subscribe To Premium"
            //   onPress={() => router.push('/pro')}
            //   iconColor={theme.colors.primary}
            // />
            null
          )}

          

          {user.isAdmin && (
            <ProfileDrawerLink
              icon="shield-outline"
              label="Admin Panel"
              onPress={() => router.push('/admin')}
              iconColor={theme.colors.primary}
            />
          )}
        </View>

        <TouchableOpacity
          style={{
            ...styles.button_outlined,
            marginTop: 30,
            borderColor: theme.colors.error,
            borderWidth: 1,
          }}
          activeOpacity={0.1}
          onPress={logoutClick}
        >
          <Text style={[styles.buttonText_outlined, { color: theme.colors.error }]}>Logout</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showDescriptionEdit} transparent animationType="fade" onRequestClose={handleCancelDescription}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 16,
              padding: 24,
              width: '90%',
              maxWidth: 400,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: '600',
                color: theme.colors.onBackground,
                marginBottom: 16,
                fontFamily: 'Inter',
              }}
            >
              Edit Description
            </Text>

            <TextInput
              style={{
                backgroundColor: theme.colors.background,
                borderRadius: 12,
                padding: 12,
                color: theme.colors.onBackground,
                fontSize: 16,
                fontFamily: 'Inter',
                minHeight: 100,
                maxHeight: 150,
                textAlignVertical: 'top',
                borderWidth: 1,
                borderColor: theme.colors.outline,
              }}
              placeholder=""
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={tempDescription}
              onChangeText={(text) => {
                if (text.length <= 100) {
                  setTempDescription(text);
                }
              }}
              multiline
              autoFocus
            />

            <Text
              style={{
                fontSize: 12,
                color: theme.colors.onSurfaceVariant,
                marginTop: 8,
                textAlign: 'right',
                fontFamily: 'Inter',
              }}
            >
              {tempDescription.length}/100
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 12 }}>
              <TouchableOpacity
                onPress={handleCancelDescription}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12,
                }}
              >
                <Text
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    fontFamily: 'Inter',
                    fontWeight: '600',
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveDescription}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: theme.colors.primary,
                }}
              >
                <Text
                  style={{
                    color: theme.colors.onPrimary,
                    fontFamily: 'Inter',
                    fontWeight: '600',
                  }}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showSuggestionDialog} transparent animationType="fade" onRequestClose={() => setShowSuggestionDialog(false)}>
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
          }}
        >
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 16,
              padding: 24,
              width: '90%',
              maxWidth: 400,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: '600',
                color: theme.colors.onBackground,
                marginBottom: 16,
                fontFamily: 'Inter',
              }}
            >
              Suggest Verse of Day
            </Text>

            <Text
              style={{
                fontSize: 14,
                color: theme.colors.onSurfaceVariant,
                marginBottom: 16,
                fontFamily: 'Inter',
                lineHeight: 20,
              }}
            >
              Enter a verse reference (e.g., "John 3:16" or "Psalm 23:1-6")
            </Text>

            <TextInput
              style={{
                backgroundColor: theme.colors.background,
                borderRadius: 12,
                padding: 12,
                color: theme.colors.onBackground,
                fontSize: 16,
                fontFamily: 'Inter',
                borderWidth: 1,
                borderColor: theme.colors.outline,
                marginBottom: 20,
              }}
              placeholder="Verse reference"
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={suggestionReference}
              onChangeText={setSuggestionReference}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12 }}>
              <TouchableOpacity
                onPress={() => {
                  setSuggestionReference('');
                  setShowSuggestionDialog(false);
                }}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12,
                }}
                disabled={submittingSuggestion}
              >
                <Text
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    fontFamily: 'Inter',
                    fontWeight: '600',
                  }}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSubmitSuggestion}
                style={{
                  paddingHorizontal: 24,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: theme.colors.primary,
                  opacity: submittingSuggestion ? 0.5 : 1,
                }}
                disabled={submittingSuggestion || !suggestionReference.trim()}
              >
                {submittingSuggestion ? (
                  <ActivityIndicator size="small" color={theme.colors.onPrimary} />
                ) : (
                  <Text
                    style={{
                      color: theme.colors.onPrimary,
                      fontFamily: 'Inter',
                      fontWeight: '600',
                    }}
                  >
                    Submit
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </SafeAreaView>
  );
}

export interface ProfileDrawerLinkProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  iconColor?: string;
}

export function ProfileDrawerLink({ icon, label, onPress, iconColor }: ProfileDrawerLinkProps) {
  const theme = useAppTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: theme.colors.surface2,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Ionicons name={icon} size={20} color={iconColor ?? theme.colors.primary} />
        <Text style={{ fontFamily: 'Inter', fontSize: 15, color: theme.colors.onBackground }}>
          {label}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.onSurfaceVariant} />
    </TouchableOpacity>
  );
}

