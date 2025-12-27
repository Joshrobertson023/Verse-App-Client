import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import React, { JSX, useEffect, useState } from 'react';
import { Alert, Dimensions, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Portal, Snackbar } from 'react-native-paper';
import { getUserVerseParts, getUserVersesPopulated, MemorizedInfo, memorizePassage, memorizeVerseOfDay, UserVerseMemorizedInfo, UserVerseParts } from './db';
import { useAppStore } from './store';
import useStyles from './styles';
import useAppTheme from './theme';

const MIN_STAGES = 3;
const MAX_STAGES = 6;
const DEFAULT_STAGES = 4;

interface Word {
  id: number;
  word: string;
  isCorrect: boolean | null;
  isHint: boolean;
}

export default function PracticeSessionScreen() {
  const styles = useStyles();
  const theme = useAppTheme();
  const selectedUserVerse = useAppStore((state) => state.selectedUserVerse);
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [referenceWords, setReferenceWords] = useState<Word[]>([]);
  const [displayWords, setDisplayWords] = useState<Word[]>([]);
  const [currentStage, setCurrentStage] = useState(1);
  const [highestCompletedStage, setHighestCompletedStage] = useState(1);
  const [stageAccuracy, setStageAccuracy] = useState<{ accuracy: number; correct: number; total: number } | null>(null);
  const setCollections = useAppStore((state) => state.setCollections);
  const [loading, setLoading] = useState(false);
  const setShouldReloadPracticeList = useAppStore((state) => state.setShouldReloadPracticeList);
  const setProfileCache = useAppStore((state) => state.setProfileCache);
  const reviewReference = useAppStore((state) => state.reviewReference);
  const [showSettings, setShowSettings] = useState(false);
  const [learnVerseReference, setLearnVerseReference] = useState(true);
  const [totalStages, setTotalStages] = useState(DEFAULT_STAGES);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const [book, setBook] = useState('');
  const [chapter, setChapter] = useState('');
  const [versesTypeParts, setVersesTypeParts] = useState<string[]>([]);
  const [readableReferenceVerses, setReadableReference] = useState('');
  const [passageText, setPassageText] = useState('');
  const [firstStageWords, setFirstStageWords] = useState<Word[]>([]);

  const [stageHiddenIndeces, setStageHiddenIndices] = useState<number[][]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeReferenceIndex, setActiveReferenceIndex] = useState(0);
  const [bookWords, setBookWords] = useState<Word[]>([]);
  const [activeBookIndex, setActiveBookIndex] = useState(0);
  const [learnedBook, setLearnedBook] = useState(false);

  const [accuracyModalVisible, setAccuracyModalVisible] = useState(false);
  const [accuracy, setAccuracy] = useState(0);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [nextDue, setNextDue] = useState(new Date());
  const [timesMemorized, setTimesMemorized] = useState(0);

  const points = useAppStore((state) => state.user?.points || 0);
  const versesMemorized = useAppStore((state) => state.user?.versesMemorized || 0);
  const [animatedPoints, setAnimatedPoints] = useState(points);
  const [animatedVersesMemorized, setAnimatedVersesMemorized] = useState(versesMemorized);

  const [pointsGained, setPointsGained] = useState(0);
  const [stageAccuracies, setStageAccuracies] = useState<number[]>([]);

  const [learnedVerseReference, setLeanredVerseReference] = useState(false);

  const updateCollection = useAppStore((state) => state.updateCollection);

