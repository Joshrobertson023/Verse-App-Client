import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useState, useRef } from 'react';
import { ScrollView, Text, TouchableOpacity, View, Dimensions, Switch, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Portal } from 'react-native-paper';
import AnimatedReanimated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withRepeat, withTiming } from 'react-native-reanimated';
import { router, Stack, useLocalSearchParams, useGlobalSearchParams } from 'expo-router';
import { getChapterVerses } from '../db';
import { Verse, useAppStore } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';
import { getChaptersForBook } from '../bibleData';
import VerseSheet from '../components/verseSheet';

// Skeleton Loader Component
const SkeletonLoader = () => {
  const theme = useAppTheme();
  const opacity = useSharedValue(0.3);

  React.useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.7, { duration: 1000 }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={{ marginBottom: 20 }}>
      <AnimatedReanimated.View style={[
        {
          height: 20,
          backgroundColor: theme.colors.onBackground,
          borderRadius: 4,
          marginBottom: 8,
        },
        animatedStyle
      ]} />
      <AnimatedReanimated.View style={[
        {
          height: 16,
          backgroundColor: theme.colors.onBackground,
          borderRadius: 4,
          width: '85%',
        },
        animatedStyle
      ]} />
    </View>
  );
};

export default function ChapterReadingPage() {
  const styles = useStyles();
  const theme = useAppTheme();
  const { bookName } = useLocalSearchParams<{ bookName: string }>();
  const { chapter } = useGlobalSearchParams<{ chapter?: string }>();
  
  const showMetadata = useAppStore((state) => state.showVerseMetadata);
  const setShowMetadata = useAppStore((state) => state.setShowVerseMetadata);
  
  const decodedBookName = bookName ? decodeURIComponent(bookName) : '';
  const maxChapters = getChaptersForBook(decodedBookName);
  const initialChapter = chapter ? parseInt(chapter) : 1;
  
  const [currentChapter, setCurrentChapter] = useState(initialChapter);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [selectedVerseIndex, setSelectedVerseIndex] = useState<number>(0);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  
  // Animation for floating buttons (using Reanimated for 120fps)
  const translateY = useSharedValue(0);
  const settingsIconTranslateY = useSharedValue(0);
  const lastScrollPosition = useRef(0);
  const scrollDirection = useRef<'up' | 'down'>('up');
  
  // Settings sheet animation
  const { height } = Dimensions.get('window');
  const offset = 0.1;
  const settingsSheetHeight = height * (0.35 + offset);
  const settingsClosedPosition = height;
  const settingsOpenPosition = height - settingsSheetHeight + (height * offset);
  
  const settingsTranslateY = useSharedValue(settingsClosedPosition);
  const settingsStartY = useSharedValue(0);

  // Animated styles for floating buttons (120fps)
  const buttonsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backIconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: settingsIconTranslateY.value }],
  }));

  const settingsIconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: settingsIconTranslateY.value }],
  }));

  // Update local chapter state when URL parameter changes
  useEffect(() => {
    if (chapter) {
      setCurrentChapter(parseInt(chapter));
    }
  }, [chapter]);

  const handlePreviousChapter = () => {
    if (currentChapter > 1) {
      setCurrentChapter(currentChapter - 1);
    }
  };

  const handleNextChapter = () => {
    if (currentChapter < maxChapters) {
      setCurrentChapter(currentChapter + 1);
    }
  };

  const handleBackToBooks = () => {
    router.back();
  };

  const handleScroll = (event: any) => {
    const currentScrollPosition = event.nativeEvent.contentOffset.y;
    const currentDirection = currentScrollPosition > lastScrollPosition.current ? 'down' : 'up';
    
    // Only update if scroll changed at least 2px to avoid jitter
    if (Math.abs(currentScrollPosition - lastScrollPosition.current) > 2) {
      // Animate on any scroll direction change
      if (currentDirection !== scrollDirection.current) {
        scrollDirection.current = currentDirection;
        
        // Animate bottom buttons down when scrolling down, up when scrolling up (120fps with Reanimated)
        translateY.value = withTiming(
          currentDirection === 'down' ? 150 : 0,
          { duration: 200 }
        );
        
        // Animate settings icon up when scrolling down, down when scrolling up (120fps with Reanimated)
        settingsIconTranslateY.value = withTiming(
          currentDirection === 'down' ? -110 : 0,
          { duration: 200 }
        );
      }
      
      lastScrollPosition.current = currentScrollPosition;
    }
  };
  
  // Settings sheet functions
  const openSettingsSheet = () => {
    setSettingsVisible(true);
    settingsTranslateY.value = withSpring(settingsOpenPosition, {
      stiffness: 900,
      damping: 110,
      mass: 2,
      overshootClamping: true,
      energyThreshold: 6e-9,
    });
  };
  
  const closeSettingsSheet = () => {
    settingsTranslateY.value = withSpring(settingsClosedPosition, {
      stiffness: 900,
      damping: 110,
      mass: 2,
      overshootClamping: true,
      energyThreshold: 6e-9,
    }, (isFinished) => {
      'worklet';
      if (isFinished) {
        runOnJS(() => setSettingsVisible(false))();
      }
    });
  };
  
  const settingsAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: settingsTranslateY.value }],
  }));
  
  const settingsBackdropStyle = useAnimatedStyle(() => {
    const sheetProgress = (settingsClosedPosition - settingsTranslateY.value) / settingsSheetHeight;
    const opacity = Math.min(1, Math.max(0, sheetProgress)) * 0.5;
    return {
      opacity,
      pointerEvents: opacity > 0.001 ? 'auto' : 'none',
    };
  });
  
  const settingsPanGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      settingsStartY.value = settingsTranslateY.value;
    })
    .onUpdate(e => {
      'worklet';
      const newPosition = settingsStartY.value + e.translationY;
      settingsTranslateY.value = Math.max(settingsOpenPosition, newPosition);
    })
    .onEnd(e => {
      'worklet';
      const SWIPE_DISTANCE_THRESHOLD = 150;
      const VELOCITY_THRESHOLD = 500;
      
      const isDraggedDownFar = settingsTranslateY.value > settingsOpenPosition + SWIPE_DISTANCE_THRESHOLD;
      const isFlickedDown = e.velocityY > VELOCITY_THRESHOLD;
      
      if (isDraggedDownFar || isFlickedDown) {
        settingsTranslateY.value = withSpring(settingsClosedPosition, {
          stiffness: 900,
          damping: 110,
          mass: 2,
          overshootClamping: true,
          energyThreshold: 6e-9,
        }, (isFinished) => {
          'worklet';
          if (isFinished) {
            runOnJS(closeSettingsSheet)();
          }
        });
      } else {
        settingsTranslateY.value = withSpring(settingsOpenPosition, {
          stiffness: 900,
          damping: 110,
          mass: 2,
          overshootClamping: true,
          energyThreshold: 6e-9,
        });
      }
    });

  useEffect(() => {
    const loadChapter = async () => {
      if (!bookName) return;
      
      const decodedBookName = decodeURIComponent(bookName);
      setLoading(true);

      try {
        const chapterVerses = await getChapterVerses(decodedBookName, currentChapter);
        setVerses(chapterVerses);
      } catch (error) {
        console.error('Error loading chapter:', error);
        setVerses([]);
      } finally {
        setLoading(false);
      }
    };

    loadChapter();
  }, [bookName, currentChapter]);

  // Build the display title: "Book ChapterNumber" (e.g., "Genesis 1")
  const displayTitle = React.useMemo(() => {
    if (!bookName) return 'Reading';
    return `${decodedBookName} ${currentChapter}`;
  }, [bookName, currentChapter, decodedBookName]);

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
        }} 
      />
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {/* Back to Books Icon */}
        <AnimatedReanimated.View
          style={[
            {
              position: 'absolute',
              top: 50,
              left: 20,
              zIndex: 1000,
            },
            backIconAnimatedStyle
          ]}
        >
          <TouchableOpacity
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: theme.colors.surface,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}
            onPress={handleBackToBooks}
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </AnimatedReanimated.View>

        {/* Settings Icon */}
        <AnimatedReanimated.View
          style={[
            {
              position: 'absolute',
              top: 50,
              right: 20,
              zIndex: 1000,
            },
            settingsIconAnimatedStyle
          ]}
        >
          <TouchableOpacity
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: theme.colors.surface,
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.25,
              shadowRadius: 4,
              elevation: 5,
            }}
            onPress={openSettingsSheet}
          >
            <Ionicons name="settings" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </AnimatedReanimated.View>

        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ padding: 20, paddingTop: 70, paddingBottom: 100 }}
          onScroll={handleScroll}
          scrollEventThrottle={12}
        >
          {/* Stylish Book and Chapter Header */}
          {decodedBookName && (
            <View style={{ marginBottom: 25, alignItems: 'center' }}>
              <Text style={{
                fontFamily: 'Noto Serif bold',
                fontSize: 28,
                color: theme.colors.onBackground,
                marginBottom: 5,
              }}>
                {decodedBookName}
              </Text>
              <Text style={{
                fontFamily: 'Inter',
                fontSize: 14,
                color: '#fff',
                fontWeight: '600',
                letterSpacing: 1,
              }}>
                CHAPTER {currentChapter}
              </Text>
            </View>
          )}

          {loading ? (
            <View>
              <SkeletonLoader />
              <SkeletonLoader />
              <SkeletonLoader />
              <SkeletonLoader />
              <SkeletonLoader />
              <SkeletonLoader />
              <SkeletonLoader />
              <SkeletonLoader />
              <SkeletonLoader />
              <SkeletonLoader />
            </View>
          ) : verses.length === 0 ? (
            <Text style={{ ...styles.text }}>No verses found</Text>
          ) : (
            <View>
              {verses.map((verse, index) => (
                <Pressable 
                  key={verse.id || index} 
                  style={{ marginBottom: 20 }}
                  onPress={() => {
                    setSelectedVerse(verse);
                    setSelectedVerseIndex(index);
                    setSheetVisible(true);
                  }}
                >
                  <Text style={{ 
                    ...styles.text, 
                    marginBottom: 0,
                    fontFamily: 'Noto Serif',
                    fontSize: 18,
                    lineHeight: 28,
                  }}>
                    <Text style={{ 
                      fontWeight: '600',
                      color: '#fff',
                      fontSize: 16,
                    }}>
                      {verse.verse_Number || index + 1}{' '}
                    </Text>
                    <Text style={{ color: theme.colors.onBackground }}>
                      {verse.text}
                    </Text>
                  </Text>
                  
                  {/* Metadata - Only show if counts are not 0 and showMetadata is true */}
                  {showMetadata && verse && typeof verse.users_Saved_Verse === 'number' && typeof verse.users_Memorized === 'number' && (verse.users_Saved_Verse > 0 || verse.users_Memorized > 0) ? (
                    <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'flex-start', alignItems: 'center' }}>
                      {verse.users_Saved_Verse > 0 ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', marginRight: 20 }}>
                          <Ionicons name="people" size={18} color={theme.colors.onBackground} />
                          <Text style={{ ...styles.tinyText, fontSize: 12, marginLeft: 5, marginBottom: 0 }}>
                            {verse.users_Saved_Verse} saves
                          </Text>
                        </View>
                      ) : null}
                      {verse.users_Memorized > 0 ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
                          <Ionicons name="checkmark-done" size={18} color={theme.colors.onBackground} />
                          <Text style={{ ...styles.tinyText, fontSize: 12, marginLeft: 5, marginBottom: 0 }}>
                            {verse.users_Memorized} memorized
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
        
        {/* Floating Navigation Buttons */}
        <AnimatedReanimated.View style={[
          {
            position: 'absolute',
            bottom: 70,
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 20,
          },
          buttonsAnimatedStyle
        ]}>
          {/* Previous Chapter Button */}
          <TouchableOpacity
            onPress={handlePreviousChapter}
            disabled={currentChapter <= 1}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: currentChapter <= 1 ? theme.colors.surface : theme.colors.primary,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: currentChapter <= 1 ? 0.5 : 1,
            }}
          >
            <Ionicons 
              name="chevron-back" 
              size={28} 
              color="#fff" 
            />
          </TouchableOpacity>

          {/* Next Chapter Button */}
          <TouchableOpacity
            onPress={handleNextChapter}
            disabled={currentChapter >= maxChapters}
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: currentChapter >= maxChapters ? theme.colors.surface : theme.colors.primary,
              justifyContent: 'center',
              alignItems: 'center',
              opacity: currentChapter >= maxChapters ? 0.5 : 1,
            }}
          >
            <Ionicons 
              name="chevron-forward" 
              size={28} 
              color="#fff" 
            />
          </TouchableOpacity>
        </AnimatedReanimated.View>

        {/* Settings Sheet */}
        {settingsVisible && (
          <Portal>
            <AnimatedReanimated.View
              style={[{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                zIndex: 9998,
              }, settingsBackdropStyle]}
            >
              <TouchableOpacity
                style={{ flex: 1 }}
                activeOpacity={0.5}
                onPress={closeSettingsSheet}
              />
            </AnimatedReanimated.View>

            <AnimatedReanimated.View style={[{
              position: 'absolute',
              left: 0,
              right: 0,
              height: settingsSheetHeight,
              backgroundColor: theme.colors.surface,
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              paddingTop: 20,
              paddingBottom: 80,
              zIndex: 9999,
            }, settingsAnimatedStyle]}>
              <GestureDetector gesture={settingsPanGesture}>
                <View style={{ padding: 20, marginTop: -20, alignItems: 'center' }}>
                  <View style={{ width: 50, height: 4, borderRadius: 2, backgroundColor: theme.colors.onBackground }} />
                </View>
              </GestureDetector>

              <View style={{ paddingHorizontal: 20 }}>
                <Text style={{
                  fontFamily: 'Noto Serif bold',
                  fontSize: 24,
                  color: theme.colors.onBackground,
                  marginBottom: 25,
                }}>
                  Reading Settings
                </Text>

                {/* Toggle for showing metadata */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingVertical: 15,
                  borderBottomWidth: 1,
                  borderBottomColor: theme.colors.onBackground + '20',
                }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      fontFamily: 'Noto Serif',
                      fontSize: 16,
                      color: theme.colors.onBackground,
                      marginBottom: 4,
                    }}>
                      Show Verse Metadata
                    </Text>
                    <Text style={{
                      ...styles.tinyText,
                      fontSize: 12,
                      color: theme.colors.onBackground + '80',
                    }}>
                      Display saves and memorized counts
                    </Text>
                  </View>
                  <Switch
                    value={showMetadata}
                    onValueChange={setShowMetadata}
                    trackColor={{ false: theme.colors.surface, true: theme.colors.primary + '80' }}
                    thumbColor={showMetadata ? theme.colors.primary : theme.colors.onBackground}
                  />
                </View>
              </View>
            </AnimatedReanimated.View>
          </Portal>
        )}

        {/* Verse Sheet */}
        {bookName && (
          <VerseSheet
            verse={selectedVerse}
            verseIndex={selectedVerseIndex}
            visible={sheetVisible}
            onClose={() => {
              setSheetVisible(false);
              setSelectedVerse(null);
            }}
            bookName={decodeURIComponent(bookName)}
            chapter={currentChapter}
            key={`${bookName}-${currentChapter}`}
          />
        )}
      </View>
    </>
  );
}
