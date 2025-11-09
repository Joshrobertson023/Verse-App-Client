import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { getFriendCollectionWithVerses, getUserVersesPopulated } from '../../../db';
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

export default function FriendCollectionScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const { username, id } = useLocalSearchParams<{ username: string; id: string }>();
  const currentUser = useAppStore((state) => state.user);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loading, setLoading] = useState(true);
  const [userVerses, setUserVerses] = useState<UserVerse[]>([]);

  useEffect(() => {
    loadCollection();
  }, [id, currentUser?.username]);

  const loadCollection = async () => {
    try {
      setLoading(true);
      const data = await getFriendCollectionWithVerses(parseInt(id), currentUser?.username);
      if (!data) {
        setCollection(null);
        setUserVerses([]);
        return;
      }
      let populated = data;
      try {
        if (data.userVerses && data.userVerses.length > 0) {
          const payload = { ...data, UserVerses: data.userVerses ?? [] };
          populated = await getUserVersesPopulated(payload as unknown as Collection);
        }
      } catch (err) {
        console.error('Failed to populate friend collection verses:', err);
      }
      setCollection(populated);
      setUserVerses(populated.userVerses ?? []);
    } catch (error) {
      console.error('Failed to load collection:', error);
      setCollection(null);
      setUserVerses([]);
    } finally {
      setLoading(false);
    }
  };

  const orderedUserVerses = useMemo(() => {
    if (!userVerses || userVerses.length === 0) return [];
    const uniqueMap = new Map<string, UserVerse>();
    userVerses.forEach((uv) => {
      if (!uv.readableReference || uniqueMap.has(uv.readableReference)) return;
      uniqueMap.set(uv.readableReference, uv);
    });
    return orderByDateAdded(Array.from(uniqueMap.values()));
  }, [userVerses]);

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
        <View style={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 }}>
          {orderedUserVerses.length === 0 ? (
            <View style={{ alignItems: 'center', backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant ?? theme.colors.outline, borderRadius: 12, borderWidth: 1, padding: 20 }}>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'Inter', fontSize: 14 }}>No verses in this collection</Text>
            </View>
          ) : (
            orderedUserVerses.map((userVerse, index) => (
              <View key={userVerse.readableReference || `userVerse-${index}`} style={{ minWidth: '100%', marginBottom: 20 }}>
                <View style={{ backgroundColor: theme.colors.surface, borderRadius: 3, minWidth: '100%', padding: 20 }}>
                  <View>
                    <Text style={{ ...styles.text, fontFamily: 'Noto Serif bold', fontWeight: 600 }}>{userVerse.readableReference}</Text>
                    {(userVerse.verses || []).map((verse, verseIndex) => (
                      <View key={verse.verse_reference || `${userVerse.readableReference}-verse-${verseIndex}`}>
                        <View>
                          <Text style={{ ...styles.text, fontFamily: 'Noto Serif', fontSize: 18 }}>
                            {verse.verse_Number ? `${verse.verse_Number}: ` : ''}
                            {verse.text}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </>
  );
}

