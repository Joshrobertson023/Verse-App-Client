import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack, useGlobalSearchParams, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Dialog, Portal, RadioButton } from 'react-native-paper';
import { bibleBooks } from '../bibleData';
import VerseSheet from '../components/verseSheet';
import { DEFAULT_READER_SETTINGS, READER_BACKGROUND_THEMES, READER_FONT_OPTIONS, READER_PRESETS, READER_SETTINGS_STORAGE_KEY, type ReaderBackgroundKey, type ReaderPresetKey, type ReaderSettings } from '../constants/reader';
import { getChapterVerses, getHighlightsByChapter, getVersesWithPrivateNotes, getVersesWithPublicNotes } from '../db';
import { useAppStore, UserVerse, Verse } from '../store';
import useStyles from '../styles';
import useAppTheme from '../theme';

// Skeleton Loader Component
const SkeletonLoader = ({ color }: { color: string }) => {
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
          backgroundColor: color,
          borderRadius: 4,
          marginBottom: 8,
        },
        { opacity }
      ]} />
      <Animated.View style={[
        {
          height: 16,
          backgroundColor: color,
          borderRadius: 4,
          width: '85%',
        },
        { opacity }
      ]} />
    </View>
  );
};

const PRESET_LABELS: Record<ReaderPresetKey, string> = {
  compact: 'Compact',
  normal: 'Normal',
  large: 'Large',
  extraLarge: 'Extra Large',
};

const BACKGROUND_ORDER: ReaderBackgroundKey[] = ['default', 'trueBlack', 'light', 'soft'];

const appendAlphaToHex = (hex: string, alpha: string) => {
  if (typeof hex !== 'string' || !hex.startsWith('#')) {
    return hex;
  }
  const normalized = hex.replace('#', '');
  if (normalized.length === 8) {
    return `#${normalized.slice(0, 6)}${alpha}`;
  }
  if (normalized.length === 6) {
    return `#${normalized}${alpha}`;
  }
  return hex;
};

const sanitizeReaderSettings = (settings: Partial<ReaderSettings> | null | undefined): ReaderSettings | null => {
  if (!settings) return null;

  const fallback = DEFAULT_READER_SETTINGS;
  const availableFonts = new Set(READER_FONT_OPTIONS.map((option) => option.id));

  const fontFamily = settings.fontFamily && availableFonts.has(settings.fontFamily) ? settings.fontFamily : fallback.fontFamily;

  const fontSize =
    typeof settings.fontSize === 'number' && Number.isFinite(settings.fontSize)
      ? Math.min(Math.max(settings.fontSize, 12), 30)
      : fallback.fontSize;

  const lineHeight =
    typeof settings.lineHeight === 'number' && Number.isFinite(settings.lineHeight)
      ? Math.max(settings.lineHeight, fontSize + 2)
      : Math.max(fallback.lineHeight, fontSize + 6);

  const letterSpacing =
    typeof settings.letterSpacing === 'number' && Number.isFinite(settings.letterSpacing)
      ? Math.min(Math.max(settings.letterSpacing, -2), 4)
      : fallback.letterSpacing;

  const background =
    settings.background && settings.background in READER_BACKGROUND_THEMES ? settings.background : fallback.background;

  return {
    fontFamily,
    fontSize,
    lineHeight,
    letterSpacing,
    background,
    showMetadata: typeof settings.showMetadata === 'boolean' ? settings.showMetadata : fallback.showMetadata,
    showPublicNoteIcons: typeof settings.showPublicNoteIcons === 'boolean' ? settings.showPublicNoteIcons : fallback.showPublicNoteIcons,
  };
};

const cacheKeyForChapter = (bookName: string, chapterNumber: number) => `${bookName}__${chapterNumber}`;
const WINDOW_OFFSETS = [-1, 0, 1] as const;

