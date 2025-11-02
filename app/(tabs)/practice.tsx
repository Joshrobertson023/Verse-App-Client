import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VerseItemSkeleton } from '../components/skeleton';
import { getUnpopulatedMemorizedUserVerses, getUserVersesInProgress, getUserVersesNotStarted, getUserVersesPopulated } from '../db';
import { Collection, UserVerse, useAppStore } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

const baseUrl = 'http://10.169.51.121:5160';

export default function PracticeScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const user = useAppStore((state) => state.user);
  const shouldReloadPracticeList = useAppStore((state) => state.shouldReloadPracticeList);
  const setShouldReloadPracticeList = useAppStore((state) => state.setShouldReloadPracticeList);
  const [versesInProgress, setVersesInProgress] = useState<UserVerse[]>([]);
  const [versesMemorized, setVersesMemorized] = useState<UserVerse[]>([]);
  const [versesNotStarted, setVersesNotStarted] = useState<UserVerse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserVerses = useCallback(async () => {
    try {
      setLoading(true);
      if (!user.username) {
        setVersesInProgress([]);
        setLoading(false);
        return;
      }
      const [memorized, inProgress, notStarted] = await Promise.all([
        getUnpopulatedMemorizedUserVerses(user.username),
        getUserVersesInProgress(user.username),
        getUserVersesNotStarted(user.username)
      ]);
      setVersesMemorized(memorized);
      setVersesInProgress(inProgress);
      setVersesNotStarted(notStarted);
    } catch (error) {
      console.error('Failed to fetch user verses:', error);
    } finally {
      setLoading(false);
    }
  }, [user.username]);

  useEffect(() => {
    fetchUserVerses();
  }, [fetchUserVerses]);

  useFocusEffect(
    useCallback(() => {
      if (shouldReloadPracticeList) {
        fetchUserVerses().finally(() => {
          setShouldReloadPracticeList(false);
        });
      }
    }, [fetchUserVerses, shouldReloadPracticeList, useAppStore.getState().setShouldReloadPracticeList])
  );

  const handlePractice = async (userVerse: UserVerse) => {
    try {
      if (!userVerse.verses || userVerse.verses.length === 0) {
        if (!userVerse.id) {
          alert('Error: Missing passage ID');
          return;
        }
        
        const collection: Collection = {
          title: '',
          collectionId: 0,
          favorites: false,
          userVerses: [userVerse]
        }
        const result = await getUserVersesPopulated(collection);
        
          if (!result.userVerses.at(0)?.verses || result.userVerses.at(0)?.verses.length === 0) {
            alert('Error: Could not load verse text for ' + userVerse.readableReference);
            return;
          }
          
          const setEditingUserVerse = useAppStore.getState().setEditingUserVerse;
          setEditingUserVerse(result.userVerses.at(0));
          router.push('/practiceSession');
        } else {
          alert('Error: Failed to load verse details');
        }
      } catch (error) {
        alert('Error: ' + (error as Error).message);
      }
  };

  const renderVerseItem = (userVerse: UserVerse, index: number, section: string) => (
    <TouchableOpacity
      key={userVerse.id || `${section}-${index}`}
      onPress={() => handlePractice(userVerse)}
      style={{ width: '100%', marginBottom: 15 }}
    >
      <View style={{ width: '100%', padding: 20, borderRadius: 3, backgroundColor: theme.colors.surface }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ ...styles.text, fontFamily: 'Noto Serif bold', fontWeight: 600, fontSize: 18, color: theme.colors.onBackground }}>
              {userVerse.readableReference || 'Unknown Reference'}
            </Text>
            <Text style={{ ...styles.tinyText, marginTop: 5, color: theme.colors.primary }}>
              {Math.floor(userVerse.progressPercent || 0)}% memorized
            </Text>
            {userVerse.verses && userVerse.verses.length > 0 && (
              <Text style={{ fontFamily: 'Noto Serif', fontSize: 16, marginTop: 5, opacity: 0.7, color: theme.colors.onBackground }}>
                {userVerse.verses[0].text.substring(0, 50)}{userVerse.verses[0].text.length > 50 ? '...' : ''}
              </Text>
            )}
          </View>
          <View style={{ alignItems: 'flex-end', marginLeft: 15 }}>
            {section === 'notStarted' ? (
              <Ionicons name="play-circle-outline" size={40} color={theme.colors.primary} />
            ) : (
              <Ionicons name="chevron-forward" size={24} color={theme.colors.onBackground} />
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={{
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          paddingBottom: 100,
          paddingHorizontal: 20,
          paddingTop: 20,
          width: '100%'
        }}
      >
        {loading ? (
          <View style={{ width: '100%' }}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={{ marginBottom: 15 }}>
                <View style={{ width: '100%', padding: 20, borderRadius: 3, backgroundColor: theme.colors.surface }}>
                  <VerseItemSkeleton />
                </View>
              </View>
            ))}
          </View>
        ) : (
          versesMemorized.length === 0 && versesInProgress.length === 0 && versesNotStarted.length === 0 ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 100, width: '100%' }}>
              <Ionicons name="book-outline" size={80} color={theme.colors.onSurface} />
              <Text style={{ ...styles.text, fontSize: 20, fontWeight: '600', marginTop: 20, textAlign: 'center' }}>
                No Saved Passages Yet
              </Text>
            </View>
          ) : (
            <View style={{ width: '100%' }}>
              {/* Memorized Section */}
              {versesMemorized.length > 0 && (
                <View style={{ width: '100%', marginBottom: 30 }}>
                  <Text style={{ ...styles.subheading, marginBottom: 15 }}>
                    Memorized ({versesMemorized.length})
                  </Text>
                  {versesMemorized.map((userVerse, index) => renderVerseItem(userVerse, index, 'memorized'))}
                </View>
              )}

              {/* In Progress Section */}
              {versesInProgress.length > 0 && (
                <View style={{ width: '100%', marginBottom: 30 }}>
                  <Text style={{ ...styles.subheading, marginBottom: 15 }}>
                    In Progress ({versesInProgress.length})
                  </Text>
                  {versesInProgress.map((userVerse, index) => renderVerseItem(userVerse, index, 'inProgress'))}
                </View>
              )}

              {/* Not Started Section */}
              {versesNotStarted.length > 0 && (
                <View style={{ width: '100%', marginBottom: 30 }}>
                  <Text style={{ ...styles.subheading, marginBottom: 15 }}>
                    Not Started ({versesNotStarted.length})
                  </Text>
                  {versesNotStarted.map((userVerse, index) => renderVerseItem(userVerse, index, 'notStarted'))}
                </View>
              )}
            </View>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
