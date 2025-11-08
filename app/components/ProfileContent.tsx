import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAllUserVerses, getUserActivity, updateUserProfile } from '../db';
import { Activity, loggedOutUser, useAppStore } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

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

  const isLoadingProfile = profileCache.isLoading && !profileCache.isLoaded;
  const myActivityLoaded = profileCache.isLoaded && !profileCache.isLoading;
  const memorizedCount = profileCache.memorizedCount || 0;
  const myActivity = useMemo<ActivityWithTimeAgo[]>(() => {
    return (profileCache.activity || []).map((activity) => {
      const date = new Date(activity.dateCreated);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const diffWeeks = Math.floor(diffDays / 7);
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const timeAgo =
        diffWeeks > 0 ? `${diffWeeks}w` : diffDays > 0 ? `${diffDays}d` : diffHours > 0 ? `${diffHours}h` : 'Today';
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
          getUserActivity(user.username, 10),
        ]);

        if (isCancelled) return;

        const memorized = (verses || []).filter((verse: any) => verse.progressPercent === 100).length;

        setProfileCache({
          memorizedCount: memorized,
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={{ padding: 20, paddingTop: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30, marginTop: 20 }}>
          <View style={{ position: 'relative' }}>
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
              }}
            >
              <Ionicons name="person" size={40} color={theme.colors.onBackground} />
            </View>
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: '#4CAF50',
                borderWidth: 3,
                borderColor: theme.colors.background,
              }}
            />
          </View>

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
                marginTop: -18,
                marginRight: 5,
              }}
            >
              <Ionicons name="checkmark-done" size={58} color={theme.colors.onBackground} />
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
                {memorizedCount}
              </Text>
              <Text
                style={{
                  ...styles.text,
                  margin: 0,
                  fontSize: 14,
                  color: theme.colors.onSurfaceVariant,
                }}
              >
                Memorized
              </Text>
            </View>
          </View>
        </View>

        <ProfileDrawerLink
          icon="people-outline"
          label="Friends"
          onPress={() => router.push('/user/friends')}
        />

        <View style={{ marginTop: 20, paddingTop: 20, gap: 10 }}>
          <ProfileDrawerLink
            icon="calendar"
            label="Streak Calendar"
            onPress={() => router.push('/user/streak')}
          />

          <ProfileDrawerLink
            icon="checkmark-done"
            label="Memorized Passages"
            onPress={() => router.push('/user/memorizedVerses')}
          />

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
                <Text style={{ ...styles.tinyText, fontFamily: 'Inter bold' }}>My Activity</Text>
                <TouchableOpacity activeOpacity={0.1}>
                  <Text
                    style={{
                      fontFamily: 'Inter',
                      fontSize: 11,
                      color: theme.colors.onSurfaceVariant,
                      textDecorationLine: 'underline',
                      marginTop: -5
                    }}
                  >
                    Stop Sharing Activity
                  </Text>
                </TouchableOpacity>
              </View>
              {myActivity.length > 0 ? (
                myActivity.map((activity) => (
                  <>
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
                      height: 35,
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
                        height: 25,
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
                  </>
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

        <View style={{ marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: theme.colors.onSurfaceVariant, gap: 10 }}>
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

