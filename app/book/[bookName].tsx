import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useEffect, useState, useRef } from 'react';
import { Animated, ScrollView, Text, TouchableOpacity, View, Pressable } from 'react-native';
import { router, Stack, useLocalSearchParams, useGlobalSearchParams } from 'expo-router';
import { getChapterVerses } from '../db';
import { Verse } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';
import { getChaptersForBook } from '../bibleData';
import VerseSheet from '../components/verseSheet';

// Skeleton Loader Component
const SkeletonLoader = () => {
  const theme = useAppTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={{ marginBottom: 20 }}>
      <Animated.View style={[
        {
          height: 20,
          backgroundColor: theme.colors.onBackground,
          borderRadius: 4,
          marginBottom: 8,
        },
        { opacity }
      ]} />
      <Animated.View style={[
        {
          height: 16,
          backgroundColor: theme.colors.onBackground,
          borderRadius: 4,
          width: '85%',
        },
        { opacity }
      ]} />
    </View>
  );
};

export default function ChapterReadingPage() {
  const styles = useStyles();
  const theme = useAppTheme();
  const { bookName } = useLocalSearchParams<{ bookName: string }>();
  const { chapter } = useGlobalSearchParams<{ chapter?: string }>();
  
  const decodedBookName = bookName ? decodeURIComponent(bookName) : '';
  const maxChapters = getChaptersForBook(decodedBookName);
  const initialChapter = chapter ? parseInt(chapter) : 1;
  
  const [currentChapter, setCurrentChapter] = useState(initialChapter);
  const [verses, setVerses] = useState<Verse[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVerse, setSelectedVerse] = useState<Verse | null>(null);
  const [selectedVerseIndex, setSelectedVerseIndex] = useState<number>(0);
  const [sheetVisible, setSheetVisible] = useState(false);
  
  // Animation for floating buttons
  const translateY = useRef(new Animated.Value(0)).current;
  const backIconTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollPosition = useRef(0);
  const scrollDirection = useRef<'up' | 'down'>('up');

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
    if (Math.abs(currentScrollPosition - lastScrollPosition.current) > 50) {
      // Animate on any scroll direction change
      if (currentDirection !== scrollDirection.current) {
        scrollDirection.current = currentDirection;
        
        // Animate bottom buttons down when scrolling down, up when scrolling up
        Animated.timing(translateY, {
          toValue: currentDirection === 'down' ? 150 : 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
        
        // Animate back icon up when scrolling down, down when scrolling up
        Animated.timing(backIconTranslateY, {
          toValue: currentDirection === 'down' ? -110 : 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
      
      lastScrollPosition.current = currentScrollPosition;
    }
  };
  
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

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
        }} 
      />
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        {/* Back to Books Icon */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 50,
              left: 20,
              zIndex: 1000,
            },
            { transform: [{ translateY: backIconTranslateY }] }
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
        </Animated.View>

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
                fontFamily: 'Noto Serif bold',
                fontSize: 44,
                color: theme.colors.onBackground,
                letterSpacing: 1,
              }}>
                {currentChapter}
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
                  style={{ marginBottom: 8 }}
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
                    lineHeight: 24,
                  }}>
                    <Text style={{ 
                      fontWeight: '600',
                      color: theme.colors.onBackground,
                      fontSize: 16,
                    }}>
                      {index + 1}{' '}
                    </Text>
                    <Text style={{ color: theme.colors.onBackground }}>
                      {verse.text}
                    </Text>
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
        
        {/* Floating Navigation Buttons */}
        <Animated.View style={[
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
          { transform: [{ translateY }] }
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
        </Animated.View>

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
