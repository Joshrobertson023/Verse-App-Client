import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import FriendCollectionItem from '../components/friendCollectionItem';
import { ProfileDrawerLink } from '../components/ProfileContent';
import { ProfileSkeleton } from '../components/skeleton';
import { minutesSince, parseUTCDate } from '../dateUtils';
import { getFriendActivity, getStreakLength, getUserFriendCollections, getUserProfile } from '../db';
import { Activity, Collection, useAppStore, User } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';
 
import { useLayoutEffect } from 'react';

const sheetItemStyle = StyleSheet.create({
  settingsItem: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center'
  }
});

export default function UserProfileScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const { username } = useLocalSearchParams<{ username: string }>();
  const currentUser = useAppStore((state) => state.user);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [streakLength, setStreakLength] = useState(0);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [points, setPoints] = useState<number>(0);
  const [friendActivity, setFriendActivity] = useState<Activity[]>([]);
  const [friendActivityLoading, setFriendActivityLoading] = useState(false);
  const [friendActivityLoaded, setFriendActivityLoaded] = useState(false);
  const [friendActivityError, setFriendActivityError] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  // Friend settings sheet removed

  // ***************************************************
  //                 Helper renderers
  // ***************************************************
  const parseLastSeen = (lastSeenValue: unknown): Date | null => {
    return parseUTCDate(lastSeenValue as Date | string | undefined);
  };

  const renderActiveStatusDot = (lastSeenValue: unknown) => {
    const lastSeenDate = parseLastSeen(lastSeenValue);
    const diffMins = minutesSince(lastSeenValue as Date | string | undefined);
    const isActive = diffMins !== null && diffMins < 1;
    if (!isActive) return null;
    return (
      <View style={{
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#4CAF50',
        borderWidth: 3,
        borderColor: theme.colors.background
      }} />
    );
  };

  const renderLastSeenTextEl = (lastSeenValue: unknown) => {
    const diffMins = minutesSince(lastSeenValue as Date | string | undefined);
    if (diffMins === null) return null;
    if (diffMins < 1) {
      return (
        <Text style={{ 
          fontSize: 14, 
          color: '#4CAF50',
          fontFamily: 'Inter',
          marginTop: 4
        }}>
          Active now
        </Text>
      );
    } else if (diffMins < 60) {
      return (
        <Text style={{ 
          fontSize: 14, 
          color: theme.colors.onSurfaceVariant,
          fontFamily: 'Inter',
          marginTop: 4
        }}>
          Last seen {diffMins} min ago
        </Text>
      );
    } else if (diffMins < 1440) {
      const hours = Math.floor(diffMins / 60);
      return (
        <Text style={{ 
          fontSize: 14, 
          color: theme.colors.onSurfaceVariant,
          fontFamily: 'Inter',
          marginTop: 4
        }}>
          Last seen {hours} hour{hours > 1 ? 's' : ''} ago
        </Text>
      );
    } else {
      const days = Math.floor(diffMins / 1440);
      return (
        <Text style={{ 
          fontSize: 14, 
          color: theme.colors.onSurfaceVariant,
          fontFamily: 'Inter',
          marginTop: 4
        }}>
          Last seen {days} day{days > 1 ? 's' : ''} ago
        </Text>
      );
    }
  };

  useEffect(() => {
    loadProfile();
  }, [username]);
  useLayoutEffect(() => {
    // navigation.setOptions({
    //   title: username ? `@${username}` : 'Profile',
    // });
  }, [username]);


  const loadProfile = async () => {
    try {
      setLoading(true);
      const user = await getUserProfile(username!);
      setProfileUser(user);
      
      // Get streak
      try {
        const streak = await getStreakLength(username!);
        setStreakLength(streak);
      } catch (error) {
        console.error('Failed to fetch streak length:', error);
        setStreakLength(0);
      }

      try {
        const friendCollections = await getUserFriendCollections(username!, currentUser.username);
        setCollections(friendCollections);
      } catch (error) {
        alert('Failed to fetch collections:' + error);
        setCollections([]);
      }

      setFriendActivityLoading(true);
      setFriendActivityLoaded(false);
      setFriendActivityError(null);
      try {
        const activity = await getFriendActivity(username!, currentUser.username, 10);
        setFriendActivity(activity || []);
      } catch (error) {
        console.error('Failed to fetch friend activity:', error);
        setFriendActivity([]);
        setFriendActivityError(error instanceof Error ? error.message : 'Failed to load activity');
      } finally {
        setFriendActivityLoading(false);
        setFriendActivityLoaded(true);
      }

      setPoints(user.points ?? 0);

      if (user.lastSeen) {
        const lastSeen = parseUTCDate(user.lastSeen);
        if (lastSeen) {
          const now = new Date();
          console.log('Last seen parsed (ISO):', lastSeen.toISOString());
          console.log('Now (ISO):', now.toISOString());
          const diffMins = minutesSince(user.lastSeen);
          const diffHours = diffMins ? Math.floor(diffMins / 60) : null;
          console.log('Diff (minutes):', diffMins, 'Diff (hours):', diffHours);
        }
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };  

  if (loading) {
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ProfileSkeleton />
      </ScrollView>
      </View>
    );
  }

  if (!profileUser) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: theme.colors.onBackground, fontSize: 16 }}>User not found</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
	<ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <View style={{ padding: 20 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 30, marginTop: 20 }}>
          <View style={{ position: 'relative' }}>
            <View style={{ 
              width: 70, 
              height: 70, 
              borderRadius: 35, 
              backgroundColor: theme.colors.surface,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 2,
              borderColor: theme.colors.onBackground,
              overflow: 'hidden'
            }}>
              {profileUser.profilePictureUrl ? (
                <Image
                  source={{ uri: profileUser.profilePictureUrl }}
                  style={{ width: 70, height: 70 }}
                  contentFit="cover"
                />
              ) : (
                <Ionicons name="person" size={40} color={theme.colors.onBackground} />
              )}
            </View>
            {renderActiveStatusDot(profileUser.lastSeen)}
          </View>
          
          <View style={{ marginLeft: 15, flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text
                style={{ 
                  fontSize: 24, 
                  fontWeight: '600', 
                  color: theme.colors.onBackground,
                  fontFamily: 'Inter',
                  flex: 1
                }}
                numberOfLines={1}
                ellipsizeMode={'tail'}
              >
                {profileUser.firstName} {profileUser.lastName}
              </Text>
              {/* Settings sheet trigger removed */}
            </View>
            <Text style={{ 
              fontSize: 16, 
              color: theme.colors.onSurfaceVariant,
              fontFamily: 'Inter'
            }}>
              @{profileUser.username}
            </Text>
            {renderLastSeenTextEl(profileUser.lastSeen)}
          </View>
        </View>

        {profileUser.description && (
          <View style={{ 
            borderRadius: 12, 
            marginBottom: 20,
            marginTop: -10
          }}>
            <Text style={{
              fontSize: 14,
              color: theme.colors.onBackground,
              fontFamily: 'Inter',
              lineHeight: 20
            }}>
              {profileUser.description}
            </Text>
          </View>
        )}

        {/* Stats Row */}
        <View style={{ 
          flexDirection: 'row', 
          marginBottom: 10,
          width: '100%',
        }}>
          {/* Day Streak */}
          <View style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
          }}>
            <View style={{
              justifyContent: 'center',
              marginTop: -10
            }}>
              <Ionicons name="flame" size={52} color={theme.colors.onBackground} />
            </View>
            <View style={{
              flexDirection: 'column',
              justifyContent: 'center',
            }}>
              <Text style={{
                  ...styles.text, 
                  marginBottom: -7,
                  marginTop: -5,
                  fontSize: 36,
                  fontWeight: 800,
                  color: theme.colors.onBackground,
                }}>
                {streakLength}
              </Text>
              <Text style={{
                ...styles.text, 
                margin: 0, 
                fontSize: 14,
                color: theme.colors.onSurfaceVariant,
              }}>
                Day Streak
              </Text>
            </View>
          </View>

          {/* Points */}
          <View style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 15,
          }}>
            <View style={{
              flexDirection: 'column',
              justifyContent: 'center',
            }}>
              <Text style={{
                  ...styles.text, 
                  marginBottom: -7,
                  marginTop: -5,
                  fontSize: 36,
                  fontWeight: 800,
                  color: theme.colors.onBackground,
                }}>
                {points}
              </Text>
              <Text style={{
                ...styles.text, 
                margin: 0, 
                fontSize: 14,
                color: theme.colors.onSurfaceVariant,
              }}>
                Points
              </Text>
            </View>
          </View>
        </View>


        {collections.length > 0 && (
          <View style={{ marginTop: 15 }}>
            <Text style={{
              fontSize: 22,
              color: theme.colors.onBackground,
              fontFamily: 'Inter',
              alignSelf: 'center'
            }}>
              {profileUser.username}'s Verses
            </Text>
            
            {collections.map((collection) => (
              <FriendCollectionItem
                key={collection.collectionId}
                collection={collection}
                authorUsername={profileUser.username}
              />
            ))}
          </View>
        )}
        {/* Bottom actions removed and moved to friends list sheet */}
      </View>
      <View style={{height: 60}} />
    </ScrollView>
    </View>
  );
}
