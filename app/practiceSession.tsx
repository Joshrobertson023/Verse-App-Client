import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Snackbar } from 'react-native-paper';
import { getUserCollections, memorizeUserVerse } from './db';
import { useAppStore } from './store';
import useStyles from './styles';
import useAppTheme from './theme';

/*
  IMPORTANT: A CHUNK OF THE CODE ON THIS PAGE WAS FINISHED WITH AI HELP TO SPEED UP DEVELOPMENT
*/

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
    let isFirstElement = true; // Track if this is the first element after colon
    
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

  // Hide words for current stage
  const hideWordsForStage = (words: Word[], stage: number): Word[] => {
    if (stage === 1) {
      return words.map(w => ({ ...w, isVisible: true }));
    }

    const totalHidePercent = (stage - 1) * HIDE_PERCENTAGE_PER_STAGE;
    const verseTextStartIndex = words.findIndex(w => w.id >= 1000);
    if (verseTextStartIndex === -1) return words;
    
    const verseWords = words.slice(verseTextStartIndex);
    const referenceWords = words.slice(0, verseTextStartIndex);
    
    // Calculate total words (reference + verse) for percentage calculation
    const totalWords = words.length;
    const totalWordsToHide = Math.floor(totalWords * totalHidePercent);
    
    // Create a combined pool of all available visible word indices
    // Each index is mapped to include whether it's a reference or verse word
    const availableIndices: Array<{ type: 'reference' | 'verse'; index: number; wordIndex: number }> = [];
    
    // Add reference word indices (wordIndex is the position in the referenceWords array)
    referenceWords.forEach((word, refIndex) => {
      if (word.isVisible) {
        availableIndices.push({ type: 'reference', index: refIndex, wordIndex: refIndex });
      }
    });
    
    // Add verse word indices (wordIndex is the position in the verseWords array)
    verseWords.forEach((word, verseIndex) => {
      if (word.isVisible) {
        availableIndices.push({ type: 'verse', index: verseIndex, wordIndex: verseIndex });
      }
    });
    
    // Randomly shuffle all available indices together
    const shuffled = [...availableIndices].sort(() => Math.random() - 0.5);
    
    // Select words to hide from the combined pool
    const indicesToHide = shuffled.slice(0, Math.min(totalWordsToHide, availableIndices.length));
    
    // Separate the indices back into reference and verse
    const referenceIndicesToHide = new Set<number>();
    const verseIndicesToHide = new Set<number>();
    
    indicesToHide.forEach(item => {
      if (item.type === 'reference') {
        referenceIndicesToHide.add(item.wordIndex);
      } else {
        verseIndicesToHide.add(item.wordIndex);
      }
    });
    
    // Update verse words
    const updatedVerseWords = verseWords.map((word, index) => ({
      ...word,
      isVisible: !verseIndicesToHide.has(index),
    }));
    
    // Update reference words
    const updatedReferenceWords = referenceWords.map((word, index) => ({
      ...word,
      isVisible: !referenceIndicesToHide.has(index),
    }));
    
    return [...updatedReferenceWords, ...updatedVerseWords];
  };

  // Initialize
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

  // Update display when stage changes
  useEffect(() => {
    setDisplayWords(hideWordsForStage(allWords, currentStage));
    setCurrentWordIndex(0);
    setUserInput('');
    setTypedWords([]);
  }, [currentStage, allWords]);

