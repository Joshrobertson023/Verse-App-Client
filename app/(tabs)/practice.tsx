import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { VerseItemSkeleton } from '../components/skeleton';
import { getOverdueVerses, getRecentPractice, getUnpopulatedMemorizedUserVerses, getUserVersesInProgress, getUserVersesNotStarted, getUserVersesPopulated, getVerseSearchResult } from '../db';
import { Collection, UserVerse, useAppStore } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

const baseUrl = 'http://10.169.51.121:5160';

export default function PracticeScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const user = useAppStore((state) => state.user);
  const collections = useAppStore((state) => state.collections);
  const shouldReloadPracticeList = useAppStore((state) => state.shouldReloadPracticeList);
  const setShouldReloadPracticeList = useAppStore((state) => state.setShouldReloadPracticeList);
  const [versesInProgress, setVersesInProgress] = useState<UserVerse[]>([]);
  const [versesMemorized, setVersesMemorized] = useState<UserVerse[]>([]);
  const [versesNotStarted, setVersesNotStarted] = useState<UserVerse[]>([]);
  const [versesOverdue, setVersesOverdue] = useState<UserVerse[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentPractice, setRecentPractice] = useState<UserVerse[]>([]);
  const [recentPracticeLoaded, setRecentPracticeLoaded] = useState(false);
  
  // Accordion state for memorized, not started, and overdue sections
  const memorizedExpanded = useSharedValue(true);
  const notStartedExpanded = useSharedValue(true);
  const overdueExpanded = useSharedValue(true);
  const memorizedHeight = useSharedValue(0);
  const notStartedHeight = useSharedValue(0);
  const overdueHeight = useSharedValue(0);

  const fetchUserVerses = useCallback(async () => {
    try {
      setLoading(true);
      if (!user.username) {
        setVersesInProgress([]);
        setLoading(false);
        return;
      }
      const validCollectionIds = new Set(
        collections
          .map((collection) => collection.collectionId)
          .filter((id): id is number => id !== undefined && id !== null)
      );
      const filterByCollection = (items: UserVerse[]) =>
        items.filter(
          (item) =>
            item.collectionId !== undefined &&
            item.collectionId !== null &&
            validCollectionIds.has(item.collectionId)
        );
      const [memorized, inProgress, notStarted, overdue] = await Promise.all([
        getUnpopulatedMemorizedUserVerses(user.username),
        getUserVersesInProgress(user.username),
        getUserVersesNotStarted(user.username),
        getOverdueVerses(user.username)
      ]);
      setVersesMemorized(filterByCollection(memorized));
      setVersesInProgress(filterByCollection(inProgress));
      setVersesNotStarted(filterByCollection(notStarted));
      setVersesOverdue(filterByCollection(overdue));
    } catch (error) {
      console.error('Failed to fetch user verses:', error);
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
      
      // Load Recent Practice
      if (user.username && user.username !== 'Default User') {
        (async () => {
          try {
            const recent = await getRecentPractice(user.username);
            setRecentPractice(recent || []);
            setRecentPracticeLoaded(true);
          } catch (e) {
            console.error('Failed to load recent practice', e);
            setRecentPracticeLoaded(true);
          }
        })();
      }
    }, [fetchUserVerses, shouldReloadPracticeList, user.username, useAppStore.getState().setShouldReloadPracticeList])
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


  const formatDate = (date: Date | null): string => {
    if (!date) return 'Not practiced';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const practiceDate = new Date(date);
    practiceDate.setHours(0, 0, 0, 0);
    
    const diffTime = practiceDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'}`;
    } else if (diffDays === 0) {
      return 'Due today';
    } else if (diffDays === 1) {
      return 'Due tomorrow';
    } else {
      const month = practiceDate.toLocaleString('default', { month: 'short' });
      const day = practiceDate.getDate();
      return `Due ${month} ${day}`;
    }
  };

  // Animated styles for accordion
  const memorizedAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: memorizedExpanded.value ? withTiming(memorizedHeight.value, { duration: 300 }) : withTiming(0, { duration: 300 }),
      overflow: 'hidden',
    };
  });

  const notStartedAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: notStartedExpanded.value ? withTiming(notStartedHeight.value, { duration: 300 }) : withTiming(0, { duration: 300 }),
      overflow: 'hidden',
    };
  });

  const memorizedChevronStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: withTiming(memorizedExpanded.value ? '180deg' : '0deg', { duration: 300 }) }],
    };
  });

  const notStartedChevronStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: withTiming(notStartedExpanded.value ? '180deg' : '0deg', { duration: 300 }) }],
    };
  });

  const overdueAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: overdueExpanded.value ? withTiming(overdueHeight.value, { duration: 300 }) : withTiming(0, { duration: 300 }),
      overflow: 'hidden',
    };
  });

  const overdueChevronStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: withTiming(overdueExpanded.value ? '180deg' : '0deg', { duration: 300 }) }],
    };
  });

  const renderVerseItem = (userVerse: UserVerse, index: number, section: string) => {
    const nextPracticeDate = userVerse.nextPracticeDate ? new Date(userVerse.nextPracticeDate) : null;
    
    return (
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
              <View style={{ flexDirection: 'column', gap: 4, marginTop: 5 }}>
                <Text style={{ ...styles.tinyText, color: theme.colors.primary }}>
                  {userVerse.timesMemorized || 0} time{(userVerse.timesMemorized || 0) === 1 ? '' : 's'} memorized
                </Text>
                {nextPracticeDate && (
                  <Text style={{ ...styles.tinyText, color: theme.colors.onSurfaceVariant }}>
                    {formatDate(nextPracticeDate)}
                  </Text>
                )}
              </View>
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
  };

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
          versesMemorized.length === 0 && versesInProgress.length === 0 && versesNotStarted.length === 0 && versesOverdue.length === 0 && (!recentPracticeLoaded || recentPractice.length === 0) ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 100, width: '100%' }}>
              <Ionicons name="book-outline" size={80} color={theme.colors.onSurface} />
              <Text style={{ ...styles.text, fontSize: 20, fontWeight: '600', marginTop: 20, textAlign: 'center' }}>
                No Saved Passages Yet
              </Text>
            </View>
          ) : (
            <View style={{ width: '100%' }}>
              {/* Recent Practice Section */}
              {recentPracticeLoaded && (
                <View style={{ width: '100%', marginBottom: 30, marginTop: 5, borderRadius: 20 }}>
                  <Text style={{ ...styles.text, fontFamily: 'Inter bold', marginBottom: 5, backgroundColor: theme.colors.background, zIndex: 9999 }}>Recent Practice</Text>
                  {recentPractice.length > 0 ? (
                    <View style={{ flexDirection: 'row', position: 'relative' }}>
                      <View style={{ flex: 1, marginLeft: 20 }}>
                        {recentPractice.map((uv, index) => (
                          <View key={uv.id || index} style={{ 
                            flexDirection: 'row', 
                            alignItems: 'center', 
                            justifyContent: 'space-between',
                            position: 'relative'
                          }}>
                            <View style={{
                              position: 'absolute',
                              left: -10,
                              top: 0,
                              width: 4,
                              height: 34,
                              borderRadius: 9999,
                              backgroundColor: theme.colors.onBackground
                            }}/>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 10, height: 30, marginTop: 0 }}>
                              <Text style={{ fontFamily: 'Inter', fontSize: 16, color: theme.colors.onBackground, marginRight: 12 }}>
                                {uv.readableReference}
                              </Text>
                              <Text style={{ fontFamily: 'Inter', fontSize: 14, color: theme.colors.onSurfaceVariant }}>
                                {uv.timesMemorized || 0}x memorized
                              </Text>
                            </View>
                            <TouchableOpacity 
                              activeOpacity={0.1}
                              onPress={async () => {
                                try {
                                  // Populate verses if not already populated
                                  let verseToPractice = uv;
                                  if (!verseToPractice.verses || verseToPractice.verses.length === 0) {
                                    const searchData = await getVerseSearchResult(uv.readableReference);
                                    verseToPractice = { ...uv, verses: searchData.verses || [] };
                                  }
                                  const setEditingUserVerse = useAppStore.getState().setEditingUserVerse;
                                  setEditingUserVerse(verseToPractice);
                                  router.push('/practiceSession');
                                } catch (e) {
                                  console.error('Failed to load verse for practice', e);
                                  alert('Failed to load verse');
                                }
                              }}
                            >
                              <Text style={{ ...styles.tinyText, fontSize: 12, textDecorationLine: 'underline', opacity: 0.8}}>
                                Learn again
                              </Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', position: 'relative', marginTop: 5 }}>
                      {/* L shape for empty state */}
                      <View style={{ marginLeft: 20, alignItems: 'flex-start' }}>
                        <View style={{
                          position: 'absolute',
                          left: -10,
                          top: 0,
                          width: 4,
                          height: 30,
                          borderRadius: 9999,
                          backgroundColor: theme.colors.onBackground
                        }}/>
                      </View>
                      <View style={{ flex: 1, alignItems: 'flex-start', marginLeft: 10, marginTop: 5 }}>
                        <Text style={{ 
                          fontFamily: 'Inter', 
                          fontSize: 14, 
                          color: theme.colors.onBackground,
                        }}>
                          No passages practiced
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
              {/* Overdue Section */}
              {versesOverdue.length > 0 && (
                <View style={{ width: '100%', marginBottom: 30 }}>
                  <TouchableOpacity
                    onPress={() => {
                      overdueExpanded.value = !overdueExpanded.value;
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}
                  >
                    <Text style={{ ...styles.subheading }}>
                      Overdue ({versesOverdue.length})
                    </Text>
                    <Animated.View style={overdueChevronStyle}>
                      <Ionicons name="chevron-down" size={20} color={theme.colors.onBackground} />
                    </Animated.View>
                  </TouchableOpacity>
                  <Animated.View style={overdueAnimatedStyle}>
                    <View
                      onLayout={(event) => {
                        overdueHeight.value = event.nativeEvent.layout.height;
                      }}
                    >
                      {versesOverdue.map((userVerse, index) => renderVerseItem(userVerse, index, 'overdue'))}
                    </View>
                  </Animated.View>
                </View>
              )}

              {/* Memorized Section */}
              {versesMemorized.length > 0 && (
                <View style={{ width: '100%', marginBottom: 30 }}>
                  <TouchableOpacity
                    onPress={() => {
                      memorizedExpanded.value = !memorizedExpanded.value;
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}
                  >
                    <Text style={{ ...styles.subheading }}>
                      Memorized ({versesMemorized.length})
                    </Text>
                    <Animated.View style={memorizedChevronStyle}>
                      <Ionicons name="chevron-down" size={20} color={theme.colors.onBackground} />
                    </Animated.View>
                  </TouchableOpacity>
                  <Animated.View style={memorizedAnimatedStyle}>
                    <View
                      onLayout={(event) => {
                        memorizedHeight.value = event.nativeEvent.layout.height;
                      }}
                    >
                      {versesMemorized.map((userVerse, index) => renderVerseItem(userVerse, index, 'memorized'))}
                    </View>
                  </Animated.View>
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
                  <TouchableOpacity
                    onPress={() => {
                      notStartedExpanded.value = !notStartedExpanded.value;
                    }}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 }}
                  >
                    <Text style={{ ...styles.subheading }}>
                      Not Started ({versesNotStarted.length})
                    </Text>
                    <Animated.View style={notStartedChevronStyle}>
                      <Ionicons name="chevron-down" size={20} color={theme.colors.onBackground} />
                    </Animated.View>
                  </TouchableOpacity>
                  <Animated.View style={notStartedAnimatedStyle}>
                    <View
                      onLayout={(event) => {
                        notStartedHeight.value = event.nativeEvent.layout.height;
                      }}
                    >
                      {versesNotStarted.map((userVerse, index) => renderVerseItem(userVerse, index, 'notStarted'))}
                    </View>
                  </Animated.View>
                </View>
              )}
            </View>
          )
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
