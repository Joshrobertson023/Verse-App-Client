import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { router, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Portal, Snackbar } from 'react-native-paper';
import { getCollectionById, getUserVerseParts, MemorizedInfo, memorizePassage, UserVerseMemorizedInfo, UserVerseParts } from './db';
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
      let counter = 0;

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


  // Handle keyboard press
  const handleKeyboardPress = async (char: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);

    if (activeIndex >= allWords.length)
      return;

    const currentWord = allWords[activeIndex];
    const expectedChar = currentWord.word.trim().charAt(0).toLowerCase();

    if (char !== expectedChar) 
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

    const updatedWords = [...allWords];
    updatedWords[activeIndex] = { ...currentWord, isCorrect: (char === expectedChar) };
    setAllWords(updatedWords);

    setActiveIndex((previous) => previous + 1);
    console.log("Active index:", activeIndex + 1);
    console.log("allWords.length:", allWords.length);
    console.log("Typed char:", char, "Expected char: " + "\"" + expectedChar + "\"");
    console.log("Is correct:", char === expectedChar);

    if (activeIndex + 1 == allWords.length) {
      // Reached end of stage
      console.log("Reached end of stage");

      let correctWords = 0;
      let totalWords = updatedWords.length;
      for (let i = 0; i < updatedWords.length; i++) {
        updatedWords[i].isCorrect ? correctWords++ : null;
      }
      let localAccuracy = Math.floor((correctWords / totalWords) * 100);
      setAccuracy(localAccuracy);
      setStageAccuracies([...stageAccuracies, localAccuracy]);
      setAccuracyModalVisible(true);
    }
  }

  const retryStage = () => {
    const hiddenSet = new Set(stageHiddenIndeces[currentStage - 1] ?? []);
    setAllWords(
      firstStageWords.map((word, index) => ({
        ...word,
        isHint: !hiddenSet.has(index),
        isCorrect: null,
      }))
    );
    setActiveIndex(0);
    setAccuracyModalVisible(false);
  }

  const nextStage = async () => {
    setCurrentStage(currentStage + 1);
    setActiveIndex(0);
    setAccuracyModalVisible(false);

    if (currentStage >= totalStages) {
      // Reached end of session
      try {
          let correctWords = 0;
          let totalWords = allWords.length;
          for (let i = 0; i < allWords.length; i++) {
            allWords[i].isCorrect ? correctWords++ : null;
          }
          let localAccuracy = Math.floor((correctWords / totalWords) * 100);
          setStageAccuracies([...stageAccuracies, localAccuracy]);
          let sessionAccuracy = Math.floor((stageAccuracies.reduce((a, b) => a + b, 0) + localAccuracy) / (stageAccuracies.length + 1));
          setAccuracy(sessionAccuracy);

          const info: MemorizedInfo = {
            userVerseId: selectedUserVerse?.id || 0,
            accuracy: sessionAccuracy,
          }
          const userVerseMemorizedInfo: UserVerseMemorizedInfo = await memorizePassage(info);
          setPointsGained(userVerseMemorizedInfo.pointsGained);
          setNextDue(userVerseMemorizedInfo.userVerse.dueDate ? new Date(userVerseMemorizedInfo.userVerse.dueDate) : new Date());
          setTimesMemorized(userVerseMemorizedInfo.userVerse.timesMemorized || 0);

          const updatedCollection = await getCollectionById(selectedUserVerse?.collectionId || 0);
          if (updatedCollection) {
            updateCollection(updatedCollection);
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
  }

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
              {learnVerseReference && (
                user.typeOutReference ? (
                  <Text style={{fontSize: 18, color: theme.colors.verseHint, lineHeight: 18, marginBottom: 12}}>
                    {book} {chapter}:{readableReferenceVerses}
                  </Text>
                ) : (
                  <Text style={{fontSize: 18, color: theme.colors.onBackground, lineHeight: 18, marginBottom: 12}}>
                    {book} {chapter}:{readableReferenceVerses}
                  </Text>
                )
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
                  <Text style={{...styles.text, textAlign: 'center'}}>It's recommended you retry this stage.</Text>
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
                      <Text style={{ ...styles.text, textAlign: 'center', fontSize: 16, color: theme.colors.onSurfaceVariant, marginBottom: 0 }}>
                        You have memorized
                      </Text>
                      <Text style={{ ...styles.subheading, textAlign: 'center', fontSize: 20, color: theme.colors.primary, marginTop: 4 }}>
                        {selectedUserVerse?.readableReference}
                      </Text>
                      <Text style={{ ...styles.text, textAlign: 'center', fontSize: 16, color: theme.colors.onSurfaceVariant, marginTop: 4, marginBottom: -20 }}>
                         {timesMemorized} {timesMemorized === 1 ? 'time' : 'times'}
                      </Text>
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

                      {/* Next Practice Card */}
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
