import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { Surface } from 'react-native-paper';
import { getAllUserVerses, populateVersesForUserVerses } from '../../db';
import { UserVerse } from '../../store';
import useStyles from '../../styles';
import useAppTheme from '../../theme';

export default function FriendMemorizedVersesScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const { username } = useLocalSearchParams<{ username: string }>();
  const [memorizedVerses, setMemorizedVerses] = useState<UserVerse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (username) {
      loadMemorizedVerses();
    }
  }, [username]);

  const loadMemorizedVerses = async () => {
    try {
      setLoading(true);
      
      const allUserVerses = await getAllUserVerses(username!);
      
      const memorized = allUserVerses.filter(
        (uv) => uv.progressPercent === 100
      );
      
      const populated = await populateVersesForUserVerses(memorized);

      const withIds: UserVerse[] = populated.map(uv => ({
        ...uv,
        clientId: (globalThis as any)?.crypto?.randomUUID?.() ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        })
      }));

      const getTime = (uv: UserVerse) => {
        const d: any = uv.lastPracticed || uv.dateMemorized;
        if (!d) return 0;
        try { return new Date(d as any).getTime(); } catch { return 0; }
      };
      const sorted = withIds.sort((a, b) => getTime(b) - getTime(a));
      
      setMemorizedVerses(sorted);
    } catch (error) {
      console.error('Failed to load memorized verses:', error);
      setMemorizedVerses([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `Memorized`,
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
                {username} hasn't memorized any verses
              </Text>
            </View>
          ) : (
            memorizedVerses.map((userVerse, index) => (
              <View 
                key={userVerse.clientId || `memorized-${index}`} 
                style={{ width: '100%', marginBottom: 20 }}
              >
                <Surface 
                  style={{ 
                    width: '100%', 
                    padding: 20, 
                    borderRadius: 3, 
                    backgroundColor: theme.colors.surface 
                  }} 
                  elevation={4}
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
                        const d: any = userVerse.lastPracticed || userVerse.dateMemorized;
                        const dt = d ? new Date(d as any) : undefined;
                        const label = userVerse.lastPracticed ? 'Last practiced' : 'Memorized on';
                        return dt ? `${label}: ${dt.toLocaleDateString()}` : '';
                      })()}
                    </Text>
                  </View>
                </Surface>
              </View>
            ))
          )}
          <View style={{ height: 60 }} />
        </View>
      </ScrollView>
    </>
  );
}

