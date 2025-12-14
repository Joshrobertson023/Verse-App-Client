import Ionicons from '@expo/vector-icons/Ionicons';
import Slider from '@react-native-community/slider';
import { router, Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { ActivityIndicator, Snackbar } from 'react-native-paper';
import { getUserVerseParts, UserVerseParts } from './db';
import { useAppStore } from './store';
import useStyles from './styles';
import useAppTheme from './theme';

const MIN_STAGES = 3;
const MAX_STAGES = 6;
const DEFAULT_STAGES = 4;

const getPracticeSettingsKeys = (username: string) => ({
  RESTART_STAGE_ON_WRONG: `@verseApp:practice:${username}:restartStageOnWrong`,
  LEARN_VERSE_REFERENCE: `@verseApp:practice:${username}:learnVerseReference`,
  TOTAL_STAGES: `@verseApp:practice:${username}:totalStages`,
});

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
  const [passageText, setPassageText] = useState('');
  const [firstStageWords, setFirstStageWords] = useState<Word[]>([]);
  // Parts of the verse reference user has to type, so if 19-20, it's 19 and 20.

  // Track next upcoming expected word
  // Main loop:
  // When button is tapped, complete word, remove isHint, set isCorrect
  // Move upcoming expected word to next
  // Need to track current index in passage text?

  useEffect(() => {
    const getUserVersePracticing = async () => {
      if (!selectedUserVerse?.verses?.length) {
        Alert.alert('Error', 'No passage to practice');
        router.back();
        return;
      }

      const userVerseParts: UserVerseParts = await getUserVerseParts(selectedUserVerse);

      const bookValue = userVerseParts.book ?? '';
      const chapterValue = userVerseParts.chapter?.toString() || '';
      const versePartsValue = userVerseParts.verseParts ?? [];
      const passageTextValue = userVerseParts.text ?? '';

      setBook(bookValue);
      setChapter(chapterValue);
      setVersesTypeParts(versePartsValue);
      setPassageText(passageTextValue);

      alert(
        'Book: ' + bookValue +
        ' | Chapter: ' + chapterValue +
        ' | readableReference: ' + selectedUserVerse.readableReference
      );

      const words: Word[] = [];
      let counter = 0;

      if (reviewReference) {
        words.push({ id: counter++, isHint: true, word: chapterValue, isCorrect: null });
        words.push({ id: counter++, isHint: true, word: chapterValue, isCorrect: null });

        for (let i = 0; i < versePartsValue.length; i++) {
          words.push({
            id: counter++,
            isHint: true,
            word: versePartsValue[i] ?? '',
            isCorrect: null,
          });
        }
      }

      for (let i = 0; i < passageTextValue.length; i++) {
        words.push({
          id: counter++,
          isHint: true,
          word: passageTextValue[i],
          isCorrect: null,
        });
      }

      setFirstStageWords(words);

      const totalLength = passageTextValue.length;
      const stageHiddenIndices: number[][] = [];

      const percentStage1 = 0.10;
      const percentIncrement = 0.20;

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

      const stage3Count = Math.floor(totalLength * (percentStage1 + percentIncrement * 2));
      const stage3NewCount = stage3Count - stage2.length;
      const stage3New = getRandomUnique(stage3NewCount, totalLength);
      const stage3 = Array.from(new Set([...stage2, ...stage3New]));
      stageHiddenIndices.push(stage3);

      const stage4Count = Math.floor(totalLength * (percentStage1 + percentIncrement * 3));
      const stage4NewCount = stage4Count - stage3.length;
      const stage4New = getRandomUnique(stage4NewCount, totalLength);
      const stage4 = Array.from(new Set([...stage3, ...stage4New]));
      stageHiddenIndices.push(stage4);

      // Save for later stages
      setAllWords(words);
      // You probably want this stored:
      // setStageHiddenIndices(stageHiddenIndices);

      // creates:
      // stageHiddenIndices[0] → Stage 1 hidden IDs
      // stageHiddenIndices[1] → Stage 2 hidden IDs
      // stageHiddenIndices[2] → Stage 3 hidden IDs
      // stageHiddenIndices[3] → Stage 4 hidden IDs


      console.log("Hidden indices all 4 stages:", stageHiddenIndices);

      if (!settingsLoaded) {
        return;
      }
    };

    getUserVersePracticing();
  }, [selectedUserVerse, learnVerseReference, totalStages, settingsLoaded]);

  useEffect(() => { // Runs when stage changes
    
  }, [currentStage, allWords]);

  useEffect(() => { // Load practice settings from server
    const loadPracticeSettings = async () => {
      if (!user?.username) {
        setLearnVerseReference(true);
        setTotalStages(DEFAULT_STAGES);
        setSettingsLoaded(true);
        return;
      }

      try {

      } catch (error) {
        console.error('Failed to load practice settings:', error);
        setLearnVerseReference(true);
        setTotalStages(DEFAULT_STAGES);
      } finally {
        setSettingsLoaded(true);
      }
    };

    loadPracticeSettings();
  }, [user?.username, user?.isPaid]);

  const createWord = (id: number, word: string, isNumber: boolean, showSpace: boolean): Word => ({
    id,
    word,
    isCorrect: null,
    isHint: false,
  });

  // Hide words
  // const hideWordsForStage = (
  //   words: Word[], 
  //   stage: number, 
  //   useStoredIndices: boolean = false
  // ): { words: Word[]; hiddenIndices?: { referenceIndices: Set<number>; verseIndices: Set<number> } } => {
  //   if (stage === 1) {
  //     return { words: words.map(w => ({ ...w, isVisible: true })) };
  //   }

  //   let totalHidePercent;
  //   if (stage === 2) {
  //     const stage2Increment = 1.0 / (2 * totalStages - 3);
  //     totalHidePercent = stage2Increment;
  //   } else {
  //     const stage2Increment = 1.0 / (2 * totalStages - 3);
  //     const normalIncrement = 2 * stage2Increment;
  //     totalHidePercent = stage2Increment + ((stage - 2) * normalIncrement);
  //   }
    
    // const totalWords = words.length;
    // const totalWordsToHide = Math.floor(totalWords * totalHidePercent);
    // const availableIndices: Array<{ type: 'reference' | 'verse'; index: number; wordIndex: number }> = []    
    // const shuffled = [...availableIndices].sort(() => Math.random() - 0.5);
    // const indicesToHide = shuffled.slice(0, Math.min(totalWordsToHide, availableIndices.length));
    // const referenceIndicesToHide = new Set<number>();
    // const verseIndicesToHide = new Set<number>();
    // DELETED CODE HERE    
    // return { 
    //   words: [...updatedReferenceWords, ...updatedVerseWords],
    //   hiddenIndices: { referenceIndices: referenceIndicesToHide, verseIndices: verseIndicesToHide }
    // };
  //};

  // function ProgressBar({ currentStage, totalStages, progressPercent, highestCompletedStage, theme }: ProgressBarProps) {
  //   return (
  //     <View style={{ marginBottom: 20 }}>
  //       <View style={{ 
  //         flexDirection: 'row', 
  //         justifyContent: 'space-between', 
  //         alignItems: 'center',
  //         marginBottom: 12 
  //       }}>
  //         <Text style={{ 
  //           fontSize: 16, 
  //           fontWeight: '600', 
  //           color: theme.colors.onBackground 
  //         }}>
  //           Stage {currentStage} / {totalStages}
  //         </Text>
  //       </View>
        
  //       <View style={{ 
  //         flexDirection: 'row', 
  //         justifyContent: 'space-between',
  //       }}>
  //         {Array.from({ length: totalStages }).map((_, index) => {
  //           const stageNum = index + 1;
  //           const isCompleted = stageNum <= highestCompletedStage;
  //           const isCurrent = stageNum === currentStage;
            
  //           let backgroundColor = theme.colors.surface;
  //           if (isCurrent || isCompleted) {
  //             backgroundColor = theme.colors.primary;
  //           }
            
  //           return (
  //             <View
  //               key={stageNum}
  //               style={{
  //                 flex: 1,
  //                 height: isCurrent ? 6 : 4,
  //                 backgroundColor: backgroundColor,
  //                 opacity: isCurrent ? 1 : (isCompleted ? 0.5 : 0.3),
  //                 borderRadius: 2,
  //                 marginRight: index < totalStages - 1 ? 4 : 0,
  //                 borderWidth: isCurrent ? 1 : 0,
  //                 borderColor: theme.colors.primary,
  //               }}
  //             />
  //           );
  //         })}
  //       </View>
  //     </View>
  //   );
  // }

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
              onPress={() => setShowSettings(true)}
              style={{ marginRight: 16 }}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={24} color={theme.colors.onBackground} />
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
          {/* <ProgressBar 
            currentStage={currentStage} 
            totalStages={totalStages}
            progressPercent={calculateProgress()}
            highestCompletedStage={highestCompletedStage}
            theme={theme}
          /> */}

          {/* Stage navigation buttons */}
          {/* <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 12 }}>
            <TouchableOpacity
              onPress={handleGoBack}
              disabled={currentStage <= 1}
              style={{
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
          </View> */}
          
            {/* Main Text Area */}

            <View style={{
              height: '70%',
              width: '100%',
            }}>

            </View>
            
            {/* Input overlay */}

          {/* {completed && (
            <Button 
              title="Go Back" 
              onPress={() => {handleBack()}} 
              variant="text"
              style={{ marginTop: -10 }}
            />
          )} */}
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
                marginBottom: user.isPaid ? 24 : 8,
                fontFamily: 'Inter',
              }}
            >
              Practice Settings
            </Text>

            {!user.isPaid && (
              <TouchableOpacity
                onPress={() => {
                  setShowSettings(false);
                  router.push('/pro');
                }}
                style={{ marginBottom: 16 }}
                activeOpacity={0.7}
              >
                <Text
                  style={{
                    fontSize: 13,
                    color: theme.colors.primary,
                    fontFamily: 'Inter',
                    textDecorationLine: 'underline',
                  }}
                >
                  Upgrade to Pro to access these settings
                </Text>
              </TouchableOpacity>
            )}

            {/* Learn Verse Reference Setting */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 4,
                opacity: user.isPaid ? 1 : 0.5,
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
                  Include verse reference
                </Text>
              </View>
              <Switch
                value={learnVerseReference}
                disabled={!user.isPaid}
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
                opacity: user.isPaid ? 1 : 0.5,
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
                  Changing this will put you back on the first stage
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
                  disabled={!user.isPaid}
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