const showSummary = () => {
  setSummaryModalVisible(true);
};

  useEffect(() => {
    const getUserVersePracticing = async () => {
      if (!selectedUserVerse?.verses?.length) {
        Alert.alert('Error', 'No passage to practice');
        router.back();
        return;
      }

      setAccuracyModalVisible(false);

      const userVerseParts: UserVerseParts = await getUserVerseParts(selectedUserVerse);

      const bookValue = userVerseParts.book ?? '';
      const chapterValue = userVerseParts.chapter?.toString() || '';
      const versePartsValue = userVerseParts.verseParts ?? [];
      const passageTextValue = userVerseParts.text ?? '';

      setBook(bookValue);
      setChapter(chapterValue);
      setVersesTypeParts(versePartsValue);
      setPassageText(passageTextValue);
      setReadableReference(selectedUserVerse.readableReference.substring(selectedUserVerse.readableReference.indexOf(':') + 1) || '');

      const words: Word[] = [];
      const referenceWords: Word[] = [];
      const bookWordsArray: Word[] = [];
      let referenceIndex = 0;
      let counter = 0;

      // Extract first letter of each word in book name
      if (user.typeOutReference && bookValue) {
        const bookWordsSplit = bookValue.trim().split(/\s+/);
        bookWordsSplit.forEach((word) => {
          if (word.length > 0) {
            bookWordsArray.push({
              id: counter++,
              word: word.charAt(0),
              isHint: true,
              isCorrect: null,
            });
          }
        });
        setBookWords(bookWordsArray);
        setActiveBookIndex(0);
        setLearnedBook(false);
      }

      // if (reviewReference) {
      //   words.push({ id: counter++, isHint: true, word: bookValue + " ", isCorrect: null });
      //   words.push({ id: counter++, isHint: true, word: chapterValue + " ", isCorrect: null });

      //   for (let i = 0; i < versePartsValue.length; i++) {
      //     if (Number.isFinite(versePartsValue[i]) &&) {
      //       continue;
      //     }
      //     words.push({
      //       id: counter++,
      //       isHint: true,
      //       word: versePartsValue[i] ?? '',
      //       isCorrect: null,
      //     });
      //   }
      // }

      // Convert all passage text into words to display
      for (let i = 0; i < passageTextValue.length + 1; i++) {
        let nextWord: string = '';
        while (i < passageTextValue.length && passageTextValue[i] !== ' ') {
          if (passageTextValue[i] !== '\n' && passageTextValue[i] !== '\t' && passageTextValue[i] !== ' ' && passageTextValue[i] !== '') {
            nextWord += passageTextValue[i];
            i++;
          }
        }
        
        if (nextWord.trim() !== '') {
          words.push({
            id: counter++,
            isHint: true,
            word: nextWord + ' ',
            isCorrect: null,
          });
        }

      }
      
      if (user.typeOutReference) {
        const refParts: string[] = [];

        console.log("Chapter parts:")
        for (let j = 0; j < chapterValue.length; j++) {
          console.log(chapterValue[j]);
          if (chapterValue[j] !== undefined && chapterValue[j] !== null)
            refParts.push(chapterValue[j].toString());
        }
        if (versePartsValue && versePartsValue.length) {
          versePartsValue.forEach((vp) => {
            for (let k = 0; k < vp.length; k++) {
              if (vp[k] !== undefined && vp[k] !== null)
                refParts.push(vp[k].toString());
            }
          });
        }

        refParts.forEach((part) => {
          referenceWords.push({
            id: counter++,
            word: part,
            isHint: true,
            isCorrect: null,
          });
        });

        setReferenceWords(referenceWords);
      }

      setAllWords(words);

      setFirstStageWords(words);

      const totalLength = words.length;
      const stageHiddenIndices: number[][] = [];

      // Hide random words for each stage
      const percentStage1 = 0.00;
      const percentIncrement = 0.30;

      const getRandomUnique = (count: number, max: number): number[] => {
        const set = new Set<number>();
        while (set.size < count) {
          set.add(Math.floor(Math.random() * max));
        }
        return Array.from(set);
      };

      const stage1Count = Math.floor(totalLength * percentStage1);
      const stage1 = getRandomUnique(stage1Count, totalLength);
      stageHiddenIndices.push(stage1);

      const stage2Count = Math.floor(totalLength * (percentStage1 + percentIncrement));
      const stage2NewCount = stage2Count - stage1.length;
      const stage2New = getRandomUnique(stage2NewCount, totalLength);
      const stage2 = Array.from(new Set([...stage1, ...stage2New]));
      stageHiddenIndices.push(stage2);

      const stage3Count = Math.floor(totalLength * (percentStage1 + percentIncrement * 2.5));
      const stage3NewCount = stage3Count - stage2.length;
      const stage3New = getRandomUnique(stage3NewCount, totalLength);
      const stage3 = Array.from(new Set([...stage2, ...stage3New]));
      stageHiddenIndices.push(stage3);

      const stage4 = Array.from({ length: totalLength }, (_, i) => i);
      stageHiddenIndices.push(stage4);

      setStageHiddenIndices(stageHiddenIndices);
      setAllWords(words);
      setActiveIndex(0);

      console.log("Hidden indices all 4 stages:", stageHiddenIndices);
    };

    getUserVersePracticing();
  }, [selectedUserVerse, learnVerseReference, totalStages]);

