import { router, Stack } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { Snackbar } from 'react-native-paper';
import { incrementVerseMemorized, incrementVersesMemorized, recordPractice, updateUserVerse as updateUserVerseAPI } from './db';
import { useAppStore, UserVerse } from './store';
import useStyles from './styles';
import useAppTheme from './theme';

interface WordDisplay {
  id: number;
  word: string;
  isVisible: boolean;
  typedLetter: string | null;
  isCorrect: boolean | null;
}

export default function PracticeSessionScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const editingUserVerse = useAppStore((state) => state.editingUserVerse);
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  const collections = useAppStore((state) => state.collections);
  const updateCollection = useAppStore((state) => state.updateCollection);
  const [words, setWords] = useState<WordDisplay[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showReference, setShowReference] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!editingUserVerse || !editingUserVerse.verses || editingUserVerse.verses.length === 0) {
      Alert.alert('Error', 'No passage to practice');
      router.back();
      return;
    }

    const reference = editingUserVerse.readableReference || '';
    const referenceParts: string[] = [];
    
    // Parse "Book Chapter:Verse" format
    const colonIndex = reference.indexOf(':');
    if (colonIndex > 0) {
      const beforeColon = reference.substring(0, colonIndex).trim();
      const afterColon = reference.substring(colonIndex + 1).trim();
      
      const beforeParts = beforeColon.split(' ');
      const book = beforeParts.slice(0, -1).join(' ');
      const chapter = beforeParts[beforeParts.length - 1];
      
      if (book) referenceParts.push(book);
      if (chapter) referenceParts.push(chapter);
      if (afterColon) referenceParts.push(afterColon);
    } else {
      referenceParts.push(reference);
    }

    const fullText = editingUserVerse.verses.map(v => v.text).join(' ');
    const wordArray = fullText.split(' ').filter(word => word.length > 0);
    const allWords = [...referenceParts, ...wordArray];
    
    const progressPercent = editingUserVerse.progressPercent || 0;
    const totalWords = allWords.length;
    const wordsToShow = Math.max(1, Math.floor(totalWords * (progressPercent / 100) * 0.50));
    
    // Calculate spacing to evenly distribute visible words
    const spacing = totalWords / wordsToShow;
    
    const initialWords: WordDisplay[] = allWords.map((word, index) => {
      const showIndex = Math.floor(index / spacing);
      const isVisible = showIndex < wordsToShow;
      
      return {
        id: index,
        word,
        isVisible,
        typedLetter: null,
        isCorrect: null,
      };
    });
    
    setWords(initialWords);
    setCurrentProgress(progressPercent);
    setCurrentWordIndex(0);
  }, [editingUserVerse]);

  const visibleWords = words.filter(w => w.isVisible);

  // Calculate how many words to hide based on progress (0% = all shown, 100% = almost all hidden)
  const getWordsToHideCount = () => {
    const total = visibleWords.length;
    const hidePercent = currentProgress / 95;
    const wordsToHide = Math.floor(total * hidePercent); // 95% max to keep some words visible
    return wordsToHide;
  };

  // Get randomly selected word indices to hide
  const getHiddenWordIndices = () => {
    const wordsToHide = getWordsToHideCount();
    const total = visibleWords.length;
    const indices: number[] = [];
    
    // Randomly select which words to hide
    const availableIndices = Array.from({ length: total }, (_, i) => i);
    for (let i = 0; i < wordsToHide && availableIndices.length > 0; i++) {
      const randomIndex = Math.floor(Math.random() * availableIndices.length);
      indices.push(availableIndices.splice(randomIndex, 1)[0]);
    }
    
    return new Set(indices);
  };

  const hiddenIndices = React.useMemo(() => getHiddenWordIndices(), [currentProgress]);

  const getCompletedText = () => {
    const completed = [];
    
    // Only show words that have been completed (isCorrect === true)
    for (let i = 0; i < currentWordIndex; i++) {
      const word = visibleWords[i];
      if (word && word.isCorrect === true) {
        completed.push(word.word);
      }
    }
    
    return completed.join(' ');
  };

  const handleInputChange = (text: string) => {
    console.log('handleInputChange - text:', text, 'userInput:', userInput, 'currentWordIndex:', currentWordIndex);
    
    if (isComplete || currentWordIndex >= visibleWords.length) {
      setUserInput('');
      return;
    }

    const currentWord = visibleWords[currentWordIndex];
    if (!currentWord) {
      setUserInput('');
      return;
    }

    console.log('Current word:', currentWord.word);
    
    const isNumber = typeof currentWord.word === "number";
    
    if (isNumber) {
      // For numbers, extract just the current word's input from text
      // The text contains completed words + current word input
      // Take the last segment after splitting by space
      const textParts = text.split(' ');
      const currentInput = textParts[textParts.length - 1] || '';
      
      if (currentInput.length === 0) {
        setUserInput('');
        return;
      }
      
      // Check if this input matches the expected number (progressive)
      const expectedSubstring = currentWord.word.substring(0, currentInput.length);
      
      if (currentInput === expectedSubstring) {
        // Correct partial or complete
        setUserInput(currentInput);
        
        if (currentInput === currentWord.word) {
          // Complete number typed - mark and move to next word
          const updatedWords = words.map((w) => {
            if (w.id === currentWord.id) {
              return { ...w, typedLetter: currentWord.word, isCorrect: true };
            }
            return w;
          });
          setWords(updatedWords);
          moveToNextWord(updatedWords);
        }
      } else {
        // Wrong input for number - clear
        setUserInput('');
      }
    } else {
      // For text words, only first letter matters
      // Extract just the current word's input from text
      const textParts = text.split(' ');
      const currentInput = textParts[textParts.length - 1] || '';
      
      if (currentInput.length === 0) {
        setUserInput('');
        return;
      }
      
      const firstChar = currentInput.charAt(0);
      const expectedChar = currentWord.word.charAt(0);
      
      console.log('Checking first letter - got:', firstChar, 'expected:', expectedChar);
      
      if (firstChar.toLowerCase() === expectedChar.toLowerCase()) {
        // Correct first letter - fill in the whole word immediately without showing single letter
        // Batch the state updates to happen in one render cycle
        setUserInput(currentWord.word);
        
        // Mark word as complete
        const updatedWords = words.map((w) => {
          if (w.id === currentWord.id) {
            return { ...w, typedLetter: currentWord.word, isCorrect: true };
          }
          return w;
        });
        setWords(updatedWords);
        
        moveToNextWord(updatedWords);
      } else {
        // Wrong letter - clear
        setUserInput('');
      }
    }
  };

  const moveToNextWord = (updatedWords: WordDisplay[]) => {
    const nextIndex = currentWordIndex + 1;
    
    setUserInput('');
    
    if (nextIndex >= visibleWords.length) {
      const allCorrect = updatedWords.filter(w => w.isVisible).every(w => w.isCorrect === true);
      if (allCorrect) {
        advanceToNextLevel(updatedWords);
      } else {
        setCurrentWordIndex(0);
      }
    } else {
      setCurrentWordIndex(nextIndex);
      inputRef.current?.focus();
    }
  };

  const advanceToNextLevel = (currentWords: WordDisplay[]) => {
    const completedVisibleWords = currentWords.filter(w => w.isVisible);
    const totalWords = currentWords.length;
    const currentProgressPercent = currentProgress;
    
    // Calculate the percentage of words to hide based on progress
    // As progress increases, hide fewer words (less help needed)
    // Early stages (0-30%): hide 25% of words
    // Mid stages (30-70%): hide 15% of words
    // Late stages (70-90%): hide 10% of words
    // Final stage (90%+): hide 5% of words
    let hidePercentage: number;
    if (currentProgressPercent < 30) {
      hidePercentage = 0.25; // 25% of words hidden
    } else if (currentProgressPercent < 70) {
      hidePercentage = 0.15; // 15% of words hidden
    } else if (currentProgressPercent < 90) {
      hidePercentage = 0.10; // 10% of words hidden
    } else {
      hidePercentage = 0.00; // 5% of words hidden
    }
    
    const wordsToHide = Math.max(1, Math.floor(completedVisibleWords.length * hidePercentage));
    
    // Randomly select words to hide
    const visibleWordIds = completedVisibleWords.map(w => w.id);
    const shuffledIds = visibleWordIds.sort(() => Math.random() - 0.5);
    const idsToHide = shuffledIds.slice(0, wordsToHide);
    
    let hiddenCount = 0;
    const updatedWords = currentWords.map(word => {
      if (word.isVisible && idsToHide.includes(word.id) && hiddenCount < wordsToHide) {
        hiddenCount++;
        return { ...word, isVisible: false, typedLetter: null, isCorrect: null };
      }
      return { ...word, typedLetter: null, isCorrect: null };
    });
    
    setWords(updatedWords);
    setCurrentWordIndex(0);
    
    // Increment progress by a larger amount (20-25% per completion)
    // This means about 4 rounds from start to finish
    const progressIncrement = 20; // Random between 20-25%
    const remainingVisible = updatedWords.filter(w => w.isVisible).length;
    const calculatedProgress = Math.round((1 - remainingVisible / totalWords) * 100);
    const newProgress = Math.min(100, currentProgressPercent + progressIncrement);
    
    setCurrentProgress(newProgress);
    
    // Save progress
    if (editingUserVerse) {
      const updatedUserVerse: UserVerse = {
        ...editingUserVerse,
        progressPercent: newProgress,
        lastPracticed: new Date(),
      };
      
      updateUserVerseAPI(updatedUserVerse).catch(error => {
        console.error('Failed to update progress:', error);
      });
      
      useAppStore.getState().setEditingUserVerse(updatedUserVerse);
      
      // Update the userVerse in all collections where it appears
      collections.forEach(collection => {
        const userVerseIndex = collection.userVerses.findIndex(uv => 
          uv.readableReference === updatedUserVerse.readableReference
        );
        
        if (userVerseIndex !== -1) {
          const updatedCollection = {
            ...collection,
            userVerses: collection.userVerses.map((uv, index) => 
              index === userVerseIndex ? updatedUserVerse : uv
            )
          };
          updateCollection(updatedCollection);
        }
      });
      
      // Check if today already has activity in the streak (normalize to local date)
      const toLocalYMD = (s: string) => {
        const ymd = s.slice(0, 10);
        const [y, m, d] = ymd.split('-').map(Number);
        const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
        const year = dt.getFullYear();
        const month = String(dt.getMonth() + 1).padStart(2, '0');
        const day = String(dt.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      const todayLocal = (() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })();
      const todayHasActivity = user.streak?.some(s => toLocalYMD(s.date) === todayLocal) || false;
      
      // Record practice session for streak tracking
      recordPractice(user.username).then(streakLength => {
        if (streakLength > 0) {
          // Only show snackbar if today didn't have activity before this practice session
          if (!todayHasActivity) {
            setSnackbarMessage(`🔥 You completed your streak for today!`);
            setSnackbarVisible(true);
          }
          
          // Update user streak in store
          setUser({
            ...user,
            streakLength: streakLength
          });
        }
      }).catch(error => {
        console.error('Failed to record practice:', error);
      });
    }
    
    // Check if complete
    if (remainingVisible === 0 || newProgress >= 100) {
      setIsComplete(true);
      
      // Set the flag to reload practice list when user returns to practice tab
      const setShouldReloadPracticeList = useAppStore.getState().setShouldReloadPracticeList;
      if (setShouldReloadPracticeList) {
        setShouldReloadPracticeList(true);
      }
      
      // Increment verse memorized count for each verse in the passage
      if (editingUserVerse?.verses && editingUserVerse.verses.length > 0) {
        editingUserVerse.verses.forEach(verse => {
          if (verse.verse_reference) {
            incrementVerseMemorized(verse.verse_reference).catch(error => {
              console.error('Failed to increment verse memorized:', error);
            });
          }
        });
      }
      
      // Increment user's verses memorized count
      if (user.username) {
        incrementVersesMemorized(user.username).catch(error => {
          console.error('Failed to increment user verses memorized:', error);
        });
      }
      
      router.back();
    } else {
        inputRef.current?.focus();
    }
  };

  const getFullText = () => {
    return editingUserVerse?.verses.map(v => v.text).join(' ') || '';
  };

  if (!editingUserVerse || !editingUserVerse.verses || editingUserVerse.verses.length === 0) {
    return null;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: `${Math.floor(currentProgress)}%`,
          headerBackVisible: true,
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.onBackground,
        }}
      />
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        >
          {/* Input box for typing - two layers */}
          <View style={{ position: 'relative', marginBottom: 20, minHeight: 200, maxHeight: 400 }}>
            <View style={{ padding: 20, borderRadius: 8, backgroundColor: theme.colors.surface, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
              {/* Background layer - shows all upcoming words with transparency based on progress */}
              <Text style={{ 
                ...styles.text, 
                fontFamily: 'Noto Serif', 
                fontSize: 18, 
                color: theme.colors.onBackground, 
                opacity: 0.7,
                paddingTop: 0,
                paddingLeft: 0,
                paddingRight: 0,
                paddingBottom: 0,
                marginTop: 0,
                marginLeft: 0,
                marginRight: 0,
                marginBottom: 0,
              }}>
                {visibleWords.map((w, index) => {
                  const isHidden = hiddenIndices.has(index);
                  return (
                    <Text key={w.id} style={{ color: isHidden ? theme.colors.surface : undefined }}>
                      {w.word}
                      {index < visibleWords.length - 1 ? ' ' : ''}
                    </Text>
                  );
                })}
              </Text>
            </View>
            
            {/* Foreground layer - shows completed full words in green */}
            <View style={{ padding: 20, borderRadius: 8, backgroundColor: 'transparent', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
              <TextInput
                ref={inputRef}
                value={getCompletedText() + (getCompletedText() ? ' ' : '') + userInput}
                onChangeText={handleInputChange}
                style={{
                  ...styles.text,
                  fontFamily: 'Noto Serif',
                  fontSize: 18,
                  color: theme.colors.onBackground,
                  flex: 1,
                  textAlignVertical: 'top',
                  paddingTop: 0,
                  paddingLeft: 0,
                  paddingRight: 0,
                  paddingBottom: 0,
                  marginTop: 0,
                  marginLeft: 0,
                  marginRight: 0,
                  marginBottom: 0,
                }}
                multiline
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                blurOnSubmit={false}
                keyboardType="default"
                scrollEnabled={true}
                underlineColorAndroid="transparent"
                spellCheck={false}
              />
            </View>
          </View>

        </ScrollView>
        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
          style={{ 
            backgroundColor: theme.colors.primary,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            margin: 0
          }}
          wrapperStyle={{ top: 0 }}
        >
          {snackbarMessage}
        </Snackbar>
      </View>
    </>
  );
}
