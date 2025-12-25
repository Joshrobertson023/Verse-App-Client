import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { Stack, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Text, View } from 'react-native';
import { getLeaderboard, getUserRank } from '../db';
import { useAppStore, User } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';
import { formatPoints } from '../utils/numberFormat';

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
          paddingVertical: 5,
          paddingHorizontal: 16,
          backgroundColor: isCurrentUser ? theme.colors.surface : 'transparent',
          marginHorizontal: 16,
          borderRadius: 10,
          marginBottom: 8,
        }}
      >
        {/* Rank */}
        <View style={{ width: 20, marginRight: 10, alignItems: 'center' }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: theme.colors.onBackground,
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
            borderColor: isCurrentUser ? theme.colors.primary : 'transparent',
            borderWidth: 1.5
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
              color: theme.colors.onBackground,
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
              fontSize: 16,
              color: theme.colors.onBackground,
              fontFamily: 'Inter',
            }}
          >
            {formatPoints(item.points || 0)}
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
            marginHorizontal: 16,
            borderRadius: 16,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: theme.colors.background,
                marginRight: 16,
                overflow: 'hidden',
                borderColor: theme.colors.primary,
                borderWidth: 1.5
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
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: '700',
                    color: theme.colors.onBackground,
                    fontFamily: 'Inter',
                    marginRight: 12,
                  }}
                >
                  {user.firstName} {user.lastName}
                </Text>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: theme.colors.onSurfaceVariant,
                    fontFamily: 'Inter',
                    marginRight: 12,
                  }}
                >
                  #{userRank || '--'}
                </Text>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: theme.colors.onBackground,
                    fontFamily: 'Inter',
                  }}
                >
                  {formatPoints(user.points || 0)} pts
                </Text>
              </View>
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
        </View>

        {/* Leaderboard Header */}
        <View
          style={{
            flexDirection: 'row',
            paddingHorizontal: 16,
            paddingVertical: 12,
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

