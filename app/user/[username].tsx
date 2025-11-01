import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Divider } from 'react-native-paper';
import FriendCollectionItem from '../components/friendCollectionItem';
import { ProfileSkeleton } from '../components/skeleton';
import { getAllUserVerses, getStreakLength, getUserFriendCollections, getUserProfile, removeFriend, submitUserReport } from '../db';
import { Collection, useAppStore, User } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';
 
import { useNavigation } from 'expo-router';
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
  const navigation = useNavigation();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [streakLength, setStreakLength] = useState(0);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [memorizedCount, setMemorizedCount] = useState<number>(0);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  // Friend settings sheet removed

  // ***************************************************
  //                 Helper renderers
  // ***************************************************
  const parseLastSeen = (lastSeenValue: unknown): Date | null => {
    if (!lastSeenValue) return null;
    const lastSeenStr = lastSeenValue.toString();
    if (lastSeenStr.includes('Z') || lastSeenStr.includes('+') || (lastSeenStr.includes('-') && lastSeenStr.match(/[+-]\d{2}:\d{2}$/))) {
      const d = new Date(lastSeenStr);
      return isNaN(d.getTime()) ? null : d;
    } else {
      const d = new Date(lastSeenStr + 'Z');
      return isNaN(d.getTime()) ? null : d;
    }
  };

  const minutesSince = (date: Date | null): number | null => {
    if (!date) return null;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    return Math.floor(Math.abs(diffMs) / 60000);
  };

  const renderActiveStatusDot = (lastSeenValue: unknown) => {
    const lastSeenDate = parseLastSeen(lastSeenValue);
    const diffMins = minutesSince(lastSeenDate);
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
    const lastSeenDate = parseLastSeen(lastSeenValue);
    const diffMins = minutesSince(lastSeenDate);
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
    navigation.setOptions({
      title: username ? `@${username}` : 'Profile',
    });
  }, [navigation, username]);


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

      try {
        const verses = await getAllUserVerses(username!);
        const count = verses.filter(v => (v as any).progressPercent === 100).length;
        setMemorizedCount(count);
      } catch (error) {
        console.error('Failed to fetch memorized count for friend:', error);
        setMemorizedCount(0);
      }

      if (user.lastSeen) {
        const lastSeenStr = user.lastSeen.toString();
        let lastSeen: Date;
        
        if (lastSeenStr.includes('Z') || lastSeenStr.includes('+') || (lastSeenStr.includes('-') && lastSeenStr.match(/[+-]\d{2}:\d{2}$/))) {
          lastSeen = new Date(lastSeenStr);
        } else {
          lastSeen = new Date(lastSeenStr + 'Z');
        }
        
        const now = new Date();
        console.log('Last seen parsed (ISO):', lastSeen.toISOString());
        console.log('Now (ISO):', now.toISOString());
        const diffMs = now.getTime() - lastSeen.getTime();
        const diffMins = Math.floor(Math.abs(diffMs) / 60000);
        const diffHours = Math.floor(Math.abs(diffMs) / 3600000);
        console.log('Diff (ms):', diffMs, 'Diff (minutes):', diffMins, 'Diff (hours):', diffHours);
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
              borderColor: theme.colors.onBackground
            }}>
              <Ionicons name="person" size={40} color={theme.colors.onBackground} />
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
            backgroundColor: theme.colors.surface, 
            borderRadius: 12, 
            padding: 16, 
            marginBottom: 20 
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

        <View style={{ flexDirection: 'row', marginBottom: 30, gap: 20 }}>
          <TouchableOpacity 
            style={{ 
              flex: 1, 
              backgroundColor: theme.colors.surface, 
              borderRadius: 12, 
              padding: 20,
              alignItems: 'center' 
            }}
            onPress={() => router.push(`/user/${profileUser.username}/streak`)}
          >
            <Ionicons name="flame" size={32} color="#FF6B35" />
            <Text style={{ 
              fontSize: 32, 
              fontWeight: 'bold', 
              color: theme.colors.onBackground,
              marginTop: 8,
              fontFamily: 'Inter'
            }}>
              {streakLength}
            </Text>
            <Text style={{ 
              fontSize: 14, 
              color: theme.colors.onSurfaceVariant,
              marginTop: 4,
              fontFamily: 'Inter'
            }}>
              Day Streak
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={{ 
              flex: 1, 
              backgroundColor: theme.colors.surface, 
              borderRadius: 12, 
              padding: 20,
              alignItems: 'center' 
            }}
            onPress={() => router.push(`/user/${profileUser.username}/memorizedVerses`)}
          >
            <Ionicons name="checkmark-circle" size={32} color={theme.colors.primary} />
            <Text style={{ 
              fontSize: 32, 
              fontWeight: 'bold', 
              color: theme.colors.onBackground,
              marginTop: 8,
              fontFamily: 'Inter'
            }}>
              {memorizedCount || 0}
            </Text>
            <Text style={{ 
              fontSize: 14, 
              color: theme.colors.onSurfaceVariant,
              marginTop: 4,
              fontFamily: 'Inter'
            }}>
              Verses in Memory
            </Text>
          </TouchableOpacity>
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
