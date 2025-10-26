import Ionicons from '@expo/vector-icons/Ionicons';
import { router, Stack } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Surface } from 'react-native-paper';
import { useAppStore, UserVerse } from './store';
import useStyles from './styles';
import useAppTheme from './theme';
import { updateUserVerse as updateUserVerseAPI } from './db';

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
  const [words, setWords] = useState<WordDisplay[]>([]);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [showReference, setShowReference] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!editingUserVerse || !editingUserVerse.verses || editingUserVerse.verses.length === 0) {
      Alert.alert('Error', 'No passage to practice');
      router.back();
      return;
    }

    // Parse the reference to get book, chapter, verse
    const reference = editingUserVerse.readableReference || '';
    const referenceParts: string[] = [];
    
    // Parse "Book Chapter:Verse" format
    const colonIndex = reference.indexOf(':');
    if (colonIndex > 0) {
      const beforeColon = reference.substring(0, colonIndex).trim();
      const afterColon = reference.substring(colonIndex + 1).trim();
      
      // Split before colon by spaces
      const beforeParts = beforeColon.split(' ');
      const book = beforeParts.slice(0, -1).join(' ');
      const chapter = beforeParts[beforeParts.length - 1];
      
      if (book) referenceParts.push(book);
      if (chapter) referenceParts.push(chapter);
      if (afterColon) referenceParts.push(afterColon);
    } else {
      referenceParts.push(reference);
    }

    // Combine all verse texts
    const fullText = editingUserVerse.verses.map(v => v.text).join(' ');
    
    // Split into words
    const wordArray = fullText.split(' ').filter(word => word.length > 0);
    
    // Combine reference with verse words
    const allWords = [...referenceParts, ...wordArray];
    
    // Determine how many words to show initially based on current progress
    const progressPercent = editingUserVerse.progressPercent || 0;
    const totalWords = allWords.length;
    const wordsToShow = Math.max(1, Math.floor(totalWords * (1 - progressPercent / 100)));
    
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

  const getBackgroundHints = () => {
    return visibleWords.map(w => w.word).join(' ');
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
    
    const isNumber = /^\d+$/.test(currentWord.word);
    
    if (isNumber) {
      // For numbers, check if text matches the number (progressive)
      if (text.length === 0) {
        setUserInput('');
        return;
      }
      
      const expectedSubstring = currentWord.word.substring(0, text.length);
      
      if (text === expectedSubstring) {
        // Correct partial or complete
        setUserInput(text);
        
        if (text === currentWord.word) {
          // Complete - mark and move to next word
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
        // Wrong input - clear
        setUserInput('');
      }
    } else {
      // For text words, only first letter matters
      if (text.length === 0) {
        setUserInput('');
        return;
      }
      
      const firstChar = text.charAt(0);
      const expectedChar = currentWord.word.charAt(0);
      
      console.log('Checking first letter - got:', firstChar, 'expected:', expectedChar);
      
      if (firstChar.toLowerCase() === expectedChar.toLowerCase()) {
        // Correct first letter - mark word as complete
        const updatedWords = words.map((w) => {
          if (w.id === currentWord.id) {
            return { ...w, typedLetter: currentWord.word, isCorrect: true };
          }
          return w;
        });
        setWords(updatedWords);
        
        // Move to next word
        console.log('Moving to next word from index', currentWordIndex);
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
    const wordsToHide = Math.max(1, Math.floor(completedVisibleWords.length * 0.3));
    
    let hiddenCount = 0;
    const updatedWords = currentWords.map(word => {
      if (word.isVisible && hiddenCount < wordsToHide) {
        hiddenCount++;
        return { ...word, isVisible: false, typedLetter: null, isCorrect: null };
      }
      return { ...word, typedLetter: null, isCorrect: null };
    });
    
    setWords(updatedWords);
    setCurrentWordIndex(0);
    
    // Update progress
    const totalWords = currentWords.length;
    const remainingVisible = updatedWords.filter(w => w.isVisible).length;
    const newProgress = Math.min(100, Math.round((1 - remainingVisible / totalWords) * 100));
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
    }
    
    // Check if complete
    if (remainingVisible === 0 && newProgress >= 100) {
      setIsComplete(true);
      Alert.alert('Congratulations!', 'You have successfully memorized this passage!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } else {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
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
          title: `${currentProgress.toFixed(0)}%`,
          headerBackVisible: true,
        }}
      />
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        >
          {/* Input box for typing - two layers */}
          <View style={{ position: 'relative', marginBottom: 20, minHeight: 150 }}>
            <Surface style={{ padding: 20, borderRadius: 8, backgroundColor: theme.colors.surface, position: 'absolute', top: 0, left: 0, right: 0 }} elevation={2}>
              {/* Background layer - shows all upcoming words */}
              <TextInput
                editable={false}
                value={getBackgroundHints()}
                style={{
                  ...styles.text,
                  fontFamily: 'Noto Serif',
                  fontSize: 18,
                  color: theme.colors.onBackground,
                  opacity: 0.2,
                  minHeight: 150,
                  textAlignVertical: 'top',
                }}
                multiline
              />
            </Surface>
            
            {/* Foreground layer - shows completed full words in green */}
            <Surface style={{ padding: 20, borderRadius: 8, backgroundColor: 'transparent', position: 'absolute', top: 0, left: 0, right: 0 }} elevation={0}>
              <TextInput
                ref={inputRef}
                value={getCompletedText() + (getCompletedText() ? ' ' : '') + userInput}
                onChangeText={handleInputChange}
                style={{
                  ...styles.text,
                  fontFamily: 'Noto Serif',
                  fontSize: 18,
                  color: 'green',
                  minHeight: 150,
                  textAlignVertical: 'top',
                }}
                multiline
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
                blurOnSubmit={false}
                keyboardType="default"
              />
            </Surface>
          </View>

          {/* Toggle for showing full text */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 20,
              padding: 10,
              backgroundColor: theme.colors.surface,
              borderRadius: 8,
            }}
            onPress={() => setShowReference(!showReference)}
          >
            <Ionicons
              name={showReference ? 'eye-off' : 'eye'}
              size={20}
              color={theme.colors.onBackground}
            />
            <Text style={{ ...styles.tinyText, marginLeft: 10 }}>
              {showReference ? 'Hide' : 'Show'} Full Text
            </Text>
          </TouchableOpacity>

          {/* Full text reference (toggleable) */}
          {showReference && (
            <Surface style={{ padding: 20, borderRadius: 8, marginBottom: 30, backgroundColor: theme.colors.surface, opacity: 0.6 }} elevation={1}>
              <Text style={{ ...styles.text, fontFamily: 'Noto Serif', fontSize: 16, opacity: 0.7 }}>
                {getFullText()}
              </Text>
            </Surface>
          )}

          {/* Instructions */}
          <View style={{ marginTop: 30 }}>
            <Text style={{ ...styles.tinyText, opacity: 0.7, textAlign: 'center' }}>
              Type the first letter of each word. For numbers (chapter/verse), type the full number.{'\n'}
              Correct inputs turn green, incorrect turn red.{'\n'}
              Complete all words to advance to the next level!
            </Text>
          </View>
        </ScrollView>
      </View>
    </>
  );
}
