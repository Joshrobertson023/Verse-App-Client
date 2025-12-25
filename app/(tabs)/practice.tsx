import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Searchbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import PracticeModeModal from '../components/practiceModeModal';
import { VerseItemSkeleton } from '../components/skeleton';
import UserVerseDonut from '../components/userVerseDonut';
import { getOverdueVerses, getUnpopulatedMemorizedUserVerses, getUserVersesInProgress, getUserVersesNotStarted, getUserVersesPopulated, getVerseSearchResult } from '../db';
import { Collection, UserVerse, useAppStore } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

// Memoized components to prevent unnecessary re-renders
const VerseItem = React.memo(({ 
  verse, 
  onPress, 
  theme, 
  styles,
  formatDate,
  collections
}: { 
  verse: UserVerse; 
  onPress: (verse: UserVerse) => void;
  theme: any;
  styles: any;
  formatDate: (date: Date | null) => string;
  collections: Collection[];
}) => {
  const nextPracticeDate = verse.nextPracticeDate ? new Date(verse.nextPracticeDate) : null;
  const collection = verse.collectionId ? collections.find(c => c.collectionId === verse.collectionId) : null;
  
  return (
    <TouchableOpacity
      onPress={() => onPress(verse)}
      style={{ width: '100%', marginBottom: 10 }}
    >
      <View style={{ width: '100%', padding: 12, borderRadius: 8, backgroundColor: theme.colors.surface }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ ...styles.text, fontFamily: 'Noto Serif bold', fontWeight: 600, fontSize: 16, color: theme.colors.onBackground, marginBottom: 4 }}>
              {verse.readableReference || 'Unknown Reference'}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 }}>
              {nextPracticeDate && (
                <Text style={{ ...styles.tinyText, fontSize: 13, color: theme.colors.onSurfaceVariant }}>
                  {formatDate(nextPracticeDate)}
                </Text>
              )}
            </View>
            {collection && (
              <TouchableOpacity
                onPress={() => {
                  if (collection.collectionId) {
                    router.push(`../collections/${collection.collectionId}`);
                  }
                }}
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, alignSelf: 'flex-start' }}
              >
                <Ionicons name="folder-outline" size={14} color={theme.colors.primary} />
                <Text style={{ ...styles.tinyText, fontSize: 12, color: theme.colors.primary, marginLeft: 6 }}>
                  {collection.title}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 10 }}>
            <UserVerseDonut 
              userVerse={verse} 
              size={50} 
              nextPracticeDate={nextPracticeDate}
              showDaysUntilDue={false}
            />
            <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurfaceVariant} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default function PracticeScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const navigation = useNavigation();
  const user = useAppStore((state) => state.user);
  const collections = useAppStore((state) => state.collections);
  const shouldReloadPracticeList = useAppStore((state) => state.shouldReloadPracticeList);
  const setShouldReloadPracticeList = useAppStore((state) => state.setShouldReloadPracticeList);

  const selectedUserVerse = useAppStore((state) => state.selectedUserVerse);
  const setSelectedUserVerse = useAppStore((state) => state.setSelectedUserVerse);
  
  const [versesInProgress, setVersesInProgress] = useState<UserVerse[]>([]);
  const [versesMemorized, setVersesMemorized] = useState<UserVerse[]>([]);
  const [versesNotStarted, setVersesNotStarted] = useState<UserVerse[]>([]);
  const [versesOverdue, setVersesOverdue] = useState<UserVerse[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search and UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [practiceModeModalVisible, setPracticeModeModalVisible] = useState(false);

  // Memoize valid collection IDs to prevent recalculation
  const validCollectionIds = useMemo(() => {
    return new Set(
      collections
        .map((collection) => collection.collectionId)
        .filter((id): id is number => id !== undefined && id !== null)
    );
  }, [collections]);

  // Remove iOS header search bar
  useLayoutEffect(() => {
    if (Platform.OS === 'ios') {
      navigation.setOptions({
        headerSearchBarOptions: undefined,
      });
    }
  }, [navigation]);


  // Optimized verse fetcher
  const fetchUserVerses = useCallback(async () => {
    setLoading(true);
    
    if (!user.username) {
      setVersesInProgress([]);
      setVersesMemorized([]);
      setVersesNotStarted([]);
      setVersesOverdue([]);
      setLoading(false);
      return;
    }

    try {
      const [memorized, inProgress, notStarted, overdue] = await Promise.all([
        getUnpopulatedMemorizedUserVerses(user.username),
        getUserVersesInProgress(user.username),
        getUserVersesNotStarted(user.username),
        getOverdueVerses(user.username)
      ]);

      // Only filter if collections exist
      if (validCollectionIds.size > 0) {
        const filterByCollection = (items: UserVerse[]) =>
          items.filter(item =>
            (item.collectionId === undefined || item.collectionId === null) ||
            (item.collectionId !== undefined && item.collectionId !== null && validCollectionIds.has(item.collectionId))
          );
        
        setVersesMemorized(filterByCollection(memorized));
        setVersesInProgress(filterByCollection(inProgress));
        setVersesNotStarted(filterByCollection(notStarted));
        setVersesOverdue(filterByCollection(overdue));
      } else {
        setVersesMemorized(memorized);
        setVersesInProgress(inProgress);
        setVersesNotStarted(notStarted);
        setVersesOverdue(overdue);
      }
    } catch (error) {
      console.error('Failed to fetch user verses:', error);
      setVersesInProgress([]);
      setVersesMemorized([]);
      setVersesNotStarted([]);
      setVersesOverdue([]);
    } finally {
      setLoading(false);
    }
  }, [user.username, validCollectionIds]);

  useEffect(() => {
    fetchUserVerses();
  }, [fetchUserVerses]);

  useFocusEffect(
    useCallback(() => {
      if (shouldReloadPracticeList) {
        fetchUserVerses().finally(() => setShouldReloadPracticeList(false));
      }
    }, [fetchUserVerses, shouldReloadPracticeList, setShouldReloadPracticeList])
  );

  // Memoized handlers
  const handlePractice = useCallback(async (userVerse: UserVerse) => {
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
        };
        const result = await getUserVersesPopulated(collection);
        
        if (!result.userVerses.at(0)?.verses || result.userVerses.at(0)?.verses.length === 0) {
          try {
            const searchData = await getVerseSearchResult(userVerse.readableReference);
            if (searchData.verses && searchData.verses.length > 0) {
              const verseToPractice = { ...userVerse, verses: searchData.verses };
              setSelectedUserVerse(verseToPractice);
              setPracticeModeModalVisible(true);
              return;
            }
          } catch (e) {
            console.error('Failed to load verse text:', e);
          }
          alert('Error: Could not load verse text for ' + userVerse.readableReference);
          return;
        }
        
        const populatedVerse = result.userVerses.at(0);
        if (populatedVerse) {
          setSelectedUserVerse(populatedVerse);
          setPracticeModeModalVisible(true);
        }
      } else {
        setSelectedUserVerse(userVerse);
        setPracticeModeModalVisible(true);
      }
    } catch (error) {
      alert('Error: ' + (error as Error).message);
    }
  }, []);

  const handleLearnMode = useCallback(async () => {
    if (!selectedUserVerse) return;
    
    useAppStore.getState().setEditingUserVerse(selectedUserVerse);
    router.push('/practiceSession');
  }, [selectedUserVerse]);

  const formatDate = useCallback((date: Date | null): string => {
    if (!date) return 'Not practiced';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const practiceDate = new Date(date);
    practiceDate.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((practiceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `Overdue ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago`;
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    
    const month = practiceDate.toLocaleString('default', { month: 'short' });
    const day = practiceDate.getDate();
    const year = practiceDate.getFullYear();
    
    return year !== today.getFullYear() ? `Due ${month} ${day}, ${year}` : `Due ${month} ${day}`;
  }, []);

  // Memoized filtered verses
  const filterVerses = useCallback((verses: UserVerse[], query: string) => {
    if (!query.trim()) return verses;
    const searchQuery = query.trim().toLowerCase();
    return verses.filter(verse => 
      verse.readableReference?.toLowerCase().includes(searchQuery) ||
      verse.verses?.some(v => v.text?.toLowerCase().includes(searchQuery))
    );
  }, []);

  const filteredOverdue = useMemo(() => filterVerses(versesOverdue, searchQuery), [versesOverdue, searchQuery, filterVerses]);
  const filteredInProgress = useMemo(() => filterVerses(versesInProgress, searchQuery), [versesInProgress, searchQuery, filterVerses]);
  const filteredNotStarted = useMemo(() => filterVerses(versesNotStarted, searchQuery), [versesNotStarted, searchQuery, filterVerses]);
  const filteredMemorized = useMemo(() => filterVerses(versesMemorized, searchQuery), [versesMemorized, searchQuery, filterVerses]);

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
        {/* Search input */}
        <View
          style={{
            width: '100%',
            marginBottom: 20,
            paddingHorizontal: 0,
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
              {filteredOverdue.length > 0 && (
                <View style={{ width: '100%', marginBottom: 20 }}>
                  <Text style={{ ...styles.subheading, marginBottom: 12 }}>
                    Overdue ({filteredOverdue.length})
                  </Text>
                  {filteredOverdue.map((userVerse, index) => (
                    <VerseItem
                      key={userVerse.id || `overdue-${index}`}
                      verse={userVerse}
                      onPress={handlePractice}
                      theme={theme}
                      styles={styles}
                      formatDate={formatDate}
                      collections={collections}
                    />
                  ))}
                </View>
              )}

              {filteredMemorized.length > 0 && (
                <View style={{ width: '100%', marginBottom: 20 }}>
                  <Text style={{ ...styles.subheading, marginBottom: 12 }}>
                    Memorized ({filteredMemorized.length}{searchQuery.trim() ? ` of ${versesMemorized.length}` : ''})
                  </Text>
                  {filteredMemorized.map((userVerse, index) => (
                    <VerseItem
                      key={userVerse.id || `memorized-${index}`}
                      verse={userVerse}
                      onPress={handlePractice}
                      theme={theme}
                      styles={styles}
                      formatDate={formatDate}
                      collections={collections}
                    />
                  ))}
                </View>
              )}

              {filteredNotStarted.length > 0 && (
                <View style={{ width: '100%', marginBottom: 20 }}>
                  <Text style={{ ...styles.subheading, marginBottom: 12 }}>
                    Not Started ({filteredNotStarted.length})
                  </Text>
                  {filteredNotStarted.map((userVerse, index) => (
                    <VerseItem
                      key={userVerse.id || `notstarted-${index}`}
                      verse={userVerse}
                      onPress={handlePractice}
                      theme={theme}
                      styles={styles}
                      formatDate={formatDate}
                      collections={collections}
                    />
                  ))}
                </View>
              )}

              {filteredInProgress.length > 0 && (
                <View style={{ width: '100%', marginBottom: 20 }}>
                  <Text style={{ ...styles.subheading, marginBottom: 12 }}>
                    In Progress ({filteredInProgress.length})
                  </Text>
                  {filteredInProgress.map((userVerse, index) => (
                    <VerseItem
                      key={userVerse.id || `inprogress-${index}`}
                      verse={userVerse}
                      onPress={handlePractice}
                      theme={theme}
                      styles={styles}
                      formatDate={formatDate}
                      collections={collections}
                    />
                  ))}
                </View>
              )}

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
      </ScrollView>
      
      <PracticeModeModal
        visible={practiceModeModalVisible}
        onClose={() => {
          setPracticeModeModalVisible(false);
        }}
        onSelectLearn={handleLearnMode}
      />
    </SafeAreaView>
  );
}