export default function ChapterReadingPage() {
  const styles = useStyles();
  const theme = useAppTheme();
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  const { bookName } = useLocalSearchParams<{ bookName: string }>();
  const { chapter } = useGlobalSearchParams<{ chapter?: string }>();

  const decodedBookNameFromParams = useMemo(() => (bookName ? decodeURIComponent(bookName) : ''), [bookName]);

  const requestedChapterFromParams = useMemo(() => {
    if (!chapter) return 1;
    const parsed = parseInt(chapter, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }, [chapter]);

  const chapterOrder = useMemo(() => {
    const order: Array<{ bookName: string; chapter: number }> = [];
    bibleBooks.forEach((bookMeta) => {
      for (let chap = 1; chap <= (bookMeta.chapters ?? 0); chap += 1) {
        order.push({ bookName: bookMeta.name, chapter: chap });
      }
    });
    return order;
  }, []);

  const chapterIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    chapterOrder.forEach((meta, index) => {
      map.set(cacheKeyForChapter(meta.bookName, meta.chapter), index);
    });
    return map;
  }, [chapterOrder]);

  const fallbackChapterMeta = useMemo(() => {
    if (chapterOrder.length > 0) {
      return chapterOrder[0];
    }
    const fallbackBook = bibleBooks[0]?.name ?? decodedBookNameFromParams ?? '';
    return { bookName: fallbackBook, chapter: 1 };
  }, [chapterOrder, decodedBookNameFromParams]);

  const requestedChapterMeta = useMemo(() => {
    if (!decodedBookNameFromParams) return null;
    return {
      bookName: decodedBookNameFromParams,
      chapter: requestedChapterFromParams,
    };
  }, [decodedBookNameFromParams, requestedChapterFromParams]);

  const initialChapterIndex = useMemo(() => {
    const seedMeta = requestedChapterMeta ?? fallbackChapterMeta;
    const key = cacheKeyForChapter(seedMeta.bookName, seedMeta.chapter);
    return chapterIndexMap.get(key) ?? 0;
  }, [chapterIndexMap, fallbackChapterMeta, requestedChapterMeta]);

  const [currentIndex, setCurrentIndex] = useState(() => initialChapterIndex);

  const totalChapters = chapterOrder.length;
  const activeChapterMeta = chapterOrder[currentIndex] ?? fallbackChapterMeta;
  const activeBookName = activeChapterMeta.bookName;
  const currentChapter = activeChapterMeta.chapter;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < totalChapters - 1;
  const isTransitioningRef = useRef(false);
  const prefetchedChaptersRef = useRef<Map<string, Verse[]>>(new Map());
  const loadingChaptersRef = useRef<Set<string>>(new Set());
  const isMountedRef = useRef(true);
  const [prefetchTick, setPrefetchTick] = useState(0);
  const [selectedVerseIndices, setSelectedVerseIndices] = useState<Set<number>>(new Set());
  const [selectedUserVerse, setSelectedUserVerse] = useState<UserVerse | null>(null);
  const [readerSettings, setReaderSettings] = useState<ReaderSettings>(() => ({ ...DEFAULT_READER_SETTINGS }));
  const [styleDialogVisible, setStyleDialogVisible] = useState(false);
  const [settingsHydrated, setSettingsHydrated] = useState(false);
  const [highlights, setHighlights] = useState<Set<string>>(new Set());
  const [versesWithNotes, setVersesWithNotes] = useState<Set<string>>(new Set());
  const [versesWithPublicNotes, setVersesWithPublicNotes] = useState<Set<string>>(new Set());

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Animation for floating buttons
  const translateY = useRef(new Animated.Value(0)).current;
  const topControlsTranslateY = useRef(new Animated.Value(0)).current;
  const lastScrollPosition = useRef(0);
  const scrollDirection = useRef<'up' | 'down'>('up');

  const activeBackground = useMemo(
    () => READER_BACKGROUND_THEMES[readerSettings.background],
    [readerSettings.background]
  );

  const dialogBackgroundColor = activeBackground.backgroundColor;
  const dialogPrimaryTextColor = activeBackground.textColor;
  const dialogSecondaryTextColor = useMemo(
    () => appendAlphaToHex(activeBackground.textColor, 'CC'),
    [activeBackground.textColor]
  );
  const dialogMutedTextColor = useMemo(
    () => appendAlphaToHex(activeBackground.textColor, '99'),
    [activeBackground.textColor]
  );
  const dialogBorderColor = useMemo(
    () => appendAlphaToHex(activeBackground.textColor, '33'),
    [activeBackground.textColor]
  );
  const dialogChipInactiveBackground = useMemo(
    () => appendAlphaToHex(activeBackground.textColor, '14'),
    [activeBackground.textColor]
  );
  const dialogChipActiveBackground = useMemo(
    () => appendAlphaToHex(activeBackground.textColor, '28'),
    [activeBackground.textColor]
  );

  const controlBubbleBackground = useMemo(() => {
    switch (readerSettings.background) {
      case 'light':
        return '#FFFFFF';
      case 'soft':
        return '#F7EBD7';
      default:
        return theme.colors.surface;
    }
  }, [readerSettings.background]);

  const disabledControlBubbleBackground = useMemo(() => {
    switch (readerSettings.background) {
      case 'light':
        return '#E1E5EC';
      case 'soft':
        return '#E5D6BB';
      default:
        return theme.colors.background;
    }
  }, [readerSettings.background]);

  const baseFloatingButtonStyle = useMemo(
    () => ({
      backgroundColor: controlBubbleBackground,
      borderColor: activeBackground.borderColor,
      borderWidth: StyleSheet.hairlineWidth,
      borderRadius: 26,
    }),
    [controlBubbleBackground, activeBackground.borderColor]
  );

  const floatingShadowStyle = useMemo(
    () => ({
      shadowColor: '#000',
      shadowOffset: { width: 0, height: readerSettings.background === 'light' || readerSettings.background === 'soft' ? 6 : 10 },
      shadowOpacity: readerSettings.background === 'light' || readerSettings.background === 'soft' ? 0.12 : 0.28,
      shadowRadius: 12,
      elevation: 10,
    }),
    [readerSettings.background]
  );

  useEffect(() => {
    if (!requestedChapterMeta) return;
    const key = cacheKeyForChapter(requestedChapterMeta.bookName, requestedChapterMeta.chapter);
    const targetIndex = chapterIndexMap.get(key);
    if (typeof targetIndex === 'number' && targetIndex !== currentIndex) {
      setCurrentIndex(targetIndex);
    }
  }, [chapterIndexMap, currentIndex, requestedChapterMeta]);

  useEffect(() => {
    setSelectedVerseIndices(new Set());
    setSelectedUserVerse(null);
  }, [currentIndex]);

  // Helper function to create readableReference from verse indices
  const createReadableReference = useCallback((bookName: string, chapter: number, verseIndices: number[]): string => {
    if (verseIndices.length === 0) return '';
    if (verseIndices.length === 1) {
      return `${bookName} ${chapter}:${verseIndices[0] + 1}`;
    }
    
    // Sort indices
    const sorted = [...verseIndices].sort((a, b) => a - b);
    const verseNumbers = sorted.map(idx => idx + 1);
    
    // Group consecutive verses
    let result = `${bookName} ${chapter}:`;
    let start = verseNumbers[0];
    let end = verseNumbers[0];
    
    for (let i = 1; i < verseNumbers.length; i++) {
      if (verseNumbers[i] === end + 1) {
        end = verseNumbers[i];
      } else {
        if (start === end) {
          result += `${start}, `;
        } else {
          result += `${start}-${end}, `;
        }
        start = verseNumbers[i];
        end = verseNumbers[i];
      }
    }
    
    // Add the last group
    if (start === end) {
      result += `${start}`;
    } else {
      result += `${start}-${end}`;
    }
    
    return result;
  }, []);

  const loadHighlightsForChapter = useCallback(
    async (book: string, chapterNumber: number) => {
      if (!user?.username || user.username === 'Default User') return;
      
      try {
        const chapterHighlights = await getHighlightsByChapter(user.username, book, chapterNumber);
        const highlightSet = new Set(chapterHighlights.map(h => h.verseReference));
        setHighlights(prev => {
          const newSet = new Set(prev);
          // Remove old highlights for this chapter
          Array.from(newSet).forEach(ref => {
            if (ref.startsWith(`${book} ${chapterNumber}:`)) {
              newSet.delete(ref);
            }
          });
          // Add new highlights
          highlightSet.forEach(ref => newSet.add(ref));
          return newSet;
        });
      } catch (error) {
        console.error('Failed to load highlights:', error);
      }
    },
    [user?.username]
  );

  const loadVersesWithNotes = useCallback(
    async (book: string, chapterNumber: number) => {
      if (!user?.username || user.username === 'Default User') return;
      
      try {
        const verseRefs = await getVersesWithPrivateNotes(user.username, book, chapterNumber);
        const notesSet = new Set(verseRefs);
        setVersesWithNotes(prev => {
          const newSet = new Set(prev);
          // Remove old notes for this chapter
          Array.from(newSet).forEach(ref => {
            if (ref.startsWith(`${book} ${chapterNumber}:`)) {
              newSet.delete(ref);
            }
          });
          // Add new notes
          notesSet.forEach(ref => newSet.add(ref));
          return newSet;
        });
      } catch (error) {
        console.error('Failed to load verses with notes:', error);
      }
    },
    [user?.username]
  );

  const loadVersesWithPublicNotes = useCallback(
    async (book: string, chapterNumber: number) => {
      try {
        const verseRefs = await getVersesWithPublicNotes(book, chapterNumber);
        const notesSet = new Set(verseRefs);
        setVersesWithPublicNotes(prev => {
          const newSet = new Set(prev);
          // Remove old notes for this chapter
          Array.from(newSet).forEach(ref => {
            if (ref.startsWith(`${book} ${chapterNumber}:`)) {
              newSet.delete(ref);
            }
          });
          // Add new notes
          notesSet.forEach(ref => newSet.add(ref));
          return newSet;
        });
      } catch (error) {
        console.error('Failed to load verses with public notes:', error);
      }
    },
    []
  );

  const ensureChapterData = useCallback(
    async (book: string, chapterNumber: number) => {
      if (!book || chapterNumber <= 0) return;

      const cacheKey = cacheKeyForChapter(book, chapterNumber);
      if (prefetchedChaptersRef.current.has(cacheKey) || loadingChaptersRef.current.has(cacheKey)) {
        return;
      }

      if (isMountedRef.current) {
        loadingChaptersRef.current.add(cacheKey);
        setPrefetchTick((tick) => tick + 1);
      }

      try {
        const data = await getChapterVerses(book, chapterNumber);
        prefetchedChaptersRef.current.set(cacheKey, data);
        
        // Load highlights and notes for this chapter if user is logged in
        await loadHighlightsForChapter(book, chapterNumber);
        await loadVersesWithNotes(book, chapterNumber);
        await loadVersesWithPublicNotes(book, chapterNumber);
      } catch (error) {
        console.error('Failed to load chapter:', error);
      } finally {
        loadingChaptersRef.current.delete(cacheKey);
        if (isMountedRef.current) {
          setPrefetchTick((tick) => tick + 1);
        }
      }
    },
    [loadHighlightsForChapter, loadVersesWithNotes, loadVersesWithPublicNotes]
  );

  const getChapterMetaForIndex = useCallback(
    (targetIndex: number) => {
      if (targetIndex < 0 || targetIndex >= totalChapters) {
        return null;
      }
      return chapterOrder[targetIndex];
    },
    [chapterOrder, totalChapters]
  );

  const getChapterMetaForOffset = useCallback(
    (offset: number) => getChapterMetaForIndex(currentIndex + offset),
    [currentIndex, getChapterMetaForIndex]
  );

  const changeChapter = useCallback(
    (direction: 'next' | 'prev') => {
      const delta = direction === 'next' ? 1 : -1;
      const targetIndex = currentIndex + delta;
      const targetMeta = getChapterMetaForIndex(targetIndex);

      if (!targetMeta) {
        return;
      }

      const targetCacheKey = cacheKeyForChapter(targetMeta.bookName, targetMeta.chapter);
      if (!prefetchedChaptersRef.current.has(targetCacheKey)) {
        ensureChapterData(targetMeta.bookName, targetMeta.chapter);
      }

      setSelectedVerseIndices(new Set());
      setSelectedUserVerse(null);

      const currentMeta = getChapterMetaForIndex(currentIndex);
      setCurrentIndex(targetIndex);

      try {
        if (currentMeta && currentMeta.bookName === targetMeta.bookName) {
          router.setParams({ chapter: String(targetMeta.chapter) });
        } else {
          router.replace(`/book/${encodeURIComponent(targetMeta.bookName)}?chapter=${targetMeta.chapter}`);
        }
      } catch (error) {
        console.warn('Failed to update chapter route:', error);
      }
    },
    [currentIndex, ensureChapterData, getChapterMetaForIndex, router]
  );

  const handlePreviousChapter = useCallback(() => {
    if (!hasPrevious) {
      return;
    }
    changeChapter('prev');
  }, [changeChapter, hasPrevious]);

  const handleNextChapter = useCallback(() => {
    if (!hasNext) {
      return;
    }
    changeChapter('next');
  }, [changeChapter, hasNext]);

  const handleBackToBooks = () => {
    router.back();
  };

  const handleVersePress = useCallback((_verse: Verse, index: number) => {
    setSelectedVerseIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

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
        
        // Animate top controls up when scrolling down, down when scrolling up
        Animated.timing(topControlsTranslateY, {
          toValue: currentDirection === 'down' ? -110 : 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
      
      lastScrollPosition.current = currentScrollPosition;
    }
  };

  const handleResetReaderSettings = () => {
    setReaderSettings({ ...DEFAULT_READER_SETTINGS });
  };

  const handleApplyPreset = (presetKey: ReaderPresetKey) => {
    setReaderSettings((prev) => {
      const preset = READER_PRESETS[presetKey];
      return {
        ...prev,
        ...preset,
        background: prev.background,
      };
    });
  };

  const activePresetKey = useMemo<ReaderPresetKey | null>(() => {
    const match = (Object.entries(READER_PRESETS) as [ReaderPresetKey, ReaderSettings][])
      .find(([, preset]) => {
        return (
          preset.fontFamily === readerSettings.fontFamily &&
          preset.fontSize === readerSettings.fontSize &&
          preset.lineHeight === readerSettings.lineHeight &&
          preset.letterSpacing === readerSettings.letterSpacing
        );
      });
    return match ? match[0] : null;
  }, [readerSettings]);

  const handleBackgroundChange = (background: ReaderBackgroundKey) => {
    setReaderSettings((prev) => ({
      ...prev,
      background,
    }));
  };

  const handleFontSelect = (fontId: string) => {
    setReaderSettings((prev) => ({
      ...prev,
      fontFamily: fontId,
    }));
  };

  const handleToggleShowMetadata = (value: boolean) => {
    setReaderSettings((prev) => ({
      ...prev,
      showMetadata: value,
    }));
  };

  useEffect(() => {
    let isMounted = true;

    const hydrateSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(READER_SETTINGS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as Partial<ReaderSettings>;
          const sanitized = sanitizeReaderSettings(parsed);
          if (sanitized && isMounted) {
            setReaderSettings((prev) => ({
              ...prev,
              ...sanitized,
            }));
          }
        }
      } catch (error) {
        console.error('Failed to load reader settings:', error);
      } finally {
        if (isMounted) {
          setSettingsHydrated(true);
        }
      }
    };

    hydrateSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!settingsHydrated) return;

    const persistSettings = async () => {
      try {
        await AsyncStorage.setItem(READER_SETTINGS_STORAGE_KEY, JSON.stringify(readerSettings));
      } catch (error) {
        console.error('Failed to save reader settings:', error);
      }
    };

    persistSettings();
  }, [readerSettings, settingsHydrated]);

  
  useEffect(() => {
    const meta = getChapterMetaForIndex(currentIndex);
    if (meta) {
      ensureChapterData(meta.bookName, meta.chapter);
    }
  }, [currentIndex, ensureChapterData, getChapterMetaForIndex]);

  useEffect(() => {
    WINDOW_OFFSETS.forEach((offset) => {
      const meta = getChapterMetaForOffset(offset);
      if (meta) {
        ensureChapterData(meta.bookName, meta.chapter);
      }
    });
  }, [ensureChapterData, getChapterMetaForOffset]);

  useEffect(() => {
    const keysToRetain = new Set<string>();
    WINDOW_OFFSETS.forEach((offset) => {
      const meta = getChapterMetaForOffset(offset);
      if (meta) {
        keysToRetain.add(cacheKeyForChapter(meta.bookName, meta.chapter));
      }
    });

    let trimmed = false;
    prefetchedChaptersRef.current.forEach((_, key) => {
      if (!keysToRetain.has(key)) {
        prefetchedChaptersRef.current.delete(key);
        loadingChaptersRef.current.delete(key);
        trimmed = true;
      }
    });

    if (trimmed && isMountedRef.current) {
      setPrefetchTick((tick) => tick + 1);
    }
  }, [getChapterMetaForOffset]);

  const columnDataByOffset = useMemo(() => {
    const data: Record<
      number,
      { bookName: string; chapter: number; verses: Verse[] | null; loading: boolean; index: number } | null
    > = {};

    WINDOW_OFFSETS.forEach((offset) => {
      const meta = getChapterMetaForOffset(offset);
      if (!meta) {
        data[offset] = null;
        return;
      }

      const cacheKey = cacheKeyForChapter(meta.bookName, meta.chapter);
      const cachedVerses = prefetchedChaptersRef.current.get(cacheKey) ?? null;
      const isLoading = loadingChaptersRef.current.has(cacheKey) && !cachedVerses;

      data[offset] = {
        bookName: meta.bookName,
        chapter: meta.chapter,
        verses: cachedVerses,
        loading: isLoading,
        index: currentIndex + offset,
      };
    });

    return data;
  }, [currentIndex, getChapterMetaForOffset, prefetchTick]);

  useEffect(() => {
    if (selectedVerseIndices.size === 0) {
      setSelectedUserVerse(null);
      return;
    }

    const activeColumnData = columnDataByOffset[0];
    const columnVerses = activeColumnData?.verses ?? [];
    const sortedIndices = Array.from(selectedVerseIndices).sort((a, b) => a - b);

    const selectedVerses: Verse[] = [];
    sortedIndices.forEach((verseIndex) => {
      const sourceVerse = columnVerses[verseIndex];
      if (!sourceVerse) {
        return;
      }

      const normalizedNumber =
        typeof sourceVerse.verse_Number === 'number'
          ? sourceVerse.verse_Number.toString()
          : sourceVerse.verse_Number ?? String(verseIndex + 1);

      selectedVerses.push({
        ...sourceVerse,
        verse_Number: normalizedNumber,
        verse_reference:
          sourceVerse.verse_reference ?? `${activeBookName} ${currentChapter}:${verseIndex + 1}`,
      });
    });

    if (selectedVerses.length === 0) {
      setSelectedUserVerse(null);
      return;
    }

    const readableRef = createReadableReference(activeBookName, currentChapter, sortedIndices);
    setSelectedUserVerse({
      username: '',
      readableReference: readableRef,
      verses: selectedVerses,
    });
  }, [selectedVerseIndices, columnDataByOffset, activeBookName, currentChapter, createReadableReference]);

  const renderChapterColumn = (
    offset: number,
    columnData: {
      bookName: string;
      chapter: number;
      verses: Verse[] | null;
      loading: boolean;
      index: number;
    } | null
  ) => {
    const isActive = offset === 0;

    if (!columnData) {
      return (
        <View
          key={`placeholder-${offset}`}
          style={{
            flex: 1,
            backgroundColor: activeBackground.backgroundColor,
          }}
        />
      );
    }

    const columnVerses = columnData.verses ?? [];
    const isLoading = columnData.loading;
    const showSkeleton = isLoading;
    const shouldShowNoVersesMessage = !isLoading && columnVerses.length === 0 && isActive;

    return (
      <View
        key={`column-${offset}-${columnData.bookName}-${columnData.chapter}`}
        style={{
          flex: 1,
          backgroundColor: activeBackground.backgroundColor,
        }}
      >
        <ScrollView
          style={{ flex: 1, backgroundColor: activeBackground.backgroundColor }}
          contentContainerStyle={{ padding: 20, paddingTop: 70, paddingBottom: 100 }}
          scrollEnabled={isActive}
          onScroll={isActive ? handleScroll : undefined}
          scrollEventThrottle={isActive ? 12 : undefined}
          pointerEvents={isActive ? 'auto' : 'none'}
        >
          {columnData.bookName && (
            <View style={{ marginBottom: 25, alignItems: 'center' }}>
              <Text
                style={{
                  fontFamily: 'Noto Serif bold',
                  fontSize: 28,
                  color: activeBackground.textColor,
                  marginBottom: 5,
                }}
              >
                {columnData.bookName}
              </Text>
              <Text
                style={{
                  fontFamily: 'Noto Serif bold',
                  fontSize: 44,
                  color: activeBackground.textColor,
                  letterSpacing: 1,
                }}
              >
                {columnData.chapter}
              </Text>
            </View>
          )}

          {showSkeleton ? (
            <View>
              {Array.from({ length: 10 }).map((_, skeletonIndex) => (
                <SkeletonLoader key={skeletonIndex} color={activeBackground.textColor} />
              ))}
            </View>
          ) : shouldShowNoVersesMessage ? (
            <Text style={{ ...styles.text, color: activeBackground.textColor }}>No verses found</Text>
          ) : (
            <View>
              {columnVerses.map((verse, index) => {
                const isSelected = selectedVerseIndices.has(index);
                const isVerseHighlighted = verse.verse_reference ? highlights.has(verse.verse_reference) : false;
                const highlightBackground =
                  activeBackground.backgroundColor === '#000000'
                    ? 'rgba(255, 255, 0, 0.2)'
                    : 'rgba(255, 255, 0, 0.3)';
                const selectionBackground =
                  activeBackground.backgroundColor === '#000000'
                    ? 'rgba(255, 255, 255, 0.12)'
                    : appendAlphaToHex(theme.colors.primary, '22');
                const verseBackground = isSelected
                  ? selectionBackground
                  : isVerseHighlighted
                    ? highlightBackground
                    : 'transparent';
                // Keep consistent padding/margin regardless of selection state
                const versePadding = 0;
                const verseRadius = isVerseHighlighted ? 4 : 0;
                // Increase line height slightly (add 4 to the existing line height)
                const adjustedLineHeight = readerSettings.lineHeight + 4;
                return (
                  <Pressable
                    key={verse.id || index}
                    style={{ 
                      marginBottom: 3,
                      backgroundColor: verseBackground,
                      padding: versePadding,
                      borderRadius: verseRadius,
                    }}
                    onPress={
                      isActive
                        ? () => handleVersePress(verse, index)
                        : undefined
                    }
                    disabled={!isActive}
                  >
                    <Text
                      style={{
                        ...styles.text,
                        marginBottom: 0,
                        marginLeft: 0,
                        fontFamily: readerSettings.fontFamily === 'System' ? undefined : readerSettings.fontFamily,
                        fontSize: readerSettings.fontSize,
                        lineHeight: adjustedLineHeight,
                        letterSpacing: readerSettings.letterSpacing,
                        color: activeBackground.textColor,
                        textDecorationLine: isSelected ? 'underline' : 'none',
                      }}
                    >
                      <Text
                        style={{
                          fontWeight: '600',
                          color: activeBackground.textColor,
                          fontSize: 16,
                        }}
                      >
                        {index + 1}{' '}
                      </Text>
                      <Text style={{ color: activeBackground.textColor }}>{verse.text}</Text>
                      {verse.verse_reference && (
                        <>
                          {versesWithNotes.has(verse.verse_reference) && (
                            <Ionicons 
                              name="document-text-outline" 
                              size={14} 
                              color={activeBackground.textColor} 
                              style={{ marginLeft: 4, opacity: 0.7 }}
                            />
                          )}
                          {readerSettings.showPublicNoteIcons && versesWithPublicNotes.has(verse.verse_reference) && (
                            <Ionicons 
                              name="people-outline" 
                              size={14} 
                              color={activeBackground.textColor} 
                              style={{ marginLeft: 4, opacity: 0.7 }}
                            />
                          )}
                        </>
                      )}
                    </Text>
                  {readerSettings.showMetadata &&
                    ((verse.users_Saved_Verse ?? 0) > 0 || (verse.users_Memorized ?? 0) > 0) && (
                      <View
                        style={{
                          marginTop: 0,
                          marginBottom: 0,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 20,
                        }}
                      >
                        {(verse.users_Saved_Verse ?? 0) > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.85 }}>
                            <Ionicons name="people-outline" size={14} color={activeBackground.textColor} />
                            <Text
                              style={{
                                fontSize: 13,
                                fontFamily: 'Source Sans Pro',
                                color: activeBackground.textColor,
                                opacity: 0.9,
                              }}
                            >
                              Saved {verse.users_Saved_Verse}
                            </Text>
                          </View>
                        )}
                        {(verse.users_Memorized ?? 0) > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.85 }}>
                            <Ionicons name="checkmark-circle-outline" size={14} color={activeBackground.textColor} />
                            <Text
                              style={{
                                fontSize: 13,
                                fontFamily: 'Source Sans Pro',
                                color: activeBackground.textColor,
                                opacity: 0.9,
                              }}
                            >
                              Memorized {verse.users_Memorized}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={{ marginTop: 40, alignItems: 'center' }}>
            <View
              style={{
                width: '100%',
                height: 1,
                backgroundColor: activeBackground.borderColor,
                marginBottom: 16,
              }}
            />
            <Text
              style={{
                ...styles.text,
                fontSize: 12,
                lineHeight: 18,
                width: '85%',
                color: activeBackground.textColor,
                textAlign: 'center',
                fontFamily: readerSettings.fontFamily === 'System' ? undefined : readerSettings.fontFamily,
              }}
            >
              All Scripture is quoted from the King James Version Bible (public domain).
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen 
        options={{
          headerShown: false,
        }} 
      />
      <View style={{ flex: 1, backgroundColor: activeBackground.backgroundColor }}>
        {/* Back to Books Icon */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 50,
              left: 20,
              zIndex: 1000,
            },
            { transform: [{ translateY: topControlsTranslateY }] },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              baseFloatingButtonStyle,
              floatingShadowStyle,
              {
                width: 54,
                height: 54,
                justifyContent: 'center',
                alignItems: 'center',
              },
            ]}
            onPress={handleBackToBooks}
          >
            <Ionicons name="chevron-back" size={24} color={activeBackground.textColor} />
          </TouchableOpacity>
        </Animated.View>

        {/* Reading Style Button */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 50,
              right: 20,
              zIndex: 1000,
            },
            { transform: [{ translateY: topControlsTranslateY }] },
          ]}
        >
          <View style={{ alignItems: 'flex-end' }}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                baseFloatingButtonStyle,
                floatingShadowStyle,
                {
                  paddingHorizontal: 18,
                  height: 54,
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: 8,
                },
              ]}
              onPress={() => setStyleDialogVisible(true)}
            >
              <Ionicons name="text-outline" size={20} color={activeBackground.textColor} />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: activeBackground.textColor,
                  fontFamily: 'Source Sans Pro',
                }}
              >
                Aa
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={{ flex: 1 }}>
          {renderChapterColumn(0, columnDataByOffset[0] ?? null)}
        </View>

        {/* Floating Navigation Buttons */}
        <Animated.View
          style={[
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
            { transform: [{ translateY }] },
          ]}
        >
          {/* Previous Chapter Button */}
          <TouchableOpacity
            onPress={handlePreviousChapter}
            disabled={!hasPrevious}
            activeOpacity={0.85}
            style={[
              baseFloatingButtonStyle,
              floatingShadowStyle,
              {
                width: 58,
                height: 58,
                justifyContent: 'center',
                alignItems: 'center',
                opacity: hasPrevious ? 1 : 0.6,
              },
            ]}
          >
            <Ionicons
              name="chevron-back"
              size={28}
              color={activeBackground.textColor}
              style={{ opacity: hasPrevious ? 1 : 0.4 }}
            />
          </TouchableOpacity>

          {/* Next Chapter Button */}
          <TouchableOpacity
            onPress={handleNextChapter}
            disabled={!hasNext}
            activeOpacity={0.85}
            style={[
              baseFloatingButtonStyle,
              floatingShadowStyle,
              {
                width: 58,
                height: 58,
                justifyContent: 'center',
                alignItems: 'center',
                opacity: hasNext ? 1 : 0.6,
              },
            ]}
          >
            <Ionicons
              name="chevron-forward"
              size={28}
              color={activeBackground.textColor}
              style={{ opacity: hasNext ? 1 : 0.4 }}
            />
          </TouchableOpacity>
        </Animated.View>

        {/* Verse Sheet */}
        {activeBookName && (
          <VerseSheet
            userVerse={selectedUserVerse}
            visible={!!selectedUserVerse}
            onClose={() => {
              setSelectedVerseIndices(new Set());
              setSelectedUserVerse(null);
              // Reload verses with notes in case a note was created
              if (activeBookName && currentChapter && user?.username && user.username !== 'Default User') {
                loadVersesWithNotes(activeBookName, currentChapter);
              }
            }}
            bookName={activeBookName}
            chapter={currentChapter}
            key={`${activeBookName}-${currentChapter}`}
            onHighlightChange={() => {
              // Reload highlights for the current chapter when a highlight is toggled
              loadHighlightsForChapter(activeBookName, currentChapter);
              // Also reload verses with notes in case a note was created
              loadVersesWithNotes(activeBookName, currentChapter);
              loadVersesWithPublicNotes(activeBookName, currentChapter);
            }}
            onUnselectVerse={(verseReference: string) => {
              // Find and unselect ONLY the verse that matches the reference
              const activeColumnData = columnDataByOffset[0];
              const columnVerses = activeColumnData?.verses ?? [];
              
              // Extract verse number from the reference (e.g., "John 3:16" -> 16, or just "16" from "16")
              let targetVerseNumber: number | null = null;
              const verseNumberMatch = verseReference.match(/:(\d+)(?:\s|$|,|;)/);
              if (verseNumberMatch) {
                targetVerseNumber = parseInt(verseNumberMatch[1], 10);
              } else {
                // Try to match just a number if the format is different
                const numberOnlyMatch = verseReference.match(/(?:^|\s)(\d+)(?:\s|$)/);
                if (numberOnlyMatch) {
                  targetVerseNumber = parseInt(numberOnlyMatch[1], 10);
                }
              }
              
              // Find the index of the verse that matches by verse number (most reliable)
              let verseIndex = -1;
              
              if (targetVerseNumber !== null) {
                verseIndex = columnVerses.findIndex((verse, index) => {
                  if (verse.verse_Number) {
                    const verseNum = typeof verse.verse_Number === 'number' 
                      ? verse.verse_Number 
                      : parseInt(verse.verse_Number.toString(), 10);
                    if (!isNaN(verseNum) && verseNum === targetVerseNumber) {
                      return true;
                    }
                  }
                  return false;
                });
              }
              
              // Fallback to reference matching if verse number didn't work
              if (verseIndex === -1) {
                verseIndex = columnVerses.findIndex((verse, index) => {
                  const verseRef = verse.verse_reference ?? `${activeBookName} ${currentChapter}:${index + 1}`;
                  return verseRef === verseReference || 
                         verse.verse_reference === verseReference ||
                         (verse.verse_reference && verse.verse_reference.toLowerCase() === verseReference.toLowerCase());
                });
              }
              
              // Only remove the specific verse index if found
              if (verseIndex !== -1) {
                setSelectedVerseIndices((prev) => {
                  const next = new Set(prev);
                  next.delete(verseIndex);
                  return next;
                });
              }
            }}
          />
        )}

        <Portal>
          <Dialog
            visible={styleDialogVisible}
            onDismiss={() => setStyleDialogVisible(false)}
            style={{
              backgroundColor: dialogBackgroundColor,
              margin: 0,
              height: '100%',
              width: '100%',
              maxHeight: '100%',
              maxWidth: '100%',
              alignSelf: 'center',
              borderRadius: 0,
            }}
            theme={{ roundness: 0 }}
          >
            <Dialog.Title style={{ color: dialogPrimaryTextColor, paddingHorizontal: 24, paddingTop: 32 }}>
              Reading Style
            </Dialog.Title>
            <Dialog.ScrollArea style={{ backgroundColor: dialogBackgroundColor }}>
              <ScrollView
                style={{ backgroundColor: dialogBackgroundColor }}
                contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 24 }}
              >
                <Dialog.Content style={{ backgroundColor: dialogBackgroundColor, padding: 0 }}>
                  <View style={{ marginBottom: 20, marginTop: 12 }}>
                    <Text style={{ ...styles.text, fontSize: 14, marginBottom: 12, color: dialogSecondaryTextColor }}>
                      Display Options
                    </Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          color: dialogPrimaryTextColor,
                          fontFamily: 'Source Sans Pro',
                          flex: 1,
                        }}
                      >
                        Show verse stats
                      </Text>
                      <Switch
                        value={readerSettings.showMetadata}
                        onValueChange={handleToggleShowMetadata}
                        trackColor={{ false: dialogBorderColor, true: dialogChipActiveBackground }}
                        thumbColor={readerSettings.showMetadata ? dialogPrimaryTextColor : dialogSecondaryTextColor}
                        ios_backgroundColor={dialogBorderColor}
                      />
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          color: dialogPrimaryTextColor,
                          fontFamily: 'Source Sans Pro',
                          flex: 1,
                        }}
                      >
                        Show public note icons
                      </Text>
                      <Switch
                        value={readerSettings.showPublicNoteIcons}
                        onValueChange={(value) =>
                          setReaderSettings((prev) => ({
                            ...prev,
                            showPublicNoteIcons: value,
                          }))
                        }
                        trackColor={{ false: dialogBorderColor, true: dialogChipActiveBackground }}
                        thumbColor={readerSettings.showPublicNoteIcons ? dialogPrimaryTextColor : dialogSecondaryTextColor}
                        ios_backgroundColor={dialogBorderColor}
                      />
                    </View>
                  </View>

                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ ...styles.text, fontSize: 14, marginBottom: 8, color: dialogSecondaryTextColor }}>
                      Presets
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                      {(Object.entries(READER_PRESETS) as [ReaderPresetKey, ReaderSettings][]).map(([key]) => {
                        const isActive = activePresetKey === key;
                        return (
                          <TouchableOpacity
                            key={key}
                            onPress={() => handleApplyPreset(key)}
                            style={{
                              paddingHorizontal: 14,
                              paddingVertical: 10,
                              borderRadius: 20,
                              borderWidth: 1,
                              borderColor: isActive ? dialogPrimaryTextColor : dialogBorderColor,
                              backgroundColor: isActive ? dialogChipActiveBackground : dialogChipInactiveBackground,
                            }}
                          >
                            <Text
                              style={{
                                color: dialogPrimaryTextColor,
                                fontFamily: 'Source Sans Pro',
                                fontSize: 14,
                                fontWeight: '600',
                              }}
                            >
                              {PRESET_LABELS[key]}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={{ marginBottom: 24 }}>
                    <Text style={{ ...styles.text, fontSize: 14, marginBottom: 8, color: dialogSecondaryTextColor }}>
                      Background
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
                      {BACKGROUND_ORDER.map((backgroundKey) => {
                        const option = READER_BACKGROUND_THEMES[backgroundKey];
                        const isActive = readerSettings.background === backgroundKey;
                        return (
                          <TouchableOpacity
                            key={backgroundKey}
                            onPress={() => handleBackgroundChange(backgroundKey)}
                            style={{ alignItems: 'center', width: 72 }}
                          >
                            <View
                              style={{
                                width: 52,
                                height: 52,
                                borderRadius: 26,
                                backgroundColor: option.backgroundColor,
                                borderWidth: isActive ? 3 : 1,
                                borderColor: isActive ? option.textColor : option.borderColor,
                              }}
                            />
                            <Text
                              style={{
                                marginTop: 6,
                                fontSize: 12,
                                color: isActive ? dialogPrimaryTextColor : dialogSecondaryTextColor,
                                fontFamily: 'Source Sans Pro',
                                textAlign: 'center',
                              }}
                            >
                              {option.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  <View style={{ marginBottom: 0 }}>
                    <Text style={{ ...styles.text, fontSize: 14, marginBottom: 8, color: dialogSecondaryTextColor }}>
                      Font
                    </Text>
                    <RadioButton.Group onValueChange={handleFontSelect} value={readerSettings.fontFamily}>
                      {READER_FONT_OPTIONS.map((option) => (
                        <TouchableOpacity
                          key={option.id}
                          onPress={() => handleFontSelect(option.id)}
                          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}
                        >
                          <RadioButton value={option.id} color={dialogPrimaryTextColor} uncheckedColor={dialogSecondaryTextColor} />
                          <Text
                            style={{
                              marginLeft: 8,
                              fontSize: 16,
                              color: dialogPrimaryTextColor,
                              fontFamily: option.id === 'System' ? undefined : option.id,
                            }}
                          >
                            {option.label}
                          </Text>
                          {option.preview && (
                            <Text
                              style={{
                                marginLeft: 8,
                                fontSize: 16,
                                color: dialogSecondaryTextColor,
                                fontFamily: option.id === 'System' ? undefined : option.id,
                              }}
                            >
                              {option.preview}
                            </Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </RadioButton.Group>
                  </View>
                </Dialog.Content>
              </ScrollView>
            </Dialog.ScrollArea>
            <Dialog.Actions style={{ backgroundColor: dialogBackgroundColor, paddingHorizontal: 24, paddingBottom: 32, alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <TouchableOpacity
                onPress={handleResetReaderSettings}
                style={{
                  ...styles.button_outlined,
                  flex: 1,
                  maxWidth: '48%',
                  borderColor: dialogPrimaryTextColor,
                  backgroundColor: dialogChipInactiveBackground,
                }}
              >
                <Text style={{ ...styles.buttonText_outlined, color: dialogPrimaryTextColor }}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setStyleDialogVisible(false)}
                style={{
                  ...styles.button_filled,
                  flex: 1,
                  maxWidth: '48%',
                  backgroundColor: activeBackground.textColor,
                }}
              >
                <Text
                  style={{
                    ...styles.buttonText_filled,
                    color: activeBackground.backgroundColor,
                  }}
                >
                  Done
                </Text>
              </TouchableOpacity>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
    </>
  );
}
