import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Modal, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { ActivityIndicator, Snackbar } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Button from './components/Button';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);
import { getAllUserVerses, getUserActivity, getUserCollections, memorizeUserVerse, memorizeVerseOfDay, refreshUser, recordPractice, getStreakLength } from './db';
import { useAppStore } from './store';
import useStyles from './styles';
import useAppTheme from './theme';

const MIN_STAGES = 3;
const MAX_STAGES = 6;
const DEFAULT_STAGES = 4;
const HIDE_PERCENTAGE_PER_STAGE = 0.35;
const MIN_STAGE_HEIGHT = 200;

const PRACTICE_SETTINGS_KEYS = {
  RESTART_STAGE_ON_WRONG: '@verseApp:practice:restartStageOnWrong',
  LEARN_VERSE_REFERENCE: '@verseApp:practice:learnVerseReference',
  TOTAL_STAGES: '@verseApp:practice:totalStages',
};

interface Word {
  id: number;
  word: string;
  isVisible: boolean;
  isNumber: boolean;
  showSpace: boolean;
  isCorrect: boolean | null;
}

interface ProgressBarProps {
  currentStage: number;
  totalStages: number;
  progressPercent: number;
  highestCompletedStage: number;
  theme: ReturnType<typeof useAppTheme>;
}