const renderReference = () => {
  const display: JSX.Element[] = [];
  let refIndex = 0;
  let bookIndex = 0;

  const fullRef = selectedUserVerse?.readableReference ?? '';

  // Use the book state variable which contains the full book name
  const bookPart = book;
  // Construct restPart from chapter and verses (e.g., " 1:1-3" or " 1:1")
  const restPart = ` ${chapter}:${readableReferenceVerses}`;

  // --- Render book char-by-char (first letter of each word) ---
  const bookWordsSplit = bookPart.trim().split(/\s+/);
  for (let i = 0; i < bookWordsSplit.length; i++) {
    const word = bookWordsSplit[i];
    if (word.length > 0) {
      // First letter of each word
      const bookWord = bookWords[bookIndex];
      const isCorrect = bookWord?.isCorrect ?? null;
      const isHint = bookWord?.isHint ?? true; // Default to true if undefined

      let color = theme.colors.verseHint; // Default to hint color

      if (isCorrect === true) {
        color = theme.colors.onBackground;
      } else if (isCorrect === false) {
        color = theme.colors.error;
      } else if (isHint) {
        color = theme.colors.verseHint;
      } else {
        color = 'transparent'; // Only transparent if explicitly not a hint
      }

      display.push(
        <Text key={`book-char-${i}`} style={{ color }}>
          {word.charAt(0)}
        </Text>
      );

      // Rest of the word - only show if first letter has been typed (isCorrect !== null)
      if (word.length > 1 && isCorrect !== null) {
        display.push(
          <Text key={`book-rest-${i}`} style={{ color: theme.colors.onBackground }}>
            {word.slice(1)}
          </Text>
        );
      }

      bookIndex++;

      // Add space between words (only if current word has been typed and not last word)
      if (i < bookWordsSplit.length - 1 && isCorrect !== null) {
        display.push(
          <Text key={`book-space-${i}`} style={{ color: theme.colors.onBackground }}>
            {' '}
          </Text>
        );
      }
    }
  }

  // --- Render chapter + verses char-by-char (only after book is learned) ---
  if (learnedBook) {
    for (let i = 0; i < restPart.length; i++) {
      const ch = restPart[i];

      // Digits → tied to referenceWords
      if (/\d/.test(ch)) {
        const refWord = referenceWords[refIndex];
        const isCorrect = refWord?.isCorrect ?? null;
        const isHint = refWord?.isHint ?? false;

        let color = 'transparent';

        if (isCorrect === true) {
          color = theme.colors.onBackground;
        } else if (isCorrect === false) {
          color = theme.colors.error;
        } else if (isHint) {
          color = theme.colors.verseHint;
        }

        display.push(
          <Text key={`digit-${i}`} style={{ color }}>
            {ch}
          </Text>
        );

        refIndex++;
      }
      // Punctuation / spaces → visual only
      else {
        display.push(
          <Text key={`punct-${i}`} style={{ color: theme.colors.onBackground }}>
            {ch}
          </Text>
        );
      }
    }
  }

  return display;
};


  const resetReferenceForStage = (stage: number) => {
    if (!user.typeOutReference) return;

    const hideReference = stage >= 3;

    setReferenceWords(prev =>
      prev.map(rw => ({
        ...rw,
        isCorrect: null,
        isHint: !hideReference,
      }))
    );

    setBookWords(prev =>
      prev.map(bw => ({
        ...bw,
        isCorrect: null,
        isHint: !hideReference,
      }))
    );

    setActiveReferenceIndex(0);
    setActiveBookIndex(0);
    setLeanredVerseReference(false);
    setLearnedBook(false);
  };

  // *********************
  // Handle keyboard press
  // *********************
  const handleKeyboardPress = async (char: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);

    // Phase 1: Type book (first letter of each word)
    if (user.typeOutReference && activeBookIndex < bookWords.length && !learnedBook) {
      const currentBookWord = bookWords[activeBookIndex];
      const expectedChar = currentBookWord.word.trim().charAt(0).toLowerCase();

      if (char.toLowerCase() !== expectedChar) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      const updatedBookWords = [...bookWords];
      updatedBookWords[activeBookIndex] = {
        ...currentBookWord,
        isCorrect: char.toLowerCase() === expectedChar,
      };
      setBookWords(updatedBookWords);

      setActiveBookIndex(activeBookIndex + 1);

      if (activeBookIndex + 1 >= bookWords.length) {
        setActiveBookIndex(0);
        setLearnedBook(true);
        setActiveReferenceIndex(0);
      }

      return;
    }

    // Phase 2: Type reference (chapter and verses)
    if (user.typeOutReference && activeReferenceIndex < referenceWords.length && !learnedVerseReference && learnedBook) {
      const currentRefWord = referenceWords[activeReferenceIndex];
      const expectedChar = currentRefWord.word.trim().charAt(0).toLowerCase();

      if (char.toLowerCase() !== expectedChar) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      const updatedReferenceWords = [...referenceWords];
      updatedReferenceWords[activeReferenceIndex] = {
        ...currentRefWord,
        isCorrect: char.toLowerCase() === expectedChar,
      };
      setReferenceWords(updatedReferenceWords);

      setActiveReferenceIndex(activeReferenceIndex + 1);

      if (activeReferenceIndex + 1 >= referenceWords.length) {
        setActiveReferenceIndex(0);
        setLeanredVerseReference(true);
        setActiveIndex(0);
      }

      return;
    }

    // Phase 3: Type verse text
    if (activeIndex >= allWords.length) 
      return;

    const currentWord = allWords[activeIndex];
    const expectedChar = currentWord.word.trim().charAt(0).toLowerCase();

    if (char.toLowerCase() !== expectedChar) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    const updatedWords = [...allWords];
    updatedWords[activeIndex] = { ...currentWord, isCorrect: char.toLowerCase() === expectedChar };
    setAllWords(updatedWords);

    setActiveIndex(activeIndex + 1);

    if (activeIndex + 1 >= allWords.length) {
        const currentAccuracy = computeStageAccuracy(updatedWords, referenceWords, bookWords);
        setAccuracy(currentAccuracy);
        const newStageAccuracies = [...stageAccuracies, currentAccuracy];
        setStageAccuracies(newStageAccuracies);

        setAccuracyModalVisible(true);
    }
  };


  const retryStage = () => {
    const hiddenSet = new Set(stageHiddenIndeces[currentStage - 1] ?? []);
    setAllWords(
      firstStageWords.map((word, index) => ({
        ...word,
        isHint: !hiddenSet.has(index),
        isCorrect: null,
      }))
    );
    resetReferenceForStage(currentStage);
    setActiveIndex(0);
    setAccuracyModalVisible(false);
  }