// Input handler
  const handleInputChange = (text: string) => {
    if (currentWordIndex >= allWords.length) return;

    const currentWord = allWords[currentWordIndex];
    
    // Check if current word is punctuation that should be auto-completed
    const isPunctuation = ['-', ':', ','].includes(currentWord.word);
    const isNumber = currentWord.isNumber;
    
    const currentDisplayed = getDisplayedInput();

    // Handle backspace - compare without spaces
    const textNoSpacesForBackspace = text.replace(/\s/g, '');
    const currentDisplayedNoSpaces = currentDisplayed.replace(/\s/g, '');
    
    if (textNoSpacesForBackspace.length < currentDisplayedNoSpaces.length) {
      if (userInput.length > 0) {
        setUserInput(userInput.slice(0, -1));
      }
      return;
    }

    // Build expected text (for comparison)
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

    // Auto-complete punctuation
    if (isPunctuation) {
      setUserInput(currentWord.word);
      setTimeout(() => handleCorrectWord(), 100);
      return;
    }

    // For numbers: check character by character
    if (isNumber) {
      const expectedChar = currentWord.word[userInput.length];
      
      if (!expectedChar) return; // Word complete
      
      // Get the actual new input (strip spaces for comparison)
      const currentExpectedNoSpaces = buildExpectedText(true, false).replace(/\s/g, '');
      const textNoSpaces = text.replace(/\s/g, '');
      
      // Check if user typed the next expected character
      if (textNoSpaces === currentExpectedNoSpaces + expectedChar) {
        // Correct - add the character
        const newInput = userInput + expectedChar;
        setUserInput(newInput);
        
        // If word complete, move to next
        if (newInput === currentWord.word) {
          setTimeout(() => handleCorrectWord(), 100);
        }
      } else if (textNoSpaces.length <= currentExpectedNoSpaces.length) {
        // User typed space or hasn't typed next char yet - ignore
        return;
      } else if (textNoSpaces.startsWith(currentExpectedNoSpaces) && textNoSpaces.length > currentExpectedNoSpaces.length) {
        // User typed something after current position - check if it's wrong
        const extraChar = textNoSpaces[currentExpectedNoSpaces.length];
        if (extraChar !== expectedChar) {
          handleIncorrectInput();
        }
      } else {
        // Text doesn't match at all - wrong input
        handleIncorrectInput();
      }
    } else {
      // For regular words: check first letter then auto-complete
      if (userInput.length === 0) {
        const textNoSpaces = text.replace(/\s/g, '');
        const expectedNoSpaces = buildExpectedText(false, false).replace(/\s/g, '');
        const remainingText = textNoSpaces.slice(expectedNoSpaces.length);
        
        if (remainingText.length > 0) {
          const firstChar = remainingText[0].toLowerCase();
          const wordFirstChar = currentWord.word[0].toLowerCase();
          
          if (firstChar === wordFirstChar) {
            setUserInput(currentWord.word);
            setTimeout(() => handleCorrectWord(), 100);
          } else {
            handleIncorrectInput();
          }
        }
      } else {
        // Already auto-completed
        handleIncorrectInput();
      }
    }
  };

  // Handle word completion
  const handleCorrectWord = () => {
    if (currentWordIndex >= allWords.length) return;

    const currentWord = allWords[currentWordIndex];
    setTypedWords([...typedWords, currentWord.word]);
    const nextIndex = currentWordIndex + 1;
    setCurrentWordIndex(nextIndex);
    setUserInput('');

    // Check if stage complete
    if (nextIndex >= allWords.length) {
      if (currentStage < TOTAL_STAGES) {
        setTimeout(() => {
          const nextStage = currentStage + 1;
          setStageHistory(prev => [...prev, currentStage]);
          setCurrentStage(nextStage);
          // Update highest completed stage if advancing to a new stage
          if (nextStage > highestCompletedStage) {
            setHighestCompletedStage(nextStage);
          }
        }, 500);
      } else {
        setTimeout(() => handleCompleted(), 500);
        // Update highest completed stage if this was the last stage
        if (currentStage === TOTAL_STAGES && currentStage > highestCompletedStage) {
          setHighestCompletedStage(TOTAL_STAGES);
        }
      }
    }
  };

  // Handle incorrect input
  const handleIncorrectInput = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    setUserInput('');
  };

  const handleCompleted = () => {
    setCompleted(true);
    setSnackbarMessage('You memorized this verse!');
    setSnackbarVisible(true);
  }

  const handleBack = async () => {
    if (editingUserVerse) {
      setLoading(true);
      editingUserVerse.progressPercent = 100;
      await memorizeUserVerse(editingUserVerse);
    } else {
      alert('Error sending update to server: editingUserVerse was undefined.');
    }
    setCollections(await getUserCollections(user.username));
    setShouldReloadPracticeList(true);
    setLoading(false);
    router.back();
  }

  // Handle going back to previous stage
  // Going back is permanent - user must re-type from that stage
  const handleGoBack = () => {
    if (currentStage > 1) {
      const previousStage = currentStage - 1;
      setStageHistory(prev => [...prev, currentStage]);
      setCurrentStage(previousStage);
      // Reset progress - user must re-type the verse
      setCurrentWordIndex(0);
      setUserInput('');
      setTypedWords([]);
      // Update highest completed stage to the previous stage
      // This prevents skipping ahead
      setHighestCompletedStage(previousStage);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Build displayed input text
  const getDisplayedInput = (): string => {
    let displayed = '';
    for (let i = 0; i < typedWords.length; i++) {
      displayed += typedWords[i];
      // Add space if next word wants space before it (showSpace: true)
      // Exception: never add space before colons
      const nextWord = allWords[i + 1];
      const shouldAddSpace = nextWord && nextWord.showSpace && nextWord.word !== ':';
      if (shouldAddSpace) displayed += ' ';
    }
    displayed += userInput;
    return displayed;
  };

  // Calculate progress
  const calculateProgress = (): number => {
    if (allWords.length === 0) return 0;
    return Math.min((currentWordIndex / allWords.length) * 100, 100);
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
              padding: 20, 
              borderRadius: 8, 
              backgroundColor: theme.colors.surface 
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
                        color: shouldHide ? theme.colors.surface : undefined,
                        opacity: shouldHide ? 0 : 0.7,
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
              padding: 20,
              borderRadius: 8, 
              backgroundColor: 'transparent' 
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
      </View>
      {loading && (
        <View style={{
          position: 'absolute',
          width: 100,
          height: 100,
          backgroundColor: theme.colors.surface
        }}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      )}
    </>
  );
}