export default function PracticeSessionScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const editingUserVerse = useAppStore((state) => state.editingUserVerse);
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [displayWords, setDisplayWords] = useState<Word[]>([]);
  const [currentStage, setCurrentStage] = useState(1);
  const [highestCompletedStage, setHighestCompletedStage] = useState(1);
  const [stageHistory, setStageHistory] = useState<number[]>([]);
  const [userInput, setUserInput] = useState('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [typedWords, setTypedWords] = useState<string[]>([]);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [streakSnackbarVisible, setStreakSnackbarVisible] = useState(false);
  const [completed, setCompleted] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const collections = useAppStore((state) => state.collections);
  const setCollections = useAppStore((state) => state.setCollections);
  const [loading, setLoading] = useState(false);
  const setShouldReloadPracticeList = useAppStore((state) => state.setShouldReloadPracticeList);
    const profileCache = useAppStore((state) => state.profileCache);
    const setProfileCache = useAppStore((state) => state.setProfileCache);
    const resetProfileCache = useAppStore((state) => state.resetProfileCache);
  const [showSettings, setShowSettings] = useState(false);
  const [restartStageOnWrong, setRestartStageOnWrong] = useState(true);
  const [learnVerseReference, setLearnVerseReference] = useState(true);
  const [totalStages, setTotalStages] = useState(DEFAULT_STAGES);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  
  // Animation values for error feedback
  const shakeAnimation = useSharedValue(0);
  const errorColorAnimation = useSharedValue(0);

  // Load settings from AsyncStorage on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const [restartStage, learnReference, stages] = await Promise.all([
          AsyncStorage.getItem(PRACTICE_SETTINGS_KEYS.RESTART_STAGE_ON_WRONG),
          AsyncStorage.getItem(PRACTICE_SETTINGS_KEYS.LEARN_VERSE_REFERENCE),
          AsyncStorage.getItem(PRACTICE_SETTINGS_KEYS.TOTAL_STAGES),
        ]);

        if (restartStage !== null) {
          setRestartStageOnWrong(restartStage === 'true');
        }
        if (learnReference !== null) {
          setLearnVerseReference(learnReference === 'true');
        }
        if (stages !== null) {
          const parsedStages = parseInt(stages, 10);
          if (!isNaN(parsedStages) && parsedStages >= MIN_STAGES && parsedStages <= MAX_STAGES) {
            setTotalStages(parsedStages);
          }
        }
      } catch (error) {
        console.error('Failed to load practice settings:', error);
      } finally {
        setSettingsLoaded(true);
      }
    };

    loadSettings();
  }, []);

  // Save restartStageOnWrong to AsyncStorage
  const handleSetRestartStageOnWrong = async (value: boolean) => {
    setRestartStageOnWrong(value);
    try {
      await AsyncStorage.setItem(PRACTICE_SETTINGS_KEYS.RESTART_STAGE_ON_WRONG, value.toString());
    } catch (error) {
      console.error('Failed to save restartStageOnWrong setting:', error);
    }
  };

  // Save learnVerseReference to AsyncStorage
  const handleSetLearnVerseReference = async (value: boolean) => {
    setLearnVerseReference(value);
    try {
      await AsyncStorage.setItem(PRACTICE_SETTINGS_KEYS.LEARN_VERSE_REFERENCE, value.toString());
      // Reset the practice session when this setting changes
      const reference = editingUserVerse?.readableReference || '';
      const referenceWords = value ? parseReference(reference) : [];
      const verseTextWords = parseVerseText(editingUserVerse?.verses || []);
      const all = [...referenceWords, ...verseTextWords];
      setAllWords(all);
      setDisplayWords(hideWordsForStage(all, currentStage));
      setCurrentWordIndex(0);
      setUserInput('');
      setTypedWords([]);
    } catch (error) {
      console.error('Failed to save learnVerseReference setting:', error);
    }
  };

  // Save totalStages to AsyncStorage
  const handleSetTotalStages = async (value: number) => {
    setTotalStages(value);
    try {
      await AsyncStorage.setItem(PRACTICE_SETTINGS_KEYS.TOTAL_STAGES, value.toString());
      // If current stage exceeds new total, reset to stage 1
      if (currentStage > value) {
        setCurrentStage(1);
        setHighestCompletedStage(1);
        setStageHistory([]);
        setCurrentWordIndex(0);
        setUserInput('');
        setTypedWords([]);
        setDisplayWords(hideWordsForStage(allWords, 1));
      } else {
        // Update display words for current stage with new total
        setDisplayWords(hideWordsForStage(allWords, currentStage));
      }
    } catch (error) {
      console.error('Failed to save totalStages setting:', error);
    }
  };

  const createWord = (id: number, word: string, isNumber: boolean, showSpace: boolean): Word => ({
    id,
    word,
    isVisible: true,
    isNumber,
    showSpace,
    isCorrect: null,
  });

  const parseBookAndChapter = (text: string): { book?: Word; chapter?: Word } => {
    const parts = text.split(/\s+/).filter(p => p.length > 0);
    
    if (parts.length >= 2) {
      return {
        book: createWord(0, parts.slice(0, -1).join(' '), false, true),
        chapter: createWord(1, parts[parts.length - 1], true, true),
      };
    }
    
    if (parts.length === 1 && /^\d+$/.test(parts[0])) {
      return { chapter: createWord(1, parts[0], true, false) };
    }
    
    return {};
  };

  const parseVerseReference = (verseText: string): Word[] => {
    const words: Word[] = [createWord(2, ':', false, false)];
    
    if (!verseText.trim()) return words;
    
    const trimmed = verseText.trim();
    const elements: Array<{ text: string; isNumber: boolean; needsSpaceAfter: boolean }> = [];
    let isFirstElement = true;
    
    let i = 0;
    while (i < trimmed.length) {
      const char = trimmed[i];
      
      if (char === ' ') {
        if (elements.length > 0 && elements[elements.length - 1].text !== ',') {
          elements[elements.length - 1].needsSpaceAfter = true;
        }
        i++;
        continue;
      }
      
      if (char === ',') {
        if (elements.length > 0) {
          elements[elements.length - 1].needsSpaceAfter = false;
        }
        elements.push({ text: ',', isNumber: false, needsSpaceAfter: false });
        isFirstElement = false;
        i++;
        continue;
      }
      
      if (/^\d$/.test(char)) {
        let number = '';
        while (i < trimmed.length && /^\d$/.test(trimmed[i])) {
          number += trimmed[i];
          i++;
        }
        const isLast = i >= trimmed.length;
        const prevWasComma = elements.length > 0 && elements[elements.length - 1].text === ',';
        const needsSpace = !isFirstElement && !prevWasComma && isLast;
        elements.push({ 
          text: number, 
          isNumber: true, 
          needsSpaceAfter: needsSpace 
        });
        isFirstElement = false;
      } else {
        const isLast = i === trimmed.length - 1;
        const prevWasComma = elements.length > 0 && elements[elements.length - 1].text === ',';
        const needsSpace = !isFirstElement && ((!prevWasComma && isLast) || (prevWasComma && !isLast));
        elements.push({ 
          text: char, 
          isNumber: false, 
          needsSpaceAfter: needsSpace
        });
        isFirstElement = false;
        i++;
      }
    }
    
    if (elements.length > 0 && elements[elements.length - 1].text !== ',' && elements.length > 1) {
      elements[elements.length - 1].needsSpaceAfter = true;
    }
    
    let wordId = 3;
    for (const element of elements) {
      words.push(createWord(
        wordId++,
        element.text,
        element.isNumber,
        element.needsSpaceAfter
      ));
    }
    
    if (words.length === 1 && trimmed.length > 0) {
      words.push(createWord(3, trimmed, true, true));
    }
    
    return words;
  };

  const parseReference = (reference: string): Word[] => {
    if (!reference.trim()) return [];
    
    const colonIndex = reference.indexOf(':');
    
    if (colonIndex > 0) {
      const { book, chapter } = parseBookAndChapter(reference.substring(0, colonIndex).trim());
      const referenceWords: Word[] = [];
      if (book) referenceWords.push(book);
      if (chapter) referenceWords.push(chapter);
      if (reference.substring(colonIndex + 1).trim()) {
        referenceWords.push(...parseVerseReference(reference.substring(colonIndex + 1).trim()));
      }
      return referenceWords;
    }
    
    const { book, chapter } = parseBookAndChapter(reference);
    const referenceWords: Word[] = [];
    if (book) referenceWords.push(book);
    if (chapter) referenceWords.push(chapter);
    if (referenceWords.length === 0) {
      referenceWords.push(createWord(0, reference.trim(), false, true));
    }
    return referenceWords;
  };

  const parseVerseText = (verses: Array<{ text: string }>): Word[] => {
    const fullText = verses.map(v => v.text).join(' ');
    return fullText.split(' ').filter(w => w.length > 0).map((word, i) => 
      createWord(i + 1000, word, false, true)
    );
  };

  // Hide words
  const hideWordsForStage = (words: Word[], stage: number): Word[] => {
    if (stage === 1) {
      return words.map(w => ({ ...w, isVisible: true }));
    }

    // Final stage hides all hints
    if (stage === totalStages) {
      return words.map(w => ({ ...w, isVisible: false }));
    }

    // Calculate hide percentage based on stage number and total stages
    // Stage 2 is always 50% easier than normal increment
    // Progress from 0% at stage 1 to 100% at final stage
    let totalHidePercent;
    if (stage === 2) {
      // Stage 2: 50% easier (half of normal increment)
      // Calculate the increment size needed to go from 0% to 100% across all stages
      // Stage 1 to 2: increment of Y (50% of normal)
      // Stage 2 to 3+: increment of 2Y (normal)
      // Total: Y + (totalStages - 2) * 2Y = (2 * totalStages - 3) * Y = 100%
      // So Y = 100% / (2 * totalStages - 3)
      const stage2Increment = 1.0 / (2 * totalStages - 3);
      totalHidePercent = stage2Increment; // Stage 2 hides Y%
    } else {
      // Stage 3+: progressive hiding
      // Stage 2 hides Y%, then each stage after adds 2Y%
      // Stage 3 hides Y% + 2Y% = 3Y%
      // Stage 4 hides 3Y% + 2Y% = 5Y%
      // etc.
      const stage2Increment = 1.0 / (2 * totalStages - 3);
      const normalIncrement = 2 * stage2Increment;
      totalHidePercent = stage2Increment + ((stage - 2) * normalIncrement);
    }
    const verseTextStartIndex = words.findIndex(w => w.id >= 1000);
    if (verseTextStartIndex === -1) 
      return words;
    
    const verseWords = words.slice(verseTextStartIndex);
    const referenceWords = words.slice(0, verseTextStartIndex);
    const totalWords = words.length;
    const totalWordsToHide = Math.floor(totalWords * totalHidePercent);

    const availableIndices: Array<{ type: 'reference' | 'verse'; index: number; wordIndex: number }> = [];
    
    referenceWords.forEach((word, refIndex) => {
      if (word.isVisible) {
        availableIndices.push({ type: 'reference', index: refIndex, wordIndex: refIndex });
      }
    });
    verseWords.forEach((word, verseIndex) => {
      if (word.isVisible) {
        availableIndices.push({ type: 'verse', index: verseIndex, wordIndex: verseIndex });
      }
    });
    
    const shuffled = [...availableIndices].sort(() => Math.random() - 0.5);
    const indicesToHide = shuffled.slice(0, Math.min(totalWordsToHide, availableIndices.length));
    const referenceIndicesToHide = new Set<number>();
    const verseIndicesToHide = new Set<number>();
    
    indicesToHide.forEach(item => {
      if (item.type === 'reference') {
        referenceIndicesToHide.add(item.wordIndex);
      } else {
        verseIndicesToHide.add(item.wordIndex);
      }
    });
  
    const updatedVerseWords = verseWords.map((word, index) => ({
      ...word,
      isVisible: !verseIndicesToHide.has(index),
    }));
    const updatedReferenceWords = referenceWords.map((word, index) => ({
      ...word,
      isVisible: !referenceIndicesToHide.has(index),
    }));
    
    return [...updatedReferenceWords, ...updatedVerseWords];
  };

  // Runs when first open practice session
  useEffect(() => {
    if (!editingUserVerse?.verses?.length) {
      Alert.alert('Error', 'No passage to practice');
      router.back();
      return;
    }

    // Wait for settings to load before initializing
    if (!settingsLoaded) {
      return;
    }

    const reference = editingUserVerse.readableReference || '';
    const referenceWords = learnVerseReference ? parseReference(reference) : [];
    const verseTextWords = parseVerseText(editingUserVerse.verses);
    const all = [...referenceWords, ...verseTextWords];
    
    setAllWords(all);
    setDisplayWords(hideWordsForStage(all, 1));
    setCurrentStage(1);
    setHighestCompletedStage(1);
    setStageHistory([]);
    setCurrentWordIndex(0);
    setUserInput('');
    setTypedWords([]);
  }, [editingUserVerse, learnVerseReference, totalStages, settingsLoaded]);

  // Runs when stage changes
  useEffect(() => {
    setDisplayWords(hideWordsForStage(allWords, currentStage));
    setCurrentWordIndex(0);
    setUserInput('');
    setTypedWords([]);
  }, [currentStage, allWords]);


  const handleInputChange = (text: string) => {
    if (currentWordIndex >= allWords.length) 
      return;

    const currentWord = allWords[currentWordIndex];
    const isPunctuation = ['-', ':', ','].includes(currentWord.word);
    const isNumber = currentWord.isNumber;
    const currentDisplayed = getDisplayedInput();

    // If backspace
    const textNoSpacesForBackspace = text.replace(/\s/g, '');
    const currentDisplayedNoSpaces = currentDisplayed.replace(/\s/g, '');
    if (textNoSpacesForBackspace.length < currentDisplayedNoSpaces.length) {
      if (userInput.length > 0) {
        setUserInput(userInput.slice(0, -1));
      }
      return;
    }

    const buildExpectedText = (includeCurrentInput: boolean, includeNextChar: boolean): string => {
      let expected = '';
      for (let i = 0; i < typedWords.length; i++) {
        expected += typedWords[i];
        if (allWords[i]?.showSpace) expected += ' ';
      }
      if (includeCurrentInput) {
        expected += userInput;
        if (includeNextChar && userInput.length < currentWord.word.length) {
          expected += currentWord.word[userInput.length];
        }
      }
      return expected;
    };

    if (isPunctuation) {
      setUserInput(currentWord.word);
      setTimeout(() => handleCorrectWord(), 1);
      return;
    }

    // If number entered
    if (isNumber) {
      const expectedChar = currentWord.word[userInput.length];
      // End of word     
      if (!expectedChar) 
        return;
      
      const currentExpectedNoSpaces = buildExpectedText(true, false).replace(/\s/g, '');
      const textNoSpaces = text.replace(/\s/g, '');
      
      if (textNoSpaces === currentExpectedNoSpaces + expectedChar) {
        // Entered correct letter
        const newInput = userInput + expectedChar;
        setUserInput(newInput);
        
        // Go to next Word
        if (newInput === currentWord.word) {
          setTimeout(() => handleCorrectWord(), 1);
        }
      } else if (textNoSpaces.length <= currentExpectedNoSpaces.length) {
        // Entered space
        return;
      } else if (textNoSpaces.startsWith(currentExpectedNoSpaces) && textNoSpaces.length > currentExpectedNoSpaces.length) {
        // Entered more than one character
        const extraChar = textNoSpaces[currentExpectedNoSpaces.length];
        if (extraChar !== expectedChar) {
          handleIncorrectInput();
        }
      } else {
        // Incorrect input
        handleIncorrectInput();
      }
    } else { // If word entered
      if (userInput.length === 0) {
        const textNoSpaces = text.replace(/\s/g, '');
        const expectedNoSpaces = buildExpectedText(false, false).replace(/\s/g, '');
        const remainingText = textNoSpaces.slice(expectedNoSpaces.length);
        
        if (remainingText.length > 0) {
          const firstChar = remainingText[0].toLowerCase();
          const wordFirstChar = currentWord.word[0].toLowerCase();
          
          if (firstChar === wordFirstChar) {
            setUserInput(currentWord.word);
            setTimeout(() => handleCorrectWord(), 1);
          } else {
            handleIncorrectInput();
          }
        }
      } else {
        handleIncorrectInput();
      }
    }
  };

  const handleCorrectWord = () => {
    if (currentWordIndex >= allWords.length)
      return;

    const currentWord = allWords[currentWordIndex];
    setTypedWords([...typedWords, currentWord.word]);
    const nextIndex = currentWordIndex + 1;
    setCurrentWordIndex(nextIndex);
    setUserInput('');

    if (nextIndex >= allWords.length) {
      if (currentStage < totalStages) {
        setTimeout(() => {
          const nextStage = currentStage + 1;
          setStageHistory(prev => [...prev, currentStage]);
          setCurrentStage(nextStage);
          if (nextStage > highestCompletedStage) {
            setHighestCompletedStage(nextStage);
          }
        }, 500);
      } else {
        setTimeout(() => handleCompleted(), 500);
        if (currentStage === totalStages && currentStage > highestCompletedStage) {
          setHighestCompletedStage(totalStages);
        }
      }
    }
  };

  const handleIncorrectInput = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setUserInput('');
    
    // If restart stage on wrong is enabled, restart the current stage
    if (restartStageOnWrong) {
      // Reset to beginning of current stage
      setCurrentWordIndex(0);
      setTypedWords([]);
      setUserInput('');
      // Reset display words for current stage
      setDisplayWords(hideWordsForStage(allWords, currentStage));
    }
    
    // Red color appears immediately, then shake happens, then red disappears
    errorColorAnimation.value = withSequence(
      withTiming(1, { duration: 0 }), // Appear immediately
      withTiming(1, { duration: 250 }), // Stay red during shake
      withTiming(0, { duration: 100 }) // Fade out after shake
    );
    
    // Shake animation starts after red appears (half strength)
    shakeAnimation.value = withSequence(
      withTiming(0, { duration: 0 }), // Start position
      withTiming(-5, { duration: 50 }),
      withTiming(5, { duration: 50 }),
      withTiming(-5, { duration: 50 }),
      withTiming(5, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  };

  const handleCompleted = () => {
    setCompleted(true);
    handleBack();
  }

  const handleBack = async () => {
    if (editingUserVerse) {
      setLoading(true);
      setSnackbarMessage('You memorized this verse!');
      setSnackbarVisible(true);
      editingUserVerse.progressPercent = 100;
      editingUserVerse.lastPracticed = new Date(); // Update LAST_PRACTICED
      
      // Get current streak length before memorizing
      let streakBefore = 0;
      try {
        streakBefore = await getStreakLength(user.username);
      } catch (error) {
        console.error('Failed to get streak length:', error);
      }
      
      // Check if this is a verse of day practice (no id means it's not saved to user's collection)
      const isVerseOfDay = !editingUserVerse.id || editingUserVerse.id === 0;
      
      if (isVerseOfDay) {
        // For verse of day, use the special endpoint that doesn't require UserVerse
        await memorizeVerseOfDay(user.username, editingUserVerse.readableReference);
      } else {
        // For regular user verses, use the normal endpoint
        await memorizeUserVerse(editingUserVerse);
      }
      
      // Record practice and check if today's activity was newly tracked
      let streakAfter = streakBefore;
      try {
        streakAfter = await recordPractice(user.username);
        // If streak increased, it means today's activity was newly recorded
        if (streakAfter > streakBefore) {
          setStreakSnackbarVisible(true);
        }
      } catch (error) {
        console.error('Failed to record practice:', error);
      }
      
      // Refresh user to get updated points
      try {
        const refreshedUser = await refreshUser(user.username);
        setUser(refreshedUser);
      } catch (error) {
        console.error('Failed to refresh user:', error);
      }
    } else {
      alert('Error sending update to server: editingUserVerse was undefined.');
    }
    setCollections(await getUserCollections(user.username));
    setShouldReloadPracticeList(true);

    setProfileCache({ isLoading: true, error: null });
    const [verses, activity] = await Promise.all([
      getAllUserVerses(user.username),
      getUserActivity(user.username, 5),
    ]);

    setProfileCache({
      activity: activity || [],
      isLoaded: true,
      isLoading: false,
      lastFetchedAt: Date.now(),
      username: user.username,
      error: null,
    });

    setLoading(false);
    router.back();
  }

  const handleGoBack = () => {
    if (currentStage > 1) {
      const previousStage = currentStage - 1;
      setStageHistory(prev => [...prev, currentStage]);
      setCurrentStage(previousStage);
      setCurrentWordIndex(0);
      setUserInput('');
      setTypedWords([]);
      setHighestCompletedStage(previousStage);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const getDisplayedInput = (): string => {
    let displayed = '';
    for (let i = 0; i < typedWords.length; i++) {
      displayed += typedWords[i];
      const nextWord = allWords[i + 1];
      if (nextWord && nextWord.showSpace && nextWord.word !== ':')
        displayed += ' ';
    }
    displayed += userInput;
    return displayed;
  };

  const calculateProgress = (): number => {
    if (allWords.length === 0) 
      return 0;
    return (currentWordIndex / allWords.length) * 100;
  };

  if (!editingUserVerse?.verses?.length) {
    return null;
  }

  const animatedInputStyle = useAnimatedStyle(() => {
    const textColor = errorColorAnimation.value === 1 
      ? '#ff4444' 
      : theme.colors.onBackground;
    return {
      color: textColor,
    };
  });

  const animatedHintTextStyle = useAnimatedStyle(() => {
    const textColor = errorColorAnimation.value === 1 
      ? '#ff4444' 
      : theme.colors.onBackground;
    return {
      color: textColor,
    };
  });

  const inputStyle = {
    ...styles.text,
    fontFamily: 'Noto Serif',
    fontSize: 18,
    color: theme.colors.onBackground,
    flex: 1,
    textAlignVertical: 'top' as const,
    padding: 0,
    margin: 0,
    minHeight: MIN_STAGE_HEIGHT,
  };

  function ProgressBar({ currentStage, totalStages, progressPercent, highestCompletedStage, theme }: ProgressBarProps) {
    return (
      <View style={{ marginBottom: 20 }}>
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 12 
        }}>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: '600', 
            color: theme.colors.onBackground 
          }}>
            Stage {currentStage} / {totalStages}
          </Text>
        </View>
        
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between',
        }}>
          {Array.from({ length: totalStages }).map((_, index) => {
            const stageNum = index + 1;
            const isCompleted = stageNum <= highestCompletedStage;
            const isCurrent = stageNum === currentStage;
            
            let backgroundColor = theme.colors.surface;
            if (isCurrent || isCompleted) {
              backgroundColor = theme.colors.primary;
            }
            
            return (
              <View
                key={stageNum}
                style={{
                  flex: 1,
                  height: isCurrent ? 6 : 4,
                  backgroundColor: backgroundColor,
                  opacity: isCurrent ? 1 : (isCompleted ? 0.5 : 0.3),
                  borderRadius: 2,
                  marginRight: index < totalStages - 1 ? 4 : 0,
                  borderWidth: isCurrent ? 1 : 0,
                  borderColor: theme.colors.primary,
                }}
              />
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: learnVerseReference ? '' : (editingUserVerse?.readableReference || ''),
          headerBackVisible: true,
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.onBackground,
          headerShadowVisible: false,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => setShowSettings(true)}
              style={{ marginRight: 16 }}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={24} color={theme.colors.onBackground} />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        >
          <ProgressBar 
            currentStage={currentStage} 
            totalStages={totalStages}
            progressPercent={calculateProgress()}
            highestCompletedStage={highestCompletedStage}
            theme={theme}
          />

          {/* Previous stage button */}
          <TouchableOpacity
            onPress={handleGoBack}
            disabled={currentStage <= 1}
            style={{
              alignSelf: 'flex-start',
              marginTop: 8,
              marginBottom: 12,
              paddingVertical: 8,
              paddingHorizontal: 0,
            }}
            activeOpacity={0.7}
          >
            <Text style={{
              fontSize: 14,
              color: currentStage <= 1 ? theme.colors.onSurfaceVariant : theme.colors.primary,
              opacity: currentStage <= 1 ? 0.5 : 1,
              marginTop: -20
            }}>
              Previous stage
            </Text>
          </TouchableOpacity>
          
          <Animated.View 
            style={[
              { position: 'relative', marginBottom: 20, minHeight: MIN_STAGE_HEIGHT, borderRadius: 8 },
              useAnimatedStyle(() => {
                return {
                  transform: [{ translateX: shakeAnimation.value }],
                };
              })
            ]}
          >
            {/* Background text */}
            <View style={{
              borderRadius: 8, 
              backgroundColor: 'transparent',
              width: '90%'
            }}>
              <Animated.Text style={[
                {
                  ...styles.text,
                  fontFamily: 'Noto Serif',
                  fontSize: 18,
                  opacity: 0.7,
                  padding: 0,
                  margin: 0,
                },
                animatedHintTextStyle
              ]}>
                {displayWords.map((w, index) => {
                  const space = w.showSpace && index > 0 ? ' ' : '';
                  const shouldHide = !w.isVisible;
                  return (
                    <Text 
                      key={`${w.id}-${index}`} 
                      style={{ 
                        color: shouldHide ? theme.colors.background : 'transparent',
                        opacity: shouldHide ? 0 : 0.6,
                      }}
                    >
                      {space}{w.word}
                    </Text>
                  );
                })}
              </Animated.Text>
            </View>
            
            {/* Input overlay */}
            <View style={{ 
              position: 'absolute', 
              top: 0, left: 0, right: 0, bottom: 0,
              borderRadius: 8, 
              backgroundColor: 'transparent',
              width: '90%'
            }}>
              <AnimatedTextInput
                ref={inputRef}
                value={getDisplayedInput()}
                onChangeText={handleInputChange}
                style={[inputStyle, animatedInputStyle]}
                multiline
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                scrollEnabled
                spellCheck={false}
                underlineColorAndroid="transparent"
                selectionColor={theme.colors.primary}
                selection={{ start: getDisplayedInput().length, end: getDisplayedInput().length }}
              />
            </View>
          </Animated.View>

          {completed && (
            <Button 
              title="Go Back" 
              onPress={() => {handleBack()}} 
              variant="text"
              style={{ marginTop: -10 }}
            />
          )}
        </ScrollView>
        
      </View>
      {loading && (
        <View style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.colors.surface
        }}>
          <Snackbar
            visible={snackbarVisible}
            onDismiss={() => setSnackbarVisible(false)}
            duration={3000}
            style={{ 
              backgroundColor: theme.colors.primary,
              position: 'absolute',
              top: 0, left: 0, right: 0, margin: 0
            }}
            wrapperStyle={{ top: 0 }}
          >
            {snackbarMessage}
          </Snackbar>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
      <Snackbar
        visible={streakSnackbarVisible}
        onDismiss={() => setStreakSnackbarVisible(false)}
        duration={3000}
        style={{ 
          backgroundColor: '#4CAF50',
          position: 'absolute',
          top: 60, left: 0, right: 0, margin: 0
        }}
        wrapperStyle={{ top: 60 }}
      >
        Streak completed for today! 🔥
      </Snackbar>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSettings(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          activeOpacity={1}
          onPress={() => setShowSettings(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 16,
              padding: 24,
              width: '85%',
              maxWidth: 400,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: '600',
                color: theme.colors.onBackground,
                marginBottom: 24,
                fontFamily: 'Inter',
              }}
            >
              Practice Settings
            </Text>

            {/* Restart Stage on Wrong Input Setting */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '500',
                    color: theme.colors.onBackground,
                    fontFamily: 'Inter',
                    marginBottom: 4,
                  }}
                >
                  Restart stage when wrong input
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: theme.colors.onSurfaceVariant,
                    fontFamily: 'Inter',
                  }}
                >
                  When enabled, the stage restarts from the beginning when you make an error
                </Text>
              </View>
              <Switch
                value={restartStageOnWrong}
                onValueChange={handleSetRestartStageOnWrong}
                trackColor={{
                  false: theme.colors.surface2,
                  true: theme.colors.primary,
                }}
                thumbColor={theme.colors.background}
              />
            </View>

            {/* Learn Verse Reference Setting */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24,
              }}
            >
              <View style={{ flex: 1, marginRight: 16 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '500',
                    color: theme.colors.onBackground,
                    fontFamily: 'Inter',
                    marginBottom: 4,
                  }}
                >
                  Learn verse reference
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: theme.colors.onSurfaceVariant,
                    fontFamily: 'Inter',
                  }}
                >
                  When enabled, you'll practice typing the verse reference (e.g., "John 3:16") along with the verse text
                </Text>
              </View>
              <Switch
                value={learnVerseReference}
                onValueChange={handleSetLearnVerseReference}
                trackColor={{
                  false: theme.colors.surface2,
                  true: theme.colors.primary,
                }}
                thumbColor={theme.colors.background}
              />
            </View>

            {/* Number of Stages Setting */}
            <View
              style={{
                marginBottom: 16,
              }}
            >
              <View style={{ marginBottom: 12 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '500',
                    color: theme.colors.onBackground,
                    fontFamily: 'Inter',
                    marginBottom: 4,
                  }}
                >
                  Number of stages: {totalStages}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: theme.colors.onSurfaceVariant,
                    fontFamily: 'Inter',
                  }}
                >
                  Adjust the number of practice stages ({MIN_STAGES}-{MAX_STAGES}). Stage 2 is always 50% easier, and the final stage hides all hints.
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: theme.colors.surface2,
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Ionicons name="warning-outline" size={20} color={theme.colors.onSurfaceVariant} />
                <Text
                  style={{
                    fontSize: 13,
                    color: theme.colors.onSurfaceVariant,
                    fontFamily: 'Inter',
                    flex: 1,
                  }}
                >
                  Changing this will restart you on the first stage
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text
                  style={{
                    fontSize: 14,
                    color: theme.colors.onSurfaceVariant,
                    fontFamily: 'Inter',
                    minWidth: 30,
                  }}
                >
                  {MIN_STAGES}
                </Text>
                <Slider
                  style={{ flex: 1, height: 40 }}
                  minimumValue={MIN_STAGES}
                  maximumValue={MAX_STAGES}
                  step={1}
                  value={totalStages}
                  onValueChange={(value: number) => {
                    const newTotalStages = Math.round(value);
                    handleSetTotalStages(newTotalStages);
                  }}
                  minimumTrackTintColor={theme.colors.primary}
                  maximumTrackTintColor={theme.colors.surface2}
                  thumbTintColor={theme.colors.primary}
                />
                <Text
                  style={{
                    fontSize: 14,
                    color: theme.colors.onSurfaceVariant,
                    fontFamily: 'Inter',
                    minWidth: 30,
                    textAlign: 'right',
                  }}
                >
                  {MAX_STAGES}
                </Text>
              </View>
            </View>

            {/* Close Button */}
            <TouchableOpacity
              onPress={() => setShowSettings(false)}
              style={{
                marginTop: 8,
                paddingVertical: 12,
                paddingHorizontal: 24,
                backgroundColor: theme.colors.primary,
                borderRadius: 8,
                alignItems: 'center',
              }}
            >
              <Text
                style={{
                  color: theme.colors.onPrimary,
                  fontFamily: 'Inter',
                  fontSize: 16,
                  fontWeight: '600',
                }}
              >
                Close
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}
