import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { getLeaderboard, getUserRank } from '../db';
import { useAppStore, User } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

const PAGE_SIZE = 20;

export default function LeaderboardScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const router = useRouter();
  const user = useAppStore((state) => state.user);
  
  const [leaderboard, setLeaderboard] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (!hasFetchedRef.current) {
      hasFetchedRef.current = true;
      loadLeaderboard();
      loadUserRank();
    }
  }, []);

  const loadLeaderboard = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const data = await getLeaderboard(pageNum, PAGE_SIZE);
      
      if (append) {
        setLeaderboard(prev => [...prev, ...data]);
      } else {
        setLeaderboard(data);
      }

      setHasMore(data.length === PAGE_SIZE);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
      if (pageNum === 1) {
        // Cancel initial load on failure
        setHasFailed(true);
        return;
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadUserRank = async () => {
    try {
      const rank = await getUserRank(user.username);
      setUserRank(rank);
    } catch (error) {
      console.error('Failed to load user rank:', error);
      // Don't retry on failure
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      loadLeaderboard(page + 1, true);
    }
  };

  const renderItem = ({ item, index }: { item: User; index: number }) => {
    const rank = (page - 1) * PAGE_SIZE + index + 1;
    const isCurrentUser = item.username === user.username;
    
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 12,
          paddingHorizontal: 16,
          backgroundColor: isCurrentUser ? theme.colors.primary + '20' : 'transparent',
          marginHorizontal: 16,
          borderRadius: 12,
          marginBottom: 8,
        }}
      >
        {/* Rank */}
        <View style={{ width: 40, alignItems: 'center' }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: isCurrentUser ? theme.colors.primary : theme.colors.onBackground,
              fontFamily: 'Inter',
            }}
          >
            {rank}
          </Text>
        </View>

        {/* Profile Picture */}
        <View
          style={{
            width: 50,
            height: 50,
            borderRadius: 25,
            backgroundColor: theme.colors.surface,
            marginRight: 12,
            overflow: 'hidden',
            borderWidth: isCurrentUser ? 2 : 0,
            borderColor: theme.colors.primary,
          }}
        >
          {item.profilePictureUrl ? (
            <Image
              source={{ uri: item.profilePictureUrl }}
              style={{ width: 50, height: 50 }}
              contentFit="cover"
            />
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Ionicons name="person" size={30} color={theme.colors.onSurfaceVariant} />
            </View>
          )}
        </View>

        {/* Name and Username */}
        <View style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: isCurrentUser ? theme.colors.primary : theme.colors.onBackground,
              fontFamily: 'Inter',
            }}
          >
            {item.firstName} {item.lastName}
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: theme.colors.onSurfaceVariant,
              fontFamily: 'Inter',
            }}
          >
            @{item.username}
          </Text>
        </View>

        {/* Points */}
        <View style={{ alignItems: 'flex-end' }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '700',
              color: isCurrentUser ? theme.colors.primary : theme.colors.onBackground,
              fontFamily: 'Inter',
            }}
          >
            {item.points || 0}
          </Text>
          <Text
            style={{
              fontSize: 12,
              color: theme.colors.onSurfaceVariant,
              fontFamily: 'Inter',
            }}
          >
            points
          </Text>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Global Leaderboard',
          headerBackVisible: true,
        }}
      />
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {/* User's Profile Summary at Top */}
        <View
          style={{
            backgroundColor: theme.colors.surface,
            padding: 20,
            marginHorizontal: 16,
            marginTop: 16,
            borderRadius: 16,
            borderWidth: 2,
            borderColor: theme.colors.primary,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: theme.colors.background,
                marginRight: 16,
                overflow: 'hidden',
                borderWidth: 2,
                borderColor: theme.colors.primary,
              }}
            >
              {user.profilePictureUrl ? (
                <Image
                  source={{ uri: user.profilePictureUrl }}
                  style={{ width: 60, height: 60 }}
                  contentFit="cover"
                />
              ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                  <Ionicons name="person" size={35} color={theme.colors.onSurfaceVariant} />
                </View>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: '700',
                  color: theme.colors.onBackground,
                  fontFamily: 'Inter',
                  marginBottom: 4,
                }}
              >
                {user.firstName} {user.lastName}
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: theme.colors.onSurfaceVariant,
                  fontFamily: 'Inter',
                }}
              >
                @{user.username}
              </Text>
            </View>
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-around',
              paddingTop: 12,
              borderTopWidth: 1,
              borderTopColor: theme.colors.outline,
            }}
          >
            <View style={{ alignItems: 'center' }}>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: '700',
                  color: theme.colors.primary,
                  fontFamily: 'Inter',
                }}
              >
                {userRank || '--'}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: theme.colors.onSurfaceVariant,
                  fontFamily: 'Inter',
                }}
              >
                Rank
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: '700',
                  color: theme.colors.primary,
                  fontFamily: 'Inter',
                }}
              >
                {user.points || 0}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: theme.colors.onSurfaceVariant,
                  fontFamily: 'Inter',
                }}
              >
                Points
              </Text>
            </View>
          </View>
        </View>

        {/* Leaderboard Header */}
        <View
          style={{
            flexDirection: 'row',
            paddingHorizontal: 16,
            paddingVertical: 12,
            marginTop: 16,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.outline,
          }}
        >
          <View style={{ width: 40, alignItems: 'center' }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: theme.colors.onSurfaceVariant,
                fontFamily: 'Inter',
                textTransform: 'uppercase',
              }}
            >
              Rank
            </Text>
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: theme.colors.onSurfaceVariant,
                fontFamily: 'Inter',
                textTransform: 'uppercase',
              }}
            >
              User
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: theme.colors.onSurfaceVariant,
                fontFamily: 'Inter',
                textTransform: 'uppercase',
              }}
            >
              Points
            </Text>
          </View>
        </View>

        {/* Leaderboard List */}
        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <FlatList
            data={leaderboard}
            renderItem={renderItem}
            keyExtractor={(item, index) => `${item.username}-${index}`}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </>
  );
}

