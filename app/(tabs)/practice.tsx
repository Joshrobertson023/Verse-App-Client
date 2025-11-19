import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Searchbar } from 'react-native-paper';
import Animated, {
  Extrapolate,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VerseItemSkeleton } from '../components/skeleton';
import { getOverdueVerses, getUnpopulatedMemorizedUserVerses, getUserActivity, getUserVersesInProgress, getUserVersesNotStarted, getUserVersesPopulated, getVerseSearchResult } from '../db';
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
              <Text style={{ ...styles.tinyText, fontSize: 13, color: theme.colors.primary }}>
                {verse.timesMemorized || 0}x memorized
              </Text>
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
          <View style={{ alignItems: 'flex-end', marginLeft: 10 }}>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.onSurfaceVariant} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

// Pre-computed dot styles for better performance
const DOT_STYLES = {
  green: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#4CAF50', marginHorizontal: 1 },
  orange: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FF6B35', marginHorizontal: 1 },
};

// Memoized Dots component to prevent re-renders
const Dots = React.memo(({ count, color }: { count: number; color: 'green' | 'orange' }) => {
  const actualCount = Math.min(count, 7);
  const style = color === 'green' ? DOT_STYLES.green : DOT_STYLES.orange;
  
  return (
    <>
      {Array.from({ length: actualCount }, (_, i) => (
        <View key={i} style={style} />
      ))}
    </>
  );
});

