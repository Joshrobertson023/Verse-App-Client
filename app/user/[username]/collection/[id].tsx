import Ionicons from '@expo/vector-icons/Ionicons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Divider } from 'react-native-paper';
import { getFriendCollectionWithVerses } from '../../../db';
import { Collection, useAppStore, UserVerse } from '../../../store';
import useStyles from '../../../styles';
import useAppTheme from '../../../theme';

function orderByDateAdded(userVerses: UserVerse[]): UserVerse[] {
  return [...userVerses].sort((a, b) => {
    const dateA = a.dateAdded ? new Date(a.dateAdded).getTime() : 0;
    const dateB = b.dateAdded ? new Date(b.dateAdded).getTime() : 0;
    return dateB - dateA;
  });
}

function orderByProgress(userVerses: UserVerse[]): UserVerse[] {
  return [...userVerses].sort((a, b) => {
    const aProgress = a.progressPercent || 0;
    const bProgress = b.progressPercent || 0;
    return bProgress - aProgress;
  });
}

export default function FriendCollectionScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const router = useRouter();
  const { username, id } = useLocalSearchParams<{ username: string; id: string }>();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'newest' | 'progress'>('newest');

  useEffect(() => {
    loadCollection();
  }, [id]);

  const loadCollection = async () => {
    try {
      setLoading(true);
      const data = await getFriendCollectionWithVerses(parseInt(id));
      setCollection(data);
    } catch (error) {
      console.error('Failed to load collection:', error);
      setCollection(null);
    } finally {
      setLoading(false);
    }
  };

  const orderedUserVerses: UserVerse[] = useMemo(() => {
    if (!collection?.userVerses) return [];

    const uniqueMap = new Map<string, UserVerse>();
    collection.userVerses.forEach((uv) => {
      if (!uv.readableReference) return;
      if (!uniqueMap.has(uv.readableReference)) {
        uniqueMap.set(uv.readableReference, uv);
      }
    });

    const verses = Array.from(uniqueMap.values());

    if (sortBy === 'progress') {
      return orderByProgress(verses);
    }

    return orderByDateAdded(verses);
  }, [collection?.userVerses, sortBy]);

  const handlePractice = (userVerse: UserVerse) => {
    const setEditingUserVerse = useAppStore.getState().setEditingUserVerse;
    setEditingUserVerse(userVerse);
    router.push('/practiceSession');
  };

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: '',
            headerBackVisible: true,
            headerShadowVisible: false,
          }}
        />
        <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </>
    );
  }

  if (!collection) {
    return (
      <>
        <Stack.Screen
          options={{
            title: '',
            headerBackVisible: true,
            headerShadowVisible: false,
          }}
        />
        <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: theme.colors.onBackground, fontSize: 16 }}>Collection not found</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: collection.title,
          headerBackVisible: true,
          headerShadowVisible: false,
        }}
      />
      <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{ padding: 20 }}>
          <View
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 16,
              padding: 20,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
            }}
          >
            <Text
              style={{
                fontSize: 24,
                fontWeight: 'bold',
                color: theme.colors.onBackground,
                marginBottom: 8,
                fontFamily: 'Inter',
              }}
            >
              {collection.title}
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: theme.colors.onSurfaceVariant,
                fontFamily: 'Inter',
                marginBottom: 4,
              }}
            >
              {collection.userVerses?.length || 0} passages • {collection.visibility}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: theme.colors.onSurfaceVariant,
                fontFamily: 'Inter',
              }}
            >
              Shared by @{username}
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight: '600',
                color: theme.colors.onBackground,
                fontFamily: 'Inter',
              }}
            >
              Verses
            </Text>
            <View style={{ flexDirection: 'row', borderRadius: 999, borderWidth: 1, borderColor: theme.colors.outline }}>
              <TouchableOpacity
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: sortBy === 'newest' ? theme.colors.primary : 'transparent',
                }}
                onPress={() => setSortBy('newest')}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: 'Inter',
                    color: sortBy === 'newest' ? theme.colors.onPrimary : theme.colors.onSurfaceVariant,
                    fontWeight: sortBy === 'newest' ? '600' : '400',
                  }}
                >
                  Newest
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: sortBy === 'progress' ? theme.colors.primary : 'transparent',
                }}
                onPress={() => setSortBy('progress')}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontFamily: 'Inter',
                    color: sortBy === 'progress' ? theme.colors.onPrimary : theme.colors.onSurfaceVariant,
                    fontWeight: sortBy === 'progress' ? '600' : '400',
                  }}
                >
                  Progress
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {orderedUserVerses.length === 0 ? (
            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderRadius: 12,
                padding: 20,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: theme.colors.outlineVariant ?? theme.colors.outline,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: theme.colors.onSurfaceVariant,
                  fontFamily: 'Inter',
                }}
              >
                No verses in this collection
              </Text>
            </View>
          ) : (
            orderedUserVerses.map((userVerse, index) => (
              <View
                key={userVerse.readableReference || `${userVerse.username}-${index}`}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderRadius: 16,
                  padding: 20,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: theme.colors.surfaceVariant ?? 'transparent',
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text
                      style={{
                        fontFamily: 'Noto Serif bold',
                        fontSize: 20,
                        color: theme.colors.onBackground,
                      }}
                    >
                      {userVerse.readableReference}
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'Inter',
                        fontSize: 12,
                        color: theme.colors.onSurfaceVariant,
                        marginTop: 4,
                      }}
                    >
                      Memorized {Math.round(userVerse.progressPercent || 0)}%
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={{ padding: 4 }}
                    onPress={() => handlePractice(userVerse)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="flash-outline" size={22} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>

                <Divider style={{ marginBottom: 12, backgroundColor: theme.colors.surfaceVariant ?? theme.colors.outline }} />

                <View style={{ gap: 10 }}>
                  {(userVerse.verses || []).map((verse, verseIndex) => (
                    <View key={verse.verse_reference || `${userVerse.readableReference}-${verseIndex}`}>
                      <Text
                        style={{
                          fontFamily: 'Noto Serif',
                          fontSize: 16,
                          color: theme.colors.onBackground,
                          lineHeight: 24,
                        }}
                      >
                        {verse.text}
                      </Text>
                    </View>
                  ))}
                </View>

                <TouchableOpacity
                  style={{ ...styles.button_outlined, marginTop: 16 }}
                  onPress={() => handlePractice(userVerse)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.buttonText_outlined}>Practice</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </>
  );
}

