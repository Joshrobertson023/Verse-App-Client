import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { formatDate, parseUTCDate } from '../dateUtils';
import { getMemorizedUserVerses } from '../db';
import { useAppStore, UserVerse } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

export default function MemorizedVersesScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const user = useAppStore((state) => state.user);
  const [memorizedVerses, setMemorizedVerses] = useState<UserVerse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMemorizedVerses();
  }, []);

  const loadMemorizedVerses = async () => {
    try {
      setLoading(true);
      setMemorizedVerses(await getMemorizedUserVerses(user.username));
    } catch (error) {
      console.error('Failed to load memorized verses:', error);
      setMemorizedVerses([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
    <>
      <Stack.Screen
        options={{
          title: 'Memorized Verses',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.onBackground,
        }}
      />
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Memorized Verses',
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.onBackground,
        }}
      />
      <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <View style={{ padding: 20 }}>
          {memorizedVerses.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={{ 
                fontSize: 16, 
                color: theme.colors.onSurfaceVariant,
                fontFamily: 'Inter',
                textAlign: 'center'
              }}>
                No verses memorized
              </Text>
            </View>
          ) : (
            memorizedVerses.map((userVerse, index) => (
              <View 
                key={userVerse.clientId || `memorized-${index}`} 
                style={{ width: '100%', marginBottom: 20 }}
              >
                <View 
                  style={{ 
                    width: '100%', 
                    padding: 20, 
                    borderRadius: 3, 
                    backgroundColor: theme.colors.surface 
                  }}
                >
                  <View>
                    <Text style={{
                      ...styles.text,
                      fontFamily: 'Noto Serif bold',
                      fontWeight: 600
                    }}>
                      {userVerse.readableReference}
                    </Text>
                    {(userVerse.verses || []).map((verse, verseIndex) => (
                      <View 
                        key={verse.verse_reference || `${userVerse.readableReference}-verse-${verseIndex}`}
                      >
                        <Text style={{
                          ...styles.text,
                          fontFamily: 'Noto Serif',
                          fontSize: 18
                        }}>
                          {verse.verse_Number}: {verse.text}
                        </Text>
                      </View>
                    ))}
                    <Text style={{
                      ...styles.text,
                      color: theme.colors.onSurfaceVariant,
                      marginTop: 8,
                      fontSize: 12
                    }}>
                      {(() => {
                        const d = userVerse.lastPracticed || userVerse.dateMemorized;
                        if (!d) return '';
                        const dt = parseUTCDate(d);
                        if (!dt) return '';
                        const label = userVerse.lastPracticed ? 'Last practiced' : 'Memorized on';
                        return `${label}: ${formatDate(dt)}`;
                      })()}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
          <View style={{ height: 60 }} />
        </View>
      </ScrollView>
    </>
  );
}

