import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Snackbar } from 'react-native-paper';
import { getAllUserVerses, getUserActivity, getUserCollections, memorizeUserVerse, memorizeVerseOfDay } from './db';
import { useAppStore } from './store';
import useStyles from './styles';
import useAppTheme from './theme';

const TOTAL_STAGES = 1;
const HIDE_PERCENTAGE_PER_STAGE = 0.25;
const MIN_STAGE_HEIGHT = 200;

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
  const [completed, setCompleted] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const collections = useAppStore((state) => state.collections);
  const setCollections = useAppStore((state) => state.setCollections);
  const [loading, setLoading] = useState(false);
  const setShouldReloadPracticeList = useAppStore((state) => state.setShouldReloadPracticeList);
    const profileCache = useAppStore((state) => state.profileCache);
    const setProfileCache = useAppStore((state) => state.setProfileCache);
    const resetProfileCache = useAppStore((state) => state.resetProfileCache);

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

    const totalHidePercent = (stage - 1) * HIDE_PERCENTAGE_PER_STAGE;
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

    const reference = editingUserVerse.readableReference || '';
    const referenceWords = parseReference(reference);
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
  }, [editingUserVerse]);

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
      if (currentStage < TOTAL_STAGES) {
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
        if (currentStage === TOTAL_STAGES && currentStage > highestCompletedStage) {
          setHighestCompletedStage(TOTAL_STAGES);
        }
      }
    }
  };

  const handleIncorrectInput = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setUserInput('');
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
      
      // Check if this is a verse of day practice (no id means it's not saved to user's collection)
      const isVerseOfDay = !editingUserVerse.id || editingUserVerse.id === 0;
      
      if (isVerseOfDay) {
        // For verse of day, use the special endpoint that doesn't require UserVerse
        await memorizeVerseOfDay(user.username, editingUserVerse.readableReference);
      } else {
        // For regular user verses, use the normal endpoint
        await memorizeUserVerse(editingUserVerse);
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

    const memorized = (verses || []).filter((verse: any) => verse.progressPercent === 100).length;

    setProfileCache({
      memorizedCount: memorized,
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
          marginBottom: 8 
        }}>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: '600', 
            color: theme.colors.onBackground 
          }}>
            Stage {currentStage} / {totalStages}
          </Text>
          <Text style={{ 
            fontSize: 16, 
            fontWeight: '600', 
            color: theme.colors.onBackground 
          }}>
            {Math.round(progressPercent)}%
          </Text>
        </View>
        
        <View style={{
          height: 8,
          backgroundColor: theme.colors.surface,
          borderRadius: 4,
          overflow: 'hidden'
        }}>
          <View style={{
            height: '100%',
            width: `${progressPercent}%`,
            backgroundColor: theme.colors.primary,
            borderRadius: 4,
          }} />
        </View>
        
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between',
          marginTop: 8,
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
          title: editingUserVerse.readableReference,
          headerBackVisible: true,
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.onBackground,
          headerShadowVisible: false,
        }}
      />
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        >
          <ProgressBar 
            currentStage={currentStage} 
            totalStages={TOTAL_STAGES}
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
          
          <View style={{ position: 'relative', marginBottom: 20, minHeight: MIN_STAGE_HEIGHT }}>
            {/* Background text */}
            <View style={{
              borderRadius: 8, 
              backgroundColor: theme.colors.background,
              width: '90%'
            }}>
              <Text style={{
                ...styles.text,
                fontFamily: 'Noto Serif',
                fontSize: 18,
                color: theme.colors.onBackground,
                opacity: 0.7,
                padding: 0,
                margin: 0,
              }}>
                {displayWords.map((w, index) => {
                  const space = w.showSpace && index > 0 ? ' ' : '';
                  const shouldHide = !w.isVisible;
                  return (
                    <Text 
                      key={`${w.id}-${index}`} 
                      style={{ 
                        color: shouldHide ? theme.colors.surface : 'transparent',
                        opacity: shouldHide ? 0 : 0.6,
                      }}
                    >
                      {space}{w.word}
                    </Text>
                  );
                })}
              </Text>
            </View>
            
            {/* Input overlay */}
            <View style={{ 
              position: 'absolute', 
              top: 0, left: 0, right: 0, bottom: 0,
              borderRadius: 8, 
              backgroundColor: 'transparent',
              width: '90%'
            }}>
              <TextInput
                ref={inputRef}
                value={getDisplayedInput()}
                onChangeText={handleInputChange}
                style={inputStyle}
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
          </View>

          {completed && (
            <TouchableOpacity style={{
              ...styles.button_text,
              marginTop: -10
            }}
            onPress={() => {handleBack()}}>
              <Text style={{...styles.text}}>Go Back</Text>
            </TouchableOpacity>
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
    </>
  );
}
