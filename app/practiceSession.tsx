import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  isVisible: boolean;
  isNumber: boolean;
  showSpace: boolean;
  isCorrect: boolean | null;
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
  const [stageAccuracy, setStageAccuracy] = useState<{ accuracy: number; correct: number; total: number } | null>(null);
  const setCollections = useAppStore((state) => state.setCollections);
  const [loading, setLoading] = useState(false);
  const setShouldReloadPracticeList = useAppStore((state) => state.setShouldReloadPracticeList);
  const setProfileCache = useAppStore((state) => state.setProfileCache);
  const [showSettings, setShowSettings] = useState(false);
  const [learnVerseReference, setLearnVerseReference] = useState(true);
  const [totalStages, setTotalStages] = useState(DEFAULT_STAGES);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const [book, setBook] = useState('');
  const [chapter, setChapter] = useState('');
  const [versesTypeParts, setVersesTypeParts] = useState<string[]>([]);
  // Parts of the verse reference user has to type, so if 19-20, it's 19 and 20.

  useEffect(() => {
    const getUserVersePracticing = async () => {
      if (!editingUserVerse?.verses?.length) {
        Alert.alert('Error', 'No passage to practice');
        router.back();
        return;
      }
  
      // Parse reference on server
      const userVerseParts: UserVerseParts = await getUserVerseParts(editingUserVerse);
      alert(userVerseParts.book || '' + userVerseParts.chapter || '' + userVerseParts.text || '');
  
      if (!settingsLoaded) {
        return;
      }
    }
    getUserVersePracticing();
  }, [editingUserVerse, learnVerseReference, totalStages, settingsLoaded]);

  useEffect(() => { // Runs when stage changes
    
  }, [currentStage, allWords]);

  useEffect(() => {
    const loadPracticeSettings = async () => {
      if (!user?.username) {
        setLearnVerseReference(true);
        setTotalStages(DEFAULT_STAGES);
        setSettingsLoaded(true);
        return;
      }

      try {
        const settingsKeys = getPracticeSettingsKeys(user.username);
        const [restartStage, learnReference, stages] = await Promise.all([
          AsyncStorage.getItem(settingsKeys.RESTART_STAGE_ON_WRONG),
          AsyncStorage.getItem(settingsKeys.LEARN_VERSE_REFERENCE),
          AsyncStorage.getItem(settingsKeys.TOTAL_STAGES),
        ]);

        // Set practice settings
        const isFreeAccount = !user.isPaid;
        if (isFreeAccount) {
          setLearnVerseReference(true);
          setTotalStages(DEFAULT_STAGES);
          await AsyncStorage.setItem(settingsKeys.RESTART_STAGE_ON_WRONG, 'true');
          await AsyncStorage.setItem(settingsKeys.LEARN_VERSE_REFERENCE, 'true');
          await AsyncStorage.setItem(settingsKeys.TOTAL_STAGES, DEFAULT_STAGES.toString());
        } else {          
          if (learnReference !== null) {
            setLearnVerseReference(learnReference === 'true');
          } else {
            setLearnVerseReference(true);
          }
          
          if (stages !== null) {
            const parsedStages = parseInt(stages, 10);
            if (!isNaN(parsedStages) && parsedStages >= MIN_STAGES && parsedStages <= MAX_STAGES) {
              setTotalStages(parsedStages);
            } else {
              setTotalStages(DEFAULT_STAGES);
            }
          } else {
            setTotalStages(DEFAULT_STAGES);
          }
        }
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

  // Save learnVerseReference to AsyncStorage
  const handleSetLearnVerseReference = async (value: boolean) => {
    if (!user?.username) return;
    setLearnVerseReference(value);
    try {
      const settingsKeys = getPracticeSettingsKeys(user.username);
      await AsyncStorage.setItem(settingsKeys.LEARN_VERSE_REFERENCE, value.toString());
      // Reset the practice session when this setting changes


    } catch (error) {
      console.error('Failed to save learnVerseReference setting:', error);
    }
  };


  // Save totalStages to AsyncStorage
  const handleSetTotalStages = async (value: number) => {
    if (!user?.username) return;
    setTotalStages(value);
    try {
      const settingsKeys = getPracticeSettingsKeys(user.username);
      await AsyncStorage.setItem(settingsKeys.TOTAL_STAGES, value.toString());
      // If current stage exceeds new total, reset to stage 1

      //Else - Update display words for current stage with new total
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
          
            {/* Background text */}
            
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
                onValueChange={handleSetLearnVerseReference}
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