const CalendarDay = React.memo(({ 
  day, 
  dateKey,
  practiceCount,
  isToday, 
  isSelected,
  overdueCount, 
  memorizedCount,
  onPress,
  theme 
}: any) => {
  if (day === null) {
    return <View style={{ width: '14.28%', aspectRatio: 1, padding: 2 }} />;
  }

  const handlePress = useCallback(() => onPress(day, dateKey), [day, dateKey, onPress]);
  const hasActivity = overdueCount > 0 || memorizedCount > 0 || practiceCount > 0;

  return (
    <View style={{ width: '14.28%', aspectRatio: 1, padding: 2 }}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handlePress}
        style={{ width: '100%', height: '100%' }}
      >
        <View style={{
          width: '100%',
          height: '100%',
          borderRadius: 8,
          backgroundColor: isToday ? theme.colors.surface : 
                           isSelected ? theme.colors.primaryContainer : 
                           'transparent',
          borderWidth: isToday ? 2 : isSelected ? 2 : 0,
          borderColor: isSelected ? theme.colors.primary : theme.colors.primary,
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          shadowColor: isSelected ? theme.colors.primary : 'transparent',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isSelected ? 0.3 : 0,
          shadowRadius: 4,
          elevation: isSelected ? 4 : 0,
        }}>
          {practiceCount > 0 && (
            <View style={{
              position: 'absolute',
              top: 2,
              left: 2,
              right: 2,
              flexDirection: 'row',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}>
              <Dots count={practiceCount} color="green" />
            </View>
          )}

          <Text style={{
            fontSize: 14,
            fontWeight: isSelected ? '600' : '400',
            color: theme.colors.onBackground,
            fontFamily: 'Inter'
          }}>
            {day}
          </Text>

          {overdueCount > 0 && (
            <View style={{
              position: 'absolute',
              bottom: 2,
              left: 2,
              right: 2,
              flexDirection: 'row',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}>
              <Dots count={overdueCount} color="orange" />
            </View>
          )}
          
          {/* Subtle indicator for tap affordance */}
          {hasActivity && !isSelected && (
            <View style={{
              position: 'absolute',
              top: -2,
              right: -2,
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: theme.colors.primary,
              opacity: 0.6,
            }} />
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return prevProps.day === nextProps.day &&
         prevProps.dateKey === nextProps.dateKey &&
         prevProps.practiceCount === nextProps.practiceCount &&
         prevProps.isToday === nextProps.isToday &&
         prevProps.isSelected === nextProps.isSelected &&
         prevProps.overdueCount === nextProps.overdueCount &&
         prevProps.memorizedCount === nextProps.memorizedCount;
});

export default function PracticeScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const navigation = useNavigation();
  const user = useAppStore((state) => state.user);
  const collections = useAppStore((state) => state.collections);
  const shouldReloadPracticeList = useAppStore((state) => state.shouldReloadPracticeList);
  const setShouldReloadPracticeList = useAppStore((state) => state.setShouldReloadPracticeList);
  
  // Main verse data states
  const [versesInProgress, setVersesInProgress] = useState<UserVerse[]>([]);
  const [versesMemorized, setVersesMemorized] = useState<UserVerse[]>([]);
  const [versesNotStarted, setVersesNotStarted] = useState<UserVerse[]>([]);
  const [versesOverdue, setVersesOverdue] = useState<UserVerse[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search and UI states
  const [searchQuery, setSearchQuery] = useState('');
  
  // Calendar states
  const [practiceDates, setPracticeDates] = useState<Set<string>>(new Set());
  const [practiceCountsByDate, setPracticeCountsByDate] = useState<Map<string, number>>(new Map());
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [totalPractices, setTotalPractices] = useState(0);
  const [months, setMonths] = useState<Date[]>([]);
  const [screenWidth, setScreenWidth] = useState(0);
  const [overdueCountsByDate, setOverdueCountsByDate] = useState<Map<string, number>>(new Map());
  const [memorizedCountsByDate, setMemorizedCountsByDate] = useState<Map<string, number>>(new Map());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDateVerses, setSelectedDateVerses] = useState<{ overdue: UserVerse[], memorized: UserVerse[] }>({ overdue: [], memorized: [] });
  const [loadingSelectedDate, setLoadingSelectedDate] = useState(false);
  const expandAnimation = useSharedValue(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showContent, setShowContent] = useState(false);
  
  // Animated styles for expansion
  const expandedContainerStyle = useAnimatedStyle(() => {
    return {
      maxHeight: interpolate(
        expandAnimation.value,
        [0, 1],
        [0, 700],
        Extrapolate.CLAMP
      ),
      overflow: 'hidden',
      marginTop: 16,
    };
  });

  const expandedContentStyle = useAnimatedStyle(() => {
    return {
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outline,
      opacity: interpolate(
        expandAnimation.value,
        [0, 0.3, 1],
        [0, 0, 1],
        Extrapolate.CLAMP
      ),
      transform: [{
        translateY: interpolate(
          expandAnimation.value,
          [0, 1],
          [-30, 0],
          Extrapolate.CLAMP
        ),
      }],
    };
  });

  // Refs
  const scrollViewRef = useRef<ScrollView>(null);
  const monthWidth = useRef(0);
  const [snapInterval, setSnapInterval] = useState<number | undefined>(undefined);

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

  // Generate months list once
  useEffect(() => {
    const today = new Date();
    const monthsList: Date[] = [];
    
    for (let i = 24; i >= 0; i--) {
      monthsList.push(new Date(today.getFullYear(), today.getMonth() - i, 1));
    }
    
    for (let i = 1; i <= 12; i++) {
      monthsList.push(new Date(today.getFullYear(), today.getMonth() + i, 1));
    }
    
    setMonths(monthsList);
  }, []);

  // Optimized practice history loader - counts verses practiced per day
  const loadPracticeHistory = useCallback(async () => {
    if (!user.username) {
      setPracticeDates(new Set());
      setPracticeCountsByDate(new Map());
      setTotalPractices(0);
      return;
    }
    
    try {
      // Get activity data to count verses memorized per day
      const activity = await getUserActivity(user.username, 1000);
      const practiceCounts = new Map<string, number>();
      const dateSet = new Set<string>();

      activity.forEach(act => {
        if (act.text && act.text.toLowerCase().includes('memorized') && act.dateCreated) {
          const actDate = new Date(act.dateCreated);
          const dateKey = `${actDate.getFullYear()}-${String(actDate.getMonth() + 1).padStart(2, '0')}-${String(actDate.getDate()).padStart(2, '0')}`;
          practiceCounts.set(dateKey, (practiceCounts.get(dateKey) || 0) + 1);
          dateSet.add(dateKey);
        }
      });

      setPracticeDates(dateSet);
      setPracticeCountsByDate(practiceCounts);
      setTotalPractices(dateSet.size);
    } catch (error) {
      console.error('Failed to load practice history:', error);
      setPracticeDates(new Set());
      setPracticeCountsByDate(new Map());
      setTotalPractices(0);
    }
  }, [user.username]);

  // Optimized month counts loader
  const loadMonthCounts = useCallback(async (month: Date) => {
    if (!user.username) return;

    // Clear immediately for instant UI update
    setOverdueCountsByDate(new Map());
    setMemorizedCountsByDate(new Map());

    // Fetch in background
    try {
      const [overdue, activity] = await Promise.all([
        getOverdueVerses(user.username),
        getUserActivity(user.username, 1000)
      ]);

      const overdueCounts = new Map<string, number>();
      const memorizedCounts = new Map<string, number>();

      // Process overdue counts
      overdue.forEach(verse => {
        if (verse.nextPracticeDate) {
          const practiceDate = new Date(verse.nextPracticeDate);
          if (practiceDate.getFullYear() === month.getFullYear() && 
              practiceDate.getMonth() === month.getMonth()) {
            const dateKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(practiceDate.getDate()).padStart(2, '0')}`;
            overdueCounts.set(dateKey, (overdueCounts.get(dateKey) || 0) + 1);
          }
        }
      });

      // Process memorized counts from activity
      activity.forEach(act => {
        if (act.text && act.text.toLowerCase().includes('memorized') && act.dateCreated) {
          const actDate = new Date(act.dateCreated);
          if (actDate.getFullYear() === month.getFullYear() && 
              actDate.getMonth() === month.getMonth()) {
            const dateKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(actDate.getDate()).padStart(2, '0')}`;
            memorizedCounts.set(dateKey, (memorizedCounts.get(dateKey) || 0) + 1);
          }
        }
      });

      setOverdueCountsByDate(overdueCounts);
      setMemorizedCountsByDate(memorizedCounts);
    } catch (error) {
      console.error('Failed to load month counts:', error);
    }
  }, [user.username]);

  // Optimized selected date verses loader
  const loadSelectedDateVerses = useCallback(async (dateKey: string) => {
    if (!user.username) return;

    setLoadingSelectedDate(true);
    setSelectedDateVerses({ overdue: [], memorized: [] });

    try {
      const [year, month, day] = dateKey.split('-').map(Number);
      const targetDateStr = new Date(year, month - 1, day).toISOString().split('T')[0];

      const [overdue, activity, memorized] = await Promise.all([
        getOverdueVerses(user.username),
        getUserActivity(user.username, 100),
        getUnpopulatedMemorizedUserVerses(user.username)
      ]);

      const overdueForDate = overdue.filter(verse => {
        if (!verse.nextPracticeDate) return false;
        return new Date(verse.nextPracticeDate).toISOString().split('T')[0] === targetDateStr;
      });

      const verseMap = new Map<number, UserVerse>();
      memorized.forEach(verse => {
        if (verse.id) verseMap.set(verse.id, verse);
      });

      const memorizedForDate: UserVerse[] = [];
      activity.forEach(act => {
        if (act.text && act.text.toLowerCase().includes('memorized') && act.dateCreated) {
          const actDateStr = new Date(act.dateCreated).toISOString().split('T')[0];
          if (actDateStr === targetDateStr) {
            memorizedForDate.push({
              username: user.username,
              readableReference: act.text.replace('memorized', '').trim() || 'Memorized verse',
              verses: [],
            } as UserVerse);
          }
        }
      });

      setSelectedDateVerses({ overdue: overdueForDate, memorized: memorizedForDate });
    } catch (error) {
      console.error('Failed to load selected date verses:', error);
    } finally {
      setLoadingSelectedDate(false);
    }
  }, [user.username]);

  // Effects
  useEffect(() => {
    loadPracticeHistory();
  }, [loadPracticeHistory]);

  useEffect(() => {
    if (user.username && selectedMonth) {
      loadMonthCounts(selectedMonth);
    }
  }, [user.username, selectedMonth, loadMonthCounts]);

  useEffect(() => {
    if (user.username && selectedDate) {
      loadSelectedDateVerses(selectedDate);
    } else {
      setSelectedDateVerses({ overdue: [], memorized: [] });
    }
  }, [user.username, selectedDate, loadSelectedDateVerses]);


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
              useAppStore.getState().setEditingUserVerse(verseToPractice);
              router.push('/practiceSession');
              return;
            }
          } catch (e) {
            console.error('Failed to load verse text:', e);
          }
          alert('Error: Could not load verse text for ' + userVerse.readableReference);
          return;
        }
        
        useAppStore.getState().setEditingUserVerse(result.userVerses.at(0));
        router.push('/practiceSession');
      } else {
        useAppStore.getState().setEditingUserVerse(userVerse);
        router.push('/practiceSession');
      }
    } catch (error) {
      alert('Error: ' + (error as Error).message);
    }
  }, []);

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

  // Calendar helpers
  const getDaysInMonth = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  }, []);

  const formatDateKey = useCallback((day: number, month: Date) => {
    return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }, []);

  const handleDatePress = useCallback((day: number, dateKey: string) => {
    const newSelectedDate = selectedDate === dateKey ? null : dateKey;
    const willExpand = newSelectedDate !== null;
    
    if (willExpand) {
      // Expanding: Set state and start animation
      setSelectedDate(newSelectedDate);
      setIsExpanded(true);
      setShowContent(false);
      
      expandAnimation.value = withSpring(1, {
        damping: 18,
        stiffness: 120,
        mass: 0.8,
      }, (finished) => {
        'worklet';
        if (finished) {
          runOnJS(setShowContent)(true);
        }
      });
    } else {
      // Collapsing: Hide content, animate, then clear state
      setShowContent(false);
      
      expandAnimation.value = withSpring(0, {
        damping: 18,
        stiffness: 120,
        mass: 0.8,
      }, (finished) => {
        'worklet';
        if (finished) {
          runOnJS(setSelectedDate)(null);
          runOnJS(setIsExpanded)(false);
        }
      });
    }
  }, [selectedDate, expandAnimation]);

  // Calendar navigation
  const goToPreviousMonth = useCallback(() => {
    const currentIndex = months.findIndex(m => 
      m.getFullYear() === selectedMonth.getFullYear() && m.getMonth() === selectedMonth.getMonth()
    );
    if (currentIndex > 0) {
      setSelectedDate(null);
      scrollViewRef.current?.scrollTo({ x: (currentIndex - 1) * monthWidth.current, animated: true });
      setSelectedMonth(months[currentIndex - 1]);
    }
  }, [months, selectedMonth]);

  const goToNextMonth = useCallback(() => {
    const currentIndex = months.findIndex(m => 
      m.getFullYear() === selectedMonth.getFullYear() && m.getMonth() === selectedMonth.getMonth()
    );
    if (currentIndex >= 0 && currentIndex < months.length - 1) {
      const nextMonth = months[currentIndex + 1];
      const now = new Date();
      if (nextMonth <= now || (nextMonth.getMonth() === now.getMonth() && nextMonth.getFullYear() === now.getFullYear())) {
        setSelectedDate(null);
        scrollViewRef.current?.scrollTo({ x: (currentIndex + 1) * monthWidth.current, animated: true });
        setSelectedMonth(nextMonth);
      }
    }
  }, [months, selectedMonth]);

  // Scroll to current month on mount
  useEffect(() => {
    if (months.length > 0 && screenWidth > 0 && scrollViewRef.current) {
      const today = new Date();
      const currentMonthIndex = months.findIndex(m => 
        m.getFullYear() === today.getFullYear() && m.getMonth() === today.getMonth()
      );
      if (currentMonthIndex >= 0) {
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ x: currentMonthIndex * screenWidth, animated: false });
          setSelectedMonth(months[currentMonthIndex]);
        }, 100);
      }
    }
  }, [months, screenWidth]);

  const handleScroll = useCallback((event: any) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const monthIndex = Math.round(scrollX / monthWidth.current);
    if (monthIndex >= 0 && monthIndex < months.length) {
      const newMonth = months[monthIndex];
      if (newMonth.getFullYear() !== selectedMonth.getFullYear() || newMonth.getMonth() !== selectedMonth.getMonth()) {
        setSelectedDate(null);
        setSelectedMonth(newMonth);
      }
    }
  }, [months, selectedMonth]);

  // Render calendar grid with optimized data preparation
  const renderCalendarGrid = useCallback((monthDate: Date) => {
    const monthDays = getDaysInMonth(monthDate);
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();
    const monthYear = monthDate.getFullYear();
    const monthMonth = monthDate.getMonth();

    // Pre-compute all day data to avoid recalculation in render
    const dayData = monthDays.map((day, index) => {
      if (day === null) {
        return { day: null, index };
      }

      const dateKey = formatDateKey(day, monthDate);
      // Use memorizedCountsByDate for practiceCount since it tracks verses practiced (memorized) per day
      const practiceCount = memorizedCountsByDate.get(dateKey) || 0;
      return {
        day,
        index,
        dateKey,
        practiceCount,
        isToday: monthYear === todayYear && monthMonth === todayMonth && day === todayDate,
        isSelected: dateKey === selectedDate,
        overdueCount: overdueCountsByDate.get(dateKey) || 0,
        memorizedCount: memorizedCountsByDate.get(dateKey) || 0,
      };
    });

    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: '100%' }}>
        {dayData.map((data) => (
          <CalendarDay
            key={data.index}
            day={data.day}
            dateKey={data.dateKey}
            practiceCount={data.practiceCount}
            isToday={data.isToday}
            isSelected={data.isSelected}
            overdueCount={data.overdueCount}
            memorizedCount={data.memorizedCount}
            onPress={handleDatePress}
            theme={theme}
          />
        ))}
      </View>
    );
  }, [getDaysInMonth, formatDateKey, selectedDate, overdueCountsByDate, memorizedCountsByDate, handleDatePress, theme]);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['top']}>
      <Animated.ScrollView
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
        {/* Calendar */}
        <View
          style={{ width: '100%', marginBottom: 16 }}
        >
          <View 
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 16,
              padding: 16
            }}
            onLayout={(event) => {
              const width = event.nativeEvent.layout.width;
              if (width > 0) {
                setScreenWidth(width);
                monthWidth.current = width;
                setSnapInterval(width);
              }
            }}
          >
            {/* Month Navigation */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 16
            }}>
              <TouchableOpacity onPress={goToPreviousMonth}>
                <Ionicons name="chevron-back" size={24} color={theme.colors.onBackground} />
              </TouchableOpacity>
              
              <Text style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: theme.colors.onBackground,
                fontFamily: 'Inter'
              }}>
                {monthNames[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
              </Text>
              
              <TouchableOpacity 
                onPress={goToNextMonth}
                disabled={new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1) > new Date()}
              >
                <Ionicons 
                  name="chevron-forward" 
                  size={24} 
                  color={new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1) > new Date() ? theme.colors.onSurfaceVariant : theme.colors.onBackground} 
                />
              </TouchableOpacity>
            </View>

            {/* Day Headers */}
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              {dayNames.map(day => (
                <View key={day} style={{ flex: 1, alignItems: 'center' }}>
                  <Text style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: theme.colors.onSurfaceVariant,
                    fontFamily: 'Inter'
                  }}>
                    {day}
                  </Text>
                </View>
              ))}
            </View>

            {/* Calendar Grid Container with horizontal ScrollView */}
            {screenWidth > 0 && months.length > 0 && (
              <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled={false}
                snapToInterval={snapInterval}
                snapToAlignment="start"
                decelerationRate="fast"
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                onMomentumScrollEnd={(event) => {
                  const scrollX = event.nativeEvent.contentOffset.x;
                  if (monthWidth.current > 0) {
                    const monthIndex = Math.round(scrollX / monthWidth.current);
                    if (monthIndex >= 0 && monthIndex < months.length) {
                      setSelectedMonth(months[monthIndex]);
                    }
                  }
                }}
                style={{ width: screenWidth }}
                contentContainerStyle={{ paddingHorizontal: 0 }}
              >
                {months.map((month, index) => (
                  <View
                    key={`${month.getFullYear()}-${month.getMonth()}`}
                    style={{
                      width: screenWidth,
                      paddingHorizontal: 0,
                    }}
                  >
                    {renderCalendarGrid(month)}
                  </View>
                ))}
              </ScrollView>
            )}

            {/* Legend */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-around',
              alignItems: 'center',
              marginTop: 16,
              paddingHorizontal: 8,
              flexWrap: 'wrap',
              gap: 12,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{
                  flexDirection: 'row',
                  gap: 2,
                  marginRight: 6
                }}>
                  {[1, 2, 3].map(i => (
                    <View key={i} style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: '#4CAF50',
                    }} />
                  ))}
                </View>
                <Text style={{
                  fontSize: 13,
                  color: theme.colors.onSurfaceVariant,
                  fontFamily: 'Inter'
                }}>
                  Practiced
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  backgroundColor: 'transparent',
                  borderWidth: 2,
                  borderColor: theme.colors.primary,
                  marginRight: 6
                }} />
                <Text style={{
                  fontSize: 13,
                  color: theme.colors.onSurfaceVariant,
                  fontFamily: 'Inter'
                }}>
                  Today
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{
                  flexDirection: 'row',
                  gap: 2,
                  marginRight: 6
                }}>
                  {[1, 2, 3].map(i => (
                    <View key={i} style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: '#FF6B35',
                    }} />
                  ))}
                </View>
                <Text style={{
                  fontSize: 13,
                  color: theme.colors.onSurfaceVariant,
                  fontFamily: 'Inter'
                }}>
                  Overdue
                </Text>
              </View>
            </View>

            {/* Selected Date Verses List with Animation */}
            <Animated.View style={expandedContainerStyle}>
              {(selectedDate || isExpanded) && (
                <Animated.View style={expandedContentStyle}>
                  <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{
                        fontSize: 16,
                        fontWeight: '700',
                        color: theme.colors.onBackground,
                        fontFamily: 'Inter',
                      }}>
                        {selectedDate && (() => {
                          const [year, month, day] = selectedDate.split('-').map(Number);
                          const date = new Date(year, month - 1, day);
                          return date.toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          });
                        })()}
                      </Text>
                      {showContent && (
                        <Text style={{
                          fontSize: 12,
                          color: theme.colors.onSurfaceVariant,
                          fontFamily: 'Inter',
                          marginTop: 2,
                        }}>
                          {selectedDateVerses.overdue.length + selectedDateVerses.memorized.length} verse{(selectedDateVerses.overdue.length + selectedDateVerses.memorized.length) !== 1 ? 's' : ''}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity 
                      onPress={() => selectedDate && handleDatePress(0, selectedDate)}
                      style={{
                        padding: 8,
                        borderRadius: 20,
                        backgroundColor: theme.colors.surfaceVariant,
                      }}
                    >
                      <Ionicons name="close" size={20} color={theme.colors.onSurfaceVariant} />
                    </TouchableOpacity>
                  </View>

                  {!showContent ? (
                    // Show placeholder skeleton while animating
                    <View>
                      <View style={{
                        height: 20,
                        width: 120,
                        backgroundColor: theme.colors.surfaceVariant,
                        borderRadius: 6,
                        marginBottom: 12,
                        opacity: 0.5,
                      }} />
                      {[1, 2].map((i) => (
                        <View key={i} style={{
                          padding: 12,
                          borderRadius: 12,
                          backgroundColor: theme.colors.surfaceVariant,
                          marginBottom: 8,
                          height: 56,
                          opacity: 0.5,
                        }} />
                      ))}
                    </View>
                  ) : loadingSelectedDate ? (
                    // Show loading skeletons
                    <View>
                      {[1, 2].map((i) => (
                        <View key={i} style={{
                          padding: 12,
                          borderRadius: 12,
                          backgroundColor: theme.colors.surfaceVariant,
                          marginBottom: 8,
                          height: 56,
                        }} />
                      ))}
                    </View>
                  ) : (
                    <>
                      {selectedDateVerses.overdue.length > 0 && (
                        <View style={{ marginBottom: 12 }}>
                          <Text style={{ 
                            fontSize: 13,
                            fontWeight: '600',
                            color: theme.colors.onSurfaceVariant,
                            fontFamily: 'Inter',
                            marginBottom: 12,
                          }}>
                            Overdue ({selectedDateVerses.overdue.length})
                          </Text>
                          {selectedDateVerses.overdue.map((verse, index) => (
                            <View key={verse.id || `overdue-${index}`} style={{ marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start' }}>
                              <View style={{
                                marginTop: 16,
                                marginRight: 8,
                                flexDirection: 'row',
                                alignItems: 'center',
                              }}>
                                <Dots count={1} color="orange" />
                              </View>
                              <View style={{ flex: 1 }}>
                                <VerseItem
                                  verse={verse}
                                  onPress={handlePractice}
                                  theme={theme}
                                  styles={styles}
                                  formatDate={formatDate}
                                  collections={collections}
                                />
                              </View>
                            </View>
                          ))}
                        </View>
                      )}

                      {selectedDateVerses.memorized.length > 0 && (
                        <View>
                          <Text style={{ 
                            fontSize: 13,
                            fontWeight: '600',
                            color: theme.colors.onSurfaceVariant,
                            fontFamily: 'Inter',
                            marginBottom: 12,
                          }}>
                            Memorized ({selectedDateVerses.memorized.length})
                          </Text>
                          {selectedDateVerses.memorized.map((verse, index) => {
                            if (verse.readableReference === 'Memorized' && verse.verses.length === 0) {
                              return null;
                            }
                            return (
                              <View key={verse.id || `memorized-${index}`} style={{ marginBottom: 10, flexDirection: 'row', alignItems: 'flex-start' }}>
                                <View style={{
                                  marginTop: 16,
                                  marginRight: 8,
                                  flexDirection: 'row',
                                  alignItems: 'center',
                                }}>
                                  <Dots count={1} color="green" />
                                </View>
                                <View style={{ flex: 1 }}>
                                  <VerseItem
                                    verse={verse}
                                    onPress={handlePractice}
                                    theme={theme}
                                    styles={styles}
                                    formatDate={formatDate}
                                    collections={collections}
                                  />
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      )}

                      {selectedDateVerses.overdue.length === 0 && selectedDateVerses.memorized.length === 0 && (
                        <View style={{
                          padding: 24,
                          alignItems: 'center',
                        }}>
                          <Ionicons name="calendar-outline" size={48} color={theme.colors.onSurfaceVariant} style={{ opacity: 0.5 }} />
                          <Text style={{
                            fontSize: 14,
                            color: theme.colors.onSurfaceVariant,
                            fontFamily: 'Inter',
                            textAlign: 'center',
                            marginTop: 12,
                          }}>
                            No verses for this date
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </Animated.View>
              )}
            </Animated.View>
          </View>
        </View>

        {/* Search input below calendar */}
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
      </Animated.ScrollView>
    </SafeAreaView>
  );
}