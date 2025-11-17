import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Animated, Platform, Text, TouchableOpacity, View } from 'react-native';
import { Searchbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VerseItemSkeleton } from '../components/skeleton';
import { getOverdueVerses, getUnpopulatedMemorizedUserVerses, getUserVersesInProgress, getUserVersesNotStarted, getUserVersesPopulated, getVerseSearchResult } from '../db';
import { Collection, UserVerse, useAppStore } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

const baseUrl = 'http://10.169.51.121:5160';

export default function PracticeScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const navigation = useNavigation();
  const user = useAppStore((state) => state.user);
  const collections = useAppStore((state) => state.collections);
  const shouldReloadPracticeList = useAppStore((state) => state.shouldReloadPracticeList);
  const setShouldReloadPracticeList = useAppStore((state) => state.setShouldReloadPracticeList);
  const [versesInProgress, setVersesInProgress] = useState<UserVerse[]>([]);
  const [versesMemorized, setVersesMemorized] = useState<UserVerse[]>([]);
  const [versesNotStarted, setVersesNotStarted] = useState<UserVerse[]>([]);
  const [versesOverdue, setVersesOverdue] = useState<UserVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrollY] = useState(new Animated.Value(0));

  // Set up native iOS search bar in header
  useLayoutEffect(() => {
    if (Platform.OS === 'ios') {
      navigation.setOptions({
        headerSearchBarOptions: {
          placeholder: 'Search passages...',
          onChangeText: (event: any) => {
            const text = event.nativeEvent.text || '';
            setSearchQuery(text);
          },
          onSearchButtonPress: (event: any) => {
            const text = event.nativeEvent.text || '';
            setSearchQuery(text);
          },
          onCancelButtonPress: () => {
            setSearchQuery('');
          },
        },
      });
    }
  }, [navigation]);

  const fetchUserVerses = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[Practice] Fetching user verses for:', user.username);
      
      if (!user.username) {
        console.log('[Practice] No username, clearing all verses');
        setVersesInProgress([]);
        setVersesMemorized([]);
        setVersesNotStarted([]);
        setVersesOverdue([]);
        setLoading(false);
        return;
      }

      console.log('[Practice] Collections count:', collections.length);
      
      // Fetch all verses without filtering first
      console.log('[Practice] Fetching from database...');
      const [memorized, inProgress, notStarted, overdue] = await Promise.all([
        getUnpopulatedMemorizedUserVerses(user.username),
        getUserVersesInProgress(user.username),
        getUserVersesNotStarted(user.username),
        getOverdueVerses(user.username)
      ]);

      console.log('[Practice] Raw data from database:');
      console.log('  - Memorized:', memorized.length);
      console.log('  - In Progress:', inProgress.length);
      console.log('  - Not Started:', notStarted.length);
      console.log('  - Overdue:', overdue.length);

      // Apply filtering only if collections exist
      const validCollectionIds = new Set(
        collections
          .map((collection) => collection.collectionId)
          .filter((id): id is number => id !== undefined && id !== null)
      );

      console.log('[Practice] Valid collection IDs:', Array.from(validCollectionIds));

      let filteredMemorized = memorized;
      let filteredInProgress = inProgress;
      let filteredNotStarted = notStarted;
      let filteredOverdue = overdue;

      // Only filter if collections exist
      if (validCollectionIds.size > 0) {
        // Show all verses - either they have no collectionId (standalone) or they belong to one of the user's collections
        const filterByCollection = (items: UserVerse[]) =>
          items.filter(
            (item) =>
              // Include verses without a collectionId (standalone verses)
              (item.collectionId === undefined || item.collectionId === null) ||
              // Or verses that belong to one of the user's collections
              (item.collectionId !== undefined && item.collectionId !== null && validCollectionIds.has(item.collectionId))
          );
        
        filteredMemorized = filterByCollection(memorized);
        filteredInProgress = filterByCollection(inProgress);
        filteredNotStarted = filterByCollection(notStarted);
        filteredOverdue = filterByCollection(overdue);

        console.log('[Practice] After filtering:');
        console.log('  - Memorized:', filteredMemorized.length);
        console.log('  - In Progress:', filteredInProgress.length);
        console.log('  - Not Started:', filteredNotStarted.length);
        console.log('  - Overdue:', filteredOverdue.length);
      }

      setVersesMemorized(filteredMemorized);
      setVersesInProgress(filteredInProgress);
      setVersesNotStarted(filteredNotStarted);
      setVersesOverdue(filteredOverdue);
    } catch (error) {
      console.error('[Practice] Failed to fetch user verses:', error);
      setVersesInProgress([]);
      setVersesMemorized([]);
      setVersesNotStarted([]);
      setVersesOverdue([]);
    } finally {
      setLoading(false);
    }
  }, [user.username, collections]);

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
    }, [fetchUserVerses, shouldReloadPracticeList, setShouldReloadPracticeList])
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
          // Try to load verse text directly
          try {
            const searchData = await getVerseSearchResult(userVerse.readableReference);
            if (searchData.verses && searchData.verses.length > 0) {
              const verseToPractice = { ...userVerse, verses: searchData.verses };
              const setEditingUserVerse = useAppStore.getState().setEditingUserVerse;
              setEditingUserVerse(verseToPractice);
              router.push('/practiceSession');
              return;
            }
          } catch (e) {
            console.error('Failed to load verse text:', e);
          }
          alert('Error: Could not load verse text for ' + userVerse.readableReference);
          return;
        }
        
        const setEditingUserVerse = useAppStore.getState().setEditingUserVerse;
        setEditingUserVerse(result.userVerses.at(0));
        router.push('/practiceSession');
      } else {
        const setEditingUserVerse = useAppStore.getState().setEditingUserVerse;
        setEditingUserVerse(userVerse);
        router.push('/practiceSession');
      }
    } catch (error) {
      alert('Error: ' + (error as Error).message);
    }
  };

  // Filter each section individually based on search query
  const filterVerses = useCallback((verses: UserVerse[], query: string) => {
    if (!query.trim()) {
      return verses;
    }

    const searchQuery = query.trim().toLowerCase();
    return verses.filter(verse => {
      // Search in readable reference
      const refMatch = verse.readableReference?.toLowerCase().includes(searchQuery);
      
      // Search in verse text
      const textMatch = verse.verses?.some(v => 
        v.text?.toLowerCase().includes(searchQuery)
      );

      return refMatch || textMatch;
    });
  }, []);

  const filteredOverdue = useMemo(() => 
    filterVerses(versesOverdue, searchQuery), 
    [versesOverdue, searchQuery, filterVerses]
  );
  const filteredInProgress = useMemo(() => 
    filterVerses(versesInProgress, searchQuery), 
    [versesInProgress, searchQuery, filterVerses]
  );
  const filteredNotStarted = useMemo(() => 
    filterVerses(versesNotStarted, searchQuery), 
    [versesNotStarted, searchQuery, filterVerses]
  );
  const filteredMemorized = useMemo(() => 
    filterVerses(versesMemorized, searchQuery), 
    [versesMemorized, searchQuery, filterVerses]
  );

  const formatDate = (date: Date | null): string => {
    if (!date) return 'Not practiced';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const practiceDate = new Date(date);
    practiceDate.setHours(0, 0, 0, 0);
    
    const diffTime = practiceDate.getTime() - today.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `Overdue ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else {
      const month = practiceDate.toLocaleString('default', { month: 'short' });
      const day = practiceDate.getDate();
      const year = practiceDate.getFullYear();
      const currentYear = today.getFullYear();
      
      if (year !== currentYear) {
        return `Due ${month} ${day}, ${year}`;
      } else {
        return `Due ${month} ${day}`;
      }
    }
  };

  const renderVerseItem = (userVerse: UserVerse, index: number) => {
    const nextPracticeDate = userVerse.nextPracticeDate ? new Date(userVerse.nextPracticeDate) : null;
    
    return (
      <TouchableOpacity
        key={userVerse.id || `verse-${index}`}
        onPress={() => handlePractice(userVerse)}
        style={{ width: '100%', marginBottom: 10 }}
      >
        <View style={{ width: '100%', padding: 12, borderRadius: 8, backgroundColor: theme.colors.surface }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ ...styles.text, fontFamily: 'Noto Serif bold', fontWeight: 600, fontSize: 16, color: theme.colors.onBackground, marginBottom: 4 }}>
                {userVerse.readableReference || 'Unknown Reference'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 }}>
                <Text style={{ ...styles.tinyText, fontSize: 13, color: theme.colors.primary }}>
                  {userVerse.timesMemorized || 0}x memorized
                </Text>
                {nextPracticeDate && (
                  <Text style={{ ...styles.tinyText, fontSize: 13, color: theme.colors.onSurfaceVariant }}>
                    {formatDate(nextPracticeDate)}
                  </Text>
                )}
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurfaceVariant} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      {/* Android: Overlay search bar over header */}
      {Platform.OS === 'android' && (
        <View
          style={{
            position: 'absolute',
            top: 30,
            left: 0,
            right: 0,
            zIndex: 10,
            backgroundColor: theme.colors.background,
            paddingTop: 8,
            paddingHorizontal: 16,
            paddingBottom: 8,
          }}
        >
          <Searchbar
            placeholder="Filter passages"
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={{
              backgroundColor: theme.colors.surface,
              elevation: 0,
            }}
            inputStyle={{
              color: theme.colors.onSurface,
            }}
            iconColor={theme.colors.onSurfaceVariant}
            placeholderTextColor={theme.colors.onSurfaceVariant}
          />
        </View>
      )}

      <Animated.ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={{
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          paddingBottom: 100,
          paddingHorizontal: 20,
          paddingTop: Platform.OS === 'android' ? 80 : 20, // Space for search bar on Android
          width: '100%'
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
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
          versesMemorized.length === 0 && versesInProgress.length === 0 && versesNotStarted.length === 0 && versesOverdue.length === 0 ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 100, width: '100%' }}>
              <Ionicons name="book-outline" size={80} color={theme.colors.onSurface} />
              <Text style={{ ...styles.text, fontSize: 20, fontWeight: '600', marginTop: 20, textAlign: 'center' }}>
                No Saved Passages Yet
              </Text>
            </View>
          ) : (
            <View style={{ width: '100%' }}>
              {/* Overdue Section */}
              {filteredOverdue.length > 0 && (
                <View style={{ width: '100%', marginBottom: 20 }}>
                  <Text style={{ ...styles.subheading, marginBottom: 12 }}>
                    Overdue ({filteredOverdue.length})
                  </Text>
                  {filteredOverdue.map((userVerse, index) => renderVerseItem(userVerse, index))}
                </View>
              )}

              {/* Memorized Section */}
              {filteredMemorized.length > 0 && (
                <View style={{ width: '100%', marginBottom: 20 }}>
                  <Text style={{ ...styles.subheading, marginBottom: 12 }}>
                    Memorized ({filteredMemorized.length}{searchQuery.trim() ? ` of ${versesMemorized.length}` : ''})
                  </Text>
                  {filteredMemorized.map((userVerse, index) => renderVerseItem(userVerse, index))}
                </View>
              )}

              {/* Not Started Section */}
              {filteredNotStarted.length > 0 && (
                <View style={{ width: '100%', marginBottom: 20 }}>
                  <Text style={{ ...styles.subheading, marginBottom: 12 }}>
                    Not Started ({filteredNotStarted.length})
                  </Text>
                  {filteredNotStarted.map((userVerse, index) => renderVerseItem(userVerse, index))}
                </View>
              )}

              {/* In Progress Section */}
              {filteredInProgress.length > 0 && (
                <View style={{ width: '100%', marginBottom: 20 }}>
                  <Text style={{ ...styles.subheading, marginBottom: 12 }}>
                    In Progress ({filteredInProgress.length})
                  </Text>
                  {filteredInProgress.map((userVerse, index) => renderVerseItem(userVerse, index))}
                </View>
              )}

              {/* Show message if searching and no results */}
              {searchQuery.trim() && 
               filteredOverdue.length === 0 && 
               filteredInProgress.length === 0 && 
               filteredNotStarted.length === 0 && 
               filteredMemorized.length === 0 && (
                <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 100, width: '100%' }}>
                  <Ionicons name="search-outline" size={80} color={theme.colors.onSurfaceVariant} />
                  <Text style={{ ...styles.text, fontSize: 20, fontWeight: '600', marginTop: 20, textAlign: 'center' }}>
                    No passages found
                  </Text>
                  <Text style={{ ...styles.tinyText, marginTop: 8, color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                    Try searching by reference or verse text
                  </Text>
                </View>
              )}
            </View>
          )
        )}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
