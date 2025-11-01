import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Surface } from 'react-native-paper';
import { UserVerse, useAppStore } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';
import { getAllUserVerses } from '../db';
import { VerseItemSkeleton } from '../components/skeleton';

const baseUrl = 'http://10.169.51.121:5160';

export default function PracticeScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const user = useAppStore((state) => state.user);
  const shouldReloadPracticeList = useAppStore((state) => state.shouldReloadPracticeList);
  const setShouldReloadPracticeList = useAppStore((state) => state.setShouldReloadPracticeList);
  const [versesInProgress, setVersesInProgress] = useState<UserVerse[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserVerses = useCallback(async () => {
    try {
      setLoading(true);
      if (!user.username) {
        setVersesInProgress([]);
        setLoading(false);
        return;
      }
      
      // Fetch all user verses from the database
      const allPassages = await getAllUserVerses(user.username);
      
      console.log('Fetched passages:', allPassages.length);
      console.log('Sample passage:', JSON.stringify(allPassages[0], null, 2));
      console.log('Sample readableReference:', allPassages[0]?.readableReference);
      
      // Sort: memorized verses (100%) first, then in progress by progress percent (highest first)
      const sorted = allPassages.sort((a, b) => {
        const aProgress = a.progressPercent || 0;
        const bProgress = b.progressPercent || 0;
        const aMemorized = aProgress === 100 ? 1 : 0;
        const bMemorized = bProgress === 100 ? 1 : 0;
        
        // Memorized verses first (descending)
        if (aMemorized !== bMemorized) {
          return bMemorized - aMemorized;
        }
        
        // Then sort by progress percent (highest first)
        return bProgress - aProgress;
      });
      
      setVersesInProgress(sorted);
    } catch (error) {
      console.error('Failed to fetch user verses:', error);
      setVersesInProgress([]);
    } finally {
      setLoading(false);
    }
  }, [user.username]);

  // Initial load on mount and when username changes
  useEffect(() => {
    fetchUserVerses();
  }, [fetchUserVerses]);

  // Refresh when tab comes into focus, but only if flag is set
  useFocusEffect(
    useCallback(() => {
      if (shouldReloadPracticeList) {
        fetchUserVerses().finally(() => {
          // Clear the flag after reloading
          setShouldReloadPracticeList(false);
        });
      }
    }, [fetchUserVerses, shouldReloadPracticeList, setShouldReloadPracticeList])
  );

  const handlePractice = async (userVerse: UserVerse) => {
    try {
      // If verses are not populated, fetch them first
      if (!userVerse.verses || userVerse.verses.length === 0) {
        console.log('Fetching verse details for:', userVerse.readableReference);
        
        if (!userVerse.id) {
          console.error('UserVerse ID is missing:', userVerse);
          alert('Error: Missing passage ID');
          return;
        }
        
        const response = await fetch(`${baseUrl}/userverses/${userVerse.id}`);
        if (response.ok) {
          const populatedUserVerse = await response.json();
          
          // Check if we got verses back
          if (!populatedUserVerse.verses || populatedUserVerse.verses.length === 0) {
            console.error('No verses found for:', userVerse.readableReference);
            alert('Error: Could not load verse text for ' + userVerse.readableReference);
            return;
          }
          
          const setEditingUserVerse = useAppStore.getState().setEditingUserVerse;
          setEditingUserVerse(populatedUserVerse);
          router.push('/practiceSession');
        } else {
          const errorText = await response.text();
          console.error('Failed to fetch verse details:', response.status, errorText);
          alert('Error: Failed to load verse details');
        }
      } else {
        const setEditingUserVerse = useAppStore.getState().setEditingUserVerse;
        setEditingUserVerse(userVerse);
        router.push('/practiceSession');
      }
    } catch (error) {
      console.error('Error fetching verse details:', error);
      alert('Error: ' + (error as Error).message);
    }
  };

  // Filter verses into three categories
  const memorized = versesInProgress.filter((uv) => (uv.progressPercent || 0) === 100);
  const inProgress = versesInProgress.filter((uv) => {
    const progress = uv.progressPercent || 0;
    return progress > 0 && progress < 100;
  });
  const notStarted = versesInProgress.filter((uv) => (uv.progressPercent || 0) === 0);

  const renderVerseItem = (userVerse: UserVerse, index: number, section: string) => (
    <TouchableOpacity
      key={userVerse.id || `${section}-${index}`}
      onPress={() => handlePractice(userVerse)}
      style={{ width: '100%', marginBottom: 15 }}
    >
      <Surface style={{ width: '100%', padding: 20, borderRadius: 3, backgroundColor: theme.colors.surface }} elevation={4}>
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
            {(!userVerse.verses || userVerse.verses.length === 0) && section === 'notStarted' && (
              <Text style={{ ...styles.tinyText, marginTop: 5, opacity: 0.5, color: theme.colors.onBackground }}>
                Tap to load verse details
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
      </Surface>
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
                <Surface style={{ width: '100%', padding: 20, borderRadius: 3, backgroundColor: theme.colors.surface }} elevation={4}>
                  <VerseItemSkeleton />
                </Surface>
              </View>
            ))}
          </View>
        ) : (
          versesInProgress.length === 0 ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 100, width: '100%' }}>
              <Ionicons name="book-outline" size={80} color={theme.colors.onSurface} />
              <Text style={{ ...styles.text, fontSize: 20, fontWeight: '600', marginTop: 20, textAlign: 'center' }}>
                No Passages Yet
              </Text>
              <Text style={{ ...styles.tinyText, marginTop: 10, textAlign: 'center', color: theme.colors.onSurface }}>
                Add passages to your collections to start practicing
              </Text>
            </View>
          ) : (
            <View style={{ width: '100%' }}>
              {/* Memorized Section */}
              {memorized.length > 0 && (
                <View style={{ width: '100%', marginBottom: 30 }}>
                  <Text style={{ ...styles.subheading, marginBottom: 15 }}>
                    Memorized ({memorized.length})
                  </Text>
                  {memorized.map((userVerse, index) => renderVerseItem(userVerse, index, 'memorized'))}
                </View>
              )}

              {/* In Progress Section */}
              {inProgress.length > 0 && (
                <View style={{ width: '100%', marginBottom: 30 }}>
                  <Text style={{ ...styles.subheading, marginBottom: 15 }}>
                    In Progress ({inProgress.length})
                  </Text>
                  {inProgress.map((userVerse, index) => renderVerseItem(userVerse, index, 'inProgress'))}
                </View>
              )}

              {/* Not Started Section */}
              {notStarted.length > 0 && (
                <View style={{ width: '100%', marginBottom: 30 }}>
                  <Text style={{ ...styles.subheading, marginBottom: 15 }}>
                    Not Started ({notStarted.length})
                  </Text>
                  {notStarted.map((userVerse, index) => renderVerseItem(userVerse, index, 'notStarted'))}
                </View>
              )}
            </View>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