const computeStageAccuracy = (words: Word[], refWords: Word[], bookWordsArray: Word[]) => {
  let allWordsToCheck = [...words];
  
  if (user.typeOutReference) {
    if (learnedBook) {
      allWordsToCheck = [...bookWordsArray, ...allWordsToCheck];
    }
    if (learnedVerseReference) {
      allWordsToCheck = [...refWords, ...allWordsToCheck];
    }
  }
  
  const total = allWordsToCheck.length;
  const correct = allWordsToCheck.filter(w => w.isCorrect === true).length;
  
  return total > 0 ? Math.floor((correct / total) * 100) : 0;
};

const nextStage = async () => {
  setCurrentStage(prev => {
    const next = prev + 1;
    resetReferenceForStage(next);
    return next;
  });

  setActiveIndex(0);
  setAccuracyModalVisible(false);

  if (currentStage >= totalStages) {
    try { // Reached end of session
      let allWordsToCheck = [...allWords];
      
      if (user.typeOutReference) {
        if (learnedBook) {
          allWordsToCheck = [...bookWords, ...allWordsToCheck];
        }
        if (learnedVerseReference) {
          allWordsToCheck = [...referenceWords, ...allWordsToCheck];
        }
      }
      
      const correctWords = allWordsToCheck.filter(w => w.isCorrect === true).length;
      const totalWords = allWordsToCheck.length;
      const localAccuracy = totalWords > 0 ? Math.floor((correctWords / totalWords) * 100) : 0;
      
      const finalStageAccuracies = [...stageAccuracies, localAccuracy];
      setStageAccuracies(finalStageAccuracies);
      
      const sessionAccuracy = Math.floor(
        finalStageAccuracies.reduce((a, b) => a + b, 0) / finalStageAccuracies.length
      );
      setAccuracy(sessionAccuracy);

      // Check if this is a verse of day (no id or no collectionId)
      const isVerseOfDay = !selectedUserVerse?.id || !selectedUserVerse?.collectionId;
      
      if (isVerseOfDay && selectedUserVerse?.readableReference && user.username) {
        // Handle verse of day memorization
        await memorizeVerseOfDay(user.username, selectedUserVerse.readableReference);
        setPointsGained(25); // Verse of day gives 25 points (as per backend)
        setTimesMemorized(1); // Simple default for verse of day
        setNextDue(new Date()); // No specific due date for verse of day
      } else {
        // Handle regular UserVerse memorization
        const info: MemorizedInfo = {
          userVerseId: selectedUserVerse?.id || 0,
          accuracy: sessionAccuracy,
        };
        
        const userVerseMemorizedInfo: UserVerseMemorizedInfo = await memorizePassage(info);
        setPointsGained(userVerseMemorizedInfo.pointsGained);
        setNextDue(userVerseMemorizedInfo.userVerse.dueDate ? new Date(userVerseMemorizedInfo.userVerse.dueDate) : new Date());
        setTimesMemorized(userVerseMemorizedInfo.userVerse.timesMemorized || 0);

        // Update collection with populated userVerses to reflect memorized info changes
        const collection = useAppStore.getState().collections.find(c => c.collectionId === selectedUserVerse?.collectionId);
        if (collection) {
          const colToSend = { ...collection, UserVerses: collection.userVerses ?? [] };
          const updatedCollection = await getUserVersesPopulated(colToSend);
          updateCollection(updatedCollection);
          setShouldReloadPracticeList(true);
        }
      }

      showSummary();
    } catch (error) {
      console.error('Failed to memorize passage:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to memorize passage';
      setSnackbarMessage(errorMessage);
      setSnackbarVisible(true);
      showSummary();
    }
    return;
  }
};

  useEffect(() => {
    if (!firstStageWords.length || !stageHiddenIndeces.length) return;

    const hiddenSet = new Set(stageHiddenIndeces[currentStage - 1] ?? []);

    setAllWords(
      firstStageWords.map((word, index) => ({
        ...word,
        isHint: !hiddenSet.has(index),
        isCorrect: null,
      }))
    );

    setActiveIndex(0);
  }, [currentStage, stageHiddenIndeces, firstStageWords]);

  const createWord = (id: number, word: string, isNumber: boolean, showSpace: boolean): Word => ({
    id,
    word,
    isCorrect: null,
    isHint: false,
  });

  const onModalClose = () => {

  }


  const KeyboardButton = ({ char }: { char: string }) => {
    const themePreference = useAppStore((state) => state.themePreference);
    return (
      <Pressable  onPress={() => {handleKeyboardPress(char)}} style={{width: '8%', height: 50, backgroundColor: theme.colors.verseText, borderRadius: 8, justifyContent: 'center', alignItems: 'center', margin: 3}}>
        <Text style={{ color: themePreference === 'dark' ? theme.colors.onBackground : theme.colors.background, fontSize: 24 }}>{char}</Text>
      </Pressable>
    );
  }

  const KeyboardNumberButton = ({ char }: { char: string }) => {
    const themePreference = useAppStore((state) => state.themePreference);
    return (
      <Pressable  onPress={() => {handleKeyboardPress(char)}} style={{width: '8%', height: 40, backgroundColor: theme.colors.verseText, borderRadius: 8, justifyContent: 'center', alignItems: 'center', margin: 3}}>
        <Text style={{ color: themePreference === 'dark' ? theme.colors.onBackground : theme.colors.background, fontSize: 24 }}>{char}</Text>
      </Pressable>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: learnVerseReference ? '' : (selectedUserVerse?.readableReference || ''),
          headerBackVisible: true,
          headerStyle: { backgroundColor: theme.colors.surface },
          headerTintColor: theme.colors.onBackground,
          headerShadowVisible: false,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => retryStage()}
              style={{ marginRight: 16 }}
              activeOpacity={0.7}
            >
              <Ionicons name="refresh" size={24} color={theme.colors.onBackground} />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={{ 
        flex: 1, 
        backgroundColor: theme.colors.background,
      }}>
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
        >          

        {/* Stage viewer */}
        <View style={{height: 5, width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20}}>
          {[...Array(totalStages)].map((_, index) => (
            <View key={index} style={{width: '24%', height: 5, borderRadius: 1, backgroundColor: index === currentStage - 1 ? theme.colors.primary : theme.colors.surface2}} />
          ))}
        </View>


            {/* Main Text Area */}

            <View style={{
              width: '100%',
              borderStyle: 'solid',
              borderRadius: 8,
              marginTop: 20
            }}>
              {learnVerseReference && user.typeOutReference ? (
                  <Text style={{ fontSize: 18, lineHeight: 18, marginBottom: 12, color: 'transparent' }}>
                    {renderReference()}
                  </Text>
                ) : (
                  <Text style={{ fontSize: 18, lineHeight: 18, marginBottom: 12, color: theme.colors.onBackground }}>
                    {book} {chapter}:{readableReferenceVerses}
                  </Text>
                )}

                <Text style={{fontSize: 18, color: theme.colors.verseHint, lineHeight: 24}}>
                  {allWords.map((w, i) => (
                    w.isCorrect === null ? (
                      w.isHint ? (
                        <Text key={w.id} style={{color: theme.colors.verseHint}}>{w.word}</Text>
                      ) : (
                        <Text key={w.id} style={{color: theme.colors.background}}>{w.word}</Text>
                      )
                    ) : (
                      w.isCorrect ? (
                        <Text key={w.id} style={{color: theme.colors.onBackground}}>{w.word}</Text>
                      ) : (
                        <Text key={w.id} style={{color: theme.colors.error}}>{w.word}</Text>
                      )
                    )
                  ))}
                </Text>
            </View>
        </ScrollView>

        {/* Keyboard */}
        <View style={{position: 'absolute', bottom: 0, width: '100%', justifyContent: 'center', alignItems: 'center', paddingBottom: 80}}>
          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row'}}>
            <KeyboardNumberButton char="1" />
            <KeyboardNumberButton char="2" />
            <KeyboardNumberButton char="3" />
            <KeyboardNumberButton char="4" />
            <KeyboardNumberButton char="5" />
            <KeyboardNumberButton char="6" />
            <KeyboardNumberButton char="7" />
            <KeyboardNumberButton char="8" />
            <KeyboardNumberButton char="9" />
            <KeyboardNumberButton char="0" />
          </View>
          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row'}}>
            <KeyboardButton char="q" />
            <KeyboardButton char="w" />
            <KeyboardButton char="e" />
            <KeyboardButton char="r" />
            <KeyboardButton char="t" />
            <KeyboardButton char="y" />
            <KeyboardButton char="u" />
            <KeyboardButton char="i" />
            <KeyboardButton char="o" />
            <KeyboardButton char="p" />
          </View>
          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row'}}>
            <KeyboardButton char="a" />
            <KeyboardButton char="s" />
            <KeyboardButton char="d" />
            <KeyboardButton char="f" />
            <KeyboardButton char="g" />
            <KeyboardButton char="h" />
            <KeyboardButton char="j" />
            <KeyboardButton char="k" />
            <KeyboardButton char="l" />
          </View>
          <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row'}}>
            <KeyboardButton char="z" />
            <KeyboardButton char="x" />
            <KeyboardButton char="c" />
            <KeyboardButton char="v" />
            <KeyboardButton char="b" />
            <KeyboardButton char="n" />
            <KeyboardButton char="m" />
          </View>
        </View>
        
      </View>
      {loading && (
        <View style={{ position: 'absolute', width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.surface }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
      <Snackbar 
        visible={snackbarVisible} 
        onDismiss={() => setSnackbarVisible(false)} 
        duration={3000}
        style={{ backgroundColor: theme.colors.primary }}
      >
        {snackbarMessage}
      </Snackbar>

          <Modal
            visible={accuracyModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={onModalClose}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ width: '80%', height: '50%', alignSelf: 'center', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 16, padding: 20, borderWidth: .5, borderColor: theme.colors.onSurfaceVariant }}>
              <Text style={{...styles.subheading, marginBottom: 10, marginTop: 20}}>Accuracy: {accuracy}%</Text>
              {accuracy >= 90 ? (
                currentStage >= totalStages ? (
                  <Text style={{...styles.text, textAlign: 'center'}}>Good job! Go ahead and finish the session.</Text>
                ) : (
                  <Text style={{...styles.text, textAlign: 'center'}}>Good job! Go ahead and continue to the next stage.</Text>
                )
              ) : (
                accuracy >= 75 ? (
                  <Text style={{...styles.text, textAlign: 'center'}}>Nice job, but you can get a better score. Try again!</Text>
                ) : (
                  <Text style={{...styles.text, textAlign: 'center'}}>It's recommended that you retry this stage.</Text>
                )
              )}
              <View style={{flexDirection: 'row', marginTop: 20}}>
                <TouchableOpacity style={{height: 150, width: '48%', borderWidth: 1, borderColor: theme.colors.onSurfaceVariant, borderRadius: 8, justifyContent: 'center', alignItems: 'center', margin: 10}}
                  onPress={retryStage}>
                  <Ionicons name="refresh-outline" size={48} color={theme.colors.onSurfaceVariant} />
                  <Text style={{...styles.text, textAlign: 'center'}}>Retry</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{height: 150, width: '48%', borderWidth: 1, borderColor: theme.colors.onSurfaceVariant, borderRadius: 8, justifyContent: 'center', alignItems: 'center', margin: 10}}
                  onPress={nextStage}>
                  <Ionicons name="arrow-forward-outline" size={48} color={theme.colors.onSurfaceVariant} />
                  {currentStage >= totalStages ? (
                    <Text style={{...styles.text, textAlign: 'center'}}>Finish</Text>
                  ) : (
                    <Text style={{...styles.text, textAlign: 'center'}}>Next Stage</Text>
                  )}
                </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

      <Portal>
          <Modal
            visible={summaryModalVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={onModalClose}>
            <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' }}
              activeOpacity={1}
              onPress={() => { }}>
              <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}
                style={{ backgroundColor: theme.colors.surface, borderRadius: 12, width: '90%', maxWidth: 400, maxHeight: Dimensions.get('window').height * 0.8,
                         padding: 20, justifyContent: 'space-between', borderWidth: .5, borderColor: theme.colors.onSurfaceVariant}}>

                    {/* Success Header */}
                    <View style={{ alignItems: 'center', marginBottom: 32 }}>
                      {!selectedUserVerse?.collectionId ? (
                        // Verse of day - simple congrats message
                        <>
                          <Text style={{ ...styles.subheading, textAlign: 'center', fontSize: 24, color: theme.colors.primary, marginTop: 4 }}>
                            Congratulations!
                          </Text>
                          <Text style={{ ...styles.text, textAlign: 'center', fontSize: 16, color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
                            You've completed practicing the verse of the day.
                          </Text>
                        </>
                      ) : (
                        // Regular collection verse
                        <>
                          <Text style={{ ...styles.text, textAlign: 'center', fontSize: 16, color: theme.colors.onSurfaceVariant, marginBottom: 0 }}>
                            You have memorized
                          </Text>
                          <Text style={{ ...styles.subheading, textAlign: 'center', fontSize: 20, color: theme.colors.primary, marginTop: 4 }}>
                            {selectedUserVerse?.readableReference}
                          </Text>
                          <Text style={{ ...styles.text, textAlign: 'center', fontSize: 16, color: theme.colors.onSurfaceVariant, marginTop: 4, marginBottom: -20 }}>
                             {timesMemorized} {timesMemorized === 1 ? 'time' : 'times'}
                          </Text>
                        </>
                      )}
                    </View>

                    {/* Stat updates */}
                    <View style={{ width: '100%', marginBottom: 24 }}>

                      {/* Accuracy */}
                      <View style={{ paddingVertical: 20, paddingHorizontal: 4}}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 22, fontFamily: 'Inter' }}>
                              Accuracy
                            </Text>
                          </View>
                          <Text style={{ color: theme.colors.onBackground, fontSize: 24, fontWeight: '600', fontFamily: 'Inter' }}>
                            {accuracy}%
                          </Text>
                        </View>
                      </View>
                      <View style={{ paddingVertical: 0, paddingHorizontal: 4}}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                          <Text style={{ color: theme.colors.onBackground, fontSize: 16, fontWeight: '600', fontFamily: 'Inter' }}>
                            + {pointsGained} points
                          </Text>
                        </View>
                      </View>

                      {/* Points */}
                      <View style={{ paddingVertical: 20, paddingHorizontal: 4}}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                          <Ionicons name="star-outline" size={20} color={theme.colors.primary} style={{ marginRight: 12 }} />
                          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 20, fontFamily: 'Inter' }}>
                            Points
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
                          <Text style={{ color: theme.colors.onBackground, fontSize: 38, fontWeight: '900', fontFamily: 'Inter' }}>
                            {points}
                          </Text>
                          <Ionicons name="arrow-forward" size={28} color={theme.colors.onSurfaceVariant} style={{ marginHorizontal: 10 }} />
                          <Text style={{ color: theme.colors.onBackground, fontSize: 38, fontWeight: '900', fontFamily: 'Inter' }}>
                            {points + pointsGained}
                          </Text>
                        </View>
                      </View>

                      {/* Next Practice Card - only show for collection verses */}
                      {selectedUserVerse?.collectionId && (
                        <View style={{ paddingVertical: 20, paddingHorizontal: 4, }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 22, fontFamily: 'Inter' }}>
                              Practice again in {(() => {
                                const today = new Date();
                                const diffTime = nextDue.getTime() - today.getTime();
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                return diffDays === 1 ? '1 day' : `${diffDays} days`;
                              })()}
                            </Text>
                          </View>
                        </View>
                      )}
                </View>

                {/* Action Button */}
                <TouchableOpacity 
                  style={{...styles.button_filled, marginTop: 16 }} 
                  onPress={() => {
                    // Update user points in store
                    if (pointsGained > 0) {
                      setUser({
                        ...user,
                        points: (user?.points || 0) + pointsGained,
                      });
                    }
                    setSummaryModalVisible(false);
                    // Collection is already updated above for regular verses, and shouldReloadPracticeList is set
                    // For verse of day, no collection to update
                    router.replace('/(tabs)');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.buttonText_filled}>
                    Back to Home
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            </TouchableOpacity>
            </Modal>
      </Portal>
    </>
  );
}